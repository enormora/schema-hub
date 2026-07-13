// @ts-check
import fs from 'node:fs/promises';
import path from 'node:path';

const projectFolder = process.cwd();
const sourcesFolder = path.join(projectFolder, 'target/build/source');

/** @returns {Promise<import('@packtory/cli').PacktoryConfig>} */
export async function buildConfig() {
    const packageJsonContent = await fs.readFile('./package.json', { encoding: 'utf8' });
    const packageJson = JSON.parse(packageJsonContent);

    return {
        registrySettings: {
            auth: {
                publish: { type: 'npm-oidc', provider: 'auto' },
                metadata: 'auto'
            }
        },
        checks: {
            noDuplicatedFiles: {
                enabled: true,
                allowList: [ path.join(projectFolder, 'LICENSE') ]
            },
            noUnusedBundleDependencies: { enabled: true },
            noDevDependencyImports: { enabled: true },
            uniqueTargetPaths: { enabled: true }
        },
        commonPackageSettings: {
            sourcesFolder,
            mainPackageJson: packageJson,
            includeSourceMapFiles: true,
            publishSettings: {
                access: 'public',
                provenance: { type: 'auto' }
            },
            additionalFiles: [
                {
                    sourceFilePath: path.join(projectFolder, 'LICENSE'),
                    targetFilePath: 'LICENSE'
                }
            ],
            additionalPackageJsonAttributes: {
                repository: packageJson.repository,
                license: packageJson.license,
                author: packageJson.author,
                engines: packageJson.engines
            }
        },
        packages: [
            {
                name: '@schema-hub/zod-error-formatter',
                roots: {
                    main: {
                        js: 'zod-error-formatter/formatter.js',
                        declarationFile: 'zod-error-formatter/formatter.d.ts'
                    }
                },
                additionalPackageJsonAttributes: {
                    description: 'Simple and easy-to-understand zod error messages',
                    keywords: [ 'zod', 'zod-error', 'zod-format', 'formatter', 'error-formatter' ]
                },
                additionalFiles: [ {
                    sourceFilePath: path.join(projectFolder, 'source/zod-error-formatter/readme.md'),
                    targetFilePath: 'readme.md'
                } ]
            },
            {
                name: '@schema-hub/zod-graphql-query-builder',
                roots: {
                    main: {
                        js: 'zod-graphql-query-builder/entry-point.js',
                        declarationFile: 'zod-graphql-query-builder/entry-point.d.ts'
                    }
                },
                additionalPackageJsonAttributes: {
                    description: 'Transforms Zod schemas into GraphQL queries',
                    keywords: [ 'zod', 'zod-graphql', 'graphql', 'graphql-query', 'query-builder', 'graphql-builder' ]
                },
                additionalFiles: [ {
                    sourceFilePath: path.join(projectFolder, 'source/zod-graphql-query-builder/readme.md'),
                    targetFilePath: 'readme.md'
                } ]
            },
            {
                name: '@schema-hub/zod-graphql-client',
                roots: {
                    main: {
                        js: 'zod-graphql-client/entry-point.js',
                        declarationFile: 'zod-graphql-client/entry-point.d.ts'
                    }
                },
                additionalPackageJsonAttributes: {
                    description: 'A lightweight and type-safe zod-based GraphQL client',
                    keywords: [ 'zod', 'zod-graphql', 'graphql', 'graphql-query', 'graphql-client', 'graphql-builder' ]
                },
                additionalFiles: [ {
                    sourceFilePath: path.join(projectFolder, 'source/zod-graphql-client/readme.md'),
                    targetFilePath: 'readme.md'
                } ],
                bundleDependencies: [ '@schema-hub/zod-graphql-query-builder', '@schema-hub/zod-error-formatter' ]
            },
            {
                name: '@schema-hub/zod-graphql-fake-client',
                roots: {
                    main: {
                        js: 'zod-graphql-fake-client/fake-client.js',
                        declarationFile: 'zod-graphql-fake-client/fake-client.d.ts'
                    }
                },
                additionalPackageJsonAttributes: {
                    description: 'Fake GraphQL client for testing @schema-hub/zod-graphql-client',
                    keywords: [ 'fake-graphql-client', 'testing-client' ]
                },
                additionalFiles: [ {
                    sourceFilePath: path.join(projectFolder, 'source/zod-graphql-fake-client/readme.md'),
                    targetFilePath: 'readme.md'
                } ],
                bundlePeerDependencies: [ '@schema-hub/zod-graphql-client' ]
            },
            {
                name: '@schema-hub/stryker-zod-mutator',
                roots: {
                    main: {
                        js: 'stryker-zod-mutator/entry-point.js',
                        declarationFile: 'stryker-zod-mutator/entry-point.d.ts'
                    }
                },
                additionalPackageJsonAttributes: {
                    description: 'Zod schema mutators for StrykerJS',
                    keywords: [ 'zod', 'stryker', 'mutation-testing', 'mutator', 'schema-validation' ]
                },
                additionalFiles: [ {
                    sourceFilePath: path.join(projectFolder, 'source/stryker-zod-mutator/readme.md'),
                    targetFilePath: 'readme.md'
                } ]
            }
        ]
    };
}
