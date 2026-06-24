'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Plus, Search, Pencil, Navigation2 } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

const TRACKING_TYPES = [
  { id: 'facebook', label: 'فيسبوك',  color: '#1877F2' },
  { id: 'tiktok',   label: 'تيك توك', color: '#000000' },
  { id: 'snapchat', label: 'سناب شات',color: '#FFFC00' },
  { id: 'google',   label: 'جوجل',    color: '#4285F4' },
]

interface Props {
  storeId: string
  pixels: { meta_pixel_id?: string | null; tiktok_pixel_id?: string | null; google_tag_id?: string | null; snapchat_pixel_id?: string | null }
}

export default function TrackingPageClient({ storeId, pixels }: Props) {
  const router = useRouter()
  const [showCreate, setShowCreate] = useState(false)
  const [form, setForm] = useState({ type: 'facebook', name: '', pixel: '', token: '', isDefault: false })
  const [saving, setSaving] = useState(false)

  const PIXEL_ROWS = [
    { type: 'facebook', label: 'فيسبوك',   icon: '📘', current: pixels.meta_pixel_id,    field: 'meta_pixel_id' },
    { type: 'tiktok',   label: 'تيك توك',  icon: '🎵', current: pixels.tiktok_pixel_id,  field: 'tiktok_pixel_id' },
    { type: 'google',   label: 'جوجل',     icon: '🔍', current: pixels.google_tag_id,     field: 'google_tag_id' },
    { type: 'snapchat', label: 'سناب شات', icon: '👻', current: pixels.snapchat_pixel_id, field: 'snapchat_pixel_id' },
  ]

  const handleSave = async () => {
    setSaving(true)
    const sb = createClient()
    const update: any = {}
    if (form.type === 'facebook') update.meta_pixel_id = form.pixel
    if (form.type === 'tiktok')   update.tiktok_pixel_id = form.pixel
    if (form.type === 'google')   update.google_tag_id = form.pixel
    if (form.type === 'snapchat') update.snapchat_pixel_id = form.pixel
    await sb.from('stores').update(update).eq('id', storeId)
    setSaving(false)
    setShowCreate(false)
    router.refresh()
  }

  return (
    <div className="p-4 md:p-6 max-w-4xl mx-auto" dir="rtl" style={{ fontFamily: 'var(--font-arabic)' }}>
      <div className="flex items-center justify-between flex-wrap gap-3 mb-5">
        <h1 className="page-title">التتبع</h1>
        <button onClick={() => setShowCreate(true)} className="btn btn-primary btn-sm gap-1.5">
          <Plus size={14} />إنشاء تتبع
        </button>
      </div>

      {/* Pixels table */}
      <div className="card overflow-hidden mb-4">
        <div className="px-4 py-3 border-b font-semibold text-sm" style={{ borderColor: 'var(--color-border)', color: 'var(--color-text-primary)' }}>
          بكسلات التتبع الحالية
        </div>
        <table className="data-table">
          <thead>
            <tr>{['النوع','الاسم','بكسل التتبع','الافتراضي','إجراءات'].map(h => <th key={h}>{h}</th>)}</tr>
          </thead>
          <tbody>
            {PIXEL_ROWS.filter(r => r.current).map(row => (
              <tr key={row.type}>
                <td>
                  <div className="flex items-center gap-2">
                    <span>{row.icon}</span>
                    <span className="font-medium text-sm" style={{ color: 'var(--color-text-primary)' }}>{row.label}</span>
                  </div>
                </td>
                <td className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>{row.label} Pixel</td>
                <td><span className="font-mono text-xs" style={{ color: 'var(--color-accent)' }}>{row.current}</span></td>
                <td><input type="checkbox" defaultChecked className="w-3.5 h-3.5 accent-[#0D6EFD]" /></td>
                <td>
                  <button onClick={() => { setForm(f => ({ ...f, type: row.type, pixel: row.current ?? '', name: row.label })); setShowCreate(true) }}
                    className="p-1.5 rounded hover:bg-[#EBF5FF] transition-colors">
                    <Pencil size={13} style={{ color: 'var(--color-accent)' }} />
                  </button>
                </td>
              </tr>
            ))}
            {!PIXEL_ROWS.some(r => r.current) && (
              <tr><td colSpan={5} className="text-center py-12 text-sm" style={{ color: 'var(--color-text-muted)' }}>
                <Navigation2 size={24} className="mx-auto mb-2 opacity-40" />
                لا توجد بكسلات مضبوطة — أضف بكسلك الأول
              </td></tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Create/Edit form */}
      {showCreate && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={() => setShowCreate(false)}>
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md animate-scale-in overflow-hidden" dir="rtl" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between p-5 border-b" style={{ borderColor: 'var(--color-border)' }}>
              <h3 className="font-bold text-base" style={{ color: 'var(--color-text-primary)' }}>إضافة بكسل تتبع</h3>
              <button onClick={() => setShowCreate(false)} className="p-1.5 rounded hover:bg-[#F8F9FA]">✕</button>
            </div>
            <div className="p-5 space-y-4">
              <div>
                <label className="block text-xs mb-1.5 font-medium" style={{ color: 'var(--color-text-secondary)' }}>نوع التتبع</label>
                <select value={form.type} onChange={e => setForm(f => ({ ...f, type: e.target.value }))} className="input text-sm">
                  {TRACKING_TYPES.map(t => <option key={t.id} value={t.id}>{t.label}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs mb-1.5 font-medium" style={{ color: 'var(--color-text-secondary)' }}>اسم التتبع</label>
                <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} className="input text-sm" placeholder="مثال: Meta Pixel الرئيسي" />
              </div>
              <div>
                <label className="block text-xs mb-1.5 font-medium" style={{ color: 'var(--color-text-secondary)' }}>بكسل التتبع / ID</label>
                <input value={form.pixel} onChange={e => setForm(f => ({ ...f, pixel: e.target.value }))} className="input text-sm font-mono" placeholder="123456789012345" dir="ltr" />
              </div>
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={form.isDefault} onChange={e => setForm(f => ({ ...f, isDefault: e.target.checked }))} className="w-4 h-4 accent-[#0D6EFD]" />
                <span className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>تعيين كافتراضي</span>
              </label>
              <div className="flex gap-3 pt-2">
                <button onClick={handleSave} disabled={saving || !form.pixel} className="btn btn-primary flex-1" style={{ fontFamily: 'var(--font-arabic)' }}>
                  {saving ? 'جارٍ الحفظ...' : 'حفظ'}
                </button>
                <button onClick={() => setShowCreate(false)} className="btn btn-ghost flex-1" style={{ fontFamily: 'var(--font-arabic)' }}>إلغاء</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
