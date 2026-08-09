import {
    formatInvalidElementIssueMessage,
    formatInvalidKeyIssueMessage
} from './invalid-collection-issue.ts';
import { formatInvalidStringIssueMessage } from './invalid-string.ts';
import { formatInvalidTypeIssueMessage } from './invalid-type.ts';
import { formatInvalidUnionIssueMessage } from './invalid-union.ts';
import { formatInvalidValueIssueMessage } from './invalid-value.ts';
import { formatNotMultipleOfIssueMessage } from './not-multiple-of.ts';
import { formatTooBigIssueMessage } from './too-big.ts';
import { formatTooSmallIssueMessage } from './too-small.ts';
import { formatUnrecognizedKeysIssueMessage } from './unrecognized-keys.ts';

export const issueSpecificFormatters = {
    formatInvalidElementIssueMessage,
    formatInvalidKeyIssueMessage,
    formatInvalidStringIssueMessage,
    formatInvalidTypeIssueMessage,
    formatInvalidUnionIssueMessage,
    formatInvalidValueIssueMessage,
    formatNotMultipleOfIssueMessage,
    formatTooBigIssueMessage,
    formatTooSmallIssueMessage,
    formatUnrecognizedKeysIssueMessage
};
