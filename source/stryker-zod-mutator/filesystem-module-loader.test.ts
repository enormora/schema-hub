import assert from 'node:assert';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import ts from 'typescript';
import { generate } from '@babel/generator';
import { parse } from '@babel/parser';
import { isNode, VISITOR_KEYS, type Node as BabelNode } from '@babel/types';
import { test } from '@sondr3/minitest';
import { createZodMutators } from './mutations.ts';
import type { MutationPath } from './ast.ts';

function childNodes(node: BabelNode): readonly BabelNode[] {
    return (VISITOR_KEYS[node.type] ?? []).flatMap(function (key) {
        const value = node[key as keyof BabelNode] as unknown;

        if (Array.isArray(value)) {
            return value.filter(isNode);
        }

        return isNode(value) ? [ value ] : [];
    });
}

function eachPath(node: BabelNode, parentPath: MutationPath | null, visit: (path: MutationPath) => void): void {
    const mutationPath = { node, parentPath };
    visit(mutationPath);

    for (const child of childNodes(node)) {
        eachPath(child, mutationPath, visit);
    }
}

function writeModules(files: Readonly<Record<string, string>>): string {
    const directory = join(tmpdir(), `zod-mutator-${process.hrtime.bigint().toString()}`);
    ts.sys.createDirectory(directory);

    for (const [ name, content ] of Object.entries(files)) {
        ts.sys.writeFile(join(directory, name), content);
    }

    return directory;
}

function collectFilesystemReadonlyAdds(
    entrySource: string,
    files: Readonly<Record<string, string>>
): readonly string[] {
    const directory = writeModules(files);
    const entryPath = join(directory, 'entry.ts');
    ts.sys.writeFile(entryPath, entrySource);

    const { program } = parse(entrySource, {
        plugins: [ 'typescript', 'jsx' ],
        sourceType: 'module',
        sourceFilename: entryPath
    });
    const mutator = createZodMutators([ 'ZodReadonlyAdd' ])[0];
    const mutations: string[] = [];

    if (mutator === undefined) {
        assert.fail('Could not find ZodReadonlyAdd');
    }

    eachPath(program, null, function (path) {
        for (const mutation of mutator.mutate(path)) {
            mutations.push(generate(mutation).code);
        }
    });

    return Array.from(new Set(mutations));
}

test('resolves schema bindings across real modules on disk', function () {
    const mutations = collectFilesystemReadonlyAdds(
        "import { z } from 'zod/v4';\nimport { fields } from './fields.ts';\nexport const schema = z.optional(fields);\n",
        { 'fields.ts': "import { z } from 'zod/v4';\nexport const fields = z.object({ id: z.string() });\n" }
    );

    assert.ok(mutations.includes('z.optional(fields).readonly()'));
});

test('resolves schema bindings using a discovered tsconfig on disk', function () {
    const mutations = collectFilesystemReadonlyAdds(
        "import { z } from 'zod/v4';\nimport { fields } from './fields.ts';\nexport const schema = z.optional(fields);\n",
        {
            'tsconfig.json': '{ "compilerOptions": { "module": "node16", "moduleResolution": "node16" } }',
            'fields.ts': "import { z } from 'zod/v4';\nexport const fields = z.object({ id: z.string() });\n"
        }
    );

    assert.ok(mutations.includes('z.optional(fields).readonly()'));
});

test('bails to emitting when a real module cannot be resolved or parsed', function () {
    const unresolved = collectFilesystemReadonlyAdds(
        "import { z } from 'zod/v4';\nimport { fields } from './absent.ts';\nexport const schema = z.optional(fields);\n",
        {}
    );
    const broken = collectFilesystemReadonlyAdds(
        "import { z } from 'zod/v4';\nimport { fields } from './broken.ts';\nexport const schema = z.optional(fields);\n",
        { 'broken.ts': 'this is (not valid typescript' }
    );
    const packaged = collectFilesystemReadonlyAdds(
        "import { z } from 'zod/v4';\nimport { types } from '@babel/types';\nexport const schema = z.optional(types);\n",
        {}
    );

    assert.ok(!unresolved.includes('z.optional(fields).readonly()'));
    assert.ok(!broken.includes('z.optional(fields).readonly()'));
    assert.ok(!packaged.includes('z.optional(types).readonly()'));
});

test('resolves modules even when a discovered tsconfig is unreadable', function () {
    const mutations = collectFilesystemReadonlyAdds(
        "import { z } from 'zod/v4';\nimport { fields } from './fields.ts';\nexport const schema = z.optional(fields);\n",
        {
            'tsconfig.json': 'not valid json {',
            'fields.ts': "import { z } from 'zod/v4';\nexport const fields = z.object({ id: z.string() });\n"
        }
    );

    assert.ok(Array.isArray(mutations));
});
