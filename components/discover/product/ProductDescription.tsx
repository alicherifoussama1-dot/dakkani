'use client'

import { useState } from 'react'
import { Truck, Clock, ShieldCheck } from 'lucide-react'
import { cdnImage } from '@/lib/image-url'

interface Spec { label: string; value: string }

interface Props {
  description?: string | null
  descriptionImageUrl?: string | null
  specs?: Spec[]
}

const TABS = [
  { id: 'desc',     label: 'الوصف' },
  { id: 'delivery', label: 'معلومات التوصيل' },
  { id: 'specs',    label: 'المواصفات' },
] as const

export default function ProductDescription({ description, descriptionImageUrl, specs = [] }: Props) {
  const [tab, setTab] = useState<typeof TABS[number]['id']>('desc')

  return (
    <div className="pt-card" style={{ padding: 0, overflow: 'hidden' }}>
      {/* Tab headers */}
      <div style={{ display: 'flex', borderBottom: '1px solid var(--pt-border)', overflowX: 'auto' }}>
        {TABS.map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            style={{
              flex: '0 0 auto', padding: '16px 22px',
              background: 'none', border: 'none', cursor: 'pointer',
              fontFamily: 'var(--font-tajawal)', fontSize: 14, fontWeight: 700,
              color: tab === t.id ? 'var(--pt-accent-text)' : 'var(--pt-text-muted)',
              borderBottom: tab === t.id ? '2px solid var(--pt-accent)' : '2px solid transparent',
              marginBottom: -1,
              transition: 'color 0.15s',
              whiteSpace: 'nowrap',
            }}>
            {t.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div style={{ padding: 'var(--pt-card-padding)' }}>
        {tab === 'desc' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {description ? (
              <p className="pt-text-soft" style={{
                fontSize: 14, lineHeight: 2, fontFamily: 'var(--font-tajawal)', whiteSpace: 'pre-wrap', margin: 0,
              }}>{description}</p>
            ) : (
              !descriptionImageUrl && <p className="pt-text-muted" style={{ fontSize: 13, fontFamily: 'var(--font-tajawal)' }}>لا يوجد وصف لهذا المنتج بعد.</p>
            )}
            {descriptionImageUrl && (
              <div>
                <img
                  src={cdnImage(descriptionImageUrl, 1080)}
                  alt="وصف المنتج"
                  style={{ width: '100%', borderRadius: 'var(--pt-radius-md)', objectFit: 'contain', display: 'block' }}
                />
              </div>
            )}
          </div>
        )}

        {tab === 'delivery' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {[
              { Icon: Truck,       title: 'التوصيل لكل الـ48 ولاية', text: 'نوصل منتجاتنا إلى جميع ولايات الجزائر عبر شركاء التوصيل المعتمدين (يلدين، ZR Express، وغيرهم).' },
              { Icon: Clock,       title: 'مدة التوصيل', text: 'عادةً ما تصل الطلبية خلال 24 إلى 72 ساعة من تأكيد الطلب، حسب الولاية.' },
              { Icon: ShieldCheck, title: 'الدفع عند الاستلام', text: 'ادفع نقداً عند استلام طلبك — لا حاجة لبطاقة بنكية أو دفع مسبق.' },
            ].map((row, i) => (
              <div key={i} style={{ display: 'flex', gap: 14, alignItems: 'flex-start' }}>
                <div style={{
                  width: 38, height: 38, borderRadius: 'var(--pt-radius-md)',
                  background: 'var(--pt-accent-soft)', flexShrink: 0,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  <row.Icon size={17} style={{ color: 'var(--pt-accent-text)' }} />
                </div>
                <div>
                  <p className="pt-text" style={{ fontSize: 14, fontWeight: 700, margin: '0 0 4px', fontFamily: 'var(--font-tajawal)' }}>{row.title}</p>
                  <p className="pt-text-soft" style={{ fontSize: 13, lineHeight: 1.8, margin: 0, fontFamily: 'var(--font-tajawal)' }}>{row.text}</p>
                </div>
              </div>
            ))}
          </div>
        )}

        {tab === 'specs' && (
          specs.length > 0 ? (
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <tbody>
                {specs.map((s, i) => (
                  <tr key={i} style={{ borderBottom: i < specs.length - 1 ? '1px solid var(--pt-border)' : 'none' }}>
                    <td className="pt-text-soft" style={{ padding: '10px 0', fontSize: 13, fontFamily: 'var(--font-tajawal)', width: '40%' }}>{s.label}</td>
                    <td className="pt-text" style={{ padding: '10px 0', fontSize: 13, fontWeight: 600, fontFamily: 'var(--font-tajawal)' }}>{s.value}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <p className="pt-text-muted" style={{ fontSize: 13, fontFamily: 'var(--font-tajawal)' }}>لا توجد مواصفات إضافية لهذا المنتج.</p>
          )
        )}
      </div>
    </div>
  )
}
