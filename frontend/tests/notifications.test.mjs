import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';
import ts from 'typescript';

const source = fs.readFileSync(new URL('../src/utils/notifications.ts', import.meta.url), 'utf8').replace('import.meta.env.VITE_API_URL', "'https://api.example.test'");
const js = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 } }).outputText;
const actions = await import('data:text/javascript;base64,' + Buffer.from(js).toString('base64'));

test('notification actions use configured API and persist through the correct server methods', async t => {
    const oldFetch = globalThis.fetch, oldWindow = globalThis.window, oldStorage = globalThis.localStorage;
    t.after(() => { globalThis.fetch = oldFetch; globalThis.window = oldWindow; globalThis.localStorage = oldStorage; });
    let events = 0;
    globalThis.window = { dispatchEvent: () => events++ };
    globalThis.localStorage = { getItem: () => 'test-session' };
    const calls = [];
    globalThis.fetch = async (url, options) => { calls.push([url, options.method, options.headers.Authorization]); return { ok: true }; };
    await actions.dismissNotification(12);
    await actions.markNotificationRead(12);
    await actions.markAllNotificationsRead();
    await actions.removeAllNotifications();
    assert.deepEqual(calls.map(c => c.slice(0, 2)), [
        ['https://api.example.test/api/notifications/12', 'DELETE'],
        ['https://api.example.test/api/notifications/12/read', 'PATCH'],
        ['https://api.example.test/api/notifications/read-all', 'POST'],
        ['https://api.example.test/api/notifications/all', 'DELETE']
    ]);
    assert.ok(calls.every(c => c[2] === 'Bearer test-session'));
    assert.equal(events, 4);
});

test('failures report errors without false success; repeat dismissal is harmless', async t => {
    const oldFetch = globalThis.fetch, oldWindow = globalThis.window, oldStorage = globalThis.localStorage;
    t.after(() => { globalThis.fetch = oldFetch; globalThis.window = oldWindow; globalThis.localStorage = oldStorage; });
    let events = 0;
    globalThis.window = { dispatchEvent: () => events++ };
    globalThis.localStorage = { getItem: () => 'test-session' };
    globalThis.fetch = async () => ({ ok: false, status: 500, json: async () => ({ detail: 'Please retry' }) });
    await assert.rejects(actions.markAllNotificationsRead(), /Please retry/);
    await assert.rejects(actions.removeAllNotifications(), /Please retry/);
    globalThis.fetch = async () => { throw new TypeError('Failed to fetch'); };
    await assert.rejects(actions.dismissNotification(12), /Cannot reach the server/);
    assert.equal(events, 0);
    globalThis.fetch = async () => ({ ok: false, status: 404 });
    await actions.dismissNotification(12);
    assert.equal(events, 1);
});
