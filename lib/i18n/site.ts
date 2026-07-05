// ============================================================
// Public site (landing + auth) i18n loader. Independent locale
// (cookie: commerco_site_lang) from dashboard and store.
// ============================================================
import { cookies } from 'next/headers'
import { SITE_LANG_COOKIE, DEFAULT_LOCALE, isLocale, type Locale } from './config'
import type { Messages } from './core'
import ar from '@/messages/site/ar.json'
import en from '@/messages/site/en.json'
import fr from '@/messages/site/fr.json'

const CATALOG: Record<Locale, Messages> = { ar, en, fr }

export function getAllSiteMessages(): Record<Locale, Messages> {
  return CATALOG
}

export function getSiteLocale(): Locale {
  const raw = cookies().get(SITE_LANG_COOKIE)?.value
  return isLocale(raw) ? raw : DEFAULT_LOCALE
}
