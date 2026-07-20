import * as babel from '@babel/types';
import type { Node as BabelNode } from '@babel/types';
import { findProgram, getMemberName, isExpressionNode, type MutationPath } from './ast.ts';
import { getZodCallName, type ZodBindings } from './zod-bindings.ts';

const unionFactoryNames = new Set([ 'union', 'discriminatedUnion' ]);

const maskingWrappersByAddedWrapper = new Map<string, ReadonlySet<string>>([
    [ 'nullable', new Set([ 'nullable', 'nullish' ]) ],
    [ 'optional', new Set([ 'optional', 'nullish' ]) ]
]);

function isNonExportedModuleConst(declarationPath: MutationPath | null): boolean {
    const declaration = declarationPath?.node;
    const container = declarationPath?.parentPath?.node;

    return babel.isVariableDeclaration(declaration) &&
        declaration.kind === 'const' &&
        babel.isProgram(container);
}

function declaratorInitId(declaratorPath: MutationPath | null, node: BabelNode): babel.Identifier | null {
    if (declaratorPath === null || !babel.isVariableDeclarator(declaratorPath.node)) {
        return null;
    }

    const { init, id } = declaratorPath.node;

    return isExpressionNode(init) && init === node && babel.isIdentifier(id) ? id : null;
}

function constIdForInit(path: MutationPath): babel.Identifier | null {
    const declaratorPath = path.parentPath;
    const id = declaratorInitId(declaratorPath, path.node);

    return id !== null && isNonExportedModuleConst(declaratorPath?.parentPath ?? null) ? id : null;
}

function isUnionCall(unionCallPath: MutationPath, bindings: ZodBindings): boolean {
    const unionCall = unionCallPath.node;

    return babel.isCallExpression(unionCall) && unionFactoryNames.has(getZodCallName(bindings, unionCall) ?? '');
}

function constIdForUnionOption(path: MutationPath, bindings: ZodBindings): babel.Identifier | null {
    const optionsPath = path.parentPath;

    if (optionsPath === null || !babel.isArrayExpression(optionsPath.node)) {
        return null;
    }

    const unionCallPath = optionsPath.parentPath;

    if (unionCallPath === null || !isUnionCall(unionCallPath, bindings)) {
        return null;
    }

    return constIdForInit(unionCallPath);
}

function topLevelPathConstId(path: MutationPath, bindings: ZodBindings): babel.Identifier | null {
    return constIdForInit(path) ?? constIdForUnionOption(path, bindings);
}

function childNodes(node: BabelNode): readonly BabelNode[] {
    return Object.values(node).flatMap(function (value) {
        if (Array.isArray(value)) {
            return value.filter(babel.isNode);
        }

        return babel.isNode(value) ? [ value ] : [];
    });
}

type IdentifierUse = {
    readonly node: BabelNode;
    readonly parent: BabelNode;
    readonly grandparent: BabelNode | undefined;
};

function collectIdentifierUses(
    node: BabelNode,
    name: string,
    ancestors: readonly BabelNode[]
): readonly IdentifierUse[] {
    const [ parent, grandparent ] = ancestors;
    const here: readonly IdentifierUse[] = babel.isIdentifier(node) && node.name === name && parent !== undefined
        ? [ { node, parent, grandparent } ]
        : [];
    const deeper = [ node, ...ancestors ];

    return here.concat(
        childNodes(node).flatMap(function (child) {
            return collectIdentifierUses(child, name, deeper);
        })
    );
}

function isPropertyOrMemberName(use: IdentifierUse): boolean {
    const { node, parent } = use;

    if (babel.isObjectProperty(parent) || babel.isObjectMethod(parent)) {
        return parent.key === node && !parent.computed;
    }

    return babel.isMemberExpression(parent) && parent.property === node && !parent.computed;
}

function isTypeOnlyReference(use: IdentifierUse): boolean {
    return babel.isTSTypeQuery(use.parent);
}

function isReference(use: IdentifierUse): boolean {
    return babel.isReferenced(use.node, use.parent, use.grandparent);
}

function isForeignBinding(use: IdentifierUse, constIdNode: BabelNode): boolean {
    return use.node !== constIdNode && !isReference(use) && !isPropertyOrMemberName(use);
}

function maskedAsWrapperArgument(
    use: IdentifierUse,
    maskingWrappers: ReadonlySet<string>,
    bindings: ZodBindings
): boolean {
    const { node, parent } = use;

    if (!babel.isCallExpression(parent)) {
        return false;
    }

    const firstArgument = parent.arguments[0];

    if (!isExpressionNode(firstArgument) || firstArgument !== node) {
        return false;
    }

    return maskingWrappers.has(getZodCallName(bindings, parent) ?? '');
}

function maskedAsWrapperReceiver(use: IdentifierUse, maskingWrappers: ReadonlySet<string>): boolean {
    const { node, parent, grandparent } = use;

    if (!babel.isMemberExpression(parent) || parent.object !== node) {
        return false;
    }

    if (!babel.isCallExpression(grandparent) || grandparent.callee !== parent) {
        return false;
    }

    return maskingWrappers.has(getMemberName(parent) ?? '');
}

function isMaskedReference(use: IdentifierUse, maskingWrappers: ReadonlySet<string>, bindings: ZodBindings): boolean {
    return maskedAsWrapperArgument(use, maskingWrappers, bindings) || maskedAsWrapperReceiver(use, maskingWrappers);
}

export function presenceWrapperMaskedByEveryUse(
    path: MutationPath,
    bindings: ZodBindings,
    wrapperName: string
): boolean {
    const maskingWrappers = maskingWrappersByAddedWrapper.get(wrapperName);
    const program = findProgram(path);
    const constId = topLevelPathConstId(path, bindings);

    if (maskingWrappers === undefined || program === null || constId === null) {
        return false;
    }

    const uses = collectIdentifierUses(program, constId.name, []).filter(function (use) {
        return !isTypeOnlyReference(use);
    });
    const references = uses.filter(isReference);
    const hasForeignBinding = uses.some(function (use) {
        return isForeignBinding(use, constId);
    });
    const allMasked = references.every(function (use) {
        return isMaskedReference(use, maskingWrappers, bindings);
    });

    return !hasForeignBinding && references.length > 0 && allMasked;
}
