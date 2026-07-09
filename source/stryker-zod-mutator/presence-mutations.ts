import {
    addWrapperOrMethod,
    removeMethodOrWrapper,
    replaceNullish
} from './schema-call-mutations.ts';
import { createDefinition, type MutationDefinition } from './mutation-definition.ts';

export const presenceMutationDefinitions: readonly MutationDefinition[] = [
    createDefinition('ZodOptionalAdd', function (path, bindings) {
        return addWrapperOrMethod(path, bindings, 'optional');
    }),
    createDefinition('ZodOptionalRemove', function (path, bindings) {
        return removeMethodOrWrapper(path, bindings, new Set([ 'optional' ]));
    }),
    createDefinition('ZodNullableAdd', function (path, bindings) {
        return addWrapperOrMethod(path, bindings, 'nullable');
    }),
    createDefinition('ZodNullableRemove', function (path, bindings) {
        return removeMethodOrWrapper(path, bindings, new Set([ 'nullable' ]));
    }),
    createDefinition('ZodNullishRemove', function (path, bindings) {
        return removeMethodOrWrapper(path, bindings, new Set([ 'nullish' ]));
    }),
    createDefinition('ZodNullishToNullable', function (path, bindings) {
        return replaceNullish(path, bindings, 'nullable');
    }),
    createDefinition('ZodNullishToOptional', function (path, bindings) {
        return replaceNullish(path, bindings, 'optional');
    }),
    createDefinition('ZodNonoptionalRemove', function (path, bindings) {
        return removeMethodOrWrapper(path, bindings, new Set([ 'nonoptional' ]));
    }),
    createDefinition('ZodReadonlyAdd', function (path, bindings) {
        return addWrapperOrMethod(path, bindings, 'readonly');
    }),
    createDefinition('ZodReadonlyRemove', function (path, bindings) {
        return removeMethodOrWrapper(path, bindings, new Set([ 'readonly' ]));
    })
];
