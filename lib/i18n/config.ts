// ============================================================
// i18n config — the ONLY place locales are declared.
// Add a language here + one JSON file per namespace, nothing else.
// ============================================================
export const LOCALES = ['ar', 'en', 'fr'] as const
export type Locale = (typeof LOCALES)[number]

export const DEFAULT_LOCALE: Locale = 'ar'

// Locales that render right-to-left.
export const RTL_LOCALES: Locale[] = ['ar']

// Map app locale → BCP-47 tag for Intl formatting.
export const INTL_LOCALE: Record<Locale, string> = {
  ar: 'ar-DZ',
  en: 'en-US',
  fr: 'fr-FR',
}

// Human labels for language switchers (shown in their own language).
export const LOCALE_LABELS: Record<Locale, string> = {
  ar: 'العربية',
  en: 'English',
  fr: 'Français',
}

export const LOCALE_FLAGS: Record<Locale, string> = {
  ar: '🇩🇿', en: '🇬🇧', fr: '🇫🇷',
}

export function isLocale(v: unknown): v is Locale {
  return typeof v === 'string' && (LOCALES as readonly string[]).includes(v)
}

export function dirOf(locale: Locale): 'rtl' | 'ltr' {
  return RTL_LOCALES.includes(locale) ? 'rtl' : 'ltr'
}

// Cookie names — dashboard, public site, and store persist INDEPENDENTLY.
export const DASHBOARD_LANG_COOKIE = 'commerco_dashboard_lang'
export const SITE_LANG_COOKIE = 'commerco_site_lang' // landing + auth (public marketing)
export const storeLangCookie = (storeId: string) => `dakkani_store_lang_${storeId}` // kept for backward compat
