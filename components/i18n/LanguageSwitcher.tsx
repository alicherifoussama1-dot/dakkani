'use client'
// ============================================================
// LanguageSwitcher — segmented AR | FR | EN control.
// No dropdown. Selected = primary color, others neutral.
// Minimal/premium (Stripe/Linear/Vercel/Apple style).
// Instant switch via i18n context (no page reload).
// ============================================================
import { LOCALES, type Locale } from '@/lib/i18n/config'
import { useLocale, useSetLocale } from '@/lib/i18n/react'

const SHORT: Record<Locale, string> = { ar: 'AR', fr: 'FR', en: 'EN' }
// Fixed display order regardless of active locale: AR | FR | EN
const ORDER: Locale[] = ['ar', 'fr', 'en']

export default function LanguageSwitcher({ className = '' }: { className?: string }) {
  const locale = useLocale()
  const setLocale = useSetLocale()
  const items = ORDER.filter(l => LOCALES.includes(l))

  return (
    <div
      dir="ltr"
      role="group"
      aria-label="Language"
      className={`inline-flex items-center rounded-full p-0.5 select-none ${className}`}
      style={{ background: 'var(--color-bg-soft, #F1F3F5)', border: '1px solid var(--color-border, #E5E7EB)' }}
    >
      {items.map((l, i) => {
        const active = locale === l
        return (
          <button
            key={l}
            type="button"
            onClick={() => setLocale(l)}
            aria-pressed={active}
            className="relative px-2.5 py-1 text-[11px] font-bold tracking-wide rounded-full transition-all duration-150"
            style={active
              ? { background: 'var(--color-accent, #0D6EFD)', color: '#fff', boxShadow: '0 1px 2px rgba(0,0,0,0.12)' }
              : { background: 'transparent', color: 'var(--color-text-muted, #6B7280)' }}
          >
            {SHORT[l]}
          </button>
        )
      })}
    </div>
  )
}
