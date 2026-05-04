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

function detectPlatform(): 'ios' | 'android' {
  if (typeof navigator === 'undefined') return 'ios';
  return /iPad|iPhone|iPod/.test(navigator.userAgent) ? 'ios' : 'android';
}

export function installArticleUrl(locale: Locale): string {
  return INSTALL_URLS[locale][detectPlatform()];
}
