import assert from 'node:assert/strict';
import test from 'node:test';
import { buildPwaInstallUrl } from '../src/utils/pwaInstallUrl.ts';

test('all three app links use the deployed origin and keep their portal paths', () => {
    for (const path of ['/?pwa=customer','/login/business?pwa=business','/login/rider?pwa=rider']) {
        assert.equal(buildPwaInstallUrl(path), `https://hivet-crm.vercel.app${path}`);
    }
});

test('invalid, insecure and localhost settings fall back to the deployed site', () => {
    for (const origin of [undefined,'','not a URL','http://localhost:5175','https://localhost:5175','https://preview.localhost','https://127.0.0.1','https://[::1]','http://example.com']) {
        assert.equal(buildPwaInstallUrl('/?pwa=customer', origin), 'https://hivet-crm.vercel.app/?pwa=customer');
    }
});

test('a configured public HTTPS domain replaces the default origin', () => {
    assert.equal(buildPwaInstallUrl('/login/rider?pwa=rider','https://app.example.com/'), 'https://app.example.com/login/rider?pwa=rider');
});
