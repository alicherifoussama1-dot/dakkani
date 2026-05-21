interface StatusBadgeProps {
  status: string
  size?: 'sm' | 'md'
}

const STATUS_MAP: Record<string, { label: string; cls: string }> = {
  // Order confirmation statuses
  pending:      { label: 'معلقة',          cls: 'bg-[#CFF4FC] text-[#0A7A82]' },
  confirmed:    { label: 'مؤكدة',          cls: 'bg-[#D1E7DD] text-[#198754]' },
  cancelled:    { label: 'ملغاة',          cls: 'bg-[#F8D7DA] text-[#DC3545]' },
  failed_1:     { label: 'فاشلة 01',       cls: 'bg-[#FFF0E0] text-[#C76B00]' },
  failed_2:     { label: 'فاشلة 02',       cls: 'bg-[#FFE5CC] text-[#A85400]' },
  failed_3:     { label: 'فاشلة 03',       cls: 'bg-[#FFD9B3] text-[#8B4400]' },
  duplicate:    { label: 'مكررة',          cls: 'bg-[#212529] text-white' },
  postponed:    { label: 'مؤجلة',          cls: 'bg-[#EEE5FF] text-[#7B2FBE]' },
  // Order types
  clean:        { label: 'نظيف',           cls: 'bg-[#D1E7DD] text-[#198754]' },
  abandoned:    { label: 'مهجور',          cls: 'bg-[#F8D7DA] text-[#DC3545]' },
  reviewing:    { label: 'قيد المراجعة',   cls: 'bg-[#FFF3CD] text-[#997404]' },
  // Situations
  send_error:   { label: 'خطأ في الإرسال', cls: 'bg-[#F8D7DA] text-[#DC3545]' },
  sending:      { label: 'جارٍ الإرسال',  cls: 'bg-[#FFF3CD] text-[#997404]' },
  sent_supplier:{ label: 'أُرسل للمورد',  cls: 'bg-[#D1E7DD] text-[#198754]' },
  sent_sheet:   { label: 'أُرسل للشيت',   cls: 'bg-[#EBF5FF] text-[#0D6EFD]' },
  waiting:      { label: 'قيد التأكيد',   cls: 'bg-[#EEE5FF] text-[#7B2FBE]' },
  no_status:    { label: 'بدون حالة',      cls: 'bg-[#F1F3F5] text-[#495057]' },
  // Delivery
  delivered:    { label: 'مسلمة',          cls: 'bg-[#D1E7DD] text-[#198754]' },
  returned:     { label: 'مرجعة',          cls: 'bg-[#F8D7DA] text-[#DC3545]' },
  in_transit:   { label: 'في الطريق',      cls: 'bg-[#FFF3CD] text-[#997404]' },
  // General
  active:       { label: 'نشط',            cls: 'bg-[#D1E7DD] text-[#198754]' },
  inactive:     { label: 'غير نشط',        cls: 'bg-[#F1F3F5] text-[#495057]' },
  new:          { label: 'جديد',           cls: 'bg-[#EBF5FF] text-[#0D6EFD]' },
  shipped:      { label: 'شُحن',           cls: 'bg-[#EEE5FF] text-[#7B2FBE]' },
  processing:   { label: 'يُعالج',         cls: 'bg-[#FFF3CD] text-[#997404]' },
}

export default function StatusBadge({ status, size = 'md' }: StatusBadgeProps) {
  const cfg  = STATUS_MAP[status] ?? { label: status, cls: 'bg-[#F1F3F5] text-[#495057]' }
  const base = size === 'sm'
    ? 'inline-flex items-center font-medium rounded px-1.5 text-[10px] h-[18px]'
    : 'inline-flex items-center font-medium rounded px-2 text-[11px] h-5'
  return <span className={`${base} ${cfg.cls}`}>{cfg.label}</span>
}
