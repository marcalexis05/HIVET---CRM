import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';
import ts from 'typescript';

const source = fs.readFileSync(new URL('../src/utils/checkoutBranches.ts', import.meta.url), 'utf8').replace('import.meta.env.VITE_API_URL', "'https://api.example.test'");
const js = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 } }).outputText;
const { loadPickupClinics } = await import('data:text/javascript;base64,' + Buffer.from(js).toString('base64'));
const directory = { clinics: [{ id: '2', name: 'Approved Clinic', branches: [{ id: '6', name: 'Ruby Street' }] }] };
const product = { id: 1, business_id: 1, clinic_name: 'Selling Clinic', clinic_phone: '09171234567', branch_availability: [{ branch_id: '1', name: 'Hospital Branch', address: 'Quezon City', lat: 14.7, lng: 121 }, { branch_id: 1, name: 'Hospital Branch', address: 'Quezon City', lat: 14.7, lng: 121 }] };

function mockApi(t, routes) {
    const original = globalThis.fetch;
    const calls = [];
    t.after(() => { globalThis.fetch = original; });
    globalThis.fetch = async url => {
        const path = url.replace('https://api.example.test', '');
        if (path.startsWith('/api/checkout/pickup-branches?')) return { ok: false, status: 404 };
        calls.push(path);
        assert.ok(path in routes, `Unexpected request: ${path}`);
        const value = routes[path];
        return { ok: value !== null, json: async () => structuredClone(value) };
    };
    return calls;
}

test('existing seller branches match numeric/string IDs and exclude unrelated clinics', async t => {
    const calls = mockApi(t, { '/api/clinics': directory });
    const clinics = await loadPickupClinics([{ id: 12, business_id: 2 }], null);
    assert.equal(clinics.length, 1);
    assert.equal(clinics[0].id, 2);
    assert.equal(clinics[0].branches[0].id, 6);
    assert.deepEqual(calls, ['/api/clinics']);
});

test('a cart seller omitted from the directory recovers its real product branches once', async t => {
    const calls = mockApi(t, { '/api/clinics': directory, '/api/catalog/1': product });
    const clinics = await loadPickupClinics([{ id: 1, business_id: 1 }, { id: 1, business_id: 1 }], null);
    assert.equal(clinics.length, 1);
    assert.equal(clinics[0].id, 1);
    assert.equal(clinics[0].branches.length, 1);
    assert.equal(clinics[0].branches[0].name, 'Hospital Branch');
    assert.equal(clinics[0].branches[0].address_line1, 'Quezon City');
    assert.deepEqual(calls, ['/api/clinics', '/api/catalog/1']);
});

test('legacy cart items without seller IDs resolve ownership from product data', async t => {
    mockApi(t, { '/api/clinics': directory, '/api/catalog/1': product });
    const clinics = await loadPickupClinics([{ id: 1 }], null);
    assert.deepEqual(clinics.map(clinic => clinic.id), [1]);
});

test('resumed orders use their saved branch owner rather than an unrelated cart seller', async t => {
    mockApi(t, { '/api/clinics': directory, '/api/clinics/branches/1': { branch: { id: 1, clinic_id: 1, clinic_name: 'Selling Clinic', name: 'Hospital Branch' } } });
    const clinics = await loadPickupClinics([{ id: 12, business_id: 2 }], { branch_id: 1 });
    assert.deepEqual(clinics.map(clinic => clinic.id), [1]);
});

test('failed fetches report errors and missing branches never invent a pickup location', async t => {
    mockApi(t, { '/api/clinics': null });
    await assert.rejects(loadPickupClinics([{ id: 1, business_id: 1 }], null), /Could not load clinic branches/);
    globalThis.fetch = async url => url.includes('/api/checkout/pickup-branches?') ? { ok: false, status: 404 } : ({ ok: true, json: async () => url.endsWith('/api/clinics') ? directory : { ...product, branch_availability: [] } });
    const clinics = await loadPickupClinics([{ id: 1, business_id: 1 }], null);
    assert.equal(clinics[0].branches.length, 0);
});

test('pickup uses one targeted request without waiting for directory and product requests', async t => {
    const original = globalThis.fetch;
    t.after(() => { globalThis.fetch = original; });
    const calls = [];
    globalThis.fetch = async url => {
        calls.push(url);
        return { ok: true, json: async () => ({ clinics: [{ id: 1, name: 'Product Seller', branches: [{ id: 1, name: 'Pickup Branch' }] }] }) };
    };
    const clinics = await loadPickupClinics([{ id: 1, business_id: 1 }, { id: 1, business_id: 1 }], null);
    assert.equal(clinics[0].branches[0].name, 'Pickup Branch');
    assert.deepEqual(calls, ['https://api.example.test/api/checkout/pickup-branches?product_ids=1']);
});
