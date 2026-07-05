'use client'
// ============================================================
// React binding for the i18n core. ONE stateful provider used by
// BOTH the dashboard and the storefront/marketing — each mounts
// its own instance (own cookie + own catalogs), so the two stay
// fully independent. Switching is INSTANT (state) — no reload.
// ============================================================
import { createContext, useContext, useMemo, useState, useCallback, useEffect } from 'react'
import { createTranslator, type Messages, type Translator } from './core'
import { makeFormatters, type Formatters } from './formats'
import { dirOf, LOCALES, type Locale } from './config'

interface I18nValue extends Formatters {
  locale: Locale
  dir: 'rtl' | 'ltr'
  t: Translator
  setLocale: (l: Locale) => void
}

const I18nContext = createContext<I18nValue | null>(null)

export function I18nProvider({
  initialLocale, catalogs, cookieName, children,
}: {
  initialLocale: Locale
  catalogs: Record<Locale, Messages>
  cookieName: string
  children: React.ReactNode
}) {
  const [locale, setLocaleState] = useState<Locale>(initialLocale)

  const setLocale = useCallback((l: Locale) => {
    if (!LOCALES.includes(l)) return
    document.cookie = `${cookieName}=${l}; path=/; max-age=31536000; samesite=lax`
    setLocaleState(l)
  }, [cookieName])

  // Keep <html dir/lang> in sync so global CSS + a11y follow the active locale.
  useEffect(() => {
    const dir = dirOf(locale)
    document.documentElement.setAttribute('dir', dir)
    document.documentElement.setAttribute('lang', locale)
  }, [locale])

  const value = useMemo<I18nValue>(() => ({
    locale,
    dir: dirOf(locale),
    t: createTranslator(catalogs[locale] ?? catalogs[initialLocale]),
    setLocale,
    ...makeFormatters(locale),
  }), [locale, catalogs, initialLocale, setLocale])

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>
}

export function useI18n(): I18nValue {
  const ctx = useContext(I18nContext)
  if (!ctx) throw new Error('useI18n must be used within an <I18nProvider>')
  return ctx
}

export const useT = () => useI18n().t
export const useLocale = () => useI18n().locale
export const useDir = () => useI18n().dir
export const useSetLocale = () => useI18n().setLocale
