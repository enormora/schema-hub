import { describe, expect, test } from 'tstyche';
import { z } from 'zod';
import { defineVariables } from './define-variables.ts';
import { defineMutation, defineQuery, type OperationHandle } from './operation-handle.ts';
import { variable } from './variable-entry.ts';

const schema = z.strictObject({ foo: z.string() });
type Schema = typeof schema;

const vars = defineVariables({ id: variable('ID!', z.string()) });
type Vars = typeof vars;

describe('defineQuery / defineMutation produce the correct OperationHandle', function () {
    test('defineQuery without variables yields OperationHandle<Schema, undefined>', function () {
        const handle = defineQuery({ schema });
        expect(handle).type.toBe<OperationHandle<Schema, undefined>>();
    });

    test('defineMutation without variables yields OperationHandle<Schema, undefined>', function () {
        const handle = defineMutation({ schema });
        expect(handle).type.toBe<OperationHandle<Schema, undefined>>();
    });

    test('defineQuery with variables carries the variable map type', function () {
        const handle = defineQuery({ schema, variables: vars });
        expect(handle).type.toBe<OperationHandle<Schema, Vars>>();
    });

    test('defineQuery accepts an operationName', function () {
        expect(defineQuery).type.toBeCallableWith({ schema, operationName: 'GetFoo' });
    });

    test('defineQuery rejects a missing schema', function () {
        expect(defineQuery).type.not.toBeCallableWith({});
    });
});

describe('OperationHandle exposes only what the runtime treats as data', function () {
    test('schema is the captured Schema parameter', function () {
        const handle = defineQuery({ schema });
        expect(handle.schema).type.toBe<Schema>();
    });

    test('variables is the captured Variables parameter (or undefined)', function () {
        const handleWithVars = defineQuery({ schema, variables: vars });
        expect(handleWithVars.variables).type.toBe<Vars | undefined>();

        const handleWithoutVars = defineQuery({ schema });
        expect(handleWithoutVars.variables).type.toBe<undefined>();
    });
});
