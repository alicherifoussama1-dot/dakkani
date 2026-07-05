// ============================================================
// Dashboard i18n loader (server). Reads the persisted dashboard
// locale (independent from the store) and returns its messages.
// ============================================================
import { cookies } from 'next/headers'
import { DASHBOARD_LANG_COOKIE, DEFAULT_LOCALE, isLocale, type Locale } from './config'
import type { Messages } from './core'
import ar from '@/messages/dashboard/ar.json'
import en from '@/messages/dashboard/en.json'
import fr from '@/messages/dashboard/fr.json'

const CATALOG: Record<Locale, Messages> = { ar, en, fr }

export function getDashboardMessages(locale: Locale): Messages {
  return CATALOG[locale] ?? CATALOG[DEFAULT_LOCALE]
}

/** All catalogs — passed to the client provider for instant switching. */
export function getAllDashboardMessages(): Record<Locale, Messages> {
  return CATALOG
}

/** Read the dashboard locale from the cookie (server components). */
export function getDashboardLocale(): Locale {
  const raw = cookies().get(DASHBOARD_LANG_COOKIE)?.value
  return isLocale(raw) ? raw : DEFAULT_LOCALE
}
