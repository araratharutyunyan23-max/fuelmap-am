// Resolves the right Telegra.ph install instruction for the current
// device + UI locale. The Armenian URLs embed non-ASCII characters
// directly — fine in href, browsers handle the percent-encoding.

import type { Locale } from './i18n';

const INSTALL_URLS = {
  ru: {
    ios:     'https://telegra.ph/Kak-ustanovit-FuelMap-na-iPhone-05-04',
    android: 'https://telegra.ph/Kak-ustanovit-FuelMap-na-Android-05-04',
  },
  hy: {
    ios:     'https://telegra.ph/Ինչպես-տեղադրել-FuelMap-ը-iPhone-ում-05-04',
    android: 'https://telegra.ph/Ինչպես-տեղադրել-FuelMap-ը-Android-ում-05-04',
  },
} as const;

function detectPlatform(): 'ios' | 'android' | 'desktop' {
  if (typeof navigator === 'undefined') return 'desktop';
  const ua = navigator.userAgent;
  if (/iPad|iPhone|iPod/.test(ua)) return 'ios';
  if (/Android/.test(ua)) return 'android';
  return 'desktop';
}

// Returns null on desktop — there is no PWA-install flow worth pointing
// at, and showing the Android article to a Windows user is misleading.
// Callers should hide their CTA when this returns null.
export function installArticleUrl(locale: Locale): string | null {
  const platform = detectPlatform();
  if (platform === 'desktop') return null;
  return INSTALL_URLS[locale][platform];
}

// True when the page is running as an installed PWA (added to home screen
// on iOS / installed via Chrome on Android). Used to hide the "how to
// install" CTA — once they're inside the standalone shell, they're done.
export function isAppInstalled(): boolean {
  if (typeof window === 'undefined') return false;
  // iOS Safari exposes a non-standard navigator.standalone instead of
  // honouring display-mode media queries.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const iosStandalone = (navigator as any).standalone === true;
  const matchMediaStandalone =
    typeof window.matchMedia === 'function' &&
    window.matchMedia('(display-mode: standalone)').matches;
  return iosStandalone || matchMediaStandalone;
}
