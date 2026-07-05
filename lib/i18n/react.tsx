'use client'
// ============================================================
// React binding for the i18n core. ONE provider used by BOTH
// the dashboard and the storefront — each mounts its own instance
// with its own locale + messages, so the two stay independent.
// ============================================================
import { createContext, useContext, useMemo } from 'react'
import { createTranslator, type Messages, type Translator } from './core'
import { makeFormatters, type Formatters } from './formats'
import { dirOf, type Locale } from './config'

interface I18nValue extends Formatters {
  locale: Locale
  dir: 'rtl' | 'ltr'
  t: Translator
}

const I18nContext = createContext<I18nValue | null>(null)

export function I18nProvider({
  locale, messages, children,
}: { locale: Locale; messages: Messages; children: React.ReactNode }) {
  const value = useMemo<I18nValue>(() => ({
    locale,
    dir: dirOf(locale),
    t: createTranslator(messages),
    ...makeFormatters(locale),
  }), [locale, messages])
  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>
}

export function useI18n(): I18nValue {
  const ctx = useContext(I18nContext)
  if (!ctx) throw new Error('useI18n must be used within an <I18nProvider>')
  return ctx
}

// Ergonomic hooks.
export const useT = () => useI18n().t
export const useLocale = () => useI18n().locale
export const useDir = () => useI18n().dir
