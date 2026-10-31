import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';
import ts from 'typescript';

const source = fs.readFileSync(new URL('../src/utils/sessionCheck.ts', import.meta.url), 'utf8').replace('import.meta.env.VITE_API_URL', "'https://api.example.test'");
const js = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 } }).outputText;
const { checkSavedSession } = await import('data:text/javascript;base64,' + Buffer.from(js).toString('base64'));

test('session restoration distinguishes rejected sessions from temporary server failures', async t => {
    const oldFetch = globalThis.fetch;
    t.after(() => { globalThis.fetch = oldFetch; });
    for (const [status, expected] of [[200, 'valid'], [401, 'invalid'], [403, 'invalid'], [503, 'unavailable']]) {
        globalThis.fetch = async (url, options) => {
            assert.equal(url, 'https://api.example.test/api/auth/me');
            assert.equal(options.headers.Authorization, 'Bearer test-token');
            return { status, ok: status === 200 };
        };
        assert.equal(await checkSavedSession('test-token'), expected);
    }
});

test('a stalled session check times out and can be cancelled on navigation', async t => {
    const oldFetch = globalThis.fetch;
    t.after(() => { globalThis.fetch = oldFetch; });
    let aborted = 0;
    globalThis.fetch = async (_url, { signal }) => new Promise((_resolve, reject) => {
        const abort = () => { aborted++; reject(new DOMException('Aborted', 'AbortError')); };
        if (signal.aborted) abort();
        else signal.addEventListener('abort', abort, { once: true });
    });
    assert.equal(await checkSavedSession('test-token', undefined, 10), 'unavailable');
    const controller = new AbortController();
    const pending = checkSavedSession('test-token', controller.signal, 1000);
    controller.abort();
    assert.equal(await pending, 'unavailable');
    assert.equal(aborted, 2);
});
