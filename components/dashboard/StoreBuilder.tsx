'use client'
import { useState, useCallback, useRef, useEffect } from 'react'
import {
  DndContext, closestCenter, PointerSensor, useSensor, useSensors, type DragEndEvent,
} from '@dnd-kit/core'
import {
  SortableContext, verticalListSortingStrategy, useSortable, arrayMove,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import {
  GripVertical, Eye, EyeOff, Trash2, Plus, Sparkles, Save, ChevronDown, Palette, X, Loader2,
} from 'lucide-react'
import {
  SECTION_META, SECTION_TYPES, newSection,
  type StoreSection, type StorefrontSectionType,
} from '@/lib/storefront/sections'
import { PRODUCT_THEMES } from '@/lib/product-themes'

type FieldType = 'text' | 'textarea' | 'bool' | 'list' | 'image' | 'imagelist'

async function uploadFile(file: File): Promise<string | null> {
  const fd = new FormData(); fd.append('file', file); fd.append('folder', 'store')
  const res = await fetch('/api/upload', { method: 'POST', body: fd })
  if (!res.ok) return null
  const d = await res.json().catch(() => ({})); return d.url ?? null
}
const FIELDS: Record<StorefrontSectionType, { key: string; label: string; type: FieldType }[]> = {
  announcement: [{ key: 'text', label: 'النص (افصل الجمل بـ ·)', type: 'textarea' }],
  hero: [
    { key: 'headline', label: 'العنوان', type: 'text' }, { key: 'subheadline', label: 'العنوان الفرعي', type: 'text' },
    { key: 'cta_label', label: 'نص الزر', type: 'text' }, { key: 'image_url', label: 'صورة الخلفية', type: 'image' },
  ],
  featured: [{ key: 'title', label: 'العنوان', type: 'text' }],
  collections: [{ key: 'title', label: 'العنوان', type: 'text' }],
  product_grid: [{ key: 'title', label: 'العنوان', type: 'text' }, { key: 'subtitle', label: 'الوصف', type: 'text' }],
  image_text: [
    { key: 'title', label: 'العنوان', type: 'text' }, { key: 'body', label: 'النص', type: 'textarea' },
    { key: 'image_url', label: 'الصورة', type: 'image' }, { key: 'cta_label', label: 'نص الزر', type: 'text' },
    { key: 'cta_href', label: 'رابط الزر', type: 'text' }, { key: 'reverse', label: 'عكس الترتيب', type: 'bool' },
  ],
  icon_list: [],
  testimonials: [{ key: 'title', label: 'العنوان', type: 'text' }],
  gallery: [{ key: 'title', label: 'العنوان', type: 'text' }, { key: 'images', label: 'الصور', type: 'imagelist' }],
  newsletter: [{ key: 'title', label: 'العنوان', type: 'text' }, { key: 'cta_label', label: 'نص الزر', type: 'text' }],
}

interface Props {
  storeId: string; storeSlug: string; storeName: string
  initialLayout: StoreSection[]; initialTheme: string
}

export default function StoreBuilder({ storeId, storeSlug, storeName, initialLayout, initialTheme }: Props) {
  const [layout, setLayout] = useState<StoreSection[]>(initialLayout)
  const [theme, setTheme] = useState(initialTheme)
  const [expanded, setExpanded] = useState<string | null>(null)
  const [addOpen, setAddOpen] = useState(false)
  const [themeOpen, setThemeOpen] = useState(false)
  const [aiOpen, setAiOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [toast, setToast] = useState('')
  const iframeRef = useRef<HTMLIFrameElement>(null)
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }))

  const flash = (m: string) => { setToast(m); setTimeout(() => setToast(''), 2500) }

  // Push the (unsaved) layout + theme to the preview iframe — live, debounced.
  const pushPreview = useCallback(() => {
    iframeRef.current?.contentWindow?.postMessage({ type: 'dakkani-preview', layout, theme }, '*')
  }, [layout, theme])
  useEffect(() => { const t = setTimeout(pushPreview, 250); return () => clearTimeout(t) }, [pushPreview])
  useEffect(() => {
    const onMsg = (e: MessageEvent) => { if (e.data?.type === 'dakkani-preview-ready') pushPreview() }
    window.addEventListener('message', onMsg)
    return () => window.removeEventListener('message', onMsg)
  }, [pushPreview])

  const onDragEnd = (e: DragEndEvent) => {
    const { active, over } = e
    if (!over || active.id === over.id) return
    setLayout(prev => {
      const from = prev.findIndex(s => s.id === active.id)
      const to = prev.findIndex(s => s.id === over.id)
      return from < 0 || to < 0 ? prev : arrayMove(prev, from, to)
    })
  }
  const toggle = (id: string) => setLayout(prev => prev.map(s => s.id === id ? { ...s, visible: !s.visible } : s))
  const remove = (id: string) => setLayout(prev => prev.filter(s => s.id !== id))
  const addSection = (type: StorefrontSectionType) => { setLayout(prev => [...prev, newSection(type)]); setAddOpen(false) }
  const setField = (id: string, key: string, value: any) =>
    setLayout(prev => prev.map(s => s.id === id ? { ...s, settings: { ...s.settings, [key]: value } } : s))

  const save = useCallback(async () => {
    setSaving(true)
    try {
      const res = await fetch('/api/store/layout', {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ storeId, layout, theme_key: theme }),
      })
      if (!res.ok) { flash('تعذّر الحفظ'); return }
      flash('✓ تم الحفظ ونشره على المتجر')
    } catch { flash('خطأ في الشبكة') }
    finally { setSaving(false) }
  }, [storeId, layout, theme])

  const onAIResult = (newLayout: StoreSection[], newTheme: string) => {
    setLayout(newLayout); setTheme(newTheme); setAiOpen(false)
    flash('✓ تم توليد المتجر — راجعه ثم احفظ')
  }

  return (
    <div dir="rtl" style={{ fontFamily: 'var(--font-arabic)' }} className="h-[calc(100vh-0px)]">
      {/* Top bar */}
      <div className="flex items-center justify-between gap-2 px-4 py-3 border-b bg-white" style={{ borderColor: '#E9ECEF' }}>
        <div className="flex items-center gap-2">
          <h1 className="font-black text-lg" style={{ color: '#0D6EFD' }}>مُنشئ المتجر</h1>
          <span className="text-xs text-gray-400">{storeName}</span>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => setAiOpen(true)} className="h-9 px-3 rounded-xl text-sm font-bold text-white flex items-center gap-1.5"
            style={{ background: 'linear-gradient(135deg,#7C3AED,#C026D3)' }}>
            <Sparkles size={15} /> أنشئ بالذكاء الاصطناعي
          </button>
          <div className="relative">
            <button onClick={() => setThemeOpen(o => !o)} className="h-9 px-3 rounded-xl text-sm font-bold border flex items-center gap-1.5"
              style={{ borderColor: '#0D6EFD', color: '#0D6EFD' }}>
              <Palette size={15} /> الثيم: {PRODUCT_THEMES.find(t => t.key === theme)?.name ?? theme}
            </button>
            {themeOpen && (
              <>
                <div className="fixed inset-0 z-10" onClick={() => setThemeOpen(false)} />
                <div className="absolute left-0 top-full mt-1 w-64 bg-white border rounded-2xl shadow-xl z-20 p-2 grid grid-cols-2 gap-2" style={{ borderColor: '#E9ECEF' }}>
                  {PRODUCT_THEMES.map(t => (
                    <button key={t.key} onClick={() => { setTheme(t.key); setThemeOpen(false) }}
                      className="p-2 rounded-xl border text-right" style={{ borderColor: theme === t.key ? '#0D6EFD' : '#E9ECEF', background: theme === t.key ? '#EFF6FF' : '#fff' }}>
                      <div className="flex gap-1 mb-1">
                        <span className="w-4 h-4 rounded-full" style={{ background: t.preview.bg, border: '1px solid #ddd' }} />
                        <span className="w-4 h-4 rounded-full" style={{ background: t.preview.accent }} />
                        <span className="w-4 h-4 rounded-full" style={{ background: t.preview.surface }} />
                      </div>
                      <span className="text-xs font-bold">{t.name}</span>
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>
          <button onClick={save} disabled={saving} className="h-9 px-4 rounded-xl text-sm font-bold text-white flex items-center gap-1.5 disabled:opacity-60" style={{ background: '#0D6EFD' }}>
            {saving ? <Loader2 size={15} className="animate-spin" /> : <Save size={15} />} حفظ
          </button>
        </div>
      </div>

      <div className="grid lg:grid-cols-[420px_1fr] h-[calc(100vh-57px)]">
        {/* Builder panel */}
        <div className="overflow-y-auto p-4 space-y-2 border-l bg-[#F8F9FA]" style={{ borderColor: '#E9ECEF' }}>
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
            <SortableContext items={layout.map(s => s.id)} strategy={verticalListSortingStrategy}>
              {layout.map(section => (
                <SortableRow key={section.id} section={section}
                  expanded={expanded === section.id} onExpand={() => setExpanded(expanded === section.id ? null : section.id)}
                  onToggle={() => toggle(section.id)} onRemove={() => remove(section.id)} onField={setField} />
              ))}
            </SortableContext>
          </DndContext>

          {/* Add section */}
          <div className="relative">
            <button onClick={() => setAddOpen(o => !o)} className="w-full h-11 rounded-xl border-2 border-dashed font-bold text-sm flex items-center justify-center gap-1.5"
              style={{ borderColor: '#0D6EFD', color: '#0D6EFD' }}>
              <Plus size={16} /> إضافة قسم
            </button>
            {addOpen && (
              <>
                <div className="fixed inset-0 z-10" onClick={() => setAddOpen(false)} />
                <div className="absolute inset-x-0 top-full mt-1 bg-white border rounded-2xl shadow-xl z-20 p-2 grid grid-cols-2 gap-1.5 max-h-72 overflow-y-auto" style={{ borderColor: '#E9ECEF' }}>
                  {SECTION_TYPES.map(t => (
                    <button key={t} onClick={() => addSection(t)} className="p-2 rounded-xl border text-right hover:bg-[#EFF6FF]" style={{ borderColor: '#E9ECEF' }}>
                      <span className="text-xs font-bold block">{SECTION_META[t].label}</span>
                      <span className="text-[10px] text-gray-400">{SECTION_META[t].description}</span>
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>

        {/* Live preview (reflects last save) */}
        <div className="bg-[#E9ECEF] overflow-hidden hidden lg:flex flex-col">
          <div className="px-4 py-1.5 text-[11px] text-gray-500 bg-white border-b" style={{ borderColor: '#E9ECEF' }}>
            معاينة حيّة — تتحدّث فور التعديل · اضغط حفظ للنشر
          </div>
          <iframe ref={iframeRef} src={`/store/${storeSlug}/preview`} className="flex-1 w-full bg-white" title="معاينة حيّة" />
        </div>
      </div>

      {aiOpen && <AIModal storeId={storeId} defaultName={storeName} onClose={() => setAiOpen(false)} onResult={onAIResult} />}
      {toast && (
        <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 px-4 py-2 rounded-xl text-sm font-bold text-white shadow-lg" style={{ background: '#0D6EFD' }}>
          {toast}
        </div>
      )}
    </div>
  )
}

// ── Sortable section row + inline editor ──────────────────────
function SortableRow({ section, expanded, onExpand, onToggle, onRemove, onField }: {
  section: StoreSection; expanded: boolean; onExpand: () => void
  onToggle: () => void; onRemove: () => void; onField: (id: string, key: string, value: any) => void
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: section.id })
  const meta = SECTION_META[section.type]
  const style = { transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.5 : 1 }
  return (
    <div ref={setNodeRef} style={style} className="bg-white border rounded-2xl" {...(section.visible ? {} : { 'data-hidden': true })}>
      <div className="flex items-center gap-1.5 p-2.5" style={{ borderColor: '#E9ECEF' }}>
        <button {...attributes} {...listeners} className="cursor-grab touch-none p-1 text-gray-400" title="اسحب لإعادة الترتيب"><GripVertical size={16} /></button>
        <button onClick={onExpand} className="flex-1 text-right">
          <span className="text-sm font-bold" style={{ color: section.visible ? '#212529' : '#ADB5BD' }}>{meta.label}</span>
        </button>
        <button onClick={onToggle} className="p-1.5 rounded-lg hover:bg-gray-100" title={section.visible ? 'إخفاء' : 'إظهار'}>
          {section.visible ? <Eye size={15} style={{ color: '#0D6EFD' }} /> : <EyeOff size={15} style={{ color: '#ADB5BD' }} />}
        </button>
        <button onClick={onExpand} className="p-1.5 rounded-lg hover:bg-gray-100"><ChevronDown size={15} className={expanded ? 'rotate-180 transition' : 'transition'} /></button>
        <button onClick={onRemove} className="p-1.5 rounded-lg hover:bg-red-50" title="حذف"><Trash2 size={15} style={{ color: '#DC3545' }} /></button>
      </div>
      {expanded && FIELDS[section.type].length > 0 && (
        <div className="px-3 pb-3 space-y-2 border-t pt-2" style={{ borderColor: '#F1F3F5' }}>
          {FIELDS[section.type].map(f => {
            const val = section.settings?.[f.key]
            if (f.type === 'bool') return (
              <label key={f.key} className="flex items-center gap-2 text-xs cursor-pointer">
                <input type="checkbox" checked={!!val} onChange={e => onField(section.id, f.key, e.target.checked)} className="w-4 h-4 accent-[#0D6EFD]" />
                {f.label}
              </label>
            )
            if (f.type === 'list') return (
              <div key={f.key}>
                <label className="block text-[11px] mb-0.5 text-gray-500">{f.label}</label>
                <textarea rows={3} value={Array.isArray(val) ? val.join('\n') : ''} dir="ltr"
                  onChange={e => onField(section.id, f.key, e.target.value.split('\n').map(s => s.trim()).filter(Boolean))}
                  className="w-full border rounded-lg px-2 py-1.5 text-xs outline-none" style={{ borderColor: '#E9ECEF' }} />
              </div>
            )
            if (f.type === 'image') return (
              <ImageField key={f.key} label={f.label} value={typeof val === 'string' ? val : ''} onChange={v => onField(section.id, f.key, v)} />
            )
            if (f.type === 'imagelist') return (
              <ImageListField key={f.key} label={f.label} value={Array.isArray(val) ? val : []} onChange={v => onField(section.id, f.key, v)} />
            )
            const Tag = f.type === 'textarea' ? 'textarea' : 'input'
            return (
              <div key={f.key}>
                <label className="block text-[11px] mb-0.5 text-gray-500">{f.label}</label>
                <Tag value={val ?? ''} onChange={(e: any) => onField(section.id, f.key, e.target.value)}
                  {...(f.type === 'textarea' ? { rows: 2 } : {})}
                  className="w-full border rounded-lg px-2 py-1.5 text-xs outline-none resize-none" style={{ borderColor: '#E9ECEF' }} />
              </div>
            )
          })}
        </div>
      )}
      {expanded && FIELDS[section.type].length === 0 && (
        <div className="px-3 pb-3 text-[11px] text-gray-400 border-t pt-2" style={{ borderColor: '#F1F3F5' }}>{meta.description} — لا توجد إعدادات</div>
      )}
    </div>
  )
}

// ── AI generator modal ────────────────────────────────────────
function AIModal({ storeId, defaultName, onClose, onResult }: {
  storeId: string; defaultName: string; onClose: () => void
  onResult: (layout: StoreSection[], theme: string) => void
}) {
  const [name, setName] = useState(defaultName)
  const [niche, setNiche] = useState('')
  const [vibe, setVibe] = useState('')
  const [loading, setLoading] = useState(false)
  const [err, setErr] = useState('')

  const generate = async () => {
    if (!name.trim() || !niche.trim()) { setErr('أدخل اسم المتجر والفئة'); return }
    setLoading(true); setErr('')
    try {
      const res = await fetch('/api/ai/store/generate', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ storeId, name, niche, vibe }),
      })
      const d = await res.json()
      if (!res.ok) { setErr(d.error ?? 'تعذّر التوليد'); return }
      onResult(d.layout, d.theme_key)
    } catch { setErr('خطأ في الشبكة') }
    finally { setLoading(false) }
  }

  return (
    <>
      <div className="fixed inset-0 bg-black/60 z-50" onClick={onClose} />
      <div className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-[440px] max-w-[calc(100vw-32px)] bg-white rounded-2xl shadow-2xl p-5" dir="rtl">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-black text-base flex items-center gap-1.5" style={{ color: '#7C3AED' }}><Sparkles size={18} /> أنشئ متجرك بالذكاء الاصطناعي</h3>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100"><X size={16} /></button>
        </div>
        <div className="space-y-3">
          <Field label="اسم المتجر"><input value={name} onChange={e => setName(e.target.value)} className="ipt" /></Field>
          <Field label="الفئة / النيتش (مثال: حجاب وأزياء، إلكترونيات، تجميل)"><input value={niche} onChange={e => setNiche(e.target.value)} className="ipt" placeholder="حجاب وأزياء نسائية" /></Field>
          <Field label="الطابع (اختياري)"><input value={vibe} onChange={e => setVibe(e.target.value)} className="ipt" placeholder="راقٍ وأنيق" /></Field>
          {err && <p className="text-xs" style={{ color: '#DC3545' }}>{err}</p>}
          <button onClick={generate} disabled={loading} className="w-full h-11 rounded-xl text-sm font-bold text-white flex items-center justify-center gap-2 disabled:opacity-60" style={{ background: 'linear-gradient(135deg,#7C3AED,#C026D3)' }}>
            {loading ? <><Loader2 size={16} className="animate-spin" /> جارٍ التوليد…</> : <><Sparkles size={16} /> توليد المتجر</>}
          </button>
          <p className="text-[10px] text-gray-400 text-center">يختار الذكاء الاصطناعي الأقسام والثيم والنصوص — يمكنك تعديل كل شيء بعدها.</p>
        </div>
      </div>
      <style jsx>{`.ipt{width:100%;height:40px;border:1px solid #E9ECEF;border-radius:12px;padding:0 12px;font-size:14px;outline:none}.ipt:focus{border-color:#7C3AED}`}</style>
    </>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <div><label className="block text-xs font-medium mb-1 text-gray-600">{label}</label>{children}</div>
}

/* eslint-disable @next/next/no-img-element */
function ImageField({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  const [busy, setBusy] = useState(false)
  const pick = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]; if (!file) return
    setBusy(true); const url = await uploadFile(file); setBusy(false)
    if (url) onChange(url)
  }
  return (
    <div>
      <label className="block text-[11px] mb-0.5 text-gray-500">{label}</label>
      {value ? (
        <div className="relative">
          <img src={value} alt="" className="w-full h-24 object-cover rounded-lg border" style={{ borderColor: '#E9ECEF' }} />
          <button onClick={() => onChange('')} className="absolute top-1 left-1 px-1.5 py-0.5 rounded text-[10px] text-white" style={{ background: '#DC3545' }}>حذف</button>
        </div>
      ) : (
        <label className="block border-2 border-dashed rounded-lg p-3 text-center text-xs cursor-pointer" style={{ borderColor: '#0D6EFD', color: '#0D6EFD' }}>
          {busy ? 'جارٍ الرفع…' : '📷 ارفع صورة'}
          <input type="file" accept="image/*" className="hidden" onChange={pick} disabled={busy} />
        </label>
      )}
    </div>
  )
}

function ImageListField({ label, value, onChange }: { label: string; value: string[]; onChange: (v: string[]) => void }) {
  const [busy, setBusy] = useState(false)
  const add = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]; if (!file) return
    setBusy(true); const url = await uploadFile(file); setBusy(false)
    if (url) onChange([...value, url])
  }
  return (
    <div>
      <label className="block text-[11px] mb-0.5 text-gray-500">{label}</label>
      <div className="grid grid-cols-3 gap-2">
        {value.map((src, i) => (
          <div key={i} className="relative">
            <img src={src} alt="" className="w-full h-16 object-cover rounded-lg border" style={{ borderColor: '#E9ECEF' }} />
            <button onClick={() => onChange(value.filter((_, j) => j !== i))} className="absolute top-0.5 left-0.5 w-5 h-5 rounded-full text-white text-xs leading-none" style={{ background: '#DC3545' }}>×</button>
          </div>
        ))}
        <label className="h-16 border-2 border-dashed rounded-lg flex items-center justify-center text-base cursor-pointer" style={{ borderColor: '#0D6EFD', color: '#0D6EFD' }}>
          {busy ? '…' : '+'}
          <input type="file" accept="image/*" className="hidden" onChange={add} disabled={busy} />
        </label>
      </div>
    </div>
  )
}
