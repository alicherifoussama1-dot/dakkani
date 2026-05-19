interface BadgeProps {
  variant: 'new' | 'bestseller' | 'sale'
  label?:  string
}

const CONFIGS = {
  new: {
    defaultLabel: 'جديد',
    bg: '#FFF0ED',
    color: '#E8431A',
    border: 'rgba(232,67,26,0.2)',
  },
  bestseller: {
    defaultLabel: 'الأكثر مبيعاً',
    bg: '#FFFBEB',
    color: '#D97706',
    border: 'rgba(217,119,6,0.2)',
  },
  sale: {
    defaultLabel: 'تخفيض',
    bg: '#E8431A',
    color: '#FFFFFF',
    border: 'transparent',
  },
}

export default function Badge({ variant, label }: BadgeProps) {
  const cfg  = CONFIGS[variant]
  const text = label ?? cfg.defaultLabel

  return (
    <span
      className="inline-block text-[10px] font-bold leading-none rounded-full px-2 py-1"
      style={{
        backgroundColor: cfg.bg,
        color: cfg.color,
        border: `1px solid ${cfg.border}`,
        fontFamily: 'var(--font-tajawal)',
        whiteSpace: 'nowrap',
      }}
    >
      {text}
    </span>
  )
}
