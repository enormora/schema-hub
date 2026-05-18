import { test } from '@sondr3/minitest';
import assert from 'node:assert';
import { formatIssue } from '../format-issue.js';
import {
    formatInvalidElementIssueMessage,
    formatInvalidKeyIssueMessage
} from './invalid-collection-issue.js';

test('falls back to an origin-labeled message when invalid_key has no inner issues at the root path', () => {
    const message = formatInvalidKeyIssueMessage(
        {
            code: 'invalid_key',
            path: [],
            message: '',
            input: new Map(),
            origin: 'map',
            issues: []
        },
        new Map(),
        formatIssue
    );
    assert.strictEqual(message, 'invalid map key');
});

test('prefixes the fallback with the path when invalid_key has no inner issues at a nested path', () => {
    const message = formatInvalidKeyIssueMessage(
        {
            code: 'invalid_key',
            path: ['foo'],
            message: '',
            input: new Map(),
            origin: 'record',
            issues: []
        },
        { foo: {} },
        formatIssue
    );
    assert.strictEqual(message, 'at foo: invalid record key');
});

test('delegates to formatChildIssue for invalid_key inner issues', () => {
    const message = formatInvalidKeyIssueMessage(
        {
            code: 'invalid_key',
            path: ['foo'],
            message: '',
            input: new Map(),
            origin: 'map',
            issues: [
                {
                    code: 'invalid_type',
                    path: ['foo'],
                    message: '',
                    expected: 'string',
                    input: 1
                }
            ]
        },
        { foo: 1 },
        formatIssue
    );
    assert.strictEqual(message, 'at foo: expected string, but got number');
});

test('joins multiple inner issues with "; " for invalid_key', () => {
    const message = formatInvalidKeyIssueMessage(
        {
            code: 'invalid_key',
            path: [],
            message: '',
            input: new Map(),
            origin: 'map',
            issues: [
                { code: 'invalid_type', path: ['a'], message: '', expected: 'string', input: 1 },
                { code: 'invalid_type', path: ['b'], message: '', expected: 'number', input: 'x' }
            ]
        },
        { a: 1, b: 'x' },
        formatIssue
    );
    assert.strictEqual(
        message,
        'at a: expected string, but got number; at b: expected number, but got string'
    );
});

test('falls back to an origin-labeled message when invalid_element has no inner issues', () => {
    const message = formatInvalidElementIssueMessage(
        {
            code: 'invalid_element',
            path: ['items'],
            message: '',
            input: new Set(),
            origin: 'set',
            key: 0,
            issues: []
        },
        { items: new Set() },
        formatIssue
    );
    assert.strictEqual(message, 'at items: invalid set element');
});

test('delegates to formatChildIssue for invalid_element inner issues', () => {
    const message = formatInvalidElementIssueMessage(
        {
            code: 'invalid_element',
            path: ['items', 0],
            message: '',
            input: 1,
            origin: 'set',
            key: 0,
            issues: [
                {
                    code: 'invalid_type',
                    path: ['items', 0],
                    message: '',
                    expected: 'string',
                    input: 1
                }
            ]
        },
        { items: [1] },
        formatIssue
    );
    assert.strictEqual(message, 'at items[0]: expected string, but got number');
});
