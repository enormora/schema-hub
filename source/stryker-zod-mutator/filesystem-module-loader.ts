import { dirname } from 'node:path';
import ts from 'typescript';
import { parse } from '@babel/parser';
import type { Program } from '@babel/types';
import type { ResolvedModule, ResolverEnv } from './binding-resolution.ts';

const babelPlugins: readonly ('jsx' | 'typescript')[] = [ 'typescript', 'jsx' ];

const fallbackCompilerOptions: Readonly<ts.CompilerOptions> = {
    moduleResolution: ts.ModuleResolutionKind.Bundler,
    allowImportingTsExtensions: true,
    allowJs: true
};

const programCache = new Map<string, Program | null>();
const resolutionCache = new Map<string, string | null>();
const compilerOptionsCache = new Map<string, Readonly<ts.CompilerOptions>>();

function parseProgram(source: string, fileName: string): Program | null {
    try {
        return parse(source, { sourceType: 'module', plugins: Array.from(babelPlugins), sourceFilename: fileName })
            .program;
    } catch {
        return null;
    }
}

function readAndParse(absolutePath: string): Program | null {
    const source = ts.sys.readFile(absolutePath);

    return source === undefined ? null : parseProgram(source, absolutePath);
}

function loadProgram(absolutePath: string): Program | null {
    if (!programCache.has(absolutePath)) {
        programCache.set(absolutePath, readAndParse(absolutePath));
    }

    return programCache.get(absolutePath) ?? null;
}

function readCompilerOptions(configPath: string): Readonly<ts.CompilerOptions> {
    if (configPath === '') {
        return fallbackCompilerOptions;
    }

    const configFile = ts.readConfigFile(configPath, ts.sys.readFile);
    const parsed = ts.parseJsonConfigFileContent(configFile.config ?? {}, ts.sys, dirname(configPath));

    return parsed.options;
}

function compilerOptionsFor(fromFileName: string): Readonly<ts.CompilerOptions> {
    const configPath = ts.findConfigFile(dirname(fromFileName), ts.sys.fileExists) ?? '';
    const cached = compilerOptionsCache.get(configPath);

    if (cached !== undefined) {
        return cached;
    }

    const options = readCompilerOptions(configPath);
    compilerOptionsCache.set(configPath, options);

    return options;
}

function isProjectSource(fileName: string): boolean {
    return !fileName.includes('/node_modules/') && !fileName.endsWith('.d.ts');
}

function resolveOnce(specifier: string, fromFileName: string): string | null {
    const result = ts.resolveModuleName(specifier, fromFileName, compilerOptionsFor(fromFileName), ts.sys);
    const resolved = result.resolvedModule?.resolvedFileName;

    return resolved !== undefined && isProjectSource(resolved) ? resolved : null;
}

function resolveModulePath(specifier: string, fromFileName: string): string | null {
    const key = `${fromFileName}\n${specifier}`;

    if (!resolutionCache.has(key)) {
        resolutionCache.set(key, resolveOnce(specifier, fromFileName));
    }

    return resolutionCache.get(key) ?? null;
}

function loadModule(specifier: string, fromFileName: string): ResolvedModule | null {
    const resolved = resolveModulePath(specifier, fromFileName);
    const program = resolved === null ? null : loadProgram(resolved);

    return program === null || resolved === null ? null : { program, fileName: resolved };
}

export const filesystemResolverEnv: ResolverEnv = { loadModule };
