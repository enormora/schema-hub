import { isIdentifier, isVariableDeclarator, type Identifier, type Node as BabelNode } from '@babel/types';
import { isExpressionNode, type MutationPath } from './ast.ts';

export function declaratorInitId(declaratorPath: MutationPath | null, node: BabelNode): Identifier | null {
    if (declaratorPath === null || !isVariableDeclarator(declaratorPath.node)) {
        return null;
    }

    const { init, id } = declaratorPath.node;

    if (!isExpressionNode(init)) {
        return null;
    }

    return init === node && isIdentifier(id) ? id : null;
}
