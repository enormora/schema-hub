import assert from 'node:assert';
import { generate } from '@babel/generator';
import { parse } from '@babel/parser';
import { test } from '@sondr3/minitest';
import { identifier, isNode, VISITOR_KEYS, type Node as BabelNode } from '@babel/types';
import {
    defaultZodMutatorSettings,
    withDefaultZodMutators,
    withZodMutators,
    type ZodMutatorSettings
} from './entry-point.ts';
import { createZodMutators, createZodMutatorsWithResolver } from './mutations.ts';
import {
    zodMutationCategories,
    zodMutationOperators,
    type ZodMutationOperator
} from './operator.ts';
import { fileNameOf, type MutationPath } from './ast.ts';
import { inertResolverEnv, type ResolvedModule, type ResolverEnv } from './binding-resolution.ts';

type StrykerMutatorRegistry = {
    readonly allMutators: readonly { readonly name: string; }[];
};

type OperatorCase = {
    readonly operator: ZodMutationOperator;
    readonly source: string;
    readonly expected: string;
};

function unique(values: readonly string[]): readonly string[] {
    return Array.from(new Set(values));
}

function childNodes(node: BabelNode): readonly BabelNode[] {
    return (VISITOR_KEYS[node.type] ?? []).flatMap(function (key) {
        const value = node[key as keyof BabelNode] as unknown;

        if (Array.isArray(value)) {
            return value.filter(isNode);
        }

        return isNode(value) ? [ value ] : [];
    });
}

function visitAst(node: BabelNode, parentPath: MutationPath | null, visit: (path: MutationPath) => void): void {
    const mutationPath = { node, parentPath };
    visit(mutationPath);

    for (const child of childNodes(node)) {
        visitAst(child, mutationPath, visit);
    }
}

function collectMutations(source: string, operator: ZodMutationOperator): readonly string[] {
    const ast = parse(source, {
        plugins: [ 'typescript', 'jsx' ],
        sourceType: 'module'
    });
    const mutator = createZodMutators([ operator ])[0];
    const mutations: string[] = [];

    if (mutator === undefined) {
        assert.fail(`Could not find ${operator}`);
    }

    visitAst(ast.program, null, function (path) {
        for (const mutation of mutator.mutate(path)) {
            mutations.push(generate(mutation).code);
        }
    });

    return unique(mutations);
}

function assertIncludesMutation(testCase: OperatorCase): void {
    const mutations = collectMutations(testCase.source, testCase.operator);
    assert.ok(
        mutations.includes(testCase.expected),
        `${testCase.operator} did not include ${testCase.expected}. Found ${JSON.stringify(mutations)}`
    );
}

function parseModule(source: string, fileName: string): ReturnType<typeof parse>['program'] {
    return parse(source, { plugins: [ 'typescript', 'jsx' ], sourceType: 'module', sourceFilename: fileName }).program;
}

function moduleResolverEnv(modules: Readonly<Record<string, string>>): ResolverEnv {
    return {
        loadModule(specifier: string): ResolvedModule | null {
            const source = modules[specifier];

            if (source === undefined) {
                return null;
            }

            const fileName = `/virtual/${specifier}.ts`;

            return { program: parseModule(source, fileName), fileName };
        }
    };
}

function collectResolvedMutations(
    source: string,
    operator: ZodMutationOperator,
    env: ResolverEnv
): readonly string[] {
    const program = parseModule(source, '/virtual/entry.ts');
    const mutator = createZodMutatorsWithResolver([ operator ], env)[0];
    const mutations: string[] = [];

    if (mutator === undefined) {
        assert.fail(`Could not find ${operator}`);
    }

    visitAst(program, null, function (path) {
        for (const mutation of mutator.mutate(path)) {
            mutations.push(generate(mutation).code);
        }
    });

    return unique(mutations);
}

async function readStrykerMutatorNames(): Promise<readonly string[]> {
    const manifestUrl = import.meta.resolve('@stryker-mutator/instrumenter/package.json');
    const registryUrl = new URL('dist/src/mutators/index.js', manifestUrl);
    const registry = await import(registryUrl.href) as StrykerMutatorRegistry;

    return registry.allMutators.map(function (mutator) {
        return mutator.name;
    });
}

test('adds classic optional to visible Zod schemas', function () {
    const mutations = collectMutations(
        "import { z } from 'zod/v4'; const schema = z.string();",
        'ZodOptionalAdd'
    );

    assert.ok(mutations.includes('z.string().optional()'));
});

test('removes classic optional from visible Zod schemas', function () {
    const mutations = collectMutations(
        "import * as z from 'zod'; const schema = z.string().optional();",
        'ZodOptionalRemove'
    );

    assert.ok(mutations.includes('z.string()'));
});

test('adds mini optional as a wrapper', function () {
    const mutations = collectMutations(
        "import { z as schema } from 'zod/v4-mini'; const value = schema.string();",
        'ZodOptionalAdd'
    );

    assert.ok(mutations.includes('schema.optional(schema.string())'));
});

test('does not add optional to schemas that already accept undefined', function () {
    for (const factory of [ 'any', 'unknown', 'undefined', 'void' ]) {
        assert.deepStrictEqual(
            collectMutations(`import { z } from 'zod/v4'; const schema = z.${factory}();`, 'ZodOptionalAdd'),
            []
        );
    }

    assert.ok(
        collectMutations("import { z } from 'zod/v4'; const schema = z.null();", 'ZodOptionalAdd')
            .includes('z.null().optional()')
    );
});

test('does not add nullable to schemas that already accept null', function () {
    for (const factory of [ 'any', 'unknown', 'null' ]) {
        assert.deepStrictEqual(
            collectMutations(`import { z } from 'zod/v4'; const schema = z.${factory}();`, 'ZodNullableAdd'),
            []
        );
    }

    assert.ok(
        collectMutations("import { z } from 'zod/v4'; const schema = z.undefined();", 'ZodNullableAdd')
            .includes('z.undefined().nullable()')
    );
});

test('does not add a no-effect presence wrapper to object fields', function () {
    assert.deepStrictEqual(
        collectMutations(
            "import { z } from 'zod/v4'; const schema = z.object({ a: z.any(), b: z.string() });",
            'ZodObjectFieldOptionalAdd'
        ),
        [ 'z.object({\n  a: z.any(),\n  b: z.string().optional()\n})' ]
    );
    assert.deepStrictEqual(
        collectMutations(
            "import { z } from 'zod/v4'; const schema = z.object({ a: z.null(), b: z.string() });",
            'ZodObjectFieldNullableAdd'
        ),
        [ 'z.object({\n  a: z.null(),\n  b: z.string().nullable()\n})' ]
    );
});

test('adds a presence wrapper only at the schema value chain root', function () {
    assert.deepStrictEqual(
        collectMutations("import { z } from 'zod/v4'; const schema = z.string().min(2);", 'ZodOptionalAdd'),
        [ 'z.string().min(2).optional()' ]
    );
    assert.deepStrictEqual(
        collectMutations("import { z } from 'zod/v4'; const schema = z.array(z.string()).min(1);", 'ZodNullableAdd'),
        [ 'z.array(z.string()).min(1).nullable()', 'z.string().nullable()' ]
    );
});

test('does not add a presence wrapper to a string template literal part', function () {
    assert.deepStrictEqual(
        collectMutations(
            "import * as z from 'zod/mini'; const schema = z.templateLiteral(['f_', z.string()]);",
            'ZodOptionalAdd'
        ),
        []
    );
    assert.deepStrictEqual(
        collectMutations(
            "import * as z from 'zod/mini'; const schema = z.templateLiteral(['f_', z.string()]);",
            'ZodNullableAdd'
        ),
        []
    );
});

test('still wraps a non-string template literal part where it changes behavior', function () {
    assert.ok(
        collectMutations(
            "import * as z from 'zod/mini'; const schema = z.templateLiteral(['p', z.number()]);",
            'ZodOptionalAdd'
        )
            .includes('z.optional(z.number())')
    );
    assert.ok(
        collectMutations(
            "import * as z from 'zod/mini'; const schema = z.templateLiteral(['p', z.number()]);",
            'ZodNullableAdd'
        )
            .includes('z.nullable(z.number())')
    );
});

test('does not add optional over a default-bearing schema', function () {
    for (const factory of [ 'prefault', '_default' ]) {
        assert.deepStrictEqual(
            collectMutations(
                `import * as z from 'zod/mini'; const schema = z.${factory}(z.boolean(), false);`,
                'ZodOptionalAdd'
            ),
            []
        );
    }

    assert.deepStrictEqual(
        collectMutations(
            "import * as z from 'zod/mini'; const schema = z.object({ a: z.prefault(z.boolean(), false) });",
            'ZodObjectFieldOptionalAdd'
        ),
        []
    );
    assert.ok(
        collectMutations("import * as z from 'zod/mini'; const schema = z.catch(z.boolean(), false);", 'ZodOptionalAdd')
            .includes('z.optional(z.catch(z.boolean(), false))')
    );
});

test('does not add a presence wrapper over a wrapped accept-anything schema', function () {
    assert.deepStrictEqual(
        collectMutations("import * as z from 'zod/mini'; const schema = z.optional(z.unknown());", 'ZodNullableAdd'),
        []
    );
    assert.deepStrictEqual(
        collectMutations(
            "import * as z from 'zod/mini'; const schema = z.object({ a: z.optional(z.unknown()) });",
            'ZodObjectFieldNullableAdd'
        ),
        []
    );
    assert.ok(
        collectMutations("import * as z from 'zod/mini'; const schema = z.optional(z.string());", 'ZodNullableAdd')
            .includes('z.nullable(z.optional(z.string()))')
    );
    assert.ok(
        collectMutations("import * as z from 'zod/mini'; const schema = z.optional(inner);", 'ZodNullableAdd')
            .includes('z.nullable(z.optional(inner))')
    );
});

test('does not add a presence wrapper masked by every use of a module const', function () {
    assert.deepStrictEqual(
        collectMutations(
            "import * as z from 'zod/mini'; const t = z.union([z.literal('w'), z.literal('b')]); export const s = z.nullable(t);",
            'ZodNullableAdd'
        ),
        []
    );
    assert.deepStrictEqual(
        collectMutations(
            "import { z } from 'zod/v4'; const t = z.union([z.literal('w'), z.literal('b')]); export const s = t.nullable();",
            'ZodNullableAdd'
        ),
        []
    );
    assert.deepStrictEqual(
        collectMutations(
            "import * as z from 'zod/mini'; const t = z.union([z.string()]); export const s = z.optional(t);",
            'ZodOptionalAdd'
        ),
        []
    );
    assert.deepStrictEqual(
        collectMutations(
            "import * as z from 'zod/mini'; const t = z.union([z.literal('w')]); const other = { t: 1 }; export const s = z.nullable(t);",
            'ZodNullableAdd'
        ),
        []
    );
    assert.deepStrictEqual(
        collectMutations(
            "import * as z from 'zod/mini'; const t = z.union([z.literal('w')]); const holder = {}; export const s = z.nullable(t); export const x = holder.t;",
            'ZodNullableAdd'
        ),
        []
    );
    assert.deepStrictEqual(
        collectMutations(
            "import * as z from 'zod/mini'; const t = z.union([z.literal('w'), z.literal('b')]); type T = z.infer<typeof t>; export const s = z.nullable(t);",
            'ZodNullableAdd'
        ),
        []
    );
});

test('still mutates a const that is not masked by every use', function () {
    const bareUse = collectMutations(
        "import * as z from 'zod/mini'; const t = z.union([z.literal('w'), z.literal('b')]); export const s = z.object({ c: z.nullable(t), d: t });",
        'ZodNullableAdd'
    );
    const shadowed = collectMutations(
        "import * as z from 'zod/mini'; const t = z.union([z.literal('w')]); function read(t) { return t; } export const s = z.nullable(t);",
        'ZodNullableAdd'
    );
    const noReference = collectMutations(
        "import * as z from 'zod/mini'; export const t = z.union([z.literal('w'), z.literal('b')]);",
        'ZodNullableAdd'
    );
    const nestedField = collectMutations(
        "import * as z from 'zod/mini'; const t = z.object({ a: z.literal('w') }); export const s = z.nullable(t);",
        'ZodNullableAdd'
    );
    const arrayUse = collectMutations(
        "import * as z from 'zod/mini'; const t = z.literal('w'); export const s = z.array(t);",
        'ZodNullableAdd'
    );
    const spreadOptions = collectMutations(
        "import * as z from 'zod/mini'; const options = [ z.literal('w') ]; export const s = z.nullable(z.union(options));",
        'ZodNullableAdd'
    );
    const memberUse = collectMutations(
        "import * as z from 'zod/mini'; const t = z.union([z.literal('w')]); export const shape = t.def; export const s = z.nullable(t);",
        'ZodNullableAdd'
    );
    const mutableBinding = collectMutations(
        "import * as z from 'zod/mini'; let t = z.union([z.literal('w')]); export const s = z.nullable(t);",
        'ZodNullableAdd'
    );
    const tupleElement = collectMutations(
        "import * as z from 'zod/mini'; const t = z.tuple([z.literal('w')]); export const s = z.nullable(t);",
        'ZodNullableAdd'
    );
    const recordValue = collectMutations(
        "import * as z from 'zod/mini'; const t = z.union([z.literal('w')]); export const s = z.record(z.string(), t);",
        'ZodNullableAdd'
    );
    const destructuredBinding = collectMutations(
        "import * as z from 'zod/mini'; const [ t ] = z.union([z.literal('w')]); export const s = z.nullable(t);",
        'ZodNullableAdd'
    );
    const nonZodCallUse = collectMutations(
        "import * as z from 'zod/mini'; const t = z.union([z.literal('w')]); export const s = wrapSchema(t);",
        'ZodNullableAdd'
    );
    const exportedConst = collectMutations(
        "import * as z from 'zod/mini'; export const t = z.union([z.literal('w')]); export const s = z.nullable(t);",
        'ZodNullableAdd'
    );
    const spreadWrapperArgument = collectMutations(
        "import * as z from 'zod/mini'; const extra = [ z.literal('x') ]; const t = z.union([z.literal('w')]); export const s = z.nullable(...extra, t);",
        'ZodNullableAdd'
    );

    assert.ok(spreadWrapperArgument.includes("z.nullable(z.union([z.literal('w')]))"));
    assert.ok(exportedConst.includes("z.nullable(z.union([z.literal('w')]))"));
    assert.ok(nonZodCallUse.includes("z.nullable(z.union([z.literal('w')]))"));
    assert.ok(destructuredBinding.includes("z.nullable(z.union([z.literal('w')]))"));
    assert.ok(tupleElement.includes("z.nullable(z.literal('w'))"));
    assert.ok(recordValue.includes("z.nullable(z.union([z.literal('w')]))"));
    assert.ok(mutableBinding.includes("z.nullable(z.union([z.literal('w')]))"));
    assert.ok(memberUse.includes("z.nullable(z.union([z.literal('w')]))"));
    assert.ok(bareUse.includes("z.nullable(z.union([z.literal('w'), z.literal('b')]))"));
    assert.ok(shadowed.includes("z.nullable(z.union([z.literal('w')]))"));
    assert.ok(noReference.includes("z.nullable(z.union([z.literal('w'), z.literal('b')]))"));
    assert.ok(nestedField.includes("z.nullable(z.literal('w'))"));
    assert.ok(arrayUse.includes("z.nullable(z.literal('w'))"));
    assert.ok(spreadOptions.includes("z.nullable(z.literal('w'))"));
});

test('does not re-wrap an already-optional or already-nullable object field', function () {
    assert.deepStrictEqual(
        collectMutations(
            "import { z } from 'zod/v4'; const schema = z.object({ a: z.string().optional(), b: z.number() });",
            'ZodObjectFieldOptionalAdd'
        ),
        [ 'z.object({\n  a: z.string().optional(),\n  b: z.number().optional()\n})' ]
    );
    assert.deepStrictEqual(
        collectMutations(
            "import { z } from 'zod/v4'; const schema = z.object({ a: z.string().nullable(), b: z.number() });",
            'ZodObjectFieldNullableAdd'
        ),
        [ 'z.object({\n  a: z.string().nullable(),\n  b: z.number().nullable()\n})' ]
    );
});

test('does not add a presence wrapper when nullish already admits the value', function () {
    assert.deepStrictEqual(
        collectMutations("import { z } from 'zod/v4'; const schema = z.string().nullish();", 'ZodOptionalAdd'),
        []
    );
    assert.deepStrictEqual(
        collectMutations("import { z } from 'zod/v4'; const schema = z.string().nullish();", 'ZodNullableAdd'),
        []
    );
});

test('does not swap record factories for infinite string keys', function () {
    assert.deepStrictEqual(
        collectMutations(
            "import { z } from 'zod/v4'; const schema = z.record(z.string(), z.number());",
            'ZodRecordFactorySwap'
        ),
        []
    );
    assert.ok(
        collectMutations(
            "import { z } from 'zod/v4'; const schema = z.record(z.enum(['a']), z.number());",
            'ZodRecordFactorySwap'
        )
            .includes("z.partialRecord(z.enum(['a']), z.number())")
    );
});

test('does not swap a string record key to an accepts-anything schema', function () {
    const keyMutations = collectMutations(
        "import { z } from 'zod/v4'; const schema = z.record(z.string(), z.literal(1));",
        'ZodPrimitiveFactorySwap'
    );

    assert.ok(!keyMutations.includes('z.any()'));
    assert.ok(!keyMutations.includes('z.unknown()'));
    assert.ok(keyMutations.includes('z.number()'));
});

test('does not remove a presence wrapper when the inner schema already admits the value', function () {
    assert.deepStrictEqual(
        collectMutations("import { z } from 'zod/v4'; const schema = z.unknown().optional();", 'ZodOptionalRemove'),
        []
    );
    assert.deepStrictEqual(
        collectMutations("import { z } from 'zod/v4'; const schema = z.unknown().nullable();", 'ZodNullableRemove'),
        []
    );
    assert.ok(
        collectMutations("import { z } from 'zod/v4'; const schema = z.string().optional();", 'ZodOptionalRemove')
            .includes('z.string()')
    );
});

test('removes object fields and wraps object fields', function () {
    const source = "import { z } from 'zod/v4'; const schema = z.object({ a: z.string(), b: z.number() });";

    assert.ok(collectMutations(source, 'ZodObjectFieldRemove').includes('z.object({\n  b: z.number()\n})'));
    assert.ok(
        collectMutations(source, 'ZodObjectFieldOptionalAdd').includes(
            'z.object({\n  a: z.string().optional(),\n  b: z.number()\n})'
        )
    );
});

test('removes and changes string checks', function () {
    const source = "import { z } from 'zod/v4'; const schema = z.string().min(2);";

    assert.ok(collectMutations(source, 'ZodStringCheckRemove').includes('z.string()'));
    assert.ok(collectMutations(source, 'ZodStringBoundaryChange').includes('z.string().min(1)'));
    assert.ok(collectMutations(source, 'ZodStringBoundaryChange').includes('z.string().min(3)'));
});

test('changes boundaries and literals to negative values without aborting', function () {
    assert.ok(
        collectMutations(
            "import { z } from 'zod'; const schema = z.number().check(z.gt(0));",
            'ZodNumberBoundaryChange'
        )
            .includes('z.number().check(z.gt(-1))')
    );
    assert.ok(
        collectMutations("import { z } from 'zod/v4'; const schema = z.number().min(0);", 'ZodNumberBoundaryChange')
            .includes('z.number().min(-1)')
    );
    assert.ok(
        collectMutations("import { z } from 'zod/v4'; const schema = z.literal(0);", 'ZodNumericLiteralChange')
            .includes('z.literal(-1)')
    );
});

test('removes mini checks inside check calls', function () {
    const mutations = collectMutations(
        "import { z } from 'zod/mini'; const schema = z.string().check(z.minLength(2));",
        'ZodStringCheckRemove'
    );

    assert.ok(mutations.includes('z.string().check()'));
});

test('does not remove readonly when the frozen value is a primitive', function () {
    assert.deepStrictEqual(
        collectMutations("import { z } from 'zod/v4'; const schema = z.string().readonly();", 'ZodReadonlyRemove'),
        []
    );
    assert.ok(
        collectMutations("import { z } from 'zod/v4'; const schema = z.object({}).readonly();", 'ZodReadonlyRemove')
            .includes('z.object({})')
    );
});

test('does not mutate a vacuous length lower bound', function () {
    assert.deepStrictEqual(
        collectMutations("import { z } from 'zod/v4'; const schema = z.string().min(0);", 'ZodStringCheckRemove'),
        []
    );
    assert.deepStrictEqual(
        collectMutations("import { z } from 'zod/v4'; const schema = z.string().min(0);", 'ZodStringBoundaryChange'),
        [ 'z.string().min(1)' ]
    );
    assert.deepStrictEqual(
        collectMutations(
            "import { z } from 'zod/mini'; const schema = z.array(z.string()).check(z.minSize(0));",
            'ZodCollectionBoundaryChange'
        ),
        [ 'z.array(z.string()).check(z.minSize(1))' ]
    );
    assert.ok(
        collectMutations("import { z } from 'zod/v4'; const schema = z.string().min(2);", 'ZodStringCheckRemove')
            .includes('z.string()')
    );
    assert.ok(
        collectMutations("import { z } from 'zod/v4'; const schema = z.number().min(0);", 'ZodNumberCheckRemove')
            .includes('z.number()')
    );
});

test('mutates tuple rest schemas', function () {
    const source = "import { z } from 'zod/v4'; const schema = z.tuple([z.string()], z.number());";

    assert.ok(collectMutations(source, 'ZodTupleRestRemove').includes('z.tuple([z.string()])'));
    assert.ok(
        collectMutations("import { z } from 'zod/v4'; const schema = z.tuple([z.string()]);", 'ZodTupleRestAdd')
            .includes('z.tuple([z.string()], z.string())')
    );
});

test('removes classic tuple rest method calls', function () {
    const mutations = collectMutations(
        "import { z } from 'zod/v4'; const schema = z.tuple([z.string()]).rest(z.number());",
        'ZodTupleRestRemove'
    );

    assert.ok(mutations.includes('z.tuple([z.string()])'));
});

test('mutates readonly because it freezes parsed values at runtime', function () {
    const source = "import { z } from 'zod/v4'; const schema = z.object({ a: z.string() }).readonly();";

    assert.ok(collectMutations(source, 'ZodReadonlyRemove').includes('z.object({\n  a: z.string()\n})'));
    assert.ok(
        collectMutations("import { z } from 'zod/mini'; const schema = z.object({ a: z.string() });", 'ZodReadonlyAdd')
            .includes('z.readonly(z.object({\n  a: z.string()\n}))')
    );
});

test('adds readonly to collection schemas whose frozen output is observable', function () {
    assert.ok(
        collectMutations("import { z } from 'zod/v4'; const schema = z.array(z.string());", 'ZodReadonlyAdd')
            .includes('z.array(z.string()).readonly()')
    );
    assert.ok(
        collectMutations("import { z } from 'zod/v4'; const schema = z.tuple([z.string()]);", 'ZodReadonlyAdd')
            .includes('z.tuple([z.string()]).readonly()')
    );
    assert.ok(
        collectMutations(
            "import { z } from 'zod/v4'; const schema = z.record(z.string(), z.number());",
            'ZodReadonlyAdd'
        )
            .includes('z.record(z.string(), z.number()).readonly()')
    );
    assert.ok(
        collectMutations("import { z } from 'zod/v4'; const schema = z.array(z.string()).min(1);", 'ZodReadonlyAdd')
            .includes('z.array(z.string()).min(1).readonly()')
    );
});

test('adds readonly through wrappers around a collection schema', function () {
    assert.ok(
        collectMutations(
            "import { z } from 'zod/v4'; const schema = z.object({ a: z.string() }).optional();",
            'ZodReadonlyAdd'
        )
            .includes('z.object({\n  a: z.string()\n}).optional().readonly()')
    );
    assert.ok(
        collectMutations(
            "import * as z from 'zod/mini'; const schema = z.optional(z.object({ a: z.string() }));",
            'ZodReadonlyAdd'
        )
            .includes('z.readonly(z.optional(z.object({\n  a: z.string()\n})))')
    );
});

test('does not add readonly where freezing has no observable effect', function () {
    const nonFreezableSources = [
        "import { z } from 'zod/v4'; const schema = z.string();",
        "import { z } from 'zod/v4'; const schema = z.number().check(z.gt(0));",
        "import { z } from 'zod/v4'; const schema = z.enum(['a', 'b']);",
        "import { z } from 'zod/v4'; const schema = z.literal('a');",
        "import { z } from 'zod/v4'; const schema = z.string().optional();",
        "import { string } from 'zod/mini'; const schema = string();"
    ];

    for (const source of nonFreezableSources) {
        assert.deepStrictEqual(collectMutations(source, 'ZodReadonlyAdd'), []);
    }
});

test('does not add readonly to schemas that are already readonly', function () {
    const alreadyReadonlySources = [
        "import { z } from 'zod/v4'; const schema = z.object({ a: z.string() }).readonly();",
        "import * as z from 'zod/mini'; const schema = z.readonly(z.object({ a: z.string() }));",
        "import { z } from 'zod/v4'; const schema = z.array(z.string()).readonly();",
        "import { z } from 'zod/v4'; const schema = z.object({ a: z.string() }).readonly().optional();",
        "import { z } from 'zod/v4'; const schema = z.array(z.string()).min(1).readonly();"
    ];

    for (const source of alreadyReadonlySources) {
        assert.deepStrictEqual(collectMutations(source, 'ZodReadonlyAdd'), []);
    }
});

test('adds readonly once per schema value and leaves an already readonly field untouched', function () {
    assert.deepStrictEqual(
        collectMutations(
            "import { z } from 'zod/v4'; const schema = z.object({ a: z.string() }).optional();",
            'ZodReadonlyAdd'
        ),
        [ 'z.object({\n  a: z.string()\n}).optional().readonly()' ]
    );
    assert.deepStrictEqual(
        collectMutations(
            "import { z } from 'zod/v4'; const schema = z.object({ a: z.array(z.string()).readonly() });",
            'ZodReadonlyAdd'
        ),
        [ 'z.object({\n  a: z.array(z.string()).readonly()\n}).readonly()' ]
    );
});

test('replaces coercion with strict schemas', function () {
    const mutations = collectMutations(
        "import { z } from 'zod/v4'; const schema = z.coerce.number();",
        'ZodCoercionRemove'
    );

    assert.ok(mutations.includes('z.number()'));
});

test('supports direct and default Zod imports', function () {
    const directMutations = collectMutations(
        "import { string as text, optional as maybe } from 'zod/mini'; const schema = text();",
        'ZodOptionalAdd'
    );
    const defaultMutations = collectMutations(
        "import zod from 'zod/v4'; const schema = zod.string().optional();",
        'ZodOptionalRemove'
    );
    const stringLiteralImportMutations = collectMutations(
        "import { 'string' as text, optional } from 'zod/mini'; const schema = text();",
        'ZodOptionalAdd'
    );

    assert.ok(directMutations.includes('maybe(text())'));
    assert.ok(defaultMutations.includes('zod.string()'));
    assert.ok(stringLiteralImportMutations.includes('optional(text())'));
});

test('does not mutate boolean or string literal values', function () {
    const booleanMutations = collectMutations(
        "import { z } from 'zod/v4'; const schema = z.literal(true);",
        'ZodNumericLiteralChange'
    );
    const stringMutations = collectMutations(
        "import { z } from 'zod/v4'; const schema = z.literal('value');",
        'ZodNumericLiteralChange'
    );

    assert.deepStrictEqual(booleanMutations, []);
    assert.deepStrictEqual(stringMutations, []);
});

test('swaps primitive Zod factories', function () {
    const mutations = collectMutations(
        "import { z } from 'zod/v4'; const schema = z.string();",
        'ZodPrimitiveFactorySwap'
    );

    assert.ok(mutations.includes('z.number()'));
    assert.ok(mutations.includes('z.null()'));
    assert.ok(mutations.includes('z.undefined()'));
    assert.ok(mutations.includes('z.bigint()'));
    assert.ok(mutations.includes('z.unknown()'));
});

test('swaps direct mini primitive factories through available imports', function () {
    const mutations = collectMutations(
        "import { string as text, number, null as nil } from 'zod/mini'; const schema = text();",
        'ZodPrimitiveFactorySwap'
    );

    assert.deepStrictEqual(mutations, [ 'number()', 'nil()' ]);
});

test('does not swap primitives to a runtime-equivalent factory', function () {
    const fromAny = collectMutations("import { z } from 'zod/v4'; const schema = z.any();", 'ZodPrimitiveFactorySwap');
    const fromVoid = collectMutations(
        "import { z } from 'zod/v4'; const schema = z.void();",
        'ZodPrimitiveFactorySwap'
    );

    assert.ok(!fromAny.includes('z.unknown()'));
    assert.ok(fromAny.includes('z.string()'));
    assert.ok(
        !collectMutations("import { z } from 'zod/v4'; const schema = z.unknown();", 'ZodPrimitiveFactorySwap')
            .includes('z.any()')
    );
    assert.ok(!fromVoid.includes('z.undefined()'));
    assert.ok(fromVoid.includes('z.any()'));
    assert.ok(
        !collectMutations("import { z } from 'zod/v4'; const schema = z.undefined();", 'ZodPrimitiveFactorySwap')
            .includes('z.void()')
    );
});

test('adds only behavior-changing object policies', function () {
    assert.deepStrictEqual(
        collectMutations("import { z } from 'zod/v4'; const schema = z.object({});", 'ZodObjectPolicyAdd'),
        [ 'z.object({}).strict()', 'z.object({}).passthrough()' ]
    );
    assert.deepStrictEqual(
        collectMutations("import { z } from 'zod/v4'; const schema = z.strictObject({});", 'ZodObjectPolicyAdd'),
        [ 'z.strictObject({}).passthrough()', 'z.strictObject({}).strip()' ]
    );
    assert.deepStrictEqual(
        collectMutations("import { z } from 'zod/v4'; const schema = z.looseObject({});", 'ZodObjectPolicyAdd'),
        [ 'z.looseObject({}).strict()', 'z.looseObject({}).strip()' ]
    );
});

test('does not add object policies to non-object schemas', function () {
    assert.deepStrictEqual(
        collectMutations("import { z } from 'zod/v4'; const schema = z.number();", 'ZodObjectPolicyAdd'),
        []
    );
    assert.deepStrictEqual(
        collectMutations("import { z } from 'zod/v4'; const schema = z.string().min(2);", 'ZodObjectPolicyAdd'),
        []
    );
});

test('covers phase one presence and object operators', function () {
    const cases: readonly OperatorCase[] = [
        {
            operator: 'ZodPrimitiveFactorySwap',
            source: "import { z } from 'zod/v4'; const schema = z.string();",
            expected: 'z.number()'
        },
        {
            operator: 'ZodNullableAdd',
            source: "import { z } from 'zod/v4'; const schema = z.string();",
            expected: 'z.string().nullable()'
        },
        {
            operator: 'ZodNullableRemove',
            source: "import { z } from 'zod/v4'; const schema = z.string().nullable();",
            expected: 'z.string()'
        },
        {
            operator: 'ZodNullishRemove',
            source: "import { z } from 'zod/v4'; const schema = z.string().nullish();",
            expected: 'z.string()'
        },
        {
            operator: 'ZodNullishToNullable',
            source: "import { z } from 'zod/v4'; const schema = z.string().nullish();",
            expected: 'z.string().nullable()'
        },
        {
            operator: 'ZodNullishToOptional',
            source: "import { z } from 'zod/mini'; const schema = z.nullish(z.string());",
            expected: 'z.optional(z.string())'
        },
        {
            operator: 'ZodNonoptionalRemove',
            source: "import { z } from 'zod/mini'; const schema = z.nonoptional(z.string());",
            expected: 'z.string()'
        },
        {
            operator: 'ZodObjectPolicyAdd',
            source: "import { z } from 'zod/v4'; const schema = z.object({ a: z.string() });",
            expected: 'z.object({\n  a: z.string()\n}).strict()'
        },
        {
            operator: 'ZodObjectPolicyRemove',
            source: "import { z } from 'zod/v4'; const schema = z.object({}).passthrough();",
            expected: 'z.object({})'
        },
        {
            operator: 'ZodObjectFactorySwap',
            source: "import { z } from 'zod/v4'; const schema = z.object({});",
            expected: 'z.strictObject({})'
        },
        {
            operator: 'ZodObjectFactorySwap',
            source: "import { z } from 'zod/mini'; const schema = z.strictObject({});",
            expected: 'z.object({})'
        },
        {
            operator: 'ZodObjectCatchallRemove',
            source: "import { z } from 'zod/v4'; const schema = z.object({}).catchall(z.string());",
            expected: 'z.object({})'
        },
        {
            operator: 'ZodObjectFieldNullableAdd',
            source: "import { z } from 'zod/v4-mini'; const schema = z.object({ a: z.string() });",
            expected: 'z.object({\n  a: z.nullable(z.string())\n})'
        }
    ];

    cases.forEach(assertIncludesMutation);
});

test('covers phase one check, collection, union, fallback, and coercion operators', function () {
    const cases: readonly OperatorCase[] = [
        {
            operator: 'ZodStringFormatToString',
            source: "import { z } from 'zod/v4'; const schema = z.email();",
            expected: 'z.string()'
        },
        {
            operator: 'ZodNumberCheckRemove',
            source: "import { z } from 'zod/v4'; const schema = z.number().int();",
            expected: 'z.number()'
        },
        {
            operator: 'ZodNumberBoundaryChange',
            source: "import { z } from 'zod/v4'; const schema = z.number().gt(5);",
            expected: 'z.number().gt(4)'
        },
        {
            operator: 'ZodNumberStrictnessSwap',
            source: "import { z } from 'zod/v4'; const schema = z.number().gt(5);",
            expected: 'z.number().gte(5)'
        },
        {
            operator: 'ZodCollectionCheckRemove',
            source: "import { z } from 'zod/v4'; const schema = z.array(z.string()).nonempty();",
            expected: 'z.array(z.string())'
        },
        {
            operator: 'ZodCollectionBoundaryChange',
            source: "import { z } from 'zod/mini'; const schema = z.array(z.string()).check(z.minSize(2));",
            expected: 'z.array(z.string()).check(z.minSize(1))'
        },
        {
            operator: 'ZodArrayToTuple',
            source: "import { z } from 'zod/v4'; const schema = z.array(z.string());",
            expected: 'z.tuple([z.string()])'
        },
        {
            operator: 'ZodTupleToArray',
            source: "import { z } from 'zod/v4'; const schema = z.tuple([z.string()]);",
            expected: 'z.array(z.string())'
        },
        {
            operator: 'ZodTupleItemRemove',
            source: "import { z } from 'zod/v4'; const schema = z.tuple([z.string(), z.number()]);",
            expected: 'z.tuple([z.number()])'
        },
        {
            operator: 'ZodRecordFactorySwap',
            source: "import { z } from 'zod/v4'; const schema = z.record(z.enum(['a', 'b']), z.string());",
            expected: "z.partialRecord(z.enum(['a', 'b']), z.string())"
        },
        {
            operator: 'ZodUnionOptionRemove',
            source: "import { z } from 'zod/v4'; const schema = z.union([z.string(), z.number()]);",
            expected: 'z.union([z.number()])'
        },
        {
            operator: 'ZodUnionOptionRemove',
            source:
                "import { z } from 'zod/v4'; const schema = z.discriminatedUnion('type', [z.object({}), z.object({ a: z.string() })]);",
            expected: "z.discriminatedUnion('type', [z.object({\n  a: z.string()\n})])"
        },
        {
            operator: 'ZodEnumValueRemove',
            source: "import { z } from 'zod/v4'; const schema = z.enum(['a', 'b']);",
            expected: "z.enum(['b'])"
        },
        {
            operator: 'ZodNumericLiteralChange',
            source: "import { z } from 'zod/v4'; const schema = z.literal(2);",
            expected: 'z.literal(1)'
        },
        {
            operator: 'ZodFallbackRemove',
            source: "import { z } from 'zod/v4'; const schema = z.string().default('x');",
            expected: 'z.string()'
        },
        {
            operator: 'ZodFallbackRemove',
            source: "import { z } from 'zod/mini'; const schema = z.catch(z.string(), 'x');",
            expected: 'z.string()'
        },
        {
            operator: 'ZodCustomBehaviorRemove',
            source: "import { z } from 'zod/v4'; const schema = z.string().transform(String);",
            expected: 'z.string()'
        },
        {
            operator: 'ZodCustomBehaviorRemove',
            source: "import { z } from 'zod/mini'; const schema = z.string().check(z.custom(() => true));",
            expected: 'z.string().check()'
        }
    ];

    cases.forEach(assertIncludesMutation);
});

test('ignores non-schema and incomplete Zod-looking nodes', function () {
    const cases: readonly { readonly operator: ZodMutationOperator; readonly source: string; }[] = [
        {
            operator: 'ZodOptionalAdd',
            source: "import { z } from 'not-zod'; const schema = z.string();"
        },
        {
            operator: 'ZodOptionalAdd',
            source: 'const schema = string();'
        },
        {
            operator: 'ZodOptionalAdd',
            source: "import { string } from 'zod/mini'; const schema = string();"
        },
        {
            operator: 'ZodOptionalAdd',
            source: "import { z } from 'zod/v4'; const schema = z.optional();"
        },
        {
            operator: 'ZodNullishToOptional',
            source: "import { nullish, string } from 'zod/mini'; const schema = nullish(string());"
        },
        {
            operator: 'ZodNullishToOptional',
            source: "import { z } from 'zod/mini'; const schema = z.nullish();"
        },
        {
            operator: 'ZodOptionalRemove',
            source: "import { optional } from 'zod/mini'; const schema = optional(value);"
        },
        {
            operator: 'ZodOptionalAdd',
            source: "import { z } from 'zod/v4'; const schema = z['string']();"
        },
        {
            operator: 'ZodObjectFactorySwap',
            source: "import { z } from 'zod/v4'; const schema = z.string();"
        },
        {
            operator: 'ZodObjectFactorySwap',
            source: "import { object } from 'zod/mini'; const schema = object({});"
        },
        {
            operator: 'ZodPrimitiveFactorySwap',
            source: "import { string } from 'zod/mini'; const schema = string();"
        },
        {
            operator: 'ZodPrimitiveFactorySwap',
            source: "import { z } from 'zod/v4'; const schema = z.string({ error: 'x' });"
        },
        {
            operator: 'ZodPrimitiveFactorySwap',
            source: "import { z } from 'zod/v4'; const schema = z.coerce.number();"
        },
        {
            operator: 'ZodObjectFieldRemove',
            source: "import { z } from 'zod/v4'; const schema = z.string();"
        },
        {
            operator: 'ZodObjectFieldRemove',
            source: "import { z } from 'zod/v4'; const schema = z.object(shape);"
        },
        {
            operator: 'ZodObjectFieldRemove',
            source: "import { z } from 'zod/v4'; const schema = z.object({ ...shape });"
        },
        {
            operator: 'ZodObjectFieldOptionalAdd',
            source: "import { z } from 'zod/v4'; const schema = z.object({ a: value });"
        },
        {
            operator: 'ZodObjectFieldOptionalAdd',
            source: "import { object, string } from 'zod/mini'; const schema = object({ a: string() });"
        },
        {
            operator: 'ZodStringCheckRemove',
            source: "import { z } from 'zod/v4'; const schema = z.string().check(other.minLength(2));"
        },
        {
            operator: 'ZodNumberBoundaryChange',
            source: "import { z } from 'zod/mini'; const schema = z.number().check(other.minimum(5));"
        },
        {
            operator: 'ZodStringBoundaryChange',
            source: "import { z } from 'zod/v4'; const schema = z.string().min();"
        },
        {
            operator: 'ZodStringBoundaryChange',
            source: "import { z } from 'zod/v4'; const schema = z.string().regex(/x/);"
        },
        {
            operator: 'ZodNumberStrictnessSwap',
            source: "import { z } from 'zod/v4'; const schema = z.number().multipleOf(2);"
        },
        {
            operator: 'ZodStringFormatToString',
            source: "import { z } from 'zod/v4'; const schema = z.string();"
        },
        {
            operator: 'ZodStringFormatToString',
            source: "import { email } from 'zod/mini'; const schema = email();"
        },
        {
            operator: 'ZodArrayToTuple',
            source: "import { array, string } from 'zod/mini'; const schema = array(string());"
        },
        {
            operator: 'ZodArrayToTuple',
            source: "import { z } from 'zod/v4'; const schema = z.array();"
        },
        {
            operator: 'ZodTupleToArray',
            source: "import { z } from 'zod/v4'; const schema = z.tuple([z.string(), z.number()]);"
        },
        {
            operator: 'ZodTupleRestAdd',
            source: "import { z } from 'zod/v4'; const schema = z.tuple([]);"
        },
        {
            operator: 'ZodTupleItemRemove',
            source: "import { z } from 'zod/v4'; const schema = z.tuple(items);"
        },
        {
            operator: 'ZodTupleRestRemove',
            source: "import { z } from 'zod/v4'; const schema = z.tuple();"
        },
        {
            operator: 'ZodUnionOptionRemove',
            source: "import { z } from 'zod/v4'; const schema = z.union(options);"
        },
        {
            operator: 'ZodEnumValueRemove',
            source: "import { z } from 'zod/v4'; const schema = z.enum(values);"
        },
        {
            operator: 'ZodRecordFactorySwap',
            source: "import { record, string } from 'zod/mini'; const schema = record(string(), string());"
        },
        {
            operator: 'ZodCoercionRemove',
            source: "import { z } from 'zod/v4'; const schema = z.coerce['number']();"
        },
        {
            operator: 'ZodCustomBehaviorRemove',
            source: "import { z } from 'zod/mini'; const schema = z.string().check(other.custom(() => true));"
        },
        {
            operator: 'ZodStringCheckRemove',
            source: "import { z } from 'zod/mini'; const schema = z.string().check(customCheck);"
        },
        {
            operator: 'ZodStringBoundaryChange',
            source: "import { z } from 'zod/mini'; const schema = z.string().check(customCheck);"
        },
        {
            operator: 'ZodStringCheckRemove',
            source: "import { string } from 'zod/mini'; const schema = string();"
        },
        {
            operator: 'ZodStringBoundaryChange',
            source: "import { string } from 'zod/mini'; const schema = string();"
        }
    ];

    for (const testCase of cases) {
        assert.deepStrictEqual(collectMutations(testCase.source, testCase.operator), []);
    }
});

test('keeps valid mutations around sparse collection inputs', function () {
    assert.ok(
        collectMutations("import { z } from 'zod/v4'; const schema = z.tuple([, z.string()]);", 'ZodTupleItemRemove')
            .includes('z.tuple([,])')
    );
    assert.ok(
        collectMutations("import { z } from 'zod/v4'; const schema = z.union([, z.string()]);", 'ZodUnionOptionRemove')
            .includes('z.union([,])')
    );
});

test('covers alias forms across phase one operators', function () {
    const cases: readonly OperatorCase[] = [
        {
            operator: 'ZodOptionalAdd',
            source: "import { z } from 'zod/v4'; const schema = z.coerce.number();",
            expected: 'z.coerce.number().optional()'
        },
        {
            operator: 'ZodOptionalRemove',
            source: "import { optional as maybe, string as text } from 'zod/mini'; const schema = maybe(text());",
            expected: 'text()'
        },
        {
            operator: 'ZodNullableAdd',
            source: "import { string as text, nullable as maybeNull } from 'zod/mini'; const schema = text();",
            expected: 'maybeNull(text())'
        },
        {
            operator: 'ZodNullishToNullable',
            source: "import zod from 'zod/v4'; const schema = zod.string().nullish();",
            expected: 'zod.string().nullable()'
        },
        {
            operator: 'ZodNonoptionalRemove',
            source: "import zod from 'zod/v4'; const schema = zod.string().nonoptional();",
            expected: 'zod.string()'
        },
        {
            operator: 'ZodReadonlyAdd',
            source: "import zod from 'zod/v4'; const schema = zod.object({});",
            expected: 'zod.object({}).readonly()'
        },
        {
            operator: 'ZodObjectFactorySwap',
            source:
                "import { looseObject as objectShape, strictObject } from 'zod/mini'; const schema = objectShape({});",
            expected: 'strictObject({})'
        },
        {
            operator: 'ZodStringFormatToString',
            source: "import { email, string } from 'zod/mini'; const schema = email();",
            expected: 'string()'
        },
        {
            operator: 'ZodNumberBoundaryChange',
            source: "import { z } from 'zod/mini'; const schema = z.number().check(z.minimum(5));",
            expected: 'z.number().check(z.minimum(4))'
        },
        {
            operator: 'ZodCollectionCheckRemove',
            source: "import { z } from 'zod/mini'; const schema = z.array(z.string()).check(z.minLength(1));",
            expected: 'z.array(z.string()).check()'
        },
        {
            operator: 'ZodRecordFactorySwap',
            source:
                "import { partialRecord as entries, record } from 'zod/mini'; const schema = entries(record, record);",
            expected: 'record(record, record)'
        },
        {
            operator: 'ZodFallbackRemove',
            source:
                "import { _default as withDefault, string } from 'zod/mini'; const schema = withDefault(string(), 'x');",
            expected: 'string()'
        },
        {
            operator: 'ZodCustomBehaviorRemove',
            source: "import zod from 'zod/v4'; const schema = zod.string().refine(Boolean);",
            expected: 'zod.string()'
        }
    ];

    cases.forEach(assertIncludesMutation);
});

test('returns no mutations for paths without a program', function () {
    const mutator = createZodMutators([ 'ZodOptionalAdd' ])[0];

    if (mutator === undefined) {
        assert.fail('Expected ZodOptionalAdd to exist');
    }

    assert.deepStrictEqual(Array.from(mutator.mutate({ node: identifier('schema'), parentPath: null })), []);
});

test('enables every Zod mutation by default', function () {
    assert.deepStrictEqual(defaultZodMutatorSettings.includedCategories, zodMutationCategories);
    assert.deepStrictEqual(defaultZodMutatorSettings.includedOperators, zodMutationOperators);
});

test('patches Stryker mutators with selected operators once', async function () {
    const settings: ZodMutatorSettings = {
        includedCategories: undefined,
        includedOperators: [ 'ZodOptionalAdd' ]
    };
    const config = { mutate: [ 'source/**/*.ts' ] };

    assert.strictEqual(await withZodMutators(config, settings), config);
    assert.strictEqual(await withDefaultZodMutators(config), config);
    assert.strictEqual(
        await withZodMutators(config, {
            includedCategories: [ 'presence' ],
            includedOperators: undefined
        }),
        config
    );

    const names = await readStrykerMutatorNames();
    const optionalAddCount = names
        .filter(function (name) {
            return name === 'ZodOptionalAdd';
        })
        .length;

    assert.strictEqual(optionalAddCount, 1);
    assert.ok(names.includes('ZodCoercionRemove'));
});

test('adds readonly through an aliased freezable schema binding', function () {
    const mutations = collectMutations(
        "import { z } from 'zod/v4'; const fields = z.object({ id: z.string() }); const schema = z.optional(fields);",
        'ZodReadonlyAdd'
    );

    assert.ok(mutations.includes('z.optional(fields).readonly()'));
});

test('adds readonly through a member-access schema binding', function () {
    const mutations = collectMutations(
        "import { z } from 'zod/v4'; const shapes = { user: z.object({ id: z.string() }) }; const schema = z.optional(shapes.user);",
        'ZodReadonlyAdd'
    );

    assert.ok(mutations.includes('z.optional(shapes.user).readonly()'));
});

test('adds readonly through a destructured schema binding', function () {
    const mutations = collectMutations(
        "import { z } from 'zod/v4'; const { user } = { user: z.object({ id: z.string() }) }; const schema = z.optional(user);",
        'ZodReadonlyAdd'
    );

    assert.ok(mutations.includes('z.optional(user).readonly()'));
});

test('adds readonly through an alias chain of schema bindings', function () {
    const mutations = collectMutations(
        "import { z } from 'zod/v4'; const base = z.object({ id: z.string() }); const alias = base; const schema = z.optional(alias);",
        'ZodReadonlyAdd'
    );

    assert.ok(mutations.includes('z.optional(alias).readonly()'));
});

test('skips an optional wrapper that a binding proves has no effect', function () {
    const mutations = collectMutations(
        "import { z } from 'zod/v4'; const loose = z.any(); const schema = z.nullable(loose);",
        'ZodOptionalAdd'
    );

    assert.ok(!mutations.includes('z.nullable(loose).optional()'));
});

test('still adds a wrapper when a binding resolves to a distinguishable schema', function () {
    const mutations = collectMutations(
        "import { z } from 'zod/v4'; const inner = z.string(); const schema = z.nullable(inner);",
        'ZodOptionalAdd'
    );

    assert.ok(mutations.includes('z.nullable(inner).optional()'));
});

test('does not add readonly when a binding resolves to a non-freezable schema', function () {
    const mutations = collectMutations(
        "import { z } from 'zod/v4'; const inner = z.string(); const schema = z.optional(inner);",
        'ZodReadonlyAdd'
    );

    assert.ok(!mutations.includes('z.optional(inner).readonly()'));
});

test('does not add readonly when a binding resolves to a non-schema value', function () {
    const mutations = collectMutations(
        "import { z } from 'zod/v4'; const label = 'plain'; const schema = z.optional(label);",
        'ZodReadonlyAdd'
    );

    assert.deepStrictEqual(mutations, []);
});

test('adds readonly through a schema binding imported from another module', function () {
    const env = moduleResolverEnv({
        './fields': "import { z } from 'zod/v4'; export const fields = z.object({ id: z.string() });"
    });
    const mutations = collectResolvedMutations(
        "import { z } from 'zod/v4'; import { fields } from './fields'; const schema = z.optional(fields);",
        'ZodReadonlyAdd',
        env
    );

    assert.ok(mutations.includes('z.optional(fields).readonly()'));
});

test('follows an aliased export name across a module boundary', function () {
    const env = moduleResolverEnv({
        './fields': "import { z } from 'zod/v4'; const base = z.object({ id: z.string() }); export { base as fields };"
    });
    const mutations = collectResolvedMutations(
        "import { z } from 'zod/v4'; import { fields } from './fields'; const schema = z.optional(fields);",
        'ZodReadonlyAdd',
        env
    );

    assert.ok(mutations.includes('z.optional(fields).readonly()'));
});

test('follows a default import across a module boundary', function () {
    const env = moduleResolverEnv({
        './fields': "import { z } from 'zod/v4'; const fields = z.object({ id: z.string() }); export default fields;"
    });
    const mutations = collectResolvedMutations(
        "import { z } from 'zod/v4'; import fields from './fields'; const schema = z.optional(fields);",
        'ZodReadonlyAdd',
        env
    );

    assert.ok(mutations.includes('z.optional(fields).readonly()'));
});

test('emits the wrapper when a cross-module binding cannot be resolved', function () {
    const mutations = collectResolvedMutations(
        "import { z } from 'zod/v4'; import { missing } from './absent'; const schema = z.nullable(missing);",
        'ZodOptionalAdd',
        moduleResolverEnv({})
    );

    assert.ok(mutations.includes('z.nullable(missing).optional()'));
});

test('ignores a namespace import used as a schema reference', function () {
    const mutations = collectResolvedMutations(
        "import { z } from 'zod/v4'; import * as shapes from './shapes'; const schema = z.optional(shapes);",
        'ZodReadonlyAdd',
        moduleResolverEnv({ './shapes': "import { z } from 'zod/v4'; export const a = z.object({});" })
    );

    assert.deepStrictEqual(mutations, []);
});

test('adds readonly through an array-destructured schema binding', function () {
    const mutations = collectMutations(
        "import { z } from 'zod/v4'; const [ first ] = [ z.object({ id: z.string() }) ]; const schema = z.optional(first);",
        'ZodReadonlyAdd'
    );

    assert.ok(mutations.includes('z.optional(first).readonly()'));
});

test('resolves a quoted object property key', function () {
    const mutations = collectMutations(
        'import { z } from \'zod/v4\'; const shapes = { "user": z.object({ id: z.string() }) }; const schema = z.optional(shapes.user);',
        'ZodReadonlyAdd'
    );

    assert.ok(mutations.includes('z.optional(shapes.user).readonly()'));
});

test('does not resolve a missing object property', function () {
    const mutations = collectMutations(
        "import { z } from 'zod/v4'; const shapes = { user: z.object({}) }; const schema = z.optional(shapes.missing);",
        'ZodReadonlyAdd'
    );

    assert.ok(!mutations.includes('z.optional(shapes.missing).readonly()'));
});

test('stops at a self-referential binding cycle', function () {
    const mutations = collectMutations(
        "import { z } from 'zod/v4'; const a = b; const b = a; const schema = z.optional(a);",
        'ZodReadonlyAdd'
    );

    assert.deepStrictEqual(mutations, []);
});

test('does not resolve cross-module bindings with an inert resolver', function () {
    const mutations = collectResolvedMutations(
        "import { z } from 'zod/v4'; import { fields } from './fields'; const schema = z.optional(fields);",
        'ZodReadonlyAdd',
        inertResolverEnv
    );

    assert.ok(!mutations.includes('z.optional(fields).readonly()'));
});

test('does not resolve imported bindings when the current file name is unknown', function () {
    const mutations = collectMutations(
        "import { z } from 'zod/v4'; import { fields } from './fields'; const schema = z.optional(fields);",
        'ZodReadonlyAdd'
    );

    assert.ok(!mutations.includes('z.optional(fields).readonly()'));
});

test('bails when a default import has no matching default export', function () {
    const mutations = collectResolvedMutations(
        "import { z } from 'zod/v4'; import fields from './fields'; const schema = z.optional(fields);",
        'ZodReadonlyAdd',
        moduleResolverEnv({ './fields': "import { z } from 'zod/v4'; export const other = z.object({});" })
    );

    assert.ok(!mutations.includes('z.optional(fields).readonly()'));
});

test('resolves a member binding past a non-identifier sibling key', function () {
    const mutations = collectMutations(
        "import { z } from 'zod/v4'; const shapes = { 1: z.number(), user: z.object({ id: z.string() }) }; const schema = z.optional(shapes.user);",
        'ZodReadonlyAdd'
    );

    assert.ok(mutations.includes('z.optional(shapes.user).readonly()'));
});

test('does not resolve an object destructure over a non-object initializer', function () {
    const mutations = collectMutations(
        "import { z } from 'zod/v4'; const { user } = z.string(); const schema = z.optional(user);",
        'ZodReadonlyAdd'
    );

    assert.ok(!mutations.includes('z.optional(user).readonly()'));
});

test('does not resolve an array destructure over a non-array initializer', function () {
    const mutations = collectMutations(
        "import { z } from 'zod/v4'; const [ first ] = z.string(); const schema = z.optional(first);",
        'ZodReadonlyAdd'
    );

    assert.ok(!mutations.includes('z.optional(first).readonly()'));
});

test('reads the current file name from a Stryker node path hub', function () {
    const hubPath = { node: identifier('x'), parentPath: null, hub: { file: { opts: { filename: '/module.ts' } } } };

    assert.strictEqual(fileNameOf(hubPath), '/module.ts');
});

test('follows a string-literal import name across a module boundary', function () {
    const mutations = collectResolvedMutations(
        "import { z } from 'zod/v4'; import { 'fields' as f } from './fields'; const schema = z.optional(f);",
        'ZodReadonlyAdd',
        moduleResolverEnv({
            './fields': "import { z } from 'zod/v4'; export const fields = z.object({ id: z.string() });"
        })
    );

    assert.ok(mutations.includes('z.optional(f).readonly()'));
});

test('does not resolve a computed member access', function () {
    const mutations = collectMutations(
        "import { z } from 'zod/v4'; const key = 'user'; const shapes = { user: z.object({}) }; const schema = z.optional(shapes[key]);",
        'ZodReadonlyAdd'
    );

    assert.ok(!mutations.includes('z.optional(shapes[key]).readonly()'));
});

test('does not resolve a binding declared without an initializer', function () {
    const mutations = collectMutations(
        "import { z } from 'zod/v4'; let holder; const schema = z.optional(holder);",
        'ZodReadonlyAdd'
    );

    assert.ok(!mutations.includes('z.optional(holder).readonly()'));
});

test('does not resolve a destructure with a renamed string-literal key', function () {
    const mutations = collectMutations(
        'import { z } from \'zod/v4\'; const { "id": user } = { id: z.object({}) }; const schema = z.optional(user);',
        'ZodReadonlyAdd'
    );

    assert.ok(!mutations.includes('z.optional(user).readonly()'));
});

test('follows a string-literal export name across a module boundary', function () {
    const mutations = collectResolvedMutations(
        "import { z } from 'zod/v4'; import { fields } from './fields'; const schema = z.optional(fields);",
        'ZodReadonlyAdd',
        moduleResolverEnv({
            './fields':
                "import { z } from 'zod/v4'; const base = z.object({ id: z.string() }); export { base as 'fields' };"
        })
    );

    assert.ok(mutations.includes('z.optional(fields).readonly()'));
});

test('does not remove a readonly re-frozen by an enclosing readonly through a pipe', function () {
    const mutations = collectMutations(
        "import * as z from 'zod/mini'; const channelSchema = z.string(); export const s = z.readonly(z.pipe(z.string(), z.readonly(z.array(channelSchema))));",
        'ZodReadonlyRemove'
    );

    assert.ok(!mutations.includes('z.array(channelSchema)'));
});

test('still removes a readonly that feeds a transform as pipe input', function () {
    const mutations = collectMutations(
        "import * as z from 'zod/mini'; export const s = z.readonly(z.pipe(z.readonly(z.array(z.unknown())), z.transform(function (channels) { return channels; })));",
        'ZodReadonlyRemove'
    );

    assert.ok(mutations.includes('z.array(z.unknown())'));
});

test('does not remove a readonly nested directly in another readonly', function () {
    const mutations = collectMutations(
        "import * as z from 'zod/mini'; export const s = z.readonly(z.readonly(z.object({ a: z.string() })));",
        'ZodReadonlyRemove'
    );

    assert.ok(!mutations.includes('z.object({\n  a: z.string()\n})'));
});

test('removes a readonly nested in a non-readonly wrapper', function () {
    const mutations = collectMutations(
        "import * as z from 'zod/mini'; export const s = z.array(z.readonly(z.object({ a: z.string() })));",
        'ZodReadonlyRemove'
    );

    assert.ok(mutations.includes('z.object({\n  a: z.string()\n})'));
});

test('handles a readonly-removal path without a parent', function () {
    const mutator = createZodMutators([ 'ZodReadonlyRemove' ])[0];

    if (mutator === undefined) {
        assert.fail('Expected ZodReadonlyRemove to exist');
    }

    assert.deepStrictEqual(Array.from(mutator.mutate({ node: identifier('schema'), parentPath: null })), []);
});

test('detects an enclosing readonly through a classic pipe method call', function () {
    const mutations = collectMutations(
        "import * as z from 'zod/mini'; export const s = z.readonly(z.string().pipe(z.readonly(z.array(z.string()))));",
        'ZodReadonlyRemove'
    );

    assert.ok(!mutations.includes('z.array(z.string())'));
});

test('widens a constraining schema reference in an object field', function () {
    const mutations = collectMutations(
        "import * as z from 'zod/mini'; const foo = z.string(); export const s = z.object({ f: foo });",
        'ZodReferencedSchemaWiden'
    );

    assert.deepStrictEqual(mutations, [ 'z.unknown()' ]);
});

test('widens constraining schema references in union options and wrapper arguments', function () {
    const unionMutations = collectMutations(
        "import * as z from 'zod/mini'; const bar = z.string(); const baz = z.number(); export const s = z.union([bar, baz]);",
        'ZodReferencedSchemaWiden'
    );
    const wrapperMutations = collectMutations(
        "import * as z from 'zod/mini'; const foo = z.string(); export const s = z.array(foo);",
        'ZodReferencedSchemaWiden'
    );

    assert.deepStrictEqual(unionMutations, [ 'z.unknown()' ]);
    assert.deepStrictEqual(wrapperMutations, [ 'z.unknown()' ]);
});

test('widens a referenced schema using the classic import style', function () {
    const mutations = collectMutations(
        "import { z } from 'zod/v4'; const foo = z.string(); export const s = z.object({ f: foo });",
        'ZodReferencedSchemaWiden'
    );

    assert.deepStrictEqual(mutations, [ 'z.unknown()' ]);
});

test('does not widen a reference that already accepts anything', function () {
    const mutations = collectMutations(
        "import * as z from 'zod/mini'; const foo = z.any(); export const s = z.object({ f: foo });",
        'ZodReferencedSchemaWiden'
    );

    assert.deepStrictEqual(mutations, []);
});

test('does not widen a reference that resolves to a non-schema', function () {
    const mutations = collectMutations(
        "import * as z from 'zod/mini'; const foo = 'plain'; export const s = z.object({ f: foo });",
        'ZodReferencedSchemaWiden'
    );

    assert.deepStrictEqual(mutations, []);
});

test('does not widen an inline schema or a non-Zod object field', function () {
    const inlineMutations = collectMutations(
        "import * as z from 'zod/mini'; export const s = z.object({ f: z.string() });",
        'ZodReferencedSchemaWiden'
    );
    const plainObjectMutations = collectMutations(
        "import * as z from 'zod/mini'; const foo = z.string(); export const opts = { f: foo };",
        'ZodReferencedSchemaWiden'
    );

    assert.deepStrictEqual(inlineMutations, []);
    assert.deepStrictEqual(plainObjectMutations, []);
});

test('widens a schema reference imported from another module', function () {
    const widened = collectResolvedMutations(
        "import * as z from 'zod/mini'; import { foo } from './foo'; export const s = z.object({ f: foo });",
        'ZodReferencedSchemaWiden',
        moduleResolverEnv({ './foo': "import * as z from 'zod/mini'; export const foo = z.string();" })
    );
    const permissive = collectResolvedMutations(
        "import * as z from 'zod/mini'; import { foo } from './foo'; export const s = z.object({ f: foo });",
        'ZodReferencedSchemaWiden',
        moduleResolverEnv({ './foo': "import * as z from 'zod/mini'; export const foo = z.any();" })
    );

    assert.deepStrictEqual(widened, [ 'z.unknown()' ]);
    assert.deepStrictEqual(permissive, []);
});

test('widens a reference using direct mini imports when unknown is importable', function () {
    const mutations = collectMutations(
        "import { object, string, unknown } from 'zod/mini'; const foo = string(); export const s = object({ f: foo });",
        'ZodReferencedSchemaWiden'
    );

    assert.deepStrictEqual(mutations, [ 'unknown()' ]);
});

test('does not widen when the module cannot construct an unknown schema', function () {
    const mutations = collectMutations(
        "import { object, string } from 'zod/mini'; const foo = string(); export const s = object({ f: foo });",
        'ZodReferencedSchemaWiden'
    );

    assert.deepStrictEqual(mutations, []);
});

test('handles a widen path without a parent', function () {
    const mutator = createZodMutators([ 'ZodReferencedSchemaWiden' ])[0];

    if (mutator === undefined) {
        assert.fail('Expected ZodReferencedSchemaWiden to exist');
    }

    assert.deepStrictEqual(Array.from(mutator.mutate({ node: identifier('schema'), parentPath: null })), []);
});

test('does not widen a reference inside a non-Zod call object', function () {
    const mutations = collectMutations(
        "import * as z from 'zod/mini'; const foo = z.string(); export const s = notZod({ f: foo });",
        'ZodReferencedSchemaWiden'
    );

    assert.deepStrictEqual(mutations, []);
});
