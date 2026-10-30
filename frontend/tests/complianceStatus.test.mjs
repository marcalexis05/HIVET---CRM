import assert from 'node:assert/strict';
import test from 'node:test';
import { normalizeComplianceStatus } from '../src/utils/complianceStatus.ts';

test('preserves supported review states and harmless formatting differences', () => {
    for (const [input, expected] of [['pending','pending'],['verified','verified'],['non_compliant','non_compliant'],[' Verified ','verified'],['NON-COMPLIANT','non_compliant'],['non compliant','non_compliant']]) {
        assert.equal(normalizeComplianceStatus(input), expected);
    }
});

test('legacy, missing and unexpected states require review without granting approval', () => {
    for (const input of ['compliant','approved','unknown','','__proto__','constructor',null,undefined,1,{},[]]) {
        assert.equal(normalizeComplianceStatus(input), 'pending');
    }
});
