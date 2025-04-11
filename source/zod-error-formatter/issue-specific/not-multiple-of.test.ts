import { test } from '@sondr3/minitest';
import assert from 'node:assert';
import { formatNotMultipleOfIssueMessage } from './not-multiple-of.js';

test('formats the issue correctly mentioning the expected multiple-of factor', () => {
    const message = formatNotMultipleOfIssueMessage({
        code: 'not_multiple_of',
        path: [],
        message: '',
        input: 123,
        divisor: 42
    });
    assert.strictEqual(message, 'number must be multiple of 42');
});
