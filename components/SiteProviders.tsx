'use client';

import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { dictionaries, localeLabels, supportedLocales, type Locale, type TranslationKey } from '@/i18n/dictionaries';
import { GLOBAL_COUNTRY_SCOPE, isCountryScope, type CountryScope } from '@/lib/discoveryCountry';

type ThemeMode = 'light' | 'dark';
export type ThemePreference = 'system' | ThemeMode;

type SiteContextValue = {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  t: (key: TranslationKey) => string;
  localeLabels: typeof localeLabels;
  supportedLocales: readonly Locale[];
  countryScope: CountryScope;
  setCountryScope: (scope: CountryScope) => void;
  theme: ThemeMode;
  themeMode: ThemePreference;
  setTheme: (theme: ThemeMode) => void;
  setThemeMode: (theme: ThemePreference) => void;
  toggleTheme: () => void;
};

const SiteContext = createContext<SiteContextValue | null>(null);

function detectLocale(): Locale {
  if (typeof window === 'undefined') return 'th';
  const saved = window.localStorage.getItem('melo-web-locale') as Locale | null;
  if (saved && supportedLocales.includes(saved)) return saved;
  const browser = window.navigator.language.toLowerCase();
  if (browser.startsWith('th')) return 'th';
  if (browser.startsWith('de')) return 'de';
  return 'en';
}


function detectCountryScope(): CountryScope {
  if (typeof window === 'undefined') return GLOBAL_COUNTRY_SCOPE;
  const saved = window.localStorage.getItem('melo-web-country-scope');
  return isCountryScope(saved) ? saved : GLOBAL_COUNTRY_SCOPE;
}

function detectThemeMode(): ThemePreference {
  if (typeof window === 'undefined') return 'system';
  const storedMode = window.localStorage.getItem('melo-web-theme-mode') as ThemePreference | null;
  if (storedMode === 'system' || storedMode === 'light' || storedMode === 'dark') return storedMode;
  const legacy = window.localStorage.getItem('melo-web-theme') as ThemeMode | null;
  if (legacy === 'light' || legacy === 'dark') return legacy;
  return 'system';
}

function systemTheme(): ThemeMode {
  if (typeof window === 'undefined') return 'light';
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

export function SiteProviders({ children }: { children: React.ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>('th');
  const [countryScope, setCountryScopeState] = useState<CountryScope>(GLOBAL_COUNTRY_SCOPE);
  const [themeMode, setThemeModeState] = useState<ThemePreference>('system');
  const [theme, setThemeState] = useState<ThemeMode>('light');
  const [themeReady, setThemeReady] = useState(false);

  useEffect(() => {
    setLocaleState(detectLocale());
    setCountryScopeState(detectCountryScope());
    const detectedThemeMode = detectThemeMode();
    setThemeModeState(detectedThemeMode);
    setThemeState(detectedThemeMode === 'system' ? systemTheme() : detectedThemeMode);
    setThemeReady(true);
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined' || !themeReady) return;
    const media = window.matchMedia('(prefers-color-scheme: dark)');
    const apply = () => setThemeState(themeMode === 'system' ? (media.matches ? 'dark' : 'light') : themeMode);
    apply();
    if (themeMode !== 'system') return;
    media.addEventListener?.('change', apply);
    return () => media.removeEventListener?.('change', apply);
  }, [themeMode, themeReady]);

  useEffect(() => {
    if (!themeReady) return;
    document.documentElement.dataset.theme = theme;
    document.documentElement.style.colorScheme = theme;
    window.localStorage.setItem('melo-web-theme', theme);
    window.localStorage.setItem('melo-web-theme-mode', themeMode);
  }, [theme, themeMode, themeReady]);

  useEffect(() => {
    window.localStorage.setItem('melo-web-country-scope', countryScope);
  }, [countryScope]);

  useEffect(() => {
    document.documentElement.lang = locale;
    window.localStorage.setItem('melo-web-locale', locale);
  }, [locale]);

  const value = useMemo<SiteContextValue>(() => ({
    locale,
    setLocale: setLocaleState,
    t: (key) => dictionaries[locale][key] ?? dictionaries.en[key] ?? key,
    localeLabels,
    supportedLocales,
    countryScope,
    setCountryScope: setCountryScopeState,
    theme,
    themeMode,
    setTheme: (nextTheme) => setThemeModeState(nextTheme),
    setThemeMode: setThemeModeState,
    toggleTheme: () => setThemeModeState(theme === 'dark' ? 'light' : 'dark'),
  }), [countryScope, locale, theme, themeMode]);

  return <SiteContext.Provider value={value}>{children}</SiteContext.Provider>;
}

export function useLocale() {
  const context = useContext(SiteContext);
  if (!context) throw new Error('useLocale must be used within SiteProviders');
  return context;
}
