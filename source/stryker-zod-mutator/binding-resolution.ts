import * as babel from '@babel/types';
import type { Node as BabelNode, Program } from '@babel/types';
import { getMemberName, isExpressionNode, type CallExpression, type SchemaExpression } from './ast.ts';
import {
    buildZodBindings,
    firstExpressionArgument,
    getZodCallName,
    valuePreservingWrapperNames,
    type ZodBindings
} from './zod-bindings.ts';

export type ResolvedModule = {
    readonly program: Program;
    readonly fileName: string;
};

export type ResolverEnv = {
    readonly loadModule: (specifier: string, fromFileName: string) => ResolvedModule | null;
};

export const inertResolverEnv: ResolverEnv = {
    loadModule() {
        return null;
    }
};

type Resolution = {
    readonly expression: SchemaExpression;
    readonly bindings: ZodBindings;
};

type ResolveState = {
    readonly bindings: ZodBindings;
    readonly seen: ReadonlySet<string>;
};

type ResolveTarget =
    | { readonly kind: 'exportName'; readonly name: string; }
    | { readonly kind: 'expression'; readonly expression: SchemaExpression; }
    | { readonly kind: 'localName'; readonly name: string; };

type Recurse = (target: ResolveTarget, state: ResolveState) => Resolution | null;

function seenKey(bindings: ZodBindings, name: string): string {
    return `${bindings.fileName ?? ''} ${name}`;
}

function getPropertyName(property: Readonly<babel.ObjectProperty>): string | null {
    if (babel.isIdentifier(property.key)) {
        return property.key.name;
    }

    return babel.isStringLiteral(property.key) ? property.key.value : null;
}

function objectPropertyValue(object: Readonly<babel.ObjectExpression>, name: string): SchemaExpression | null {
    const match = object.properties.find(function (property) {
        return babel.isObjectProperty(property) && !property.computed && getPropertyName(property) === name;
    });

    return match !== undefined && babel.isObjectProperty(match) && isExpressionNode(match.value) ? match.value : null;
}

function propertySourceName(pattern: Readonly<babel.ObjectPattern>, localName: string): string {
    const match = pattern.properties.find(function (property) {
        return babel.isObjectProperty(property) && babel.isIdentifier(property.value) &&
            property.value.name === localName;
    });

    return match !== undefined && babel.isObjectProperty(match) && !match.computed && babel.isIdentifier(match.key)
        ? match.key.name
        : localName;
}

function objectPatternValue(
    pattern: Readonly<babel.ObjectPattern>,
    name: string,
    init: Resolution
): SchemaExpression | null {
    const holdsName = pattern.properties.some(function (property) {
        return babel.isObjectProperty(property) && babel.isIdentifier(property.value) && property.value.name === name;
    });

    return holdsName && babel.isObjectExpression(init.expression)
        ? objectPropertyValue(init.expression, propertySourceName(pattern, name))
        : null;
}

function arrayPatternValue(
    pattern: Readonly<babel.ArrayPattern>,
    name: string,
    init: Resolution
): SchemaExpression | null {
    const index = pattern.elements.findIndex(function (element) {
        return babel.isIdentifier(element) && element.name === name;
    });
    const element = index !== -1 && babel.isArrayExpression(init.expression)
        ? init.expression.elements[index]
        : undefined;

    return isExpressionNode(element) ? element : null;
}

function bindingPatternValue(id: BabelNode, name: string, init: Resolution): SchemaExpression | null {
    if (babel.isObjectPattern(id)) {
        return objectPatternValue(id, name, init);
    }

    return babel.isArrayPattern(id) ? arrayPatternValue(id, name, init) : null;
}

function patternBindsName(pattern: BabelNode, name: string): boolean {
    if (babel.isObjectPattern(pattern)) {
        return pattern.properties.some(function (property) {
            return babel.isObjectProperty(property) && babel.isIdentifier(property.value) &&
                property.value.name === name;
        });
    }

    return babel.isArrayPattern(pattern) && pattern.elements.some(function (element) {
        return babel.isIdentifier(element) && element.name === name;
    });
}

function declaresName(declarator: Readonly<babel.VariableDeclarator>, name: string): boolean {
    if (babel.isIdentifier(declarator.id)) {
        return declarator.id.name === name;
    }

    return patternBindsName(declarator.id, name);
}

function localDeclarators(program: Program): readonly Readonly<babel.VariableDeclarator>[] {
    return program.body.flatMap(function (statement) {
        const declaration = babel.isExportNamedDeclaration(statement) ? statement.declaration : statement;

        return babel.isVariableDeclaration(declaration) ? declaration.declarations : [];
    });
}

type ImportBinding = {
    readonly source: string;
    readonly exportName: string;
};

type ImportSpecifierEntry = {
    readonly specifier: Readonly<babel.ImportDeclaration['specifiers'][number]>;
    readonly source: string;
};

function importSpecifierEntries(program: Program): readonly ImportSpecifierEntry[] {
    return program.body.flatMap(function (statement) {
        return babel.isImportDeclaration(statement)
            ? statement.specifiers.map(function (specifier) {
                return { specifier, source: statement.source.value };
            })
            : [];
    });
}

function importedExportName(specifier: Readonly<babel.ImportDeclaration['specifiers'][number]>): string {
    if (!babel.isImportSpecifier(specifier)) {
        return 'default';
    }

    return babel.isIdentifier(specifier.imported) ? specifier.imported.name : specifier.imported.value;
}

function importBindingFor(program: Program, localName: string): ImportBinding | null {
    const entry = importSpecifierEntries(program).find(function (candidate) {
        return candidate.specifier.local.name === localName;
    });

    if (entry === undefined || babel.isImportNamespaceSpecifier(entry.specifier)) {
        return null;
    }

    return { source: entry.source, exportName: importedExportName(entry.specifier) };
}

function defaultExportDeclaration(program: Program): SchemaExpression | null {
    const [ declaration ] = program.body.flatMap(function (statement) {
        return babel.isExportDefaultDeclaration(statement) ? [ statement.declaration ] : [];
    });

    return isExpressionNode(declaration) ? declaration : null;
}

function exportSpecifiers(program: Program): readonly Readonly<babel.ExportSpecifier>[] {
    return program
        .body
        .flatMap(function (statement) {
            return babel.isExportNamedDeclaration(statement) && statement.source === null ? statement.specifiers : [];
        })
        .flatMap(function (specifier) {
            return babel.isExportSpecifier(specifier) ? [ specifier ] : [];
        });
}

function exportedName(specifier: Readonly<babel.ExportSpecifier>): string {
    return babel.isIdentifier(specifier.exported) ? specifier.exported.name : specifier.exported.value;
}

function localNameForExport(program: Program, exportName: string): string {
    const specifier = exportSpecifiers(program).find(function (candidate) {
        return exportedName(candidate) === exportName;
    });

    return specifier?.local.name ?? exportName;
}

function resolveMember(
    member: Readonly<babel.MemberExpression>,
    state: ResolveState,
    recurse: Recurse
): Resolution | null {
    const name = getMemberName(member);

    if (name === null || !isExpressionNode(member.object)) {
        return null;
    }

    const object = recurse({ kind: 'expression', expression: member.object }, state);

    if (object === null || !babel.isObjectExpression(object.expression)) {
        return null;
    }

    const value = objectPropertyValue(object.expression, name);

    return value === null
        ? null
        : recurse({ kind: 'expression', expression: value }, { bindings: object.bindings, seen: state.seen });
}

function resolveExpressionTarget(
    expression: SchemaExpression,
    state: ResolveState,
    recurse: Recurse
): Resolution | null {
    if (babel.isIdentifier(expression)) {
        return recurse({ kind: 'localName', name: expression.name }, state);
    }

    if (babel.isMemberExpression(expression)) {
        return resolveMember(expression, state, recurse);
    }

    return { expression, bindings: state.bindings };
}

function declaratorValue(
    declarator: Readonly<babel.VariableDeclarator>,
    name: string,
    state: ResolveState,
    recurse: Recurse
): Resolution | null {
    if (!isExpressionNode(declarator.init)) {
        return null;
    }

    const init = recurse({ kind: 'expression', expression: declarator.init }, state);

    if (init === null || babel.isIdentifier(declarator.id) && declarator.id.name === name) {
        return init;
    }

    const value = bindingPatternValue(declarator.id, name, init);

    return value === null
        ? null
        : recurse({ kind: 'expression', expression: value }, { bindings: init.bindings, seen: state.seen });
}

function resolveLocalTarget(name: string, state: ResolveState, recurse: Recurse): Resolution | null {
    const declarator = localDeclarators(state.bindings.program).find(function (candidate) {
        return declaresName(candidate, name);
    });

    return declarator === undefined ? null : declaratorValue(declarator, name, state, recurse);
}

function resolveImportedTarget(name: string, state: ResolveState, recurse: Recurse): Resolution | null {
    const binding = importBindingFor(state.bindings.program, name);

    if (binding === null || state.bindings.fileName === null) {
        return null;
    }

    const loaded = state.bindings.env.loadModule(binding.source, state.bindings.fileName);

    if (loaded === null) {
        return null;
    }

    const targetBindings = buildZodBindings(loaded.program, loaded.fileName, state.bindings.env);

    return recurse({ kind: 'exportName', name: binding.exportName }, { bindings: targetBindings, seen: state.seen });
}

function resolveExportTarget(name: string, state: ResolveState, recurse: Recurse): Resolution | null {
    if (name === 'default') {
        const declaration = defaultExportDeclaration(state.bindings.program);

        return declaration === null ? null : recurse({ kind: 'expression', expression: declaration }, state);
    }

    return recurse({ kind: 'localName', name: localNameForExport(state.bindings.program, name) }, state);
}

function resolveNameTarget(name: string, state: ResolveState, recurse: Recurse): Resolution | null {
    const key = seenKey(state.bindings, name);

    if (state.seen.has(key)) {
        return null;
    }

    const next: ResolveState = { bindings: state.bindings, seen: new Set([ ...state.seen, key ]) };

    return resolveLocalTarget(name, next, recurse) ?? resolveImportedTarget(name, next, recurse);
}

function resolve(target: ResolveTarget, state: ResolveState): Resolution | null {
    if (target.kind === 'expression') {
        return resolveExpressionTarget(target.expression, state, resolve);
    }

    if (target.kind === 'exportName') {
        return resolveExportTarget(target.name, state, resolve);
    }

    return resolveNameTarget(target.name, state, resolve);
}

function resolveSchemaReference(bindings: ZodBindings, name: string): Resolution | null {
    return resolve({ kind: 'localName', name }, { bindings, seen: new Set() });
}

function resolveExpressionReference(bindings: ZodBindings, expression: SchemaExpression): Resolution | null {
    return resolve({ kind: 'expression', expression }, { bindings, seen: new Set() });
}

type ChainStep = {
    readonly node: CallExpression;
    readonly bindings: ZodBindings;
};

const freezableSchemaFactoryNames = new Set([
    'object',
    'strictObject',
    'looseObject',
    'array',
    'tuple',
    'record',
    'partialRecord',
    'looseRecord'
]);

function underlyingSchemaExpression(bindings: ZodBindings, call: CallExpression): SchemaExpression | null {
    const callName = getZodCallName(bindings, call);

    if (callName !== null && valuePreservingWrapperNames.has(callName)) {
        return firstExpressionArgument(call);
    }

    return babel.isMemberExpression(call.callee) && isExpressionNode(call.callee.object)
        ? call.callee.object
        : null;
}

function stepFromNode(node: SchemaExpression, bindings: ZodBindings): Resolution | null {
    if (babel.isIdentifier(node)) {
        return resolveSchemaReference(bindings, node.name);
    }

    if (babel.isMemberExpression(node) && !babel.isCallExpression(node)) {
        const resolved = resolveExpressionReference(bindings, node);

        return resolved === null || babel.isMemberExpression(resolved.expression) ? null : resolved;
    }

    return { expression: node, bindings };
}

function nextResolution(step: Resolution): Resolution | null {
    const node: SchemaExpression = step.expression;

    if (!babel.isCallExpression(node)) {
        return stepFromNode(node, step.bindings);
    }

    const next = underlyingSchemaExpression(step.bindings, node);

    return next === null ? null : stepFromNode(next, step.bindings);
}

function* schemaChain(expression: SchemaExpression, bindings: ZodBindings): Generator<ChainStep> {
    const seen = new Set<BabelNode>();
    let resolution: Resolution | null = { expression, bindings };

    while (resolution !== null && !seen.has(resolution.expression)) {
        seen.add(resolution.expression);

        if (babel.isCallExpression(resolution.expression)) {
            yield { node: resolution.expression, bindings: resolution.bindings };
        }

        resolution = nextResolution(resolution);
    }
}

function isFreezableFactoryCall(step: ChainStep): boolean {
    const callName = getZodCallName(step.bindings, step.node);

    return callName !== null && freezableSchemaFactoryNames.has(callName);
}

export function producesFreezableValue(bindings: ZodBindings, expression: SchemaExpression): boolean {
    return Array.from(schemaChain(expression, bindings)).some(isFreezableFactoryCall);
}

function appliesReadonly(step: ChainStep): boolean {
    return getZodCallName(step.bindings, step.node) === 'readonly' || getMemberName(step.node.callee) === 'readonly';
}

export function chainAppliesReadonly(bindings: ZodBindings, expression: SchemaExpression): boolean {
    return Array.from(schemaChain(expression, bindings)).some(appliesReadonly);
}

const acceptAnythingFactoryNames = new Set([ 'any', 'unknown' ]);

function schemaName(step: ChainStep): string {
    return getZodCallName(step.bindings, step.node) ?? getMemberName(step.node.callee) ?? '';
}

function isBreakingWrapper(step: ChainStep): boolean {
    return !valuePreservingWrapperNames.has(schemaName(step));
}

export function resolvesToAcceptAnything(bindings: ZodBindings, expression: SchemaExpression): boolean {
    const steps = Array.from(schemaChain(expression, bindings));
    const decisive = steps.find(function (step) {
        return acceptAnythingFactoryNames.has(schemaName(step)) || isBreakingWrapper(step);
    });

    return decisive !== undefined && acceptAnythingFactoryNames.has(schemaName(decisive));
}

const factoryNamesAcceptingUndefined = new Set([
    'any',
    'unknown',
    'undefined',
    'void',
    'nullish',
    'prefault',
    'default',
    '_default'
]);
const factoryNamesAcceptingNull = new Set([ 'any', 'unknown', 'null', 'nullish' ]);

const alreadyAcceptedValueByWrapper = new Map<string, ReadonlySet<string>>([
    [ 'optional', factoryNamesAcceptingUndefined ],
    [ 'nullable', factoryNamesAcceptingNull ]
]);

export function addingWrapperHasNoEffect(
    bindings: ZodBindings,
    expression: SchemaExpression,
    wrapperName: string
): boolean {
    const acceptingFactories = alreadyAcceptedValueByWrapper.get(wrapperName);
    const [ outer ] = Array.from(schemaChain(expression, bindings));

    if (acceptingFactories === undefined || outer === undefined) {
        return false;
    }

    const outerName = schemaName(outer);

    return outerName === wrapperName ||
        acceptingFactories.has(outerName) ||
        resolvesToAcceptAnything(bindings, expression);
}
