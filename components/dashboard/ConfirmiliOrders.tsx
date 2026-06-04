'use client'
// ============================================================
// ConfirmiliOrders — Exact Octomatic /orders page replica
// Dakkani blue #0D6EFD · Exact status colors · RTL Arabic · Tajawal
// ============================================================
import React, {
  useState, useMemo, useCallback, useEffect,
} from 'react'
import { createClient } from '@/lib/supabase/client'
import {
  Search, RefreshCw, Trash2, Plus, SlidersHorizontal,
  Calendar, X, Check, ChevronDown, MessageCircle, Clock,
  Edit2, Truck, RotateCcw, Copy, CheckCircle, AlertTriangle,
  Package, Filter, Info, Users,
} from 'lucide-react'
// statuses import used for type parity — getStatusDef is inlined below for exact Octomatic colors

// ─── EXACT STATUS COLORS (Octomatic) ─────────────────────────
const SB = {
  pending:   { label:'معلقة',    color:'#80BCBD', text:'#fff' },
  failed_01: { label:'فاشلة 01', color:'#FFA447', text:'#fff' },
  failed_02: { label:'فاشلة 02', color:'#FF8C1A', text:'#fff' },
  failed_03: { label:'فاشلة 03', color:'#E67300', text:'#fff' },
  confirmed: { label:'مؤكدة',    color:'#22C55E', text:'#fff' },
  cancelled: { label:'ملغاة',    color:'#E23024', text:'#fff' },
  postponed: { label:'مؤجلة',    color:'#9D76C1', text:'#fff' },
  duplicate: { label:'مكررة',    color:'#1A1A1A', text:'#fff' },
} as Record<string, {label:string;color:string;text:string}>

function normStatus(raw?: string|null): string {
  const m: Record<string,string> = { new:'pending','':'pending',failed_1:'failed_01',failed_2:'failed_02',failed_3:'failed_03' }
  return m[raw??''] ?? (raw ?? 'pending')
}
function dbStatus(ui: string): string {
  const m: Record<string,string> = { pending:'new',failed_01:'failed_1',failed_02:'failed_2',failed_03:'failed_3' }
  return m[ui] ?? ui
}
function getStatusDef(raw?: string|null) {
  return SB[normStatus(raw)] ?? { label: raw ?? '—', color:'#868E96', text:'#fff' }
}

// ─── SOURCE ICONS ─────────────────────────────────────────────
function SourceBadge({ source }: { source: string }) {
  const s = (source ?? '').toLowerCase()
  if (s.includes('dakkani') || s.includes('storefront')) return (
    <span title="Dakkani" className="inline-flex items-center gap-1 text-[10px] font-bold px-1.5 py-0.5 rounded" style={{background:'#EBF5FF',color:'#0D6EFD'}}>🔵 Dakkani</span>
  )
  if (s.includes('sheet') || s.includes('google'))  return (
    <span title="Google Sheet" className="inline-flex items-center gap-1 text-[10px] font-bold px-1.5 py-0.5 rounded" style={{background:'#E8F5E9',color:'#2E7D32'}}>📊 Sheet</span>
  )
  if (s.includes('youcan'))  return (
    <span title="YouCan" className="inline-flex items-center gap-1 text-[10px] font-bold px-1.5 py-0.5 rounded" style={{background:'#FFF3E0',color:'#E65100'}}>🛒 YouCan</span>
  )
  return (
    <span title="Manuel" className="inline-flex items-center gap-1 text-[10px] font-bold px-1.5 py-0.5 rounded" style={{background:'#F3E5F5',color:'#6A1B9A'}}>✏️ يدوي</span>
  )
}

// ─── COLUMN DEFINITIONS ───────────────────────────────────────
const COL_DEFS = [
  { key:'source',         label:'المصدر',            always: false, defaultOn: true  },
  { key:'order_number',   label:'ر.الطلبية',         always: true,  defaultOn: true  },
  { key:'date',           label:'التاريخ',            always: false, defaultOn: true  },
  { key:'customer_name',  label:'الإسم الكامل',       always: true,  defaultOn: true  },
  { key:'phone',          label:'الهاتف',             always: true,  defaultOn: true  },
  { key:'verify',         label:'تحقق',              always: false, defaultOn: true  },
  { key:'status',         label:'الحالة',             always: true,  defaultOn: true  },
  { key:'address',        label:'العنوان',            always: false, defaultOn: true  },
  { key:'delivery_co',    label:'ش.ت',               always: false, defaultOn: true  },
  { key:'delivery_type',  label:'نوعية التوصيل',      always: false, defaultOn: true  },
  { key:'wilaya',         label:'الولاية',            always: false, defaultOn: true  },
  { key:'baladia',        label:'البلدية',            always: false, defaultOn: false },
  { key:'delivery_action',label:'ش ت إجراء',          always: false, defaultOn: true  },
  { key:'product',        label:'المنتج',             always: false, defaultOn: true  },
  { key:'product_price',  label:'سعر المنتج',         always: false, defaultOn: true  },
  { key:'quantity',       label:'الكمية',             always: false, defaultOn: true  },
  { key:'delivery_price', label:'س.التوصيل',          always: false, defaultOn: true  },
  { key:'total_price',    label:'السعر الكلي',        always: false, defaultOn: true  },
  { key:'notes',          label:'ملاحظات',            always: false, defaultOn: true  },
  { key:'variant',        label:'المتغيرات',          always: false, defaultOn: true  },
  { key:'sku',            label:'SKU',                always: false, defaultOn: false },
  { key:'confirmed_by',   label:'التأكيد بواسطة',     always: false, defaultOn: true  },
  { key:'actions',        label:'الإجراءات',          always: true,  defaultOn: true  },
]

const LS_COLS = 'confirmili_cols_v2'
function loadSavedCols(): Set<string> {
  try {
    if (typeof window === 'undefined') throw new Error()
    const raw = localStorage.getItem(LS_COLS)
    if (raw) return new Set(JSON.parse(raw))
  } catch {}
  return new Set(COL_DEFS.filter(c => c.defaultOn).map(c => c.key))
}

// ─── PROPS ────────────────────────────────────────────────────
interface Props {
  storeId:   string
  storeName: string
  orders:    any[]
  products:  any[]
  team:      any[]
  companies: any[]
  onRefresh: () => void
  setToast:  (msg: string) => void
  lang:      'ar'|'fr'|'en'
}

// ─── MAIN COMPONENT ───────────────────────────────────────────
export default function ConfirmiliOrders({
  storeId, storeName, orders: initOrders, products, team, companies,
  onRefresh, setToast, lang,
}: Props) {

  // ── state ────────────────────────────────────────────────────
  const [orders,          setOrders]          = useState<any[]>(initOrders)
  const [search,          setSearch]          = useState('')
  const [datePreset,      setDatePreset]      = useState<string>('all')
  const [calendarFrom,    setCalendarFrom]    = useState('')
  const [calendarTo,      setCalendarTo]      = useState('')
  const [showCal,         setShowCal]         = useState(false)
  const [statusFilter,    setStatusFilter]    = useState<string[]>([])
  const [sourceFilter,    setSourceFilter]    = useState<string[]>([])
  const [wilayaFilter,    setWilayaFilter]    = useState<string[]>([])
  const [showStatusFilter,setShowStatusFilter]= useState(false)
  const [showSourceFilter,setShowSourceFilter]= useState(false)
  const [showWilayaFilter,setShowWilayaFilter]= useState(false)
  const [selected,        setSelected]        = useState<Set<string>>(new Set())
  const [bulkMode,        setBulkMode]        = useState(false)
  const [page,            setPage]            = useState(1)
  const [perPage,         setPerPage]         = useState(50)
  const [trashMode,       setTrashMode]       = useState(false)
  const [trashedIds,      setTrashedIds]      = useState<Set<string>>(
    () => new Set(initOrders.filter(o => o.is_trashed).map((o:any)=>o.id))
  )
  const [updating,        setUpdating]        = useState<string|null>(null)
  const [statusDropdown,  setStatusDropdown]  = useState<string|null>(null) // orderId
  const [visibleCols,     setVisibleCols]     = useState<Set<string>>(loadSavedCols)

  // modals
  const [showColSettings, setShowColSettings] = useState(false)
  const [showManual,      setShowManual]      = useState(false)
  const [manualForm,      setManualForm]      = useState<any>({})
  const [savingManual,    setSavingManual]    = useState(false)
  const [showSendReport,  setShowSendReport]  = useState(false)
  const [sendReports,     setSendReports]     = useState<any[]>([])
  const [historyModal,    setHistoryModal]    = useState<any|null>(null)
  const [historyRows,     setHistoryRows]     = useState<any[]>([])
  const [editModal,       setEditModal]       = useState<any|null>(null)
  const [savingEdit,      setSavingEdit]      = useState(false)
  const [verifyModal,     setVerifyModal]     = useState<any|null>(null)
  const [infoOpen,        setInfoOpen]        = useState(false)
  const [bulkMenuOpen,    setBulkMenuOpen]    = useState(false)
  const [confirmTrash,    setConfirmTrash]    = useState<string|null>(null) // orderId awaiting confirm

  // sync from parent when onRefresh causes new props
  useEffect(() => {
    setOrders(initOrders)
    setTrashedIds(new Set(initOrders.filter(o => o.is_trashed).map((o:any)=>o.id)))
  }, [initOrders])

  // ── filtering ─────────────────────────────────────────────────
  const filtered = useMemo(() => {
    let list = orders.filter(o => trashMode ? trashedIds.has(o.id) : !trashedIds.has(o.id))

    // date
    if (datePreset !== 'all') {
      const now = new Date()
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
      if (datePreset === 'today')     list = list.filter(o => new Date(o.created_at) >= today)
      if (datePreset === 'yesterday') {
        const yd = new Date(today); yd.setDate(yd.getDate()-1)
        list = list.filter(o => { const d = new Date(o.created_at); return d >= yd && d < today })
      }
      if (datePreset === 'week')  { const d = new Date(today); d.setDate(d.getDate()-7);  list = list.filter(o => new Date(o.created_at) >= d) }
      if (datePreset === 'month') { const d = new Date(today); d.setDate(d.getDate()-30); list = list.filter(o => new Date(o.created_at) >= d) }
    }
    if (calendarFrom) list = list.filter(o => o.created_at >= calendarFrom)
    if (calendarTo)   list = list.filter(o => o.created_at <= calendarTo + 'T23:59:59')

    // search
    if (search.trim()) {
      const q = search.trim().toLowerCase()
      list = list.filter(o =>
        (o.customer_name?.toLowerCase() ?? '').includes(q) ||
        (o.customer_phone ?? '').includes(q) ||
        (o.order_number ?? '').toLowerCase().includes(q)
      )
    }

    // status filter
    if (statusFilter.length > 0) {
      list = list.filter(o => statusFilter.includes(normStatus(o.status)))
    }

    // source filter
    if (sourceFilter.length > 0) {
      list = list.filter(o => sourceFilter.includes(o.source ?? 'manual'))
    }

    // wilaya filter
    if (wilayaFilter.length > 0) {
      list = list.filter(o => {
        const w = (o.wilaya as any)?.name_ar ?? ''
        return wilayaFilter.includes(w)
      })
    }

    return list
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orders, trashMode, trashedIds, search, datePreset, calendarFrom, calendarTo, statusFilter, sourceFilter, wilayaFilter])

  const totalPages  = Math.max(1, Math.ceil(filtered.length / perPage))
  const pagedOrders = filtered.slice((page-1)*perPage, page*perPage)
  const allSelected = selected.size > 0 && pagedOrders.every(o => selected.has(o.id))
  const uniqueWilayas = useMemo(() => Array.from(new Set(orders.map(o => (o.wilaya as any)?.name_ar).filter(Boolean))).sort() as string[], [orders])
  const uniqueSources = useMemo(() => Array.from(new Set(orders.map(o => o.source ?? 'manual').filter(Boolean))) as string[], [orders])

  // ── handlers ─────────────────────────────────────────────────
  const updateOrderStatus = useCallback(async (orderId: string, uiStatus: string) => {
    setUpdating(orderId)
    setStatusDropdown(null)
    const db = dbStatus(uiStatus)
    try {
      const res = await fetch(`/api/orders/${orderId}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: db, changed_by: 'confirmili' }),
      })
      if (!res.ok) throw new Error('API failed')
      setOrders(prev => prev.map(o => o.id === orderId ? { ...o, status: db } : o))
      setToast(`✓ ${getStatusDef(db).label}`)
    } catch {
      // fallback direct DB
      const sb = createClient()
      await sb.from('orders').update({ status: db }).eq('id', orderId)
      setOrders(prev => prev.map(o => o.id === orderId ? { ...o, status: db } : o))
      setToast(`✓ ${getStatusDef(db).label}`)
    } finally { setUpdating(null) }
  }, [setToast])

  const moveToTrash = useCallback(async (orderId: string) => {
    setTrashedIds(prev => { const s = new Set(prev); s.add(orderId); return s })
    const sb = createClient()
    await sb.from('orders').update({ is_trashed: true }).eq('id', orderId).then(()=>{},()=>{})
    setToast('تم النقل إلى سلة المهملات')
  }, [setToast])

  const restoreOrder = useCallback(async (orderId: string) => {
    setTrashedIds(prev => { const s = new Set(prev); s.delete(orderId); return s })
    const sb = createClient()
    await sb.from('orders').update({ is_trashed: false }).eq('id', orderId).then(()=>{},()=>{})
    setToast('تمت الاستعادة')
  }, [setToast])

  const openWhatsApp = useCallback((phone: string, name: string) => {
    const clean = (phone ?? '').replace(/\D/g,'').replace(/^0/,'213')
    window.open(`https://wa.me/${clean}?text=${encodeURIComponent(`السلام عليكم ${name}`)}`, '_blank')
  }, [])

  const copyText = useCallback((text: string, label = '') => {
    navigator.clipboard.writeText(text)
    setToast(`✓ تم النسخ${label ? ': '+label : ''}`)
  }, [setToast])

  const openHistory = useCallback(async (order: any) => {
    setHistoryModal(order); setHistoryRows([])
    const sb = createClient()
    const { data } = await sb.from('order_history').select('*')
      .eq('order_id', order.id).order('created_at', { ascending: false })
    setHistoryRows(data ?? [])
  }, [])

  const sendToDelivery = useCallback(async (order: any) => {
    const sb = createClient()
    const co = companies.find(c => c.id === order.delivery_company_id)
    const prefix = order.delivery_type === 'stopdesk' ? 'SD' : 'HM'
    const tracking = `${co?.short_name ?? prefix}-${Date.now().toString(36).toUpperCase()}`
    await sb.from('orders').update({ tracking_number: tracking, shipped_at: new Date().toISOString() }).eq('id', order.id)
    await sb.from('confirmili_send_reports').insert({
      store_id: storeId, order_id: order.id,
      company_id: order.delivery_company_id ?? null, tracking_num: tracking, is_auto: false, status: 'sent',
    }).then(()=>{},()=>{})
    setOrders(prev => prev.map(o => o.id === order.id ? { ...o, tracking_number: tracking } : o))
    setToast(`✓ أُرسل — ${tracking}`)
  }, [companies, storeId, setToast])

  const bulkUpdateStatus = useCallback(async (uiStatus: string) => {
    if (selected.size === 0) return
    const ids = Array.from(selected)
    const db = dbStatus(uiStatus)
    const sb = createClient()
    await sb.from('orders').update({ status: db }).in('id', ids)
    setOrders(prev => prev.map(o => ids.includes(o.id) ? { ...o, status: db } : o))
    setSelected(new Set()); setBulkMenuOpen(false)
    setToast(`✓ ${ids.length} طلبية — ${getStatusDef(db).label}`)
  }, [selected, setToast])

  const bulkTrash = useCallback(async () => {
    // Uses inline confirm dialog (setConfirmTrash) for single — for bulk proceed directly
    if (!window.confirm(`نقل ${selected.size} طلبية إلى سلة المهملات؟`)) return // eslint-disable-line no-restricted-globals
    const ids = Array.from(selected)
    const sb = createClient()
    await sb.from('orders').update({ is_trashed: true }).in('id', ids)
    setTrashedIds(prev => { const s = new Set(prev); ids.forEach(id => s.add(id)); return s })
    setSelected(new Set()); setBulkMenuOpen(false)
    setToast(`تم نقل ${ids.length} طلبية`)
  }, [selected, setToast])

  const saveEdit = useCallback(async () => {
    if (!editModal) return
    setSavingEdit(true)
    const sb = createClient()
    await sb.from('orders').update({
      customer_name:  editModal.customer_name,
      customer_phone: editModal.customer_phone,
      address:        editModal.address,
      notes:          editModal.notes,
      delivery_type:  editModal.delivery_type,
    }).eq('id', editModal.id)
    setOrders(prev => prev.map(o => o.id === editModal.id ? { ...o, ...editModal } : o))
    setEditModal(null); setSavingEdit(false); setToast('✓ تم الحفظ')
  }, [editModal, setToast])

  const saveManual = useCallback(async () => {
    if (!manualForm.customer_name || !manualForm.customer_phone) return
    setSavingManual(true)
    try {
      const res = await fetch('/api/orders', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          store_id: storeId, source: 'manual', payment_method: 'cod',
          customer_name: manualForm.customer_name, customer_phone: manualForm.customer_phone,
          address: manualForm.address ?? '',
          wilaya_id: manualForm.wilaya_id ? +manualForm.wilaya_id : 1,
          delivery_type: manualForm.delivery_type ?? 'home',
          notes: manualForm.notes ?? '',
          items: manualForm.product_id ? [{ product_id: manualForm.product_id, quantity: +(manualForm.qty??1), variant_key:'default' }] : [],
        }),
      })
      const data = await res.json()
      if (data.success) { setShowManual(false); setManualForm({}); setToast('✓ تم إنشاء الطلبية'); onRefresh() }
      else setToast(data.error ?? 'خطأ')
    } catch { setToast('خطأ في الشبكة') }
    finally { setSavingManual(false) }
  }, [manualForm, storeId, onRefresh, setToast])

  const loadSendReports = useCallback(async () => {
    const sb = createClient()
    const { data } = await sb.from('confirmili_send_reports').select('*')
      .eq('store_id', storeId).order('sent_at', { ascending: false }).limit(100)
    setSendReports(data ?? [])
  }, [storeId])

  const saveColSettings = useCallback((cols: Set<string>) => {
    setVisibleCols(cols)
    localStorage.setItem(LS_COLS, JSON.stringify(Array.from(cols)))
    setShowColSettings(false); setToast('✓ تم حفظ إعدادات الأعمدة')
  }, [setToast])

  // col visibility helper
  const show = (key: string) => visibleCols.has(key)

  // ── date label for separators ─────────────────────────────────
  function dateSep(iso: string) {
    return new Date(iso).toLocaleDateString('ar-DZ', { weekday:'long', year:'numeric', month:'long', day:'numeric' })
  }

  // ── verify counters ──────────────────────────────────────────
  function verifyStats(phone: string) {
    const same  = orders.filter(o => o.customer_phone === phone)
    const green = same.filter(o => o.status === 'delivered').length
    const red   = same.filter(o => ['returned','cancelled','failed_1','failed_2','failed_3'].includes(o.status)).length
    const denom = green + red
    return { green, red, risk: denom > 0 ? Math.round(red/denom*100) : 0, total: same.length }
  }

  // ── TOOLBAR ───────────────────────────────────────────────────
  const Toolbar = () => (
    <div className="flex flex-wrap items-center gap-1.5 px-3 py-2.5 border-b" style={{borderColor:'var(--color-border)',background:'#FAFAFA',fontFamily:'var(--font-arabic)'}}>

      {/* Search */}
      <div className="relative">
        <Search size={12} className="absolute right-2.5 top-1/2 -translate-y-1/2" style={{color:'#868E96'}}/>
        <input value={search} onChange={e=>{setSearch(e.target.value);setPage(1)}}
          placeholder="بحث..." dir="rtl"
          className="pr-7 pl-2 h-7 text-xs border rounded-lg outline-none focus:ring-1 focus:ring-[#0D6EFD]"
          style={{borderColor:'var(--color-border)',background:'#fff',width:160,fontFamily:'var(--font-arabic)'}}/>
      </div>

      {/* Bulk select toggle */}
      <button
        onClick={() => { setBulkMode(m=>!m); if (bulkMode) { setSelected(new Set()) } }}
        className="relative h-7 px-2.5 text-xs rounded-lg border flex items-center gap-1.5 transition-colors"
        style={{ borderColor: bulkMode ? '#0D6EFD' : 'var(--color-border)', background: bulkMode ? '#EBF5FF' : '#fff', color: bulkMode ? '#0D6EFD' : '#495057' }}>
        مهام متعددة
        {selected.size > 0 && (
          <span className="w-4 h-4 rounded-full text-[9px] font-bold text-white flex items-center justify-center" style={{background:'#0D6EFD'}}>
            {selected.size}
          </span>
        )}
      </button>

      {/* Bulk action menu */}
      {bulkMode && selected.size > 0 && (
        <div className="relative">
          <button onClick={()=>setBulkMenuOpen(o=>!o)}
            className="h-7 px-2.5 text-xs rounded-lg border flex items-center gap-1" style={{borderColor:'#0D6EFD',background:'#EBF5FF',color:'#0D6EFD'}}>
            إجراء ({selected.size}) <ChevronDown size={10}/>
          </button>
          {bulkMenuOpen && (
            <>
              <div className="fixed inset-0 z-10" onClick={()=>setBulkMenuOpen(false)}/>
              <div className="absolute right-0 top-full mt-1 w-44 bg-white border rounded-xl shadow-xl z-20 overflow-hidden" style={{borderColor:'var(--color-border)'}}>
                {Object.entries(SB).map(([key,s]) => (
                  <button key={key} onClick={()=>bulkUpdateStatus(key)}
                    className="w-full flex items-center gap-2 px-3 py-1.5 text-xs hover:bg-[#F8F9FA] text-right" style={{fontFamily:'var(--font-arabic)'}}>
                    <span className="w-2 h-2 rounded-full flex-shrink-0" style={{background:s.color}}/>
                    {s.label}
                  </button>
                ))}
                <div className="border-t" style={{borderColor:'var(--color-border)'}}/>
                <button onClick={bulkTrash} className="w-full flex items-center gap-2 px-3 py-1.5 text-xs hover:bg-red-50 text-right" style={{color:'#DC3545',fontFamily:'var(--font-arabic)'}}>
                  <Trash2 size={11}/>نقل للسلة
                </button>
              </div>
            </>
          )}
        </div>
      )}

      {/* Date presets */}
      {(['today','yesterday','week','month'] as const).map(d => {
        const L = {today:'اليوم',yesterday:'الأمس',week:'أسبوع',month:'شهر'}
        return (
          <button key={d} onClick={()=>{setDatePreset(p=>p===d?'all':d);setPage(1)}}
            className="h-7 px-2.5 text-xs rounded-lg border transition-colors"
            style={{
              borderColor: datePreset===d ? '#0D6EFD' : 'var(--color-border)',
              background:  datePreset===d ? '#0D6EFD' : '#fff',
              color:       datePreset===d ? '#fff'    : '#495057',
              fontFamily:  'var(--font-arabic)',
            }}>
            {L[d]}
          </button>
        )
      })}

      {/* Calendar date range */}
      <div className="relative">
        <button onClick={()=>setShowCal(o=>!o)}
          className="h-7 w-7 flex items-center justify-center rounded-lg border"
          style={{borderColor:'var(--color-border)',background:'#fff',color:'#495057'}}>
          <Calendar size={13}/>
        </button>
        {showCal && (
          <>
            <div className="fixed inset-0 z-10" onClick={()=>setShowCal(false)}/>
            <div className="absolute right-0 top-full mt-1 p-3 bg-white border rounded-xl shadow-xl z-20 space-y-2" style={{borderColor:'var(--color-border)',minWidth:240}}>
              <p className="text-xs font-semibold" style={{fontFamily:'var(--font-arabic)',color:'var(--color-text-secondary)'}}>نطاق التاريخ</p>
              <div className="flex gap-2">
                <div>
                  <label className="block text-[10px] mb-0.5" style={{color:'#868E96'}}>من</label>
                  <input type="date" value={calendarFrom} onChange={e=>setCalendarFrom(e.target.value)} className="border rounded-lg px-2 h-7 text-xs outline-none" style={{borderColor:'var(--color-border)'}}/>
                </div>
                <div>
                  <label className="block text-[10px] mb-0.5" style={{color:'#868E96'}}>إلى</label>
                  <input type="date" value={calendarTo} onChange={e=>setCalendarTo(e.target.value)} className="border rounded-lg px-2 h-7 text-xs outline-none" style={{borderColor:'var(--color-border)'}}/>
                </div>
              </div>
              <div className="flex gap-2">
                <button onClick={()=>setShowCal(false)} className="flex-1 h-7 text-xs rounded-lg text-white" style={{background:'#0D6EFD'}}>تطبيق</button>
                <button onClick={()=>{setCalendarFrom('');setCalendarTo('');setShowCal(false)}} className="flex-1 h-7 text-xs rounded-lg border" style={{borderColor:'var(--color-border)'}}>مسح</button>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Column settings */}
      <button onClick={()=>setShowColSettings(true)}
        className="h-7 px-2.5 text-xs rounded-lg border flex items-center gap-1.5"
        style={{borderColor:'var(--color-border)',background:'#fff',color:'#495057'}}>
        <SlidersHorizontal size={12}/>إعدادات الأعمدة
      </button>

      {/* Refresh */}
      <button onClick={()=>{onRefresh();setToast('جارٍ التحديث...')}}
        className="h-7 w-7 flex items-center justify-center rounded-lg border"
        style={{borderColor:'var(--color-border)',background:'#fff',color:'#495057'}}>
        <RefreshCw size={13}/>
      </button>

      {/* Trash toggle */}
      <button onClick={()=>{setTrashMode(m=>!m);setPage(1)}}
        className="h-7 px-2.5 text-xs rounded-lg border flex items-center gap-1.5 transition-colors"
        style={{
          borderColor: trashMode ? '#DC3545' : 'var(--color-border)',
          background:  trashMode ? '#FEF2F2' : '#fff',
          color:       trashMode ? '#DC3545' : '#495057',
        }}>
        <Trash2 size={12}/>سلة المهملات
        {trashedIds.size > 0 && <span className="text-[9px]">({trashedIds.size})</span>}
      </button>

      {/* Send report */}
      <button onClick={()=>{setShowSendReport(true);loadSendReports()}}
        className="h-7 px-2.5 text-xs rounded-lg border flex items-center gap-1.5"
        style={{borderColor:'var(--color-border)',background:'#fff',color:'#495057'}}>
        📊 تقرير الإرسال
      </button>

      {/* Add manual order */}
      <button onClick={()=>{setShowManual(true);setManualForm({})}}
        className="h-7 px-2.5 text-xs rounded-lg flex items-center gap-1 text-white"
        style={{background:'#0D6EFD'}}>
        <Plus size={12}/>
      </button>

      {/* Info */}
      <div className="relative">
        <button onClick={()=>setInfoOpen(o=>!o)} className="h-7 w-7 flex items-center justify-center rounded-lg border" style={{borderColor:'var(--color-border)',background:'#fff',color:'#868E96'}}>
          <Info size={13}/>
        </button>
        {infoOpen && (
          <>
            <div className="fixed inset-0 z-10" onClick={()=>setInfoOpen(false)}/>
            <div className="absolute left-0 top-full mt-1 w-64 p-3 bg-white border rounded-xl shadow-xl z-20" style={{borderColor:'var(--color-border)'}}>
              <p className="text-xs font-semibold mb-1" style={{fontFamily:'var(--font-arabic)'}}>معلومات الطلبات</p>
              <p className="text-[10px]" style={{color:'#868E96',fontFamily:'var(--font-arabic)'}}>إجمالي: {orders.filter(o=>!trashedIds.has(o.id)).length} طلبية · محذوف: {trashedIds.size}</p>
            </div>
          </>
        )}
      </div>

      <div className="flex-1"/>
      {/* Active filter chips */}
      {datePreset !== 'all' && (
        <button onClick={()=>setDatePreset('all')} className="h-6 px-2 text-[10px] rounded-full flex items-center gap-1" style={{background:'#EBF5FF',color:'#0D6EFD'}}>
          {({today:'اليوم',yesterday:'الأمس',week:'أسبوع',month:'شهر'} as any)[datePreset]}
          <X size={10}/>
        </button>
      )}
      {statusFilter.length > 0 && (
        <button onClick={()=>setStatusFilter([])} className="h-6 px-2 text-[10px] rounded-full flex items-center gap-1" style={{background:'#EBF5FF',color:'#0D6EFD'}}>
          {statusFilter.length} حالة <X size={10}/>
        </button>
      )}
    </div>
  )

  // ── STATUS CELL ───────────────────────────────────────────────
  const StatusCell = ({ order }: { order: any }) => {
    const def = getStatusDef(order.status)
    const isOpen = statusDropdown === order.id
    return (
      <div className="relative inline-block">
        <button disabled={updating === order.id}
          onClick={e => { e.stopPropagation(); setStatusDropdown(isOpen ? null : order.id) }}
          className="inline-flex items-center gap-1 rounded-full px-2 h-[22px] text-[11px] font-bold whitespace-nowrap"
          style={{ background: def.color, color: def.text, cursor:'pointer', fontFamily:'var(--font-arabic)' }}>
          {updating === order.id ? '⏳' : def.label}
          <ChevronDown size={9}/>
        </button>
        {isOpen && (
          <>
            <div className="fixed inset-0 z-10" onClick={()=>setStatusDropdown(null)}/>
            <div className="absolute right-0 top-full mt-1 w-44 bg-white border rounded-xl shadow-2xl z-20 overflow-hidden" style={{borderColor:'var(--color-border)'}}>
              {/* Quick failed progression */}
              {['pending','failed_01','failed_02'].includes(normStatus(order.status)) && (
                <button onClick={() => {
                  const next = normStatus(order.status) === 'pending' ? 'failed_01'
                    : normStatus(order.status) === 'failed_01' ? 'failed_02' : 'failed_03'
                  updateOrderStatus(order.id, next)
                }}
                className="w-full flex items-center gap-2 px-3 py-2 text-xs font-semibold border-b hover:bg-orange-50 text-right" style={{borderColor:'#FFF3E0',color:'#E67300',fontFamily:'var(--font-arabic)'}}>
                  <span className="w-2.5 h-2.5 rounded-full" style={{background:'#E67300'}}/>
                  فاشلة ← التالية
                </button>
              )}
              {Object.entries(SB).map(([key, s]) => {
                const isCurrent = normStatus(order.status) === key
                return (
                  <button key={key} onClick={() => updateOrderStatus(order.id, key)}
                    className="w-full flex items-center gap-2 px-3 py-1.5 text-xs hover:bg-[#F8F9FA] text-right"
                    style={{fontFamily:'var(--font-arabic)',background:isCurrent?'#F8F9FA':'',fontWeight:isCurrent?700:400}}>
                    <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{background:s.color}}/>
                    {s.label}
                    {isCurrent && <span className="mr-auto text-[9px]" style={{color:'#0D6EFD'}}>✓</span>}
                  </button>
                )
              })}
            </div>
          </>
        )}
      </div>
    )
  }

  // ── ROW ACTIONS ────────────────────────────────────────────────
  const RowActions = ({ order }: { order: any }) => (
    <div className="flex items-center gap-0.5">
      {/* 🗑 trash */}
      {!trashMode && (
        <button title="نقل إلى سلة المهملات"
          onClick={() => setConfirmTrash(order.id)}
          className="p-1.5 rounded hover:bg-red-50 transition-colors">
          <Trash2 size={13} style={{color:'#DC3545'}}/>
        </button>
      )}
      {/* ↩ restore */}
      {trashMode && (
        <button title="استعادة" onClick={()=>restoreOrder(order.id)}
          className="p-1.5 rounded hover:bg-green-50 transition-colors">
          <RotateCcw size={13} style={{color:'#22C55E'}}/>
        </button>
      )}
      {/* 🕐 history */}
      <button title="سجل التاريخ" onClick={()=>openHistory(order)}
        className="p-1.5 rounded hover:bg-[#F8F9FA] transition-colors">
        <Clock size={13} style={{color:'#1A1A1A'}}/>
      </button>
      {/* ✈ whatsapp */}
      <button title="واتساب" onClick={()=>openWhatsApp(order.customer_phone, order.customer_name)}
        className="p-1.5 rounded hover:bg-green-50 transition-colors">
        <MessageCircle size={13} style={{color:'#25D366'}}/>
      </button>
      {/* ✏ edit */}
      {!trashMode && (
        <button title="تعديل" onClick={()=>setEditModal({...order})}
          className="p-1.5 rounded hover:bg-green-50 transition-colors">
          <Edit2 size={13} style={{color:'#22C55E'}}/>
        </button>
      )}
      {/* 🚚 send to delivery */}
      {!trashMode && (
        <button title="أرسل إلى شركة التوصيل" onClick={()=>sendToDelivery(order)}
          className="p-1.5 rounded hover:bg-blue-50 transition-colors">
          <Truck size={13} style={{color:'#0D6EFD'}}/>
        </button>
      )}
    </div>
  )

  // ── TRACKING BADGE ────────────────────────────────────────────
  const TrackingBadge = ({ num, type }: { num: string; type: string }) => {
    const prefix = type === 'stopdesk' ? 'SD' : 'HM'
    const bg     = type === 'stopdesk' ? '#EEE5FF' : '#EBF5FF'
    const col    = type === 'stopdesk' ? '#9D76C1' : '#0D6EFD'
    return (
      <button onClick={() => copyText(num, num)} title="نسخ رقم التتبع"
        className="inline-flex items-center gap-1 hover:opacity-80">
        <span className="text-[9px] font-black px-1 rounded" style={{background:bg,color:col}}>{prefix}</span>
        <span className="font-mono text-[10px]">{num}</span>
        <Copy size={9} style={{color:'#868E96'}}/>
      </button>
    )
  }

  // ── SOURCE FILTER DROPDOWN ────────────────────────────────────
  const SourceFilter = () => (
    <div className="relative inline-block">
      <button onClick={()=>{setShowSourceFilter(o=>!o);setShowStatusFilter(false);setShowWilayaFilter(false)}}
        className="flex items-center gap-1" title="فلتر المصدر">
        <Filter size={10} style={{color: sourceFilter.length > 0 ? '#0D6EFD' : '#868E96'}}/>
      </button>
      {showSourceFilter && (
        <>
          <div className="fixed inset-0 z-10" onClick={()=>setShowSourceFilter(false)}/>
          <div className="absolute right-0 top-full mt-1 w-44 bg-white border rounded-xl shadow-2xl z-20 overflow-hidden" style={{borderColor:'var(--color-border)'}}>
            <div className="px-2 py-1.5 border-b" style={{borderColor:'var(--color-border)'}}>
              <p className="text-[10px] font-semibold" style={{color:'var(--color-text-muted)'}}>فلتر المصدر</p>
            </div>
            {uniqueSources.map(s => (
              <label key={s} className="flex items-center gap-2 px-3 py-1.5 hover:bg-[#F8F9FA] cursor-pointer">
                <input type="checkbox" checked={sourceFilter.includes(s)}
                  onChange={e => setSourceFilter(prev => e.target.checked ? [...prev,s] : prev.filter(x=>x!==s))}
                  className="w-3 h-3 accent-[#0D6EFD]"/>
                <span className="text-xs" style={{fontFamily:'var(--font-arabic)'}}>{s}</span>
              </label>
            ))}
            {sourceFilter.length > 0 && (
              <button onClick={()=>setSourceFilter([])} className="w-full text-[10px] py-1.5 text-center border-t" style={{color:'#DC3545',borderColor:'var(--color-border)'}}>مسح الفلتر</button>
            )}
          </div>
        </>
      )}
    </div>
  )

  // ── STATUS FILTER DROPDOWN ────────────────────────────────────
  const StatusFilter = () => (
    <div className="relative inline-block">
      <button onClick={()=>{setShowStatusFilter(o=>!o);setShowSourceFilter(false);setShowWilayaFilter(false)}}
        className="flex items-center gap-1 mr-1" title="فلتر الحالة">
        <Filter size={10} style={{color: statusFilter.length > 0 ? '#0D6EFD' : '#868E96'}}/>
      </button>
      {showStatusFilter && (
        <>
          <div className="fixed inset-0 z-10" onClick={()=>setShowStatusFilter(false)}/>
          <div className="absolute right-0 top-full mt-1 w-44 bg-white border rounded-xl shadow-2xl z-20 overflow-hidden" style={{borderColor:'var(--color-border)'}}>
            <div className="px-2 py-1.5 border-b" style={{borderColor:'var(--color-border)'}}>
              <p className="text-[10px] font-semibold" style={{color:'var(--color-text-muted)'}}>فلتر الحالة</p>
            </div>
            {Object.entries(SB).map(([key,s]) => (
              <label key={key} className="flex items-center gap-2 px-3 py-1.5 hover:bg-[#F8F9FA] cursor-pointer">
                <input type="checkbox" checked={statusFilter.includes(key)}
                  onChange={e => setStatusFilter(prev => e.target.checked ? [...prev,key] : prev.filter(x=>x!==key))}
                  className="w-3 h-3 accent-[#0D6EFD]"/>
                <span className="w-2 h-2 rounded-full flex-shrink-0" style={{background:s.color}}/>
                <span className="text-xs" style={{fontFamily:'var(--font-arabic)'}}>{s.label}</span>
              </label>
            ))}
            {statusFilter.length > 0 && (
              <button onClick={()=>setStatusFilter([])} className="w-full text-[10px] py-1.5 text-center border-t" style={{color:'#DC3545',borderColor:'var(--color-border)'}}>مسح الفلتر</button>
            )}
          </div>
        </>
      )}
    </div>
  )

  // ── WILAYA FILTER ────────────────────────────────────────────
  const WilayaFilter = () => (
    <div className="relative inline-block">
      <button onClick={()=>{setShowWilayaFilter(o=>!o);setShowStatusFilter(false);setShowSourceFilter(false)}}
        className="flex items-center gap-1" title="فلتر الولاية">
        <Filter size={10} style={{color: wilayaFilter.length > 0 ? '#0D6EFD' : '#868E96'}}/>
      </button>
      {showWilayaFilter && (
        <>
          <div className="fixed inset-0 z-10" onClick={()=>setShowWilayaFilter(false)}/>
          <div className="absolute right-0 top-full mt-1 w-44 bg-white border rounded-xl shadow-2xl z-20 overflow-hidden" style={{borderColor:'var(--color-border)'}}>
            <div className="px-2 py-1.5 border-b" style={{borderColor:'var(--color-border)'}}>
              <p className="text-[10px] font-semibold" style={{color:'var(--color-text-muted)'}}>فلتر الولاية</p>
            </div>
            <div className="max-h-48 overflow-y-auto">
              {uniqueWilayas.map(w => (
                <label key={w} className="flex items-center gap-2 px-3 py-1.5 hover:bg-[#F8F9FA] cursor-pointer">
                  <input type="checkbox" checked={wilayaFilter.includes(w)}
                    onChange={e => setWilayaFilter(prev => e.target.checked ? [...prev,w] : prev.filter(x=>x!==w))}
                    className="w-3 h-3 accent-[#0D6EFD]"/>
                  <span className="text-xs" style={{fontFamily:'var(--font-arabic)'}}>{w}</span>
                </label>
              ))}
            </div>
            {wilayaFilter.length > 0 && (
              <button onClick={()=>setWilayaFilter([])} className="w-full text-[10px] py-1.5 text-center border-t" style={{color:'#DC3545',borderColor:'var(--color-border)'}}>مسح الفلتر</button>
            )}
          </div>
        </>
      )}
    </div>
  )

  // ── MAIN RENDER ───────────────────────────────────────────────
  return (
    <div className="space-y-0" style={{fontFamily:'var(--font-arabic)'}} dir="rtl">
      <Toolbar/>

      {/* TABLE */}
      <div className="overflow-x-auto" style={{scrollbarWidth:'thin'}}>
        <table style={{borderCollapse:'collapse',minWidth:'1800px',fontSize:'12px',fontFamily:'var(--font-arabic)'}}>
          <thead>
            <tr style={{background:'#212529',color:'#fff',userSelect:'none'}}>
              {/* Checkbox */}
              <th style={TH}>
                <input type="checkbox" checked={allSelected}
                  onChange={e => {
                    if (e.target.checked) setSelected(new Set(pagedOrders.map(o=>o.id)))
                    else setSelected(new Set())
                  }}
                  className="w-3.5 h-3.5 accent-[#0D6EFD]"/>
              </th>
              {/* Source */}
              {show('source')        && <th style={TH}><span className="flex items-center gap-1">المصدر<SourceFilter/></span></th>}
              {show('order_number')  && <th style={TH}>ر.الطلبية</th>}
              {show('date')          && <th style={TH}>التاريخ</th>}
              {show('customer_name') && <th style={TH}>الإسم الكامل</th>}
              {show('phone')         && <th style={TH}>الهاتف</th>}
              {show('verify')        && <th style={TH}>تحقق</th>}
              {show('status')        && <th style={TH}><span className="flex items-center gap-1">الحالة<StatusFilter/></span></th>}
              {show('address')       && <th style={TH}>العنوان</th>}
              {show('delivery_co')   && <th style={TH}>ش.ت</th>}
              {show('delivery_type') && <th style={TH}>نوعية التوصيل</th>}
              {show('wilaya')        && <th style={TH}><span className="flex items-center gap-1">الولاية<WilayaFilter/></span></th>}
              {show('baladia')       && <th style={TH}>البلدية</th>}
              {show('delivery_action')&&<th style={TH}>ش ت إجراء</th>}
              {show('product')       && <th style={TH}>المنتج</th>}
              {show('product_price') && <th style={TH}>سعر المنتج</th>}
              {show('quantity')      && <th style={TH}>الكمية</th>}
              {show('delivery_price')&& <th style={TH}>س.التوصيل</th>}
              {show('total_price')   && <th style={TH}>السعر الكلي</th>}
              {show('notes')         && <th style={TH}>ملاحظات</th>}
              {show('variant')       && <th style={TH}>المتغيرات</th>}
              {show('sku')           && <th style={TH}>SKU</th>}
              {show('confirmed_by')  && <th style={TH}>التأكيد بواسطة</th>}
              {show('actions')       && <th style={TH}>الإجراءات</th>}
            </tr>
          </thead>
          <tbody>
            {pagedOrders.length === 0 ? (
              <tr>
                <td colSpan={30} style={{textAlign:'center',padding:'60px 16px',color:'#868E96'}}>
                  {trashMode ? 'سلة المهملات فارغة' : 'لا توجد طلبات'}
                </td>
              </tr>
            ) : (() => {
              const rows: React.ReactNode[] = []
              let lastDay = ''
              pagedOrders.forEach(o => {
                // Date separator
                const day = o.created_at?.slice(0,10) ?? ''
                if (day !== lastDay) {
                  lastDay = day
                  rows.push(
                    <tr key={`sep-${day}`} style={{background:'#F1F3F5'}}>
                      <td colSpan={30} style={{padding:'5px 16px',fontSize:'11px',fontWeight:600,color:'#495057',textAlign:'center',borderTop:'1px solid #DEE2E6',borderBottom:'1px solid #DEE2E6'}}>
                        {dateSep(o.created_at)}
                      </td>
                    </tr>
                  )
                }

                const isDuplicate = normStatus(o.status) === 'duplicate'
                const vc = verifyStats(o.customer_phone)
                const item0 = (o.items as any[])?.[0] ?? {}
                const co = companies.find(c => c.id === o.delivery_company_id)

                rows.push(
                  <tr key={o.id}
                    style={{
                      background: selected.has(o.id) ? '#EBF5FF' : isDuplicate ? '#F8F9FA' : '#fff',
                      borderBottom:'1px solid #F1F3F5',
                    }}
                    onMouseEnter={e=>(e.currentTarget.style.background=selected.has(o.id)?'#EBF5FF':'#F8FCFF')}
                    onMouseLeave={e=>(e.currentTarget.style.background=selected.has(o.id)?'#EBF5FF':isDuplicate?'#F8F9FA':'#fff')}>

                    {/* Checkbox */}
                    <td style={TD}>
                      <input type="checkbox" checked={selected.has(o.id)}
                        onChange={e => setSelected(prev => { const s=new Set(prev); e.target.checked?s.add(o.id):s.delete(o.id); return s })}
                        className="w-3.5 h-3.5 accent-[#0D6EFD]"/>
                    </td>

                    {/* Source */}
                    {show('source') && <td style={TD}><SourceBadge source={o.source ?? o.utm_source ?? ''}/></td>}

                    {/* ر.الطلبية */}
                    {show('order_number') && (
                      <td style={TD}>
                        <span className="font-mono font-bold" style={{color:'#0D6EFD',fontSize:11}}>{o.order_number}</span>
                      </td>
                    )}

                    {/* Date */}
                    {show('date') && (
                      <td style={TD}>
                        <div style={{color:'#495057',fontSize:10}}>
                          {new Date(o.created_at).toLocaleDateString('ar-DZ')}
                        </div>
                        <div style={{color:'#868E96',fontSize:10}}>
                          {new Date(o.created_at).toLocaleTimeString('ar-DZ',{hour:'2-digit',minute:'2-digit'})}
                        </div>
                      </td>
                    )}

                    {/* Name */}
                    {show('customer_name') && (
                      <td style={TD}><span style={{fontWeight:500,color:'#212529'}}>{o.customer_name}</span></td>
                    )}

                    {/* Phone */}
                    {show('phone') && (
                      <td style={TD}>
                        <button onClick={()=>openWhatsApp(o.customer_phone, o.customer_name)}
                          className="font-mono hover:underline flex items-center gap-1" style={{color:'#25D366',fontSize:11}}>
                          <MessageCircle size={10}/>+{o.customer_phone}
                        </button>
                      </td>
                    )}

                    {/* Verify */}
                    {show('verify') && (
                      <td style={TD}>
                        <button onClick={()=>setVerifyModal(o)} className="flex items-center gap-1 hover:opacity-80" title="التحقق من العميل">
                          <span style={{background:'#D1E7DD',color:'#198754',fontSize:9,padding:'1px 4px',borderRadius:3,fontWeight:700}}>{vc.green}✓</span>
                          <span style={{background:'#F8D7DA',color:'#DC3545',fontSize:9,padding:'1px 4px',borderRadius:3,fontWeight:700}}>{vc.red}✗</span>
                        </button>
                      </td>
                    )}

                    {/* Status */}
                    {show('status') && <td style={TD}><StatusCell order={o}/></td>}

                    {/* Address */}
                    {show('address') && (
                      <td style={TD}><span style={{color:'#495057',fontSize:10,maxWidth:120,display:'block',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{o.address ?? (o.wilaya as any)?.name_ar ?? '—'}</span></td>
                    )}

                    {/* Delivery company */}
                    {show('delivery_co') && (
                      <td style={TD}>
                        <span style={{fontWeight:600,color:'#495057',fontSize:11}}>{co?.short_name ?? '—'}</span>
                      </td>
                    )}

                    {/* Delivery type */}
                    {show('delivery_type') && (
                      <td style={TD}>
                        <span style={{
                          fontSize:10, fontWeight:600, padding:'2px 6px', borderRadius:999,
                          background: o.delivery_type === 'stopdesk' ? '#EEE5FF' : '#EBF5FF',
                          color:      o.delivery_type === 'stopdesk' ? '#9D76C1' : '#0D6EFD',
                        }}>
                          {o.delivery_type === 'stopdesk' ? 'المكتب' : 'المنزل'}
                        </span>
                      </td>
                    )}

                    {/* Wilaya */}
                    {show('wilaya') && (
                      <td style={TD}><span style={{color:'#495057',fontSize:11}}>{(o.wilaya as any)?.name_ar ?? '—'}</span></td>
                    )}

                    {/* Baladia */}
                    {show('baladia') && (
                      <td style={TD}><span style={{color:'#868E96',fontSize:10}}>{(o.commune as any)?.name_ar ?? '—'}</span></td>
                    )}

                    {/* Delivery action (tracking badge or send) */}
                    {show('delivery_action') && (
                      <td style={TD}>
                        {o.tracking_number
                          ? <TrackingBadge num={o.tracking_number} type={o.delivery_type ?? 'home'}/>
                          : <button onClick={()=>sendToDelivery(o)}
                              className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded hover:opacity-80"
                              style={{background:'#EBF5FF',color:'#0D6EFD',fontFamily:'var(--font-arabic)'}}>
                              <Truck size={10}/>إرسال
                            </button>
                        }
                      </td>
                    )}

                    {/* Product */}
                    {show('product') && (
                      <td style={TD}><span style={{color:'#495057',fontSize:11}}>{item0.product_name?.slice(0,18) ?? '—'}</span></td>
                    )}

                    {/* Product price */}
                    {show('product_price') && (
                      <td style={TD}><span style={{fontWeight:600,color:'#0D6EFD',fontSize:11,fontFamily:'monospace'}}>{item0.unit_price?.toLocaleString('ar-DZ') ?? '—'} دج</span></td>
                    )}

                    {/* Quantity */}
                    {show('quantity') && (
                      <td style={TD}><span style={{fontWeight:600,color:'#212529',fontSize:12}}>{item0.quantity ?? 1}</span></td>
                    )}

                    {/* Delivery price */}
                    {show('delivery_price') && (
                      <td style={TD}><span style={{color:'#495057',fontSize:11,fontFamily:'monospace'}}>{(o.declared_delivery_fee ?? o.delivery_fee ?? 0).toLocaleString('ar-DZ')} دج</span></td>
                    )}

                    {/* Total */}
                    {show('total_price') && (
                      <td style={TD}><span style={{fontWeight:700,color:'#0D6EFD',fontSize:12,fontFamily:'monospace'}}>{o.total?.toLocaleString('ar-DZ')} دج</span></td>
                    )}

                    {/* Notes */}
                    {show('notes') && (
                      <td style={TD}><span style={{color:'#868E96',fontSize:10,maxWidth:100,display:'block',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{o.notes ?? '—'}</span></td>
                    )}

                    {/* Variant */}
                    {show('variant') && (
                      <td style={TD}>
                        {item0.variant_key && item0.variant_key !== 'default'
                          ? (
                            <button onClick={()=>setEditModal({...o})} className="inline-flex items-center gap-1 hover:opacity-80">
                              <span style={{fontSize:10,padding:'1px 6px',borderRadius:999,background:'#D1E7DD',color:'#198754',fontWeight:600}}>{item0.variant_key}</span>
                              <Edit2 size={9} style={{color:'#22C55E'}}/>
                            </button>
                          )
                          : <span style={{color:'#DEE2E6',fontSize:10}}>—</span>
                        }
                      </td>
                    )}

                    {/* SKU */}
                    {show('sku') && (
                      <td style={TD}><span style={{fontFamily:'monospace',fontSize:10,color:'#868E96'}}>{item0.variant_sku ?? o.sku ?? '—'}</span></td>
                    )}

                    {/* Confirmed by */}
                    {show('confirmed_by') && (
                      <td style={TD}>
                        <ConfirmedByCell order={o} team={team} onSave={(teamId)=>{
                          const sb = createClient()
                          sb.from('orders').update({ confirmed_by: teamId ?? null }).eq('id', o.id)
                          setOrders(prev=>prev.map(x=>x.id===o.id?{...x,confirmed_by:teamId}:x))
                        }}/>
                      </td>
                    )}

                    {/* Actions */}
                    {show('actions') && <td style={TD}><RowActions order={o}/></td>}
                  </tr>
                )
              })
              return rows
            })()}
          </tbody>
        </table>
      </div>

      {/* PAGINATION */}
      <div className="flex items-center justify-between px-4 py-2.5 border-t" style={{borderColor:'var(--color-border)',background:'#FAFAFA'}}>
        <div className="flex items-center gap-2">
          <select value={perPage} onChange={e=>{setPerPage(+e.target.value);setPage(1)}}
            className="border rounded-lg px-2 h-7 text-xs outline-none" style={{borderColor:'var(--color-border)'}}>
            {[10,20,50,100].map(n=><option key={n} value={n}>{n}</option>)}
          </select>
          <span className="text-xs" style={{color:'#868E96',fontFamily:'var(--font-arabic)'}}>
            {Math.min((page-1)*perPage+1, filtered.length)}-{Math.min(page*perPage, filtered.length)} من {filtered.length}
          </span>
        </div>
        <div className="flex items-center gap-1">
          <PagBtn label="«" onClick={()=>setPage(1)} disabled={page<=1}/>
          <PagBtn label="‹" onClick={()=>setPage(p=>Math.max(1,p-1))} disabled={page<=1}/>
          {[...Array(Math.min(5,totalPages))].map((_,i) => {
            const n = Math.min(Math.max(page-2,1)+i, totalPages)
            return <PagBtn key={n} label={String(n)} onClick={()=>setPage(n)} active={page===n}/>
          })}
          <PagBtn label="›" onClick={()=>setPage(p=>Math.min(totalPages,p+1))} disabled={page>=totalPages}/>
          <PagBtn label="الأخيرة" onClick={()=>setPage(totalPages)} disabled={page>=totalPages}/>
        </div>
      </div>

      {/* ── MODALS ─────────────────────────────────────────────── */}

      {/* Trash confirm dialog (exact Octomatic: حذف green / إلغاء red) */}
      {confirmTrash && (
        <>
          <div className="fixed inset-0 bg-black/60 z-50" onClick={()=>setConfirmTrash(null)}/>
          <div className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-80 bg-white rounded-2xl shadow-2xl overflow-hidden" dir="rtl">
            <div className="p-5 text-center">
              <div className="w-12 h-12 rounded-full mx-auto mb-3 flex items-center justify-center" style={{background:'#FEE2E2'}}>
                <Trash2 size={20} style={{color:'#DC3545'}}/>
              </div>
              <p className="font-bold text-sm mb-1" style={{fontFamily:'var(--font-arabic)',color:'#212529'}}>هل أنت متأكد؟</p>
              <p className="text-xs mb-4" style={{fontFamily:'var(--font-arabic)',color:'#868E96'}}>سيتم نقل الطلبية إلى سلة المهملات</p>
              <div className="flex gap-3">
                <button onClick={()=>{ moveToTrash(confirmTrash); setConfirmTrash(null) }}
                  className="flex-1 h-9 rounded-xl text-sm font-bold text-white" style={{background:'#22C55E',fontFamily:'var(--font-arabic)'}}>
                  حذف
                </button>
                <button onClick={()=>setConfirmTrash(null)}
                  className="flex-1 h-9 rounded-xl text-sm font-bold text-white" style={{background:'#E23024',fontFamily:'var(--font-arabic)'}}>
                  إلغاء
                </button>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Column settings */}
      {showColSettings && <ColSettingsModal visibleCols={visibleCols} onSave={saveColSettings} onClose={()=>setShowColSettings(false)}/>}

      {/* Manual order */}
      {showManual && (
        <Modal title="إضافة طلبية يدوية" onClose={()=>setShowManual(false)} width={440}>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <Field label="الاسم الكامل *" required><input className="input text-sm w-full" value={manualForm.customer_name??''} onChange={e=>setManualForm((f:any)=>({...f,customer_name:e.target.value}))}/></Field>
              <Field label="رقم الهاتف *" required><input className="input text-sm w-full" dir="ltr" value={manualForm.customer_phone??''} onChange={e=>setManualForm((f:any)=>({...f,customer_phone:e.target.value}))}/></Field>
            </div>
            <Field label="العنوان"><input className="input text-sm w-full" value={manualForm.address??''} onChange={e=>setManualForm((f:any)=>({...f,address:e.target.value}))}/></Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="نوعية التوصيل">
                <select className="input text-sm w-full" value={manualForm.delivery_type??'home'} onChange={e=>setManualForm((f:any)=>({...f,delivery_type:e.target.value}))}>
                  <option value="home">توصيل للمنزل</option>
                  <option value="stopdesk">نقطة توزيع</option>
                </select>
              </Field>
              <Field label="المنتج">
                <select className="input text-sm w-full" value={manualForm.product_id??''} onChange={e=>setManualForm((f:any)=>({...f,product_id:e.target.value}))}>
                  <option value="">بدون منتج</option>
                  {products.map(p=><option key={p.id} value={p.id}>{p.name_ar??p.name}</option>)}
                </select>
              </Field>
            </div>
            {manualForm.product_id && (
              <Field label="الكمية"><input type="number" min="1" className="input text-sm w-full" value={manualForm.qty??1} onChange={e=>setManualForm((f:any)=>({...f,qty:+e.target.value}))}/></Field>
            )}
            <Field label="ملاحظات"><textarea rows={2} className="input text-sm w-full resize-none" value={manualForm.notes??''} onChange={e=>setManualForm((f:any)=>({...f,notes:e.target.value}))}/></Field>
            <div className="flex gap-2 pt-1">
              <button onClick={saveManual} disabled={savingManual||!manualForm.customer_name||!manualForm.customer_phone} className="flex-1 h-9 rounded-xl text-sm font-bold text-white" style={{background:'#0D6EFD'}}>
                {savingManual ? 'جارٍ الحفظ...' : 'إنشاء الطلبية'}
              </button>
              <button onClick={()=>setShowManual(false)} className="flex-1 h-9 rounded-xl text-sm font-bold border" style={{borderColor:'#DC3545',color:'#DC3545'}}>إلغاء</button>
            </div>
          </div>
        </Modal>
      )}

      {/* Edit order */}
      {editModal && (
        <Modal title={`تعديل الطلبية — ${editModal.order_number}`} onClose={()=>setEditModal(null)} width={440}>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <Field label="الاسم"><input className="input text-sm w-full" value={editModal.customer_name??''} onChange={e=>setEditModal((f:any)=>({...f,customer_name:e.target.value}))}/></Field>
              <Field label="الهاتف"><input className="input text-sm w-full" dir="ltr" value={editModal.customer_phone??''} onChange={e=>setEditModal((f:any)=>({...f,customer_phone:e.target.value}))}/></Field>
            </div>
            <Field label="العنوان"><input className="input text-sm w-full" value={editModal.address??''} onChange={e=>setEditModal((f:any)=>({...f,address:e.target.value}))}/></Field>
            <Field label="ملاحظات"><textarea rows={2} className="input text-sm w-full resize-none" value={editModal.notes??''} onChange={e=>setEditModal((f:any)=>({...f,notes:e.target.value}))}/></Field>
            <Field label="نوعية التوصيل">
              <select className="input text-sm w-full" value={editModal.delivery_type??'home'} onChange={e=>setEditModal((f:any)=>({...f,delivery_type:e.target.value}))}>
                <option value="home">توصيل للمنزل</option>
                <option value="stopdesk">نقطة توزيع</option>
              </select>
            </Field>
            <div className="flex gap-2 pt-1">
              <button onClick={saveEdit} disabled={savingEdit} className="flex-1 h-9 rounded-xl text-sm font-bold text-white" style={{background:'#22C55E'}}>
                {savingEdit ? 'جارٍ الحفظ...' : 'حفظ التعديل'}
              </button>
              <button onClick={()=>setEditModal(null)} className="flex-1 h-9 rounded-xl text-sm font-bold border" style={{borderColor:'#DC3545',color:'#DC3545'}}>إلغاء</button>
            </div>
          </div>
        </Modal>
      )}

      {/* Order history */}
      {historyModal && (
        <Modal title={`سجل الطلبية — ${historyModal.order_number}`} onClose={()=>setHistoryModal(null)} width={460}>
          <div className="space-y-2 max-h-[60vh] overflow-y-auto">
            {historyRows.length === 0
              ? <p className="text-center py-8 text-sm" style={{color:'#868E96'}}>لا يوجد سجل لهذه الطلبية</p>
              : historyRows.map((h: any, i: number) => {
                const defOld = getStatusDef(h.old_status)
                const defNew = getStatusDef(h.new_status)
                return (
                  <div key={h.id} className="flex items-start gap-3 pb-3 border-b" style={{borderColor:'#F1F3F5'}}>
                    <div className="w-2 h-2 rounded-full mt-1.5 flex-shrink-0" style={{background:'#0D6EFD'}}/>
                    <div>
                      <div className="flex items-center gap-1.5 flex-wrap">
                        {h.old_status && (
                          <>
                            <span className="inline-flex items-center rounded-full px-2 h-5 text-[10px] font-bold" style={{background:defOld.color,color:defOld.text}}>{defOld.label}</span>
                            <span style={{color:'#868E96',fontSize:11}}>→</span>
                          </>
                        )}
                        <span className="inline-flex items-center rounded-full px-2 h-5 text-[10px] font-bold" style={{background:defNew.color,color:defNew.text}}>{defNew.label}</span>
                        <span className="text-[10px]" style={{color:'#868E96'}}>{h.changed_by}</span>
                      </div>
                      {h.notes && <p className="text-xs mt-0.5" style={{color:'#495057'}}>{h.notes}</p>}
                      <p className="text-[10px] mt-0.5" style={{color:'#868E96'}}>
                        {new Date(h.created_at).toLocaleString('ar-DZ',{weekday:'short',day:'numeric',month:'short',hour:'2-digit',minute:'2-digit'})}
                      </p>
                    </div>
                  </div>
                )
              })
            }
          </div>
        </Modal>
      )}

      {/* Verify modal */}
      {verifyModal && (() => {
        const vc = verifyStats(verifyModal.customer_phone)
        const masked = verifyModal.customer_phone ? verifyModal.customer_phone.slice(0,2)+'****'+verifyModal.customer_phone.slice(-3) : '—'
        return (
          <Modal title="التحقق من العميل" onClose={()=>setVerifyModal(null)} width={360}>
            <div className="space-y-4 text-center">
              <div className="w-14 h-14 rounded-full mx-auto flex items-center justify-center" style={{background:'#EBF5FF'}}>
                <Package size={26} style={{color:'#0D6EFD'}}/>
              </div>
              <div>
                <p className="font-bold text-sm" style={{color:'#212529'}}>{verifyModal.customer_name}</p>
                <p className="text-xs font-mono" style={{color:'#868E96'}}>{masked}</p>
                <p className="text-xs" style={{color:'#868E96'}}>{(verifyModal.wilaya as any)?.name_ar ?? ''}</p>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-xl p-3" style={{background:'#D1E7DD'}}>
                  <p className="text-2xl font-black" style={{color:'#22C55E',fontFamily:'monospace'}}>{vc.green}</p>
                  <p className="text-xs" style={{color:'#198754'}}>تم التسليم</p>
                </div>
                <div className="rounded-xl p-3" style={{background:'#F8D7DA'}}>
                  <p className="text-2xl font-black" style={{color:'#DC3545',fontFamily:'monospace'}}>{vc.red}</p>
                  <p className="text-xs" style={{color:'#DC3545'}}>مرتجع / فاشل</p>
                </div>
              </div>
              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span style={{color:'#868E96'}}>نسبة الخطورة</span>
                  <span style={{fontWeight:700,color: vc.risk>=50?'#DC3545':vc.risk>=25?'#FFA447':'#22C55E'}}>{vc.risk}%</span>
                </div>
                <div className="h-2 rounded-full overflow-hidden" style={{background:'#F1F3F5'}}>
                  <div className="h-full rounded-full" style={{width:`${vc.risk}%`,background:vc.risk>=50?'#DC3545':vc.risk>=25?'#FFA447':'#22C55E'}}/>
                </div>
                <p className="text-[10px] mt-1" style={{color:'#868E96'}}>إجمالي {vc.total} طلبية بهذا الرقم</p>
              </div>
            </div>
          </Modal>
        )
      })()}

      {/* Send report modal */}
      {showSendReport && (
        <Modal title="تقرير الإرسال" onClose={()=>setShowSendReport(false)} width={540}>
          <div className="space-y-4">
            <div className="grid grid-cols-3 gap-3">
              {[
                {l:'إجمالي الإرسال',v:sendReports.length,c:'#0D6EFD'},
                {l:'نجح',v:sendReports.filter(r=>r.status==='sent').length,c:'#22C55E'},
                {l:'فشل',v:sendReports.filter(r=>r.status==='failed').length,c:'#E23024'},
              ].map(i=>(
                <div key={i.l} className="rounded-xl p-3 text-center" style={{background:'#F8F9FA'}}>
                  <p className="text-2xl font-black" style={{color:i.c,fontFamily:'monospace'}}>{i.v}</p>
                  <p className="text-xs" style={{color:'#868E96'}}>{i.l}</p>
                </div>
              ))}
            </div>
            <div className="max-h-64 overflow-y-auto space-y-2">
              {sendReports.length === 0
                ? <p className="text-center py-6 text-sm" style={{color:'#868E96'}}>لا توجد تقارير إرسال</p>
                : sendReports.map(r=>(
                  <div key={r.id} className="flex items-center gap-3 p-3 rounded-xl border" style={{borderColor:'#F1F3F5'}}>
                    <span className="w-2 h-2 rounded-full" style={{background:r.status==='sent'?'#22C55E':'#E23024'}}/>
                    <div className="flex-1 min-w-0">
                      <p className="font-mono text-xs font-bold" style={{color:'#0D6EFD'}}>{r.tracking_num??'—'}</p>
                      <p className="text-[10px]" style={{color:'#868E96'}}>{r.is_auto?'⚡ تلقائي':'✋ يدوي'} · {new Date(r.sent_at).toLocaleString('ar-DZ')}</p>
                    </div>
                    <span className="text-[10px] px-2 py-0.5 rounded-full font-semibold"
                      style={{background:r.status==='sent'?'#D1E7DD':'#F8D7DA',color:r.status==='sent'?'#198754':'#DC3545'}}>
                      {r.status==='sent'?'نجح':'فشل'}
                    </span>
                  </div>
                ))
              }
            </div>
            <button onClick={()=>setShowSendReport(false)} className="w-full h-9 rounded-xl text-sm font-bold text-white" style={{background:'#DC3545'}}>إغلاق</button>
          </div>
        </Modal>
      )}
    </div>
  )
}

// ─── CONFIRMED BY CELL ────────────────────────────────────────
function ConfirmedByCell({ order, team, onSave }: { order:any; team:any[]; onSave:(id:string|null)=>void }) {
  const [open, setOpen] = useState(false)
  const current = team.find(m => m.id === order.confirmed_by)
  return (
    <div className="relative">
      <button onClick={()=>setOpen(o=>!o)}
        className="flex items-center gap-1 text-xs hover:opacity-80"
        style={{color: current ? '#0D6EFD' : '#868E96', fontFamily:'var(--font-arabic)'}}>
        <Users size={10}/>{current?.name ?? '—'}<ChevronDown size={9}/>
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={()=>setOpen(false)}/>
          <div className="absolute right-0 top-full mt-1 w-40 bg-white border rounded-xl shadow-xl z-20 overflow-hidden" style={{borderColor:'var(--color-border)'}}>
            <button onClick={()=>{onSave(null);setOpen(false)}} className="w-full text-xs px-3 py-1.5 hover:bg-[#F8F9FA] text-right" style={{color:'#868E96'}}>— لا أحد</button>
            {team.map(m=>(
              <button key={m.id} onClick={()=>{onSave(m.id);setOpen(false)}}
                className="w-full text-xs px-3 py-1.5 hover:bg-[#EBF5FF] text-right font-medium"
                style={{color: order.confirmed_by===m.id?'#0D6EFD':'#212529',fontFamily:'var(--font-arabic)'}}>
                {m.name}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  )
}

// ─── COL SETTINGS MODAL (exact Octomatic) ────────────────────
function ColSettingsModal({ visibleCols, onSave, onClose }: { visibleCols:Set<string>; onSave:(s:Set<string>)=>void; onClose:()=>void }) {
  const [local, setLocal] = useState(new Set(visibleCols))
  const [style, setStyle] = useState<1|2>(1)

  // Exact Octomatic column list with section grouping
  const OCTO_COLS = [
    { key:'order_number',    label:'رقم الطلب',          defaultOn: true  },
    { key:'source',          label:'المصدر',             defaultOn: true  },
    { key:'date',            label:'التاريخ',            defaultOn: true  },
    { key:'customer_name',   label:'الإسم الكامل',        defaultOn: true  },
    { key:'phone',           label:'الهاتف',             defaultOn: true  },
    { key:'verify',          label:'تحقق',               defaultOn: true  },
    { key:'status',          label:'الحالة',             defaultOn: true  },
    { key:'address',         label:'العنوان',            defaultOn: true  },
    { key:'delivery_co',     label:'ش.ت',                defaultOn: true  },
    { key:'delivery_type',   label:'نوعية التوصيل',       defaultOn: true  },
    { key:'wilaya',          label:'الولاية',             defaultOn: true  },
    { key:'baladia',         label:'البلدية',             defaultOn: false },
    { key:'delivery_action', label:'ش ت إجراء',           defaultOn: true  },
    { key:'product',         label:'المنتج',              defaultOn: true  },
    { key:'product_price',   label:'سعر المنتج',          defaultOn: true  },
    { key:'quantity',        label:'الكمية',              defaultOn: true  },
    { key:'delivery_price',  label:'س.التوصيل',           defaultOn: true  },
    { key:'total_price',     label:'السعر الكلي',         defaultOn: true  },
    { key:'notes',           label:'ملاحظات',             defaultOn: true  },
    { key:'variant',         label:'المتغيرات',           defaultOn: true  },
    { key:'sku',             label:'SKU',                 defaultOn: false },
    { key:'confirmed_by',    label:'التأكيد بواسطة',      defaultOn: true  },
  ]

  const toggle = (key: string) => setLocal(prev => {
    const s = new Set(Array.from(prev))
    s.has(key) ? s.delete(key) : s.add(key)
    return s
  })

  return (
    <Modal title="إعدادات الأعمدة / تغيير شكل الجدول" onClose={onClose} width={520}>
      <div className="space-y-4">
        {/* Layout style toggle */}
        <div className="flex items-center gap-2">
          <span className="text-xs font-medium" style={{color:'#495057'}}>شكل الجدول:</span>
          {[1,2].map(s => (
            <button key={s} onClick={()=>setStyle(s as 1|2)}
              className="px-3 h-7 rounded-lg text-xs font-bold border transition-colors"
              style={{
                background: style===s ? '#0D6EFD' : '#fff',
                color:      style===s ? '#fff'    : '#495057',
                borderColor: style===s ? '#0D6EFD' : 'var(--color-border)',
              }}>
              ستايل 0{s}
            </button>
          ))}
        </div>

        {/* Column toggles */}
        <div className="grid grid-cols-2 gap-2 max-h-72 overflow-y-auto">
          {OCTO_COLS.map(c => {
            const on = local.has(c.key)
            return (
              <div key={c.key}
                className="flex items-center justify-between px-3 py-2 rounded-xl border cursor-pointer select-none"
                style={{borderColor: on ? '#DEE2E6' : '#FEE2E2', background: on ? '#FAFFFE' : '#FFFAFA'}}
                onClick={() => toggle(c.key)}>
                <span className="text-xs font-medium" style={{fontFamily:'var(--font-arabic)',color:'#212529'}}>{c.label}</span>
                <div className="w-9 h-5 rounded-full relative flex-shrink-0" style={{background: on?'#22C55E':'#DC3545'}}>
                  <span className="absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-all"
                    style={{[on?'right':'left']:'2px'} as any}/>
                </div>
              </div>
            )
          })}
        </div>

        {/* Action buttons — exact Octomatic order */}
        <div className="flex gap-2 pt-1 flex-wrap">
          <button onClick={()=>setLocal(new Set(OCTO_COLS.filter(c=>c.defaultOn).map(c=>c.key)))}
            className="flex-1 h-9 rounded-xl text-xs font-bold text-white" style={{background:'#22C55E',minWidth:140}}>
            إعادة تعيين إلى الافتراضي
          </button>
          <button className="flex-1 h-9 rounded-xl text-xs font-bold text-white" style={{background:'#22C55E',minWidth:100}}
            onClick={()=>{}}>
            ترتيب الأعمدة
          </button>
          <button onClick={()=>onSave(local)} className="flex-1 h-9 rounded-xl text-xs font-bold text-white" style={{background:'#0D6EFD',minWidth:80}}>
            حفظ
          </button>
          <button onClick={onClose} className="flex-1 h-9 rounded-xl text-xs font-bold border" style={{borderColor:'#DC3545',color:'#DC3545',minWidth:80}}>
            إلغاء
          </button>
        </div>
      </div>
    </Modal>
  )
}

// ─── UTILITY COMPONENTS ───────────────────────────────────────
function Modal({ title, onClose, children, width=420 }: { title:string; onClose:()=>void; children:React.ReactNode; width?:number }) {
  return (
    <>
      <div className="fixed inset-0 bg-black/60 z-50" onClick={onClose}/>
      <div className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-50 bg-white rounded-2xl shadow-2xl overflow-hidden" style={{width,maxWidth:'calc(100vw - 32px)',maxHeight:'90vh',overflowY:'auto'}} dir="rtl">
        <div className="flex items-center justify-between px-5 py-3 border-b sticky top-0 bg-white z-10" style={{borderColor:'#DEE2E6'}}>
          <h3 className="font-bold text-sm" style={{fontFamily:'var(--font-arabic)',color:'#212529'}}>{title}</h3>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-[#F8F9FA]"><X size={16}/></button>
        </div>
        <div className="p-5">{children}</div>
      </div>
    </>
  )
}

function Field({ label, children, required }: { label:string; children:React.ReactNode; required?:boolean }) {
  return (
    <div>
      <label className="block text-xs font-medium mb-1.5" style={{color:'#495057',fontFamily:'var(--font-arabic)'}}>
        {label}{required && <span style={{color:'#DC3545'}}> *</span>}
      </label>
      {children}
    </div>
  )
}

function PagBtn({ label, onClick, disabled, active }: { label:string; onClick:()=>void; disabled?:boolean; active?:boolean }) {
  return (
    <button onClick={onClick} disabled={disabled}
      className="h-7 min-w-[28px] px-1.5 rounded-lg text-xs border transition-colors disabled:opacity-40"
      style={{
        borderColor: active ? '#0D6EFD' : 'var(--color-border)',
        background:  active ? '#0D6EFD' : '#fff',
        color:       active ? '#fff'    : '#495057',
        fontFamily:  'var(--font-arabic)',
      }}>
      {label}
    </button>
  )
}

// ─── TABLE CELL STYLES ────────────────────────────────────────
const TH: React.CSSProperties = {
  padding: '8px 10px', textAlign: 'right', fontSize: 11, fontWeight: 600,
  whiteSpace: 'nowrap', fontFamily: 'var(--font-arabic)', letterSpacing: 0,
  borderLeft: '1px solid rgba(255,255,255,0.1)',
}
const TD: React.CSSProperties = {
  padding: '7px 10px', textAlign: 'right', verticalAlign: 'middle',
  borderLeft: '1px solid #F1F3F5', whiteSpace: 'nowrap',
}
