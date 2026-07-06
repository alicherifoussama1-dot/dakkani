'use client'
import { useT } from '@/lib/i18n/react'

interface StatusBadgeProps {
  status: string
  size?: 'sm' | 'md'
}

// Visual style per status — labels come from the i18n catalog (status.*).
const STATUS_CLS: Record<string, string> = {
  pending: 'bg-[#CFF4FC] text-[#0A7A82]', confirmed: 'bg-[#D1E7DD] text-[#198754]',
  cancelled: 'bg-[#F8D7DA] text-[#DC3545]', failed_1: 'bg-[#FFF0E0] text-[#C76B00]',
  failed_2: 'bg-[#FFE5CC] text-[#A85400]', failed_3: 'bg-[#FFD9B3] text-[#8B4400]',
  duplicate: 'bg-[#212529] text-white', postponed: 'bg-[#EEE5FF] text-[#7B2FBE]',
  clean: 'bg-[#D1E7DD] text-[#198754]', abandoned: 'bg-[#F8D7DA] text-[#DC3545]',
  reviewing: 'bg-[#FFF3CD] text-[#997404]', send_error: 'bg-[#F8D7DA] text-[#DC3545]',
  sending: 'bg-[#FFF3CD] text-[#997404]', sent_supplier: 'bg-[#D1E7DD] text-[#198754]',
  sent_sheet: 'bg-[#EBF5FF] text-[#0D6EFD]', waiting: 'bg-[#EEE5FF] text-[#7B2FBE]',
  no_status: 'bg-[#F1F3F5] text-[#495057]', delivered: 'bg-[#D1E7DD] text-[#198754]',
  returned: 'bg-[#F8D7DA] text-[#DC3545]', in_transit: 'bg-[#FFF3CD] text-[#997404]',
  active: 'bg-[#D1E7DD] text-[#198754]', inactive: 'bg-[#F1F3F5] text-[#495057]',
  new: 'bg-[#EBF5FF] text-[#0D6EFD]', shipped: 'bg-[#EEE5FF] text-[#7B2FBE]',
  processing: 'bg-[#FFF3CD] text-[#997404]',
}

export default function StatusBadge({ status, size = 'md' }: StatusBadgeProps) {
  const t = useT()
  const cls = STATUS_CLS[status] ?? 'bg-[#F1F3F5] text-[#495057]'
  const keyed = t(`status.${status}`)
  const label = keyed === `status.${status}` ? status : keyed // fallback: raw status
  const base = size === 'sm'
    ? 'inline-flex items-center font-medium rounded px-1.5 text-[10px] h-[18px]'
    : 'inline-flex items-center font-medium rounded px-2 text-[11px] h-5'
  return <span className={`${base} ${cls}`}>{label}</span>
}
