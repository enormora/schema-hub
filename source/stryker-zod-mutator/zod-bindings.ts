import * as babel from '@babel/types';
import type { Node as BabelNode, Program } from '@babel/types';
import {
    fileNameOf,
    findProgram,
    getMemberName,
    isExpressionNode,
    type CallExpression,
    type MutationPath,
    type SchemaExpression
} from './ast.ts';
import type { ResolverEnv } from './binding-resolution.ts';

export type ZodApiStyle = 'classic' | 'mini';

type NamespaceBinding = {
    readonly name: string;
    readonly style: ZodApiStyle;
};

type DirectBinding = {
    readonly localName: string;
    readonly importedName: string;
    readonly style: ZodApiStyle;
};

type ZodImportBindings = {
    readonly namespaces: readonly NamespaceBinding[];
    readonly directBindings: readonly DirectBinding[];
};
type ImportSpecifier =
    | Readonly<babel.ImportDefaultSpecifier>
    | Readonly<babel.ImportNamespaceSpecifier>
    | Readonly<babel.ImportSpecifier>;
type SourceStatement = Readonly<babel.Statement>;

export type ZodBindings = {
    readonly namespaces: readonly NamespaceBinding[];
    readonly directBindings: readonly DirectBinding[];
    readonly program: Program;
    readonly fileName: string | null;
    readonly env: ResolverEnv;
};

const zodSourceStyles = new Map<string, ZodApiStyle>([
    [ 'zod', 'classic' ],
    [ 'zod/v4', 'classic' ],
    [ 'zod/mini', 'mini' ],
    [ 'zod/v4-mini', 'mini' ],
    [ 'zod/v4/mini', 'mini' ]
]);

export const primitiveFactoryNames = [
    'string',
    'number',
    'bigint',
    'boolean',
    'date',
    'symbol',
    'null',
    'undefined',
    'void',
    'never',
    'any',
    'unknown'
] as const;

const schemaFactoryNames = new Set([
    ...primitiveFactoryNames,
    'object',
    'strictObject',
    'looseObject',
    'array',
    'tuple',
    'record',
    'partialRecord',
    'looseRecord',
    'union',
    'discriminatedUnion',
    'enum',
    'literal',
    'optional',
    'nullable',
    'nullish',
    'nonoptional',
    'readonly',
    '_default',
    'prefault',
    'catch',
    'email',
    'url',
    'uuid',
    'ulid',
    'cuid',
    'cuid2',
    'nanoid',
    'emoji',
    'ipv4',
    'ipv6',
    'iso'
]);

function getImportedName(specifier: Readonly<babel.ImportSpecifier>): string {
    return babel.isIdentifier(specifier.imported)
        ? specifier.imported.name
        : specifier.imported.value;
}

function readZodImportSpecifier(
    style: ZodApiStyle,
    specifier: ImportSpecifier
): ZodImportBindings {
    if (specifier.type === 'ImportNamespaceSpecifier' || specifier.type === 'ImportDefaultSpecifier') {
        return { namespaces: [ { name: specifier.local.name, style } ], directBindings: [] };
    }

    const importedName = getImportedName(specifier);

    return importedName === 'z'
        ? { namespaces: [ { name: specifier.local.name, style } ], directBindings: [] }
        : {
            namespaces: [],
            directBindings: [ { localName: specifier.local.name, importedName, style } ]
        };
}

function readZodImport(statement: SourceStatement): ZodImportBindings {
    const style = babel.isImportDeclaration(statement)
        ? zodSourceStyles.get(statement.source.value)
        : undefined;

    if (style === undefined || !babel.isImportDeclaration(statement)) {
        return { namespaces: [], directBindings: [] };
    }

    const bindings = statement.specifiers.map(function (specifier) {
        return readZodImportSpecifier(style, specifier);
    });

    return {
        namespaces: bindings.flatMap(function (binding) {
            return binding.namespaces;
        }),
        directBindings: bindings.flatMap(function (binding) {
            return binding.directBindings;
        })
    };
}

export function buildZodBindings(program: Program, fileName: string | null, env: ResolverEnv): ZodBindings {
    const imports = program.body.map(readZodImport);

    return {
        namespaces: imports.flatMap(function (binding) {
            return binding.namespaces;
        }),
        directBindings: imports.flatMap(function (binding) {
            return binding.directBindings;
        }),
        program,
        fileName,
        env
    };
}

export function readZodBindings(path: MutationPath, env: ResolverEnv): ZodBindings {
    return buildZodBindings(findProgram(path) ?? babel.program([]), fileNameOf(path), env);
}

export function getDirectBinding(bindings: ZodBindings, localName: string): DirectBinding | null {
    return bindings.directBindings.find(function (binding) {
        return binding.localName === localName;
    }) ?? null;
}

export function getNamespaceStyle(bindings: ZodBindings, localName: string): ZodApiStyle | null {
    return bindings
        .namespaces
        .find(function (binding) {
            return binding.name === localName;
        })
        ?.style ?? null;
}

export function isZodNamespaceMember(bindings: ZodBindings, expression: BabelNode): boolean {
    if (!babel.isMemberExpression(expression) || !babel.isIdentifier(expression.object)) {
        return false;
    }

    return getNamespaceStyle(bindings, expression.object.name) !== null;
}

function getCoerceNamespaceName(call: CallExpression): string | null {
    if (!babel.isMemberExpression(call.callee) || !babel.isMemberExpression(call.callee.object)) {
        return null;
    }

    const { object } = call.callee;

    return getMemberName(object) === 'coerce' && babel.isIdentifier(object.object)
        ? object.object.name
        : null;
}

export function isCoerceCall(bindings: ZodBindings, call: CallExpression): boolean {
    const namespaceName = getCoerceNamespaceName(call);

    return namespaceName !== null && getNamespaceStyle(bindings, namespaceName) !== null;
}

export function getZodCallName(bindings: ZodBindings, call: CallExpression): string | null {
    if (babel.isIdentifier(call.callee)) {
        return getDirectBinding(bindings, call.callee.name)?.importedName ?? null;
    }

    if (isZodNamespaceMember(bindings, call.callee)) {
        return getMemberName(call.callee);
    }

    if (isCoerceCall(bindings, call)) {
        return getMemberName(call.callee);
    }

    return null;
}

function getCoerceCallStyle(bindings: ZodBindings, call: CallExpression): ZodApiStyle | null {
    const namespaceName = getCoerceNamespaceName(call);

    return namespaceName === null ? null : getNamespaceStyle(bindings, namespaceName);
}

export function getZodCallStyle(bindings: ZodBindings, call: CallExpression): ZodApiStyle | null {
    if (babel.isIdentifier(call.callee)) {
        return getDirectBinding(bindings, call.callee.name)?.style ?? null;
    }

    if (babel.isMemberExpression(call.callee) && babel.isIdentifier(call.callee.object)) {
        return getNamespaceStyle(bindings, call.callee.object.name);
    }

    return getCoerceCallStyle(bindings, call);
}

export function isZodSchemaExpression(bindings: ZodBindings, expression: SchemaExpression): boolean {
    if (!babel.isCallExpression(expression)) {
        return false;
    }

    const callName = getZodCallName(bindings, expression);

    if (callName !== null) {
        return schemaFactoryNames.has(callName);
    }

    if (!babel.isMemberExpression(expression.callee)) {
        return false;
    }

    const { object } = expression.callee;

    return isExpressionNode(object) && isZodSchemaExpression(bindings, object);
}

export function expressionStyle(bindings: ZodBindings, expression: SchemaExpression): ZodApiStyle | null {
    let currentExpression: SchemaExpression | null = expression;

    for (;;) {
        if (!babel.isCallExpression(currentExpression)) {
            return null;
        }

        const directStyle = getZodCallStyle(bindings, currentExpression);

        if (directStyle !== null) {
            return directStyle;
        }

        if (!babel.isMemberExpression(currentExpression.callee) || !isExpressionNode(currentExpression.callee.object)) {
            return null;
        }

        currentExpression = currentExpression.callee.object;
    }
}

export function buildZodCall(
    bindings: ZodBindings,
    style: ZodApiStyle,
    name: string,
    args: readonly SchemaExpression[]
): CallExpression | null {
    const namespace = bindings.namespaces.find(function (binding) {
        return binding.style === style;
    });

    if (namespace !== undefined) {
        return babel.callExpression(
            babel.memberExpression(babel.identifier(namespace.name), babel.identifier(name)),
            Array.from(args)
        );
    }

    const direct = bindings.directBindings.find(function (binding) {
        return binding.style === style && binding.importedName === name;
    });

    if (direct !== undefined) {
        return babel.callExpression(babel.identifier(direct.localName), Array.from(args));
    }

    return null;
}

export function replaceZodCallee(
    bindings: ZodBindings,
    call: CallExpression,
    replacementName: string
): CallExpression | null {
    const style = getZodCallStyle(bindings, call);

    if (style === null) {
        return null;
    }

    return buildZodCall(bindings, style, replacementName, call.arguments.filter(isExpressionNode));
}

export function firstExpressionArgument(call: CallExpression): SchemaExpression | null {
    const argument = call.arguments[0];

    return argument !== undefined && isExpressionNode(argument) ? argument : null;
}

export function isObjectLikeFactory(name: string): boolean {
    return [ 'object', 'strictObject', 'looseObject' ].includes(name);
}

export const valuePreservingWrapperNames = new Set([
    'optional',
    'nullable',
    'nullish',
    'nonoptional',
    '_default',
    'prefault',
    'catch',
    'readonly'
]);

function isReceiverOfMethodCall(path: MutationPath): boolean {
    const enclosingMember = path.parentPath?.node;

    return babel.isMemberExpression(enclosingMember) && enclosingMember.object === path.node;
}

function isFirstArgumentOfCallNamed(
    path: MutationPath,
    bindings: ZodBindings,
    callNames: ReadonlySet<string>
): boolean {
    const enclosingCall = path.parentPath?.node;

    if (!babel.isCallExpression(enclosingCall)) {
        return false;
    }

    const firstArgument = enclosingCall.arguments[0];

    if (!isExpressionNode(firstArgument)) {
        return false;
    }

    const isFirstArgument = firstArgument === path.node;

    return isFirstArgument && callNames.has(getZodCallName(bindings, enclosingCall) ?? '');
}

export function isSchemaValueChainRoot(path: MutationPath, bindings: ZodBindings): boolean {
    return !isReceiverOfMethodCall(path) && !isFirstArgumentOfCallNamed(path, bindings, valuePreservingWrapperNames);
}

const recordFactoryNames = new Set([ 'record', 'partialRecord', 'looseRecord' ]);

export function isRecordKeyPosition(path: MutationPath, bindings: ZodBindings): boolean {
    return isFirstArgumentOfCallNamed(path, bindings, recordFactoryNames);
}

function grandparentNode(path: MutationPath): BabelNode | null {
    return path.parentPath?.parentPath?.node ?? null;
}

function isElementOfTemplateLiteralParts(path: MutationPath, bindings: ZodBindings): boolean {
    const partsArray = path.parentPath?.node;
    const templateCall = grandparentNode(path);

    if (!babel.isArrayExpression(partsArray) || !babel.isCallExpression(templateCall)) {
        return false;
    }

    const firstArgument = templateCall.arguments[0];
    const arrayIsFirstArgument = isExpressionNode(firstArgument) && firstArgument === partsArray;

    return arrayIsFirstArgument && getZodCallName(bindings, templateCall) === 'templateLiteral';
}

export function isStringTemplateLiteralPart(path: MutationPath, bindings: ZodBindings): boolean {
    return babel.isCallExpression(path.node) &&
        getZodCallName(bindings, path.node) === 'string' &&
        isElementOfTemplateLiteralParts(path, bindings);
}
