// ============================================================
// Locale-aware formatting via Intl. Currency stays DZD; only the
// presentation is localized. Numerals use Latin digits everywhere
// for consistency with dashboards/receipts (no arabic-indic).
// ============================================================
import { INTL_LOCALE, type Locale } from './config'

const numOpts = { numberingSystem: 'latn' } as Intl.NumberFormatOptions

export function makeFormatters(locale: Locale) {
  const tag = INTL_LOCALE[locale]
  return {
    formatNumber: (n: number, opts?: Intl.NumberFormatOptions) =>
      new Intl.NumberFormat(tag, { ...numOpts, ...opts }).format(n),

    formatCurrency: (n: number, currency = 'DZD') =>
      new Intl.NumberFormat(tag, { ...numOpts, style: 'currency', currency, maximumFractionDigits: 2 }).format(n),

    formatDate: (d: string | number | Date, opts: Intl.DateTimeFormatOptions = { dateStyle: 'medium' }) =>
      new Intl.DateTimeFormat(tag, { numberingSystem: 'latn', ...opts }).format(new Date(d)),
  }
}

export type Formatters = ReturnType<typeof makeFormatters>
