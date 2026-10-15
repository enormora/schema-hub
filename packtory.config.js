// @ts-check
import fs from 'node:fs/promises';
import path from 'node:path';

const projectFolder = process.cwd();
const sourcesFolder = path.join(projectFolder, 'target/build/source');
const sharedQueryTypeFiles = [
    'zod-graphql-query-builder/custom-scalar.d.ts',
    'zod-graphql-query-builder/custom-scalar.d.ts.map',
    'zod-graphql-query-builder/query-schema.d.ts',
    'zod-graphql-query-builder/query-schema.d.ts.map'
]
    .map(function (filePath) {
        return path.join(sourcesFolder, filePath);
    });

/**
 * @returns {Promise<import('@packtory/cli').PacktoryConfiguration>}
 */
export async function buildConfiguration() {
    const packageJsonContent = await fs.readFile('./package.json', { encoding: 'utf8' });
    const packageJson = JSON.parse(packageJsonContent);
    return {
        registrySettings: {
            authentication: {
                publish: { type: 'npm-open-identity-connect', provider: 'automatic' },
                metadata: 'automatic'
            }
        },
        checks: {
            noDuplicatedFiles: {
                enabled: true,
                allowList: [ path.join(projectFolder, 'LICENSE') ]
            },
            noUnusedBundleDependencies: { enabled: true },
            noDevelopmentDependencyImports: { enabled: true },
            uniqueTargetPaths: { enabled: true },
            noUnexposedExecutables: { enabled: true },
            nodeEngineCompatibility: { enabled: true },
            requiredFiles: { enabled: true, files: [ 'LICENSE', 'readme.md' ] },
            typeScriptIntegrity: { enabled: true, declarations: 'all' }
        },
        commonPackageSettings: {
            sourcesFolder,
            mainPackageManifest: packageJson,
            includeSourceMapFiles: true,
            publishSettings: {
                access: 'public',
                provenance: { type: 'automatic' }
            },
            additionalFiles: [
                {
                    inputFilePath: path.join(projectFolder, 'LICENSE'),
                    targetFilePath: 'LICENSE'
                }
            ],
            additionalPackageManifestAttributes: {
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
                        javaScript: 'zod-error-formatter/formatter.js',
                        declarationFile: 'zod-error-formatter/formatter.d.ts'
                    }
                },
                additionalPackageManifestAttributes: {
                    description: 'Simple and easy-to-understand zod error messages',
                    keywords: [ 'zod', 'zod-error', 'zod-format', 'formatter', 'error-formatter' ]
                },
                additionalFiles: [ {
                    inputFilePath: path.join(projectFolder, 'source/zod-error-formatter/readme.md'),
                    targetFilePath: 'readme.md'
                } ]
            },
            {
                name: '@schema-hub/zod-graphql-query-builder',
                roots: {
                    main: {
                        javaScript: 'zod-graphql-query-builder/entry-point.js',
                        declarationFile: 'zod-graphql-query-builder/entry-point.d.ts'
                    }
                },
                additionalPackageManifestAttributes: {
                    description: 'Transforms Zod schemas into GraphQL queries',
                    keywords: [ 'zod', 'zod-graphql', 'graphql', 'graphql-query', 'query-builder', 'graphql-builder' ]
                },
                additionalFiles: [ {
                    inputFilePath: path.join(projectFolder, 'source/zod-graphql-query-builder/readme.md'),
                    targetFilePath: 'readme.md'
                } ],
                checks: { noDuplicatedFiles: { allowList: sharedQueryTypeFiles } }
            },
            {
                name: '@schema-hub/zod-graphql-client',
                roots: {
                    main: {
                        javaScript: 'zod-graphql-client/entry-point.js',
                        declarationFile: 'zod-graphql-client/entry-point.d.ts'
                    }
                },
                additionalPackageManifestAttributes: {
                    description: 'A lightweight and type-safe zod-based GraphQL client',
                    keywords: [ 'zod', 'zod-graphql', 'graphql', 'graphql-query', 'graphql-client', 'graphql-builder' ]
                },
                additionalFiles: [ {
                    inputFilePath: path.join(projectFolder, 'source/zod-graphql-client/readme.md'),
                    targetFilePath: 'readme.md'
                } ],
                bundleDependencies: [ '@schema-hub/zod-graphql-query-builder', '@schema-hub/zod-error-formatter' ]
            },
            {
                name: '@schema-hub/zod-graphql-fake-client',
                roots: {
                    main: {
                        javaScript: 'zod-graphql-fake-client/fake-client.js',
                        declarationFile: 'zod-graphql-fake-client/fake-client.d.ts'
                    }
                },
                additionalPackageManifestAttributes: {
                    description: 'Fake GraphQL client for testing @schema-hub/zod-graphql-client',
                    keywords: [ 'fake-graphql-client', 'testing-client' ]
                },
                additionalFiles: [ {
                    inputFilePath: path.join(projectFolder, 'source/zod-graphql-fake-client/readme.md'),
                    targetFilePath: 'readme.md'
                } ],
                bundlePeerDependencies: [ '@schema-hub/zod-graphql-client' ],
                checks: { noDuplicatedFiles: { allowList: sharedQueryTypeFiles } }
            },
            {
                name: '@schema-hub/stryker-zod-mutator',
                roots: {
                    main: {
                        javaScript: 'stryker-zod-mutator/entry-point.js',
                        declarationFile: 'stryker-zod-mutator/entry-point.d.ts'
                    }
                },
                additionalPackageManifestAttributes: {
                    description: 'Zod schema mutators for StrykerJS',
                    keywords: [ 'zod', 'stryker', 'mutation-testing', 'mutator', 'schema-validation' ],
                    engines: { node: '^24.11.0 || ^26.0.0' }
                },
                additionalFiles: [ {
                    inputFilePath: path.join(projectFolder, 'source/stryker-zod-mutator/readme.md'),
                    targetFilePath: 'readme.md'
                } ]
            }
        ]
    };
}
