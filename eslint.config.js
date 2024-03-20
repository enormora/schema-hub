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
    }
];
