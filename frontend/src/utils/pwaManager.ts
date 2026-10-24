// PWA Manager for Hi-Vet Multi-Portal Application

export type PwaRole = 'customer' | 'business' | 'rider';

export interface PwaPortalConfig {
  role: PwaRole;
  title: string;
  badge: string;
  description: string;
  path: string;
  manifest: string;
  themeColor: string;
  accentClass: string;
}

export const PWA_PORTALS: Record<PwaRole, PwaPortalConfig> = {
  customer: {
    role: 'customer',
    title: 'Customer App',
    badge: 'Customer',
    description: 'Book vet visits, buy pet food and supplies, and get reminders right on your phone.',
    path: '/?pwa=customer',
    manifest: '/manifest-customer.json',
    themeColor: '#000000',
    accentClass: 'text-brand'
  },
  business: {
    role: 'business',
    title: 'Clinic App',
    badge: 'Clinic',
    description: 'Manage appointments, pet patient records, and clinic orders in one place.',
    path: '/login/business?pwa=business',
    manifest: '/manifest-business.json',
    themeColor: '#FFFFFF',
    accentClass: 'text-accent-brown'
  },
  rider: {
    role: 'rider',
    title: 'Rider App',
    badge: 'Rider',
    description: 'Pick up pet packages, deliver to homes, and track your daily pay.',
    path: '/login/rider?pwa=rider',
    manifest: '/manifest-rider.json',
    themeColor: '#FFFFFF',
    accentClass: 'text-brand'
  }
};

let deferredPrompt: any = null;

// Listen to beforeinstallprompt event
if (typeof window !== 'undefined') {
  // Check URL params on initial load
  const urlParams = new URLSearchParams(window.location.search);
  const pwaParam = urlParams.get('pwa') as PwaRole;
  if (pwaParam && PWA_PORTALS[pwaParam]) {
    setPwaManifestForRole(pwaParam);
  }

  window.addEventListener('beforeinstallprompt', (e: Event) => {
    e.preventDefault();
    deferredPrompt = e;
    window.dispatchEvent(new CustomEvent('pwa-installable', { detail: { canInstall: true } }));
  });

  window.addEventListener('appinstalled', () => {
    deferredPrompt = null;
    window.dispatchEvent(new CustomEvent('pwa-installed'));
  });
}

/**
 * Registers the Service Worker in supporting environments.
 */
export function registerServiceWorker() {
  if (typeof window === 'undefined' || !('serviceWorker' in navigator)) return;

  window.addEventListener('load', () => {
    navigator.serviceWorker
      .register('/sw.js')
      .then((reg) => {
        // Check for updates
        reg.onupdatefound = () => {
          const installingWorker = reg.installing;
          if (installingWorker) {
            installingWorker.onstatechange = () => {
              if (installingWorker.state === 'installed' && navigator.serviceWorker.controller) {
                console.log('[PWA] New version available.');
              }
            };
          }
        };
      })
      .catch((err) => {
        console.warn('[PWA] Service Worker registration skipped or failed:', err);
      });
  });
}

/**
 * Dynamically switches the active manifest link in the document head based on role or route.
 */
export function setPwaManifestForRole(role: PwaRole) {
  if (typeof document === 'undefined') return;

  const config = PWA_PORTALS[role];
  let link = document.querySelector<HTMLLinkElement>('link[rel="manifest"]');
  if (!link) {
    link = document.createElement('link');
    link.rel = 'manifest';
    document.head.appendChild(link);
  }

  if (link.getAttribute('href') !== config.manifest) {
    link.setAttribute('href', config.manifest);
  }

  // NOTE: theme-color (the Android status bar color) is owned by StatusBarManager in App.tsx,
  // which matches it to the exact top color of the current screen for an edge-to-edge look.
  // It is intentionally not changed here so the two never fight each other.

  // Ensure title is strictly "Hi-Vet" in standalone window or when ?pwa= is active
  if (typeof window !== 'undefined' && (window.matchMedia('(display-mode: standalone)').matches || window.location.search.includes('pwa'))) {
    document.title = 'Hi-Vet';
  }
}

/**
 * Prompts the browser's native PWA installation dialog if available.
 */
export async function promptNativePwaInstall(): Promise<boolean> {
  if (!deferredPrompt) return false;
  try {
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    deferredPrompt = null;
    return outcome === 'accepted';
  } catch (err) {
    console.warn('[PWA] Install prompt error:', err);
    return false;
  }
}

export function canPromptNativeInstall(): boolean {
  return !!deferredPrompt;
}

/**
 * Generates the absolute URL for the QR code for a given role.
 */
export function getPwaInstallUrl(role: PwaRole): string {
  if (typeof window === 'undefined') return '';
  const origin = window.location.origin;
  const config = PWA_PORTALS[role];
  return `${origin}${config.path}`;
}
