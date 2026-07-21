import * as babel from '@babel/types';
import type { Node as BabelNode } from '@babel/types';
import { isExpressionNode, type MutationPath } from './ast.ts';

export function declaratorInitId(declaratorPath: MutationPath | null, node: BabelNode): babel.Identifier | null {
    if (declaratorPath === null || !babel.isVariableDeclarator(declaratorPath.node)) {
        return null;
    }

    const { init, id } = declaratorPath.node;

    if (!isExpressionNode(init)) {
        return null;
    }

    return init === node && babel.isIdentifier(id) ? id : null;
}
