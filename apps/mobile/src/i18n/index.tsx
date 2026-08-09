// ============================================================
// i18n — ar · fr · en, with persistence.
//
// The website localises through next-intl; the app was written with its
// Arabic copy inline. This adds the layer that was missing: a persisted
// locale, a `t()` that falls back to Arabic for any key not yet
// translated, and the RTL flip that a locale change implies.
//
// Fallback is deliberate and load-bearing. Arabic is the source of truth,
// so a missing fr/en key shows correct Arabic rather than a raw key or an
// empty string — the app degrades to "not translated yet", never to
// "broken".
//
// RTL: React Native applies I18nManager.forceRTL only at process start, so
// switching between an RTL and an LTR locale needs a relaunch. The UI says
// so rather than half-flipping the layout.
// ============================================================
import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { I18nManager } from 'react-native'
import * as SecureStore from 'expo-secure-store'
import * as Localization from 'expo-localization'
import { ar } from './ar'
import { fr } from './fr'
import { en } from './en'

export type Locale = 'ar' | 'fr' | 'en'

export const LOCALES: Array<{ key: Locale; label: string; sub: string; rtl: boolean }> = [
  { key: 'ar', label: 'العربية', sub: 'من اليمين إلى اليسار', rtl: true },
  { key: 'fr', label: 'Français', sub: 'De gauche à droite', rtl: false },
  { key: 'en', label: 'English', sub: 'Left to right', rtl: false },
]

const DICTS: Record<Locale, Record<string, string>> = { ar, fr, en }
const K_LOCALE = 'commerco.locale'

export function isRTLLocale(l: Locale) { return l === 'ar' }

interface Ctx {
  locale: Locale
  /** Translate. Falls back to Arabic, then to the key itself. */
  t: (key: string, vars?: Record<string, string | number>) => string
  setLocale: (l: Locale) => Promise<void>
  /** True when the stored locale's direction differs from the running one,
   *  i.e. a relaunch is needed for the layout to match. */
  needsRestart: boolean
}

const I18nContext = createContext<Ctx>({
  locale: 'ar',
  t: k => ar[k] ?? k,
  setLocale: async () => {},
  needsRestart: false,
})

/** Interpolates {name} placeholders — the same shape next-intl uses. */
function interpolate(s: string, vars?: Record<string, string | number>) {
  if (!vars) return s
  return s.replace(/\{(\w+)\}/g, (m, k) => (k in vars ? String(vars[k]) : m))
}

/** Direction is a native, START-TIME decision in React Native: forceRTL only
 *  takes effect on the next launch. Applying it here — and NOWHERE else —
 *  is what makes the stored locale the single owner of layout direction. */
function applyDirection(l: Locale) {
  const rtl = isRTLLocale(l)
  if (rtl !== I18nManager.isRTL) {
    I18nManager.allowRTL(rtl)
    I18nManager.forceRTL(rtl)
  }
}

export function I18nProvider({ children }: { children: React.ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>('ar')
  const [ready, setReady] = useState(false)

  useEffect(() => {
    (async () => {
      const saved = await SecureStore.getItemAsync(K_LOCALE).catch(() => null)
      const resolved: Locale =
        saved === 'ar' || saved === 'fr' || saved === 'en'
          ? saved
          // First run: follow the device, but only into a locale we ship.
          : (() => {
              const dev = Localization.getLocales()[0]?.languageCode
              return dev === 'fr' ? 'fr' : dev === 'en' ? 'en' : 'ar'
            })()
      setLocaleState(resolved)
      // Re-assert the STORED locale's direction on every launch. app.json
      // sets forcesRTL:false, so Arabic (the default) has to claim RTL here —
      // and a merchant who chose French keeps LTR, instead of having it
      // silently forced back the way an unconditional forceRTL(true) did.
      applyDirection(resolved)
      setReady(true)
    })()
  }, [])

  const setLocale = useCallback(async (l: Locale) => {
    setLocaleState(l)
    await SecureStore.setItemAsync(K_LOCALE, l).catch(() => {})
    applyDirection(l)
  }, [])

  const t = useCallback((key: string, vars?: Record<string, string | number>) => {
    const dict = DICTS[locale]
    return interpolate(dict[key] ?? ar[key] ?? key, vars)
  }, [locale])

  const needsRestart = ready && isRTLLocale(locale) !== I18nManager.isRTL

  const value = useMemo<Ctx>(
    () => ({ locale, t, setLocale, needsRestart }),
    [locale, t, setLocale, needsRestart],
  )

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>
}

export function useI18n() { return useContext(I18nContext) }

/** Shorthand for components that only need the function. */
export function useT() { return useContext(I18nContext).t }
