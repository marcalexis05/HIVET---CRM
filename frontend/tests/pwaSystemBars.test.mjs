import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';

const frontend = new URL('../', import.meta.url);

test('all install entry points keep visible system bars using standalone mode', () => {
    for (const filename of ['manifest.json','manifest-customer.json','manifest-business.json','manifest-rider.json']) {
        const manifest = JSON.parse(fs.readFileSync(new URL(`public/${filename}`, frontend), 'utf8'));
        assert.equal(manifest.display, 'standalone', filename);
        assert.ok(!manifest.display_override?.includes('fullscreen'), filename);
        assert.equal(manifest.scope, '/');
        assert.ok(manifest.start_url.startsWith('/'));
    }
});

test('the main document retains the supported edge-to-edge viewport opt-in', () => {
    const html = fs.readFileSync(new URL('index.html', frontend), 'utf8');
    const viewportTags = html.match(/<meta\b[^>]*name="viewport"[^>]*>/g) ?? [];
    assert.equal(viewportTags.length, 1);
    assert.match(viewportTags[0], /viewport-fit=cover/);
    assert.match(viewportTags[0], /width=device-width/);
    assert.match(viewportTags[0], /initial-scale=1/);
});
