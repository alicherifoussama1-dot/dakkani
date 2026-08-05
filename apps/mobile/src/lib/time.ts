// ============================================================
// TIME — Arabic relative formatting. Small enough not to warrant a
// dependency (moment/dayjs would add ~70KB for this).
// ============================================================

/** Arabic month names, used when the engine's ICU data is unavailable.
 *  Hermes ships only a partial Intl, so toLocale* can return an unlocalised
 *  or Arabic-Indic-digit string depending on the build. */
const AR_MONTHS = [
  'جانفي', 'فيفري', 'مارس', 'أفريل', 'ماي', 'جوان',
  'جويلية', 'أوت', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر',
]

const pad2 = (n: number) => (n < 10 ? `0${n}` : String(n))

export function relativeTime(iso: string): string {
  const t = new Date(iso).getTime()
  if (!Number.isFinite(t)) return ''
  const diff = Date.now() - t
  const m = Math.floor(diff / 60_000)
  if (m < 1) return 'الآن'
  if (m < 60) return `منذ ${m} د`
  const h = Math.floor(m / 60)
  if (h < 24) return `منذ ${h} س`
  const d = Math.floor(h / 24)
  if (d === 1) return 'أمس'
  if (d < 30) return `منذ ${d} يوم`
  const dt = new Date(iso)
  return `${dt.getDate()} ${AR_MONTHS[dt.getMonth()]}`
}

/** Full timestamp for detail views, Algiers-local as the merchant expects.
 *
 *  Computed rather than delegated to toLocaleString({ timeZone }): Hermes'
 *  partial Intl silently ignores the timeZone option on some builds, which
 *  would show the device's local time and quietly misreport when an order
 *  came in. Algeria is UTC+1 all year (no DST since 1981), so a fixed offset
 *  is exact and identical on every device. */
const ALGIERS_OFFSET_MIN = 60

export function fullDateTime(iso: string): string {
  const d = new Date(iso)
  if (!Number.isFinite(d.getTime())) return ''
  const local = new Date(d.getTime() + ALGIERS_OFFSET_MIN * 60_000)
  const day = local.getUTCDate()
  const month = AR_MONTHS[local.getUTCMonth()]
  return `${day} ${month}، ${pad2(local.getUTCHours())}:${pad2(local.getUTCMinutes())}`
}

/** Mirrors lib/utils/format.ts#formatDateShort on the website: fr-DZ,
 *  2-digit day/month, numeric year → "05/08/2026".
 *
 *  Hermes ships only a partial Intl, so the same deterministic fallback the
 *  number formatter uses applies here: verify the engine produced the exact
 *  expected shape, otherwise build it by hand. */
const shortDate: { format: (d: Date) => string } = (() => {
  const manual = (d: Date) => {
    const p = (n: number) => String(n).padStart(2, '0')
    return `${p(d.getDate())}/${p(d.getMonth() + 1)}/${d.getFullYear()}`
  }
  try {
    const f = new Intl.DateTimeFormat('fr-DZ', { year: 'numeric', month: '2-digit', day: '2-digit' })
    if (/^\d{2}\/\d{2}\/\d{4}$/.test(f.format(new Date(2026, 7, 5)))) return f
  } catch { /* Intl unavailable in this Hermes build */ }
  return { format: manual }
})()

export function formatDateShort(iso: string): string {
  const d = new Date(iso)
  return Number.isNaN(d.getTime()) ? '—' : shortDate.format(d)
}
