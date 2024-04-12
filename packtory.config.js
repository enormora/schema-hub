// @ts-check
import fs from 'node:fs/promises';
import path from 'node:path';

const projectFolder = process.cwd();
const sourcesFolder = path.join(projectFolder, 'target/build/source');

const npmToken = process.env.NPM_TOKEN;

/** @returns {Promise<import('@packtory/cli').PacktoryConfig>} */
export async function buildConfig() {
    const packageJsonContent = await fs.readFile('./package.json', { encoding: 'utf8' });
    const packageJson = JSON.parse(packageJsonContent);

    if (npmToken === undefined) {
        throw new Error('Missing NPM_TOKEN environment variable');
    }

    return {
        registrySettings: { token: npmToken },
        commonPackageSettings: {
            sourcesFolder,
            mainPackageJson: packageJson,
            includeSourceMapFiles: true,
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
                entryPoints: [
                    {
                        js: 'zod-error-formatter/formatter.js',
                        declarationFile: 'zod-error-formatter/formatter.d.ts'
                    }
                ],
                additionalPackageJsonAttributes: {
                    description: 'Simple and easy-to-understand zod error messages',
                    keywords: ['zod', 'zod-error', 'zod-format', 'formatter', 'error-formatter']
                },
                additionalFiles: [{
                    sourceFilePath: path.join(projectFolder, 'source/zod-error-formatter/readme.md'),
                    targetFilePath: 'readme.md'
                }]
            },
            {
                name: '@schema-hub/zod-graphql-query-builder',
                entryPoints: [
                    {
                        js: 'zod-graphql-query-builder/entry-point.js',
                        declarationFile: 'zod-graphql-query-builder/entry-point.d.ts'
                    }
                ],
                additionalPackageJsonAttributes: {
                    description: 'Transforms Zod schemas into GraphQL queries',
                    keywords: ['zod', 'zod-graphql', 'graphql', 'graphql-query', 'query-builder', 'graphql-builder']
                },
                additionalFiles: [{
                    sourceFilePath: path.join(projectFolder, 'source/zod-graphql-query-builder/readme.md'),
                    targetFilePath: 'readme.md'
                }]
            },
            {
                name: '@schema-hub/zod-graphql-client',
                entryPoints: [
                    {
                        js: 'zod-graphql-client/entry-point.js',
                        declarationFile: 'zod-graphql-client/entry-point.d.ts'
                    }
                ],
                additionalPackageJsonAttributes: {
                    description: 'A lightweight and type-safe zod-based GraphQL client',
                    keywords: ['zod', 'zod-graphql', 'graphql', 'graphql-query', 'graphql-client', 'graphql-builder']
                },
                additionalFiles: [{
                    sourceFilePath: path.join(projectFolder, 'source/zod-graphql-client/readme.md'),
                    targetFilePath: 'readme.md'
                }],
                bundleDependencies: ['@schema-hub/zod-graphql-query-builder', '@schema-hub/zod-error-formatter']
            }
        ]
    };
}
