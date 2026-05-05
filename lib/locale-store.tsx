'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from 'react';
import { translate, type Locale, type TranslationKey } from './i18n';
import { supabase } from './supabase';

const STORAGE_KEY = 'fuelmap.locale';
// Armenia-first product → land in Armenian by default. Existing users
// already have their pick saved in localStorage so they aren't reset.
const DEFAULT_LOCALE: Locale = 'hy';

interface LocaleContextValue {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  t: (key: TranslationKey, params?: Record<string, string | number>) => string;
}

const LocaleContext = createContext<LocaleContextValue>({
  locale: DEFAULT_LOCALE,
  setLocale: () => {},
  t: (key) => String(key),
});

function readStoredLocale(): Locale {
  if (typeof window === 'undefined') return DEFAULT_LOCALE;
  const v = window.localStorage.getItem(STORAGE_KEY);
  return v === 'hy' || v === 'ru' ? v : DEFAULT_LOCALE;
}

export function LocaleProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>(DEFAULT_LOCALE);

  // Hydrate from localStorage after mount to avoid SSR/CSR text mismatch.
  useEffect(() => {
    const stored = readStoredLocale();
    if (stored !== locale) setLocaleState(stored);
  }, []);

  const setLocale = useCallback((next: Locale) => {
    setLocaleState(next);
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(STORAGE_KEY, next);
    }
    // Sync to auth metadata so server-side push triggers can pick the
    // right language. Best-effort: if the user is signed out the call
    // 401s and we just keep the localStorage copy.
    supabase.auth.updateUser({ data: { locale: next } }).catch(() => {});
  }, []);

  // When auth state shows a user, push the current locale up so a fresh
  // signup or signin from another device gets it associated immediately.
  useEffect(() => {
    const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
      if (session?.user && (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED')) {
        const current = (session.user.user_metadata?.locale as Locale | undefined) ?? null;
        if (current !== locale) {
          supabase.auth.updateUser({ data: { locale } }).catch(() => {});
        }
      }
    });
    return () => sub.subscription.unsubscribe();
  }, [locale]);

  const t = useCallback(
    (key: TranslationKey, params?: Record<string, string | number>) =>
      translate(locale, key, params),
    [locale]
  );

  return (
    <LocaleContext.Provider value={{ locale, setLocale, t }}>
      {children}
    </LocaleContext.Provider>
  );
}

export function useLocale() {
  return useContext(LocaleContext);
}

// Shorthand for components that only need the translator.
export function useT() {
  return useContext(LocaleContext).t;
}
