'use client'
// Lightweight Algeria distribution "map": a dot-grid silhouette where each
// wilaya's dot brightens with its order share. No external SVG asset, no
// heavy geo library. Purely presentational; data comes from wilayaCounts.
//
// The 48 historic wilayas are laid out on a coarse grid that approximates
// Algeria's shape (dense north, sparse south). Intensity = orders / max.
import { useMemo } from 'react'

// Approx grid positions [col, row] on an 11x9 board, north at top.
// Not cartographically exact; it reads as "Algeria" and ranks activity.
const WILAYA_POS: Record<number, [number, number]> = {
  16: [5, 1], 42: [4, 1], 35: [6, 1], 9: [5, 2], 6: [7, 1], 15: [7, 2], 18: [8, 2],
  2: [3, 1], 44: [4, 2], 10: [6, 2], 34: [6, 3], 5: [8, 3], 43: [7, 2], 24: [8, 2],
  31: [3, 2], 27: [2, 2], 48: [2, 1], 29: [3, 3], 25: [5, 3], 19: [5, 2], 28: [6, 4],
  22: [1, 3], 46: [1, 2], 13: [2, 1], 20: [3, 4], 14: [4, 4], 38: [5, 4], 4: [8, 4],
  40: [7, 4], 12: [8, 4], 23: [9, 2], 21: [8, 1], 36: [9, 1], 41: [7, 3],
  17: [4, 5], 3: [5, 5], 32: [4, 6], 45: [2, 5], 1: [3, 6], 7: [7, 5], 39: [5, 6],
  33: [7, 6], 47: [5, 7], 30: [6, 6], 8: [4, 7], 11: [6, 8], 37: [3, 7],
}

const COLS = 11
const ROWS = 9

export default function AlgeriaMap({ counts }: { counts: Record<number, number> }) {
  const { max, total, top } = useMemo(() => {
    const values = Object.values(counts)
    const max = Math.max(1, ...values)
    const total = values.reduce((s, v) => s + v, 0)
    const top = Object.entries(counts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([w, c]) => ({ w: Number(w), c }))
    return { max, total, top }
  }, [counts])

  return (
    <div>
      <div
        className="grid mx-auto"
        style={{
          gridTemplateColumns: `repeat(${COLS}, 1fr)`,
          gridTemplateRows: `repeat(${ROWS}, 1fr)`,
          gap: 3,
          maxInlineSize: 240,
          aspectRatio: `${COLS} / ${ROWS}`,
        }}
        role="img"
        aria-label="التوزيع الجغرافي للطلبات حسب الولاية"
      >
        {Array.from({ length: COLS * ROWS }).map((_, idx) => {
          const col = (idx % COLS) + 1
          const row = Math.floor(idx / COLS) + 1
          const wilaya = Object.entries(WILAYA_POS).find(([, [c, r]]) => c === col && r === row)?.[0]
          const count = wilaya ? counts[Number(wilaya)] ?? 0 : 0
          const onLand = !!wilaya
          const intensity = count > 0 ? 0.35 + 0.65 * (count / max) : 0
          return (
            <span
              key={idx}
              style={{
                inlineSize: '100%', aspectRatio: '1', borderRadius: '50%',
                background: !onLand
                  ? 'transparent'
                  : count > 0
                    ? `color-mix(in srgb, var(--color-primary-600) ${Math.round(intensity * 100)}%, var(--surface-sunken))`
                    : 'var(--surface-sunken)',
              }}
            />
          )
        })}
      </div>

      {total > 0 ? (
        <ul className="mt-4 space-y-1.5" style={{ listStyle: 'none' }}>
          {top.map(({ w, c }) => (
            <li key={w} className="flex items-center justify-between" style={{ fontSize: 'var(--text-xs)' }}>
              <span style={{ color: 'var(--text-secondary)' }}>الولاية {String(w).padStart(2, '0')}</span>
              <span className="num" style={{ color: 'var(--text-primary)', fontWeight: 'var(--font-semibold)' }}>{c} طلب</span>
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-4 text-center" style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>
          لا توجد طلبات بعد لعرض التوزيع
        </p>
      )}
    </div>
  )
}
