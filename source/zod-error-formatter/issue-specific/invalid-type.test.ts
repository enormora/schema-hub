import { test } from '@sondr3/minitest';
import assert from 'node:assert';
import { formatInvalidTypeIssueMessage } from './invalid-type.js';

test('formats the expected and received value correctly', () => {
    const message = formatInvalidTypeIssueMessage({
        code: 'invalid_type',
        path: [],
        message: '',
        expected: 'date',
        received: 'null'
    });
    assert.strictEqual(message, 'expected date, but got null');
});
