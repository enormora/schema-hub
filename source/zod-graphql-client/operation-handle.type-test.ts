import { describe, expect, test } from 'tstyche';
import { z } from 'zod';
import { defineVariables } from './define-variables.js';
import { defineMutation, defineQuery, type OperationHandle } from './operation-handle.js';
import { variable } from './variable-entry.js';

const schema = z.strictObject({ foo: z.string() });
type Schema = typeof schema;

const vars = defineVariables({ id: variable('ID!', z.string()) });
type Vars = typeof vars;

describe('defineQuery / defineMutation produce the correct OperationHandle', () => {
    test('defineQuery without variables yields OperationHandle<Schema, undefined>', () => {
        const handle = defineQuery({ schema });
        expect(handle).type.toBe<OperationHandle<Schema, undefined>>();
    });

    test('defineMutation without variables yields OperationHandle<Schema, undefined>', () => {
        const handle = defineMutation({ schema });
        expect(handle).type.toBe<OperationHandle<Schema, undefined>>();
    });

    test('defineQuery with variables carries the variable map type', () => {
        const handle = defineQuery({ schema, variables: vars });
        expect(handle).type.toBe<OperationHandle<Schema, Vars>>();
    });

    test('defineQuery accepts an operationName', () => {
        expect(defineQuery).type.toBeCallableWith({ schema, operationName: 'GetFoo' });
    });

    test('defineQuery rejects a missing schema', () => {
        expect(defineQuery).type.not.toBeCallableWith({});
    });
});

describe('OperationHandle exposes only what the runtime treats as data', () => {
    test('schema is the captured Schema parameter', () => {
        const handle = defineQuery({ schema });
        expect(handle.schema).type.toBe<Schema>();
    });

    test('variables is the captured Variables parameter (or undefined)', () => {
        const handleWithVars = defineQuery({ schema, variables: vars });
        expect(handleWithVars.variables).type.toBe<Vars | undefined>();

        const handleWithoutVars = defineQuery({ schema });
        expect(handleWithoutVars.variables).type.toBe<undefined>();
    });
});
