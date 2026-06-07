'use client'

// Known color-name → swatch hex map (Arabic + common French/English names)
const COLOR_MAP: Record<string, string> = {
  'أحمر': '#DC2626', 'أزرق': '#2563EB', 'أخضر': '#16A34A', 'أصفر': '#FACC15',
  'أسود': '#171717', 'أبيض': '#FFFFFF', 'رمادي': '#9CA3AF', 'بني': '#92400E',
  'وردي': '#EC4899', 'بنفسجي': '#9333EA', 'برتقالي': '#F97316', 'كحلي': '#1E3A8A',
  'بيج': '#E7D8C3', 'ذهبي': '#D4AF37', 'فضي': '#C0C0C0', 'تركواز': '#06B6D4',
  red: '#DC2626', blue: '#2563EB', green: '#16A34A', yellow: '#FACC15',
  black: '#171717', white: '#FFFFFF', gray: '#9CA3AF', grey: '#9CA3AF',
  brown: '#92400E', pink: '#EC4899', purple: '#9333EA', orange: '#F97316',
  navy: '#1E3A8A', beige: '#E7D8C3', gold: '#D4AF37', silver: '#C0C0C0',
}

function isColorGroup(name: string) {
  const n = name.trim().toLowerCase()
  return n.includes('لون') || n.includes('color') || n.includes('couleur')
}

function swatchFor(option: string): string | null {
  const key = option.trim()
  return COLOR_MAP[key] ?? COLOR_MAP[key.toLowerCase()] ?? null
}

export interface VariantGroup { name: string; options: string[] }

interface Props {
  groups: VariantGroup[]
  selected: Record<string, string>
  onSelect: (groupName: string, option: string) => void
  isOptionAvailable?: (groupName: string, option: string) => boolean
}

export default function ProductVariants({ groups, selected, onSelect, isOptionAvailable }: Props) {
  if (!groups?.length) return null

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
      {groups.map(group => {
        const colorGroup = isColorGroup(group.name)
        return (
          <div key={group.name}>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: 10 }}>
              <span className="pt-text" style={{ fontSize: 13, fontWeight: 700, fontFamily: 'var(--font-tajawal)' }}>
                {group.name}
              </span>
              {selected[group.name] && (
                <span className="pt-text-soft" style={{ fontSize: 12, fontFamily: 'var(--font-tajawal)' }}>
                  — {selected[group.name]}
                </span>
              )}
            </div>

            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
              {group.options.map(opt => {
                const active = selected[group.name] === opt
                const available = isOptionAvailable ? isOptionAvailable(group.name, opt) : true
                const swatch = colorGroup ? swatchFor(opt) : null

                if (swatch) {
                  return (
                    <button
                      key={opt}
                      onClick={() => available && onSelect(group.name, opt)}
                      disabled={!available}
                      title={opt}
                      aria-label={opt}
                      style={{
                        position: 'relative',
                        width: 38, height: 38, borderRadius: '50%',
                        background: swatch,
                        border: active ? '3px solid var(--pt-accent)' : '2px solid var(--pt-border)',
                        cursor: available ? 'pointer' : 'not-allowed',
                        opacity: available ? 1 : 0.35,
                        boxShadow: swatch === '#FFFFFF' ? 'inset 0 0 0 1px #E2E8F0' : 'none',
                        outline: 'none',
                        transition: 'transform 0.12s ease',
                        transform: active ? 'scale(1.12)' : 'scale(1)',
                      }}>
                      {!available && (
                        <span style={{
                          position: 'absolute', inset: '-2px',
                          background: 'linear-gradient(to top right, transparent 47%, var(--pt-text-muted) 48%, var(--pt-text-muted) 52%, transparent 53%)',
                          borderRadius: '50%',
                        }} />
                      )}
                    </button>
                  )
                }

                return (
                  <button
                    key={opt}
                    onClick={() => available && onSelect(group.name, opt)}
                    disabled={!available}
                    style={{
                      minWidth: 46, height: 40, padding: '0 16px',
                      borderRadius: 'var(--pt-radius-pill)',
                      fontFamily: 'var(--font-tajawal)', fontSize: 13, fontWeight: 600,
                      background: active ? 'var(--pt-btn-primary-bg)' : 'var(--pt-surface)',
                      color: active ? 'var(--pt-btn-primary-text)' : 'var(--pt-text)',
                      border: active ? 'none' : '1.5px solid var(--pt-border)',
                      cursor: available ? 'pointer' : 'not-allowed',
                      opacity: available ? 1 : 0.4,
                      textDecoration: available ? 'none' : 'line-through',
                      transition: 'all 0.15s ease',
                      position: 'relative',
                    }}>
                    {opt}
                  </button>
                )
              })}
            </div>
          </div>
        )
      })}
    </div>
  )
}
