'use client'

import { useEffect, useState } from 'react'
import { Minus, Plus, ShoppingCart, Check, Truck, ChevronDown } from 'lucide-react'
import { formatDZD } from '@/lib/utils/format'
import WilayaSelector from '@/components/ui/WilayaSelector'
import { getBaladiasForWilaya } from '@/lib/algeria-baladias'

interface Props {
  price: number
  qty: number
  setQty: (n: number) => void
  maxQty?: number | null
  wilayaId: number | null
  setWilayaId: (id: number | null) => void
  baladia: string
  setBaladia: (name: string) => void
  added: boolean
  onAddToCart: () => void
  onBuyNow: () => void
  whatsappUrl?: string | null
  sticky?: boolean   // render as the mobile sticky bar variant
}

function BaladiaSelect({ wilayaId, value, onChange }: {
  wilayaId: number | null; value: string; onChange: (v: string) => void
}) {
  const [open, setOpen] = useState(false)
  const options = getBaladiasForWilaya(wilayaId)

  if (!wilayaId) return null

  return (
    <div style={{ position: 'relative' }}>
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        className="pt-input"
        style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          cursor: 'pointer', textAlign: 'right',
        }}>
        <span style={{ fontFamily: 'var(--font-tajawal)', color: value ? 'var(--pt-text)' : 'var(--pt-text-muted)' }}>
          {value || 'اختر البلدية'}
        </span>
        <ChevronDown size={16} className="pt-text-muted" style={{ transform: open ? 'rotate(180deg)' : 'none', transition: 'transform 0.15s' }} />
      </button>
      {open && (
        <>
          <div onClick={() => setOpen(false)} style={{ position: 'fixed', inset: 0, zIndex: 49 }} />
          <div className="pt-card-sm" style={{
            position: 'absolute', top: 'calc(100% + 6px)', insetInlineStart: 0, insetInlineEnd: 0,
            zIndex: 50, maxHeight: 240, overflowY: 'auto', padding: 6,
          }}>
            {options.map(b => (
              <button
                key={b}
                type="button"
                onClick={() => { onChange(b); setOpen(false) }}
                style={{
                  display: 'block', width: '100%', textAlign: 'right',
                  padding: '9px 12px', borderRadius: 'var(--pt-radius-sm)',
                  background: value === b ? 'var(--pt-accent-soft)' : 'transparent',
                  color: value === b ? 'var(--pt-accent-text)' : 'var(--pt-text)',
                  border: 'none', cursor: 'pointer',
                  fontFamily: 'var(--font-tajawal)', fontSize: 13, fontWeight: value === b ? 700 : 400,
                }}>
                {b}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  )
}

export default function ProductBuyBox({
  price, qty, setQty, maxQty, wilayaId, setWilayaId, baladia, setBaladia,
  added, onAddToCart, onBuyNow, whatsappUrl, sticky = false,
}: Props) {
  // Reset baladia when wilaya changes
  useEffect(() => { setBaladia('') }, [wilayaId]) // eslint-disable-line react-hooks/exhaustive-deps

  const canIncrement = maxQty == null || qty < maxQty

  if (sticky) {
    return (
      <div className="md:hidden pt-surface" style={{
        position: 'fixed', bottom: 0, insetInlineStart: 0, insetInlineEnd: 0, zIndex: 60,
        borderTop: '1px solid var(--pt-border)',
        boxShadow: '0 -8px 24px rgba(0,0,0,0.08)',
        padding: '10px 14px',
        paddingBottom: 'max(10px, env(safe-area-inset-bottom))',
        display: 'flex', gap: 8, alignItems: 'center',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <button onClick={() => setQty(Math.max(1, qty - 1))} className="pt-btn-secondary pt-btn"
            style={{ minHeight: 40, width: 40, padding: 0, fontSize: 13 }}>
            <Minus size={14} />
          </button>
          <span className="pt-text" style={{ fontWeight: 800, fontFamily: 'var(--font-inter)', minWidth: 22, textAlign: 'center' }}>{qty}</span>
          <button onClick={() => canIncrement && setQty(qty + 1)} className="pt-btn-secondary pt-btn"
            style={{ minHeight: 40, width: 40, padding: 0, fontSize: 13 }}>
            <Plus size={14} />
          </button>
        </div>
        <button onClick={onAddToCart} className="pt-btn pt-btn-secondary" style={{ flex: 1, fontSize: 13, padding: '0 10px', minHeight: 44 }}>
          {added ? <Check size={16} /> : <ShoppingCart size={16} />}
          {added ? 'أُضيف ✓' : 'أضف للسلة'}
        </button>
        <button onClick={onBuyNow} className="pt-btn pt-btn-primary" style={{ flex: 1.4, fontSize: 13, padding: '0 10px', minHeight: 44 }}>
          اشتري الآن — {formatDZD(price * qty)}
        </button>
      </div>
    )
  }

  return (
    <div className="pt-card" style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
      {/* Quantity */}
      <div>
        <label className="pt-text-soft" style={{ display: 'block', fontSize: 13, fontWeight: 600, marginBottom: 8, fontFamily: 'var(--font-tajawal)' }}>
          الكمية
        </label>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <button onClick={() => setQty(Math.max(1, qty - 1))} className="pt-btn-secondary pt-btn"
            style={{ width: 42, height: 42, minHeight: 0, padding: 0 }}>
            <Minus size={16} />
          </button>
          <span className="pt-heading" style={{ fontSize: 18, minWidth: 32, textAlign: 'center' }}>{qty}</span>
          <button onClick={() => canIncrement && setQty(qty + 1)} className="pt-btn-secondary pt-btn"
            style={{ width: 42, height: 42, minHeight: 0, padding: 0, opacity: canIncrement ? 1 : 0.4, cursor: canIncrement ? 'pointer' : 'not-allowed' }}>
            <Plus size={16} />
          </button>
          {typeof maxQty === 'number' && (
            <span className="pt-text-muted" style={{ fontSize: 12, fontFamily: 'var(--font-tajawal)' }}>
              ({maxQty} متوفر)
            </span>
          )}
        </div>
      </div>

      {/* Wilaya */}
      <div>
        <label className="pt-text-soft" style={{ display: 'block', fontSize: 13, fontWeight: 600, marginBottom: 8, fontFamily: 'var(--font-tajawal)' }}>
          الولاية <span style={{ color: 'var(--pt-danger)' }}>*</span>
        </label>
        <WilayaSelector value={wilayaId} onChange={w => setWilayaId(w?.id ?? null)} />
      </div>

      {/* Baladia — depends on wilaya */}
      {wilayaId && (
        <div>
          <label className="pt-text-soft" style={{ display: 'block', fontSize: 13, fontWeight: 600, marginBottom: 8, fontFamily: 'var(--font-tajawal)' }}>
            البلدية <span style={{ color: 'var(--pt-danger)' }}>*</span>
          </label>
          <BaladiaSelect wilayaId={wilayaId} value={baladia} onChange={setBaladia} />
        </div>
      )}

      {/* Delivery estimate */}
      {wilayaId && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Truck size={15} style={{ color: 'var(--pt-success)' }} />
          <span style={{ fontSize: 13, fontFamily: 'var(--font-tajawal)', color: 'var(--pt-success)', fontWeight: 600 }}>
            التوصيل خلال 24-72 ساعة لولايتك
          </span>
        </div>
      )}

      <hr className="pt-divider" />

      {/* CTAs */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        <button onClick={onBuyNow} className="pt-btn pt-btn-primary" style={{ width: '100%', fontSize: 16 }}>
          اشتري الآن ← {formatDZD(price * qty)}
        </button>
        <button onClick={onAddToCart} className="pt-btn pt-btn-secondary" style={{ width: '100%' }}>
          {added ? <><Check size={17} /> أُضيف للسلة ✓</> : <><ShoppingCart size={17} /> أضف للسلة</>}
        </button>
        {whatsappUrl && (
          <a href={whatsappUrl} target="_blank" rel="noopener noreferrer"
            className="pt-btn" style={{ width: '100%', background: '#25D366', color: '#fff' }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="white"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884"/></svg>
            اطلب عبر واتساب
          </a>
        )}
      </div>
    </div>
  )
}
