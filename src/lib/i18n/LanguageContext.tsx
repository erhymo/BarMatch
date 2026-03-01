'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from 'react';
import { translations, type Locale } from './translations';

const STORAGE_KEY = 'w2w_locale';

interface LanguageContextValue {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  t: (key: string, params?: Record<string, string | number>) => string;
}

const LanguageContext = createContext<LanguageContextValue | undefined>(undefined);

function getInitialLocale(): Locale {
  if (typeof window === 'undefined') return 'no';
  try {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (stored === 'en' || stored === 'no') return stored;
  } catch {
    // ignore
  }
  return 'no';
}

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>('no');
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setLocaleState(getInitialLocale());
    setMounted(true);
  }, []);

  const setLocale = useCallback((newLocale: Locale) => {
    setLocaleState(newLocale);
    try {
      window.localStorage.setItem(STORAGE_KEY, newLocale);
    } catch {
      // ignore
    }
    // Update html lang attribute
    document.documentElement.lang = newLocale === 'no' ? 'no' : 'en';
  }, []);

  const t = useCallback(
    (key: string, params?: Record<string, string | number>): string => {
      const dict = translations[locale];
      let value = (dict as Record<string, string>)[key] ?? key;
      if (params) {
        Object.entries(params).forEach(([k, v]) => {
          value = value.replace(`{${k}}`, String(v));
        });
      }
      return value;
    },
    [locale],
  );

  // Prevent flash of wrong language
  if (!mounted) {
    const defaultT = (key: string, params?: Record<string, string | number>): string => {
      const dict = translations.no;
      let value = (dict as Record<string, string>)[key] ?? key;
      if (params) {
        Object.entries(params).forEach(([k, v]) => {
          value = value.replace(`{${k}}`, String(v));
        });
      }
      return value;
    };
    return (
      <LanguageContext.Provider value={{ locale: 'no', setLocale, t: defaultT }}>
        {children}
      </LanguageContext.Provider>
    );
  }

  return (
    <LanguageContext.Provider value={{ locale, setLocale, t }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useTranslation() {
  const ctx = useContext(LanguageContext);
  if (!ctx) {
    throw new Error('useTranslation must be used within a LanguageProvider');
  }
  return ctx;
}

