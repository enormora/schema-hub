import { baseConfig, withCspellWords } from '@enormora/eslint-config-base';
import { nodeConfig, nodeConfigFileConfig } from '@enormora/eslint-config-node';
import { typescriptConfig } from '@enormora/eslint-config-typescript';

export default [
    {
        ignores: [ 'target/**/*', 'integration-tests/fixtures/**/*' ]
    },
    ...baseConfig,
    {
        ...withCspellWords([ 'bivariant', 'enormora', 'optin' ]),
        files: [ '**/*.{js,ts}' ]
    },
    {
        ...nodeConfig,
        files: [ '**/*.{js,ts}' ]
    },
    {
        ...typescriptConfig,
        files: [ '**/*.ts' ]
    },
    {
        files: [ '**/*.{js,ts}' ],
        rules: {
            '@stylistic/operator-linebreak': 'off'
        }
    },
    {
        ...nodeConfigFileConfig,
        files: [ 'eslint.config.js', 'packtory.config.js' ],
        rules: {
            ...nodeConfigFileConfig.rules,

            'node/no-process-env': 'off'
        }
    },
    {
        files: [ '**/entry-point.ts', '**/zod-error-formatter/formatter.ts' ],
        rules: {
            'no-barrel-files/no-barrel-files': 'off',
            'import/max-dependencies': 'off'
        }
    },
    {
        files: [ 'source/zod-graphql-client/client.ts' ],
        rules: {
            'import/max-dependencies': 'off'
        }
    },
    {
        files: [ '**/*.test.ts', '**/*.type-test.ts' ],
        rules: {
            'max-statements': 'off',
            'max-lines': 'off',
            '@stylistic/max-len': 'off',
            '@typescript-eslint/no-unsafe-type-assertion': 'off',
            'functional/prefer-immutable-types': 'off',
            'functional/type-declaration-immutability': 'off',
            'enormora-typescript/prefer-readonly-types': 'off'
        }
    }
];
