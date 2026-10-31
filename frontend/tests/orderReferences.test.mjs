import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';
import ts from 'typescript';
const source = fs.readFileSync(new URL('../src/utils/textFormatters.ts', import.meta.url), 'utf8');
const js = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 } }).outputText;
const { formatOrderReference, formatRiderOrderId, matchesRiderOrderIdSearch, maskPickupSerial } = await import('data:text/javascript;base64,' + Buffer.from(js).toString('base64'));
test('customer, clinic and rider labels preserve the legacy ending without exposing the database key', () => {
    const id = 'HV-2026-000182-1183';
    assert.equal(formatOrderReference(id), 'HV-2026-1183');
    assert.equal(formatOrderReference('#' + id), 'HV-2026-1183');
    const order = { id: 182, order_reference: 'HV-2026-1183' };
    assert.equal(formatOrderReference(order), 'HV-2026-1183');
    assert.equal(formatRiderOrderId(order), '#HV-2026-1183');
    assert.equal(matchesRiderOrderIdSearch(order, 'HV-2026-1183'), true);
    assert.equal(matchesRiderOrderIdSearch(order, '1183'), true);
    assert.equal(matchesRiderOrderIdSearch(order, '182'), true);
    assert.equal(order.id, 182);
});
test('short labels remain stable and other identifiers are not rewritten', () => {
    assert.equal(formatOrderReference('HV-2027-0012'), 'HV-2027-0012');
    assert.equal(formatOrderReference('HV-SN-182-1-1183'), 'HV-SN-182-1-1183');
    assert.equal(formatOrderReference(null), '');
});

test('pickup serial digits are masked even with an older server response', () => {
    assert.equal(maskPickupSerial('HV-SN-186-1-9810'), 'HV-SN-***-*-****');
    assert.equal(maskPickupSerial('HV-SN-***-*-****'), 'HV-SN-***-*-****');
    assert.equal(maskPickupSerial(null), '');
});
