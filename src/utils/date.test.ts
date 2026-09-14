import assert from 'node:assert/strict';
import { getLocalDateStr } from './date';

const sample = new Date(2026, 8, 14, 23, 30, 0);
assert.equal(getLocalDateStr(sample), '2026-09-14');

console.log('date helper test passed');
