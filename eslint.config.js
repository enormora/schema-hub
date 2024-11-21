import dprintPlugin from '@ben_12/eslint-plugin-dprint';
import { baseConfig } from '@enormora/eslint-config-base';
import { nodeConfig, nodeConfigFileConfig } from '@enormora/eslint-config-node';
import { typescriptConfig } from '@enormora/eslint-config-typescript';

export default [
    {
        ignores: ['target/**/*', 'integration-tests/fixtures/**/*']
    },
    baseConfig,
    nodeConfig,
    {
        plugins: { dprint: dprintPlugin },
        rules: {
            'prettier/prettier': 'off',
            'dprint/typescript': ['error', { configFile: 'dprint.json' }],
            'import/order': 'off',
            '@stylistic/member-delimiter-style': 'off'
        }
    },
    {
        ...typescriptConfig,
        files: ['**/*.ts']
    },
    {
        ...nodeConfigFileConfig,
        files: ['eslint.config.js', 'packtory.config.js']
    },
    {
        files: ['packtory.config.js'],
        rules: {
            'node/no-process-env': 'off'
        }
    },
    {
        files: ['**/*.ts'],
        rules: {
            // re-enable once https://github.com/eslint-functional/eslint-plugin-functional/issues/733 is fixed
            'functional/prefer-immutable-types': 'off',
            // re-enable once https://github.com/eslint-functional/eslint-plugin-functional/issues/733 is fixed
            'functional/type-declaration-immutability': 'off'
        }
    },
    {
        files: ['**/*.test.ts'],
        rules: {
            'max-statements': 'off',
            'max-lines': 'off'
        }
    },
    {
        files: ['source/zod-graphql-query-builder/builder.ts', 'source/zod-graphql-query-builder/query-schema.ts'],
        // those rules crash for some reason, we should re-enable them as soon as they are not crashing anymore
        rules: {
            '@typescript-eslint/no-unnecessary-type-assertion': 'off',
            '@typescript-eslint/no-unsafe-argument': 'off',
            '@typescript-eslint/no-confusing-void-expression': 'off',
            '@typescript-eslint/promise-function-async': 'off',
            '@typescript-eslint/no-misused-promises': 'off',
            '@typescript-eslint/no-unsafe-return': 'off',
            '@typescript-eslint/strict-boolean-expressions': 'off'
        }
    }
];
