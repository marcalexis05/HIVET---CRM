export const DEPLOYED_APP_ORIGIN = 'https://hivet-crm.vercel.app';

export function buildPwaInstallUrl(path: string, configuredOrigin?: string): string {
    let origin = DEPLOYED_APP_ORIGIN;
    if (configuredOrigin) {
        try {
            const url = new URL(configuredOrigin);
            const isLocal = url.hostname === 'localhost' || url.hostname.endsWith('.localhost') ||
                url.hostname === '[::1]' || url.hostname === '0.0.0.0' || url.hostname.startsWith('127.');
            if (url.protocol === 'https:' && !isLocal && !url.username && !url.password) origin = url.origin;
        } catch {
            // A missing or invalid setting must never produce an unusable QR code.
        }
    }
    return new URL(path, origin).toString();
}
