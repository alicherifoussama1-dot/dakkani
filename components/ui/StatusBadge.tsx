'use client'
import { useT } from '@/lib/i18n/react'

interface StatusBadgeProps {
  status: string
  size?: 'sm' | 'md'
}

// Status → semantic family (design system: color says status, text explains).
// Families map to token pairs and adapt to dark mode automatically.
const FAMILY: Record<string, string> = {
  // green — money in / completed
  confirmed: 'success', delivered: 'success', clean: 'success', sent_supplier: 'success', active: 'success',
  // amber — needs attention / in motion
  pending: 'warning', processing: 'warning', reviewing: 'warning', sending: 'warning', in_transit: 'warning',
  failed_1: 'warning', failed_2: 'warning', failed_3: 'warning',
  // red — lost / blocked
  cancelled: 'error', returned: 'error', abandoned: 'error', send_error: 'error', failed: 'error',
  // cobalt — new / system
  new: 'info', sent_sheet: 'info', shipped: 'info', waiting: 'info', postponed: 'info',
  // neutral
  no_status: 'neutral', inactive: 'neutral', duplicate: 'inverted',
}

const STYLES: Record<string, React.CSSProperties> = {
  success:  { background: 'var(--color-success-100)', color: 'var(--color-success-700)' },
  warning:  { background: 'var(--color-warning-100)', color: 'var(--color-warning-700)' },
  error:    { background: 'var(--color-error-100)',   color: 'var(--color-error-700)' },
  info:     { background: 'var(--color-primary-50)',  color: 'var(--color-primary-700)' },
  neutral:  { background: 'var(--surface-sunken)',    color: 'var(--text-secondary)' },
  inverted: { background: 'var(--surface-inverted)',  color: 'var(--surface-raised)' },
}

export default function StatusBadge({ status, size = 'md' }: StatusBadgeProps) {
  const t = useT()
  const style = STYLES[FAMILY[status] ?? 'neutral']
  const keyed = t(`status.${status}`)
  const label = keyed === `status.${status}` ? status : keyed // fallback: raw status
  const base = size === 'sm'
    ? 'inline-flex items-center font-semibold rounded-full px-1.5 text-[10px] h-[18px] whitespace-nowrap'
    : 'inline-flex items-center font-semibold rounded-full px-2 text-[11px] h-5 whitespace-nowrap'
  return <span className={base} style={style}>{label}</span>
}
