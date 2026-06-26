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

// Pick a check-mark color that stays visible on the swatch.
function isLightHex(hex: string): boolean {
  const h = hex.replace('#', '')
  if (h.length < 6) return false
  const r = parseInt(h.slice(0, 2), 16), g = parseInt(h.slice(2, 4), 16), b = parseInt(h.slice(4, 6), 16)
  return (0.299 * r + 0.587 * g + 0.114 * b) > 160
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
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {groups.map(group => {
        const colorGroup = isColorGroup(group.name)
        return (
          <div key={group.name}>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, marginBottom: 12, flexWrap: 'wrap' }}>
              <span className="pt-text-soft" style={{ fontSize: 13, fontWeight: 700, fontFamily: 'var(--font-tajawal)' }}>
                {group.name}{selected[group.name] ? ':' : ''}
              </span>
              {selected[group.name] && (
                <span style={{ fontSize: 13, fontWeight: 800, fontFamily: 'var(--font-tajawal)', color: 'var(--pt-accent)' }}>
                  {selected[group.name]}
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
                      aria-pressed={active}
                      style={{
                        position: 'relative',
                        width: 44, height: 44, borderRadius: '50%',
                        background: swatch,
                        border: active ? '3px solid var(--pt-accent)' : '2px solid var(--pt-border)',
                        cursor: available ? 'pointer' : 'not-allowed',
                        opacity: available ? 1 : 0.35,
                        boxShadow: active
                          ? '0 0 0 2px var(--pt-surface), 0 2px 8px color-mix(in srgb, var(--pt-accent) 35%, transparent)'
                          : (swatch === '#FFFFFF' ? 'inset 0 0 0 1px #E2E8F0' : 'none'),
                        outline: 'none',
                        transition: 'transform 0.12s ease, box-shadow 0.12s ease',
                        transform: active ? 'scale(1.08)' : 'scale(1)',
                      }}>
                      {active && (
                        <span style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={isLightHex(swatch) ? '#171717' : '#fff'} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6L9 17l-5-5" /></svg>
                        </span>
                      )}
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
                    aria-pressed={active}
                    style={{
                      minWidth: 48, height: 44, padding: '0 18px',
                      borderRadius: 'var(--pt-radius-pill)',
                      fontFamily: 'var(--font-tajawal)', fontSize: 13, fontWeight: 600,
                      background: active ? 'var(--pt-btn-primary-bg)' : 'var(--pt-surface)',
                      color: active ? 'var(--pt-btn-primary-text)' : 'var(--pt-text)',
                      border: active ? 'none' : '1.5px solid var(--pt-border)',
                      boxShadow: active ? '0 2px 8px color-mix(in srgb, var(--pt-accent) 30%, transparent)' : 'none',
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
