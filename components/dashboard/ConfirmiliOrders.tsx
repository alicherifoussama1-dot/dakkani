'use client'
// ============================================================
// ConfirmiliOrders — Exact Octomatic /orders page replica
// Dakkani blue #3CC6B9 · Exact status colors · RTL Arabic · Tajawal
// ============================================================
import React, {
  useState, useMemo, useCallback, useEffect,
} from 'react'
import { createClient } from '@/lib/supabase/client'
import {
  Search, RefreshCw, Trash2, Plus, SlidersHorizontal,
  Calendar, X, Check, ChevronDown, MessageCircle, Clock,
  Edit2, Truck, RotateCcw, Copy, CheckCircle, AlertTriangle,
  Package, Filter, Info, Users, Phone,
} from 'lucide-react'
// statuses import used for type parity — getStatusDef is inlined below for exact Octomatic colors

// ─── EXACT STATUS COLORS (Confirmili design system) ──────────
// color = solid pill bg · text = contrast-aware label color
const SB = {
  pending:   { label:'معلقة',    color:'#80BCBD', text:'#fff' },
  failed_01: { label:'فاشلة 01', color:'#FFA447', text:'#3A2400' },
  failed_02: { label:'فاشلة 02', color:'#FF8C1A', text:'#fff' },
  failed_03: { label:'فاشلة 03', color:'#E67300', text:'#fff' },
  confirmed: { label:'مؤكدة',    color:'#22C55E', text:'#fff' },
  cancelled: { label:'ملغاة',    color:'#E23024', text:'#fff' },
  postponed: { label:'مؤجلة',    color:'#9D76C1', text:'#fff' },
  duplicate: { label:'مكررة',    color:'#1A1A1A', text:'#fff' },
  // ── Logistics statuses (DB allows these too — migration 009) ──
  processing:       { label:'قيد المعالجة', color:'#3CC6B9', text:'#06403B' },
  shipped:          { label:'مشحونة',       color:'#3B82F6', text:'#fff' },
  in_transit:       { label:'في الطريق',     color:'#3B82F6', text:'#fff' },
  out_for_delivery: { label:'خرجت للتوصيل',  color:'#6366F1', text:'#fff' },
  with_driver:      { label:'مع السائق',     color:'#6366F1', text:'#fff' },
  at_stopdesk:      { label:'بالمكتب',       color:'#8B5CF6', text:'#fff' },
  delivered:        { label:'مسلمة',         color:'#16A34A', text:'#fff' },
  returned:         { label:'مرجعة',         color:'#DC2626', text:'#fff' },
  failed:           { label:'فاشلة',         color:'#FFA447', text:'#3A2400' },
  exception:        { label:'مشكلة',         color:'#EF4444', text:'#fff' },
} as Record<string, {label:string;color:string;text:string}>

// Row-background tint = 10% of the status color (spec). Falls back to 10%
// of the pill color for any unlisted status.
const ROW_TINT: Record<string,string> = {
  pending:   'rgba(128,188,189,0.10)',
  failed_01: 'rgba(255,164,71,0.10)',
  failed_02: 'rgba(255,140,26,0.10)',
  failed_03: 'rgba(230,115,0,0.10)',
  confirmed: 'rgba(34,197,94,0.10)',
  cancelled: 'rgba(226,48,36,0.10)',
  postponed: 'rgba(157,118,193,0.10)',
  duplicate: 'rgba(26,26,26,0.10)',
}

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

// ─── Row tint: ~13% of status color (hover ~24%) ──────────────
function hexToRgba(hex: string, alpha: number): string {
  const h = hex.replace('#','')
  const r = parseInt(h.substring(0,2),16)
  const g = parseInt(h.substring(2,4),16)
  const b = parseInt(h.substring(4,6),16)
  return `rgba(${r},${g},${b},${alpha})`
}

// ─── SOURCE ICONS ─────────────────────────────────────────────
function SourceBadge({ source }: { source: string }) {
  const s = (source ?? '').toLowerCase()
  if (s.includes('dakkani') || s.includes('storefront')) return (
    <span title="Dakkani" className="inline-flex items-center gap-1 text-[10px] font-bold px-1.5 py-0.5 rounded" style={{background:'#E0F5F2',color:'#3CC6B9'}}>🔵 Dakkani</span>
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

// Reorderable middle columns (☑ is always first, الإجراءات always last).
const MIDDLE_COLS = COL_DEFS.map(c => c.key).filter(k => k !== 'actions')
const LS_ORDER = 'confirmili_col_order_v1'
const LS_DENSITY = 'confirmili_density_v1'
function loadSavedOrder(): string[] {
  try {
    if (typeof window === 'undefined') throw new Error()
    const raw = localStorage.getItem(LS_ORDER)
    if (raw) {
      const saved: string[] = JSON.parse(raw)
      // keep only known keys, then append any new columns not yet in saved order
      const known = saved.filter(k => MIDDLE_COLS.includes(k))
      return [...known, ...MIDDLE_COLS.filter(k => !known.includes(k))]
    }
  } catch {}
  return MIDDLE_COLS
}
function loadSavedDensity(): 1|2 {
  try { return (localStorage.getItem(LS_DENSITY) === '2' ? 2 : 1) } catch { return 1 }
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
  const [colOrder,        setColOrder]        = useState<string[]>(loadSavedOrder)
  const [density,         setDensity]         = useState<1|2>(loadSavedDensity)

  // modals
  const [showColSettings, setShowColSettings] = useState(false)
  const [showManual,      setShowManual]      = useState(false)
  const [manualForm,      setManualForm]      = useState<any>({})
  const [savingManual,    setSavingManual]    = useState(false)
  const [wilayasList,     setWilayasList]     = useState<{id:number;name_ar:string}[]>([])
  const [manualCommunes,  setManualCommunes]  = useState<{id:number;name_ar:string}[]>([])
  const [showSendReport,  setShowSendReport]  = useState(false)
  const [sendReports,     setSendReports]     = useState<any[]>([])
  const [srSearch,        setSrSearch]        = useState('')
  const [srStatus,        setSrStatus]        = useState<'all'|'sent'|'failed'>('all')
  const [srDate,          setSrDate]          = useState('')
  const [srPage,          setSrPage]          = useState(1)
  const [srPerPage,       setSrPerPage]       = useState(10)
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

  // Lazy-load the 58 wilayas the first time the manual-order modal opens.
  useEffect(() => {
    if (!showManual || wilayasList.length > 0) return
    createClient().from('wilayas').select('id,name_ar').order('id')
      .then(({ data }) => setWilayasList((data ?? []) as any))
  }, [showManual, wilayasList.length])

  // Dependent communes: reload whenever the chosen wilaya changes.
  useEffect(() => {
    const wid = manualForm.wilaya_id
    if (!wid) { setManualCommunes([]); return }
    createClient().from('communes').select('id,name_ar').eq('wilaya_id', +wid).order('name_ar')
      .then(({ data }) => setManualCommunes((data ?? []) as any))
  }, [manualForm.wilaya_id])

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
    if (order.tracking_number) { setToast('الطلب مُرسَل مسبقاً'); return }
    setToast('جارٍ الإرسال إلى شركة التوصيل...')
    try {
      // Real shipment via the unified provider (resolves wilaya routing /
      // delivery_provider_id / first active provider) → creates a REAL parcel.
      const res = await fetch(`/api/delivery/ship/${order.id}`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}',
      })
      const d = await res.json().catch(() => ({}))
      if (!res.ok) { setToast(d.error ?? 'تعذّر الإرسال — تأكد من تفعيل شركة توصيل وربطها'); return }
      setOrders(prev => prev.map(o => o.id === order.id
        ? { ...o, tracking_number: d.trackingNumber, status: 'processing', tracking_status: 'pending', label_url: d.labelUrl ?? o.label_url }
        : o))
      setToast(`✓ أُرسل عبر ${d.provider ?? 'شركة التوصيل'} — ${d.trackingNumber}`)
    } catch {
      setToast('تعذّر الإرسال إلى شركة التوصيل')
    }
  }, [setToast])

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
    if (!manualForm.customer_name || !manualForm.customer_phone || !manualForm.wilaya_id) return
    setSavingManual(true)
    try {
      const res = await fetch('/api/orders', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          store_id: storeId, source: 'manual', payment_method: 'cod',
          customer_name: manualForm.customer_name, customer_phone: manualForm.customer_phone,
          address: manualForm.address ?? '',
          wilaya_id: +manualForm.wilaya_id,
          commune_id: manualForm.commune_id ? +manualForm.commune_id : undefined,
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
    // Join client (orders) + company so cards can show name/company/message.
    let { data, error } = await sb.from('confirmili_send_reports')
      .select('*, order:orders(customer_name,order_number), company:confirmili_delivery_companies(short_name,name)')
      .eq('store_id', storeId).order('sent_at', { ascending: false }).limit(300)
    if (error) { // fallback if FK-embeds unavailable
      const r = await sb.from('confirmili_send_reports').select('*')
        .eq('store_id', storeId).order('sent_at', { ascending: false }).limit(300)
      data = r.data as any
    }
    setSendReports(data ?? [])
  }, [storeId])

  const saveColSettings = useCallback((cols: Set<string>, order: string[], dens: 1|2) => {
    setVisibleCols(cols); setColOrder(order); setDensity(dens)
    try {
      localStorage.setItem(LS_COLS, JSON.stringify(Array.from(cols)))
      localStorage.setItem(LS_ORDER, JSON.stringify(order))
      localStorage.setItem(LS_DENSITY, String(dens))
    } catch {}
    setShowColSettings(false); setToast('✓ تم حفظ إعدادات الأعمدة')
  }, [setToast])

  // col visibility helper
  const show = (key: string) => visibleCols.has(key)
  // density-aware cell padding (ستايل 01 = مريح · ستايل 02 = مضغوط)
  const td: React.CSSProperties = { ...TD, padding: density === 2 ? '3px 8px' : '7px 10px' }

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
    <div className="flex flex-wrap items-center gap-1.5 px-3 py-2.5 border-b" style={{borderColor:'var(--color-border)',background:'#fff',fontFamily:'var(--font-arabic)'}}>

      {/* Search */}
      <div className="relative">
        <Search size={13} className="absolute right-3 top-1/2 -translate-y-1/2" style={{color:'#3CC6B9'}}/>
        <input value={search} onChange={e=>{setSearch(e.target.value);setPage(1)}}
          placeholder="بحث..." dir="rtl"
          className="pr-8 pl-3 h-8 text-xs border rounded-full outline-none focus:ring-2"
          style={{borderColor:'#3CC6B9',background:'#fff',width:170,color:'#0A6E66',fontFamily:'var(--font-arabic)'}}/>
      </div>

      {/* Bulk select toggle */}
      <button
        onClick={() => { setBulkMode(m=>!m); if (bulkMode) { setSelected(new Set()) } }}
        className="relative h-7 px-2.5 text-xs rounded-full border flex items-center gap-1.5 transition-colors"
        style={{ borderColor: bulkMode ? '#3CC6B9' : 'var(--color-border)', background: bulkMode ? '#E0F5F2' : '#fff', color: bulkMode ? '#3CC6B9' : '#495057' }}>
        مهام متعددة
        {selected.size > 0 && (
          <span className="w-4 h-4 rounded-full text-[9px] font-bold text-white flex items-center justify-center" style={{background:'#3CC6B9'}}>
            {selected.size}
          </span>
        )}
      </button>

      {/* Bulk action menu */}
      {bulkMode && selected.size > 0 && (
        <div className="relative">
          <button onClick={()=>setBulkMenuOpen(o=>!o)}
            className="h-7 px-2.5 text-xs rounded-full border flex items-center gap-1" style={{borderColor:'#3CC6B9',background:'#E0F5F2',color:'#3CC6B9'}}>
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
            className="h-7 px-2.5 text-xs rounded-full border transition-colors"
            style={{
              borderColor: '#3CC6B9',
              background:  datePreset===d ? '#00414D' : '#fff',
              color:       datePreset===d ? '#fff'    : '#0A6E66',
              fontWeight:  600,
              fontFamily:  'var(--font-arabic)',
            }}>
            {L[d]}
          </button>
        )
      })}

      {/* Calendar date range */}
      <div className="relative">
        <button onClick={()=>setShowCal(o=>!o)}
          className="h-7 w-7 flex items-center justify-center rounded-full border"
          style={{borderColor:'#3CC6B9',background:'#fff',color:'#0A6E66'}}>
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
                <button onClick={()=>setShowCal(false)} className="flex-1 h-7 text-xs rounded-lg text-white" style={{background:'#3CC6B9'}}>تطبيق</button>
                <button onClick={()=>{setCalendarFrom('');setCalendarTo('');setShowCal(false)}} className="flex-1 h-7 text-xs rounded-full border" style={{borderColor:'var(--color-border)'}}>مسح</button>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Column settings */}
      <button onClick={()=>setShowColSettings(true)}
        className="h-7 px-2.5 text-xs rounded-full border flex items-center gap-1.5"
        style={{borderColor:'#3CC6B9',background:'#fff',color:'#0A6E66'}}>
        <SlidersHorizontal size={12}/>إعدادات الأعمدة
      </button>

      {/* Refresh */}
      <button onClick={()=>{onRefresh();setToast('جارٍ التحديث...')}}
        className="h-7 w-7 flex items-center justify-center rounded-full border"
        style={{borderColor:'#3CC6B9',background:'#fff',color:'#0A6E66'}}>
        <RefreshCw size={13}/>
      </button>

      {/* Trash toggle */}
      <button onClick={()=>{setTrashMode(m=>!m);setPage(1)}}
        className="h-7 px-2.5 text-xs rounded-full border flex items-center gap-1.5 transition-colors"
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
        className="h-7 px-2.5 text-xs rounded-full border flex items-center gap-1.5"
        style={{borderColor:'#3CC6B9',background:'#fff',color:'#0A6E66'}}>
        📊 تقرير الإرسال
      </button>

      {/* Add manual order */}
      <button onClick={()=>{setShowManual(true);setManualForm({})}}
        className="h-7 px-2.5 text-xs rounded-lg flex items-center gap-1 text-white"
        style={{background:'#3CC6B9'}}>
        <Plus size={12}/>
      </button>

      {/* Info */}
      <div className="relative">
        <button onClick={()=>setInfoOpen(o=>!o)} className="h-7 w-7 flex items-center justify-center rounded-full border" style={{borderColor:'var(--color-border)',background:'#fff',color:'#868E96'}}>
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
        <button onClick={()=>setDatePreset('all')} className="h-6 px-2 text-[10px] rounded-full flex items-center gap-1" style={{background:'#E0F5F2',color:'#3CC6B9'}}>
          {({today:'اليوم',yesterday:'الأمس',week:'أسبوع',month:'شهر'} as any)[datePreset]}
          <X size={10}/>
        </button>
      )}
      {statusFilter.length > 0 && (
        <button onClick={()=>setStatusFilter([])} className="h-6 px-2 text-[10px] rounded-full flex items-center gap-1" style={{background:'#E0F5F2',color:'#3CC6B9'}}>
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
                    {isCurrent && <span className="mr-auto text-[9px]" style={{color:'#3CC6B9'}}>✓</span>}
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
          <Truck size={13} style={{color:'#3CC6B9'}}/>
        </button>
      )}
    </div>
  )

  // ── TRACKING BADGE ────────────────────────────────────────────
  const TrackingBadge = ({ num, type }: { num: string; type: string }) => {
    const prefix = type === 'stopdesk' ? 'SD' : 'HM'
    const bg     = type === 'stopdesk' ? '#EEE5FF' : '#E0F5F2'
    const col    = type === 'stopdesk' ? '#9D76C1' : '#3CC6B9'
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
        <Filter size={10} style={{color: sourceFilter.length > 0 ? '#3CC6B9' : '#868E96'}}/>
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
                  className="w-3 h-3 accent-[#3CC6B9]"/>
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
        <Filter size={10} style={{color: statusFilter.length > 0 ? '#3CC6B9' : '#868E96'}}/>
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
                  className="w-3 h-3 accent-[#3CC6B9]"/>
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
        <Filter size={10} style={{color: wilayaFilter.length > 0 ? '#3CC6B9' : '#868E96'}}/>
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
                    className="w-3 h-3 accent-[#3CC6B9]"/>
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

  // ── COLUMN HEADER RENDERER (order-driven) ─────────────────────
  const HEADERS: Record<string, React.ReactNode> = {
    source:        <span className="flex items-center gap-1">المصدر<SourceFilter/></span>,
    order_number:  'ر.الطلبية', date: 'التاريخ', customer_name: 'الإسم الكامل', phone: 'الهاتف', verify: 'تحقق',
    status:        <span className="flex items-center gap-1">الحالة<StatusFilter/></span>,
    address:       'العنوان', delivery_co: 'ش.ت', delivery_type: 'نوعية التوصيل',
    wilaya:        <span className="flex items-center gap-1">الولاية<WilayaFilter/></span>,
    baladia:       'البلدية', delivery_action: 'ش ت إجراء', product: 'المنتج', product_price: 'سعر المنتج',
    quantity:      'الكمية', delivery_price: 'س.التوصيل', total_price: 'السعر الكلي', notes: 'ملاحظات',
    variant:       'المتغيرات', sku: 'SKU', confirmed_by: 'التأكيد بواسطة',
  }
  const renderHeader = (k: string) => show(k) ? <th key={k} style={TH}>{HEADERS[k]}</th> : null

  // ── COLUMN CELL RENDERER (order-driven) ───────────────────────
  const renderCell = (k: string, o: any, vc: any, item0: any, co: any): React.ReactNode => {
    if (!show(k)) return null
    let inner: React.ReactNode = null
    switch (k) {
      case 'source': inner = (
        <span className="inline-flex items-center gap-1 flex-wrap">
          <SourceBadge source={o.source ?? o.utm_source ?? ''}/>
          {(o as any).sheet_status === 'sent' && <span title="أُرسل نسخة للقوقل شيت" className="inline-flex items-center gap-0.5 text-[10px] font-bold px-1.5 py-0.5 rounded" style={{background:'#D1E7DD',color:'#198754'}}>📊 أُرسل للشيت</span>}
          {(o as any).sheet_status === 'failed' && <span title={(o as any).sheet_error ?? 'فشل الإرسال للشيت'} className="inline-flex items-center gap-0.5 text-[10px] font-bold px-1.5 py-0.5 rounded" style={{background:'#F8D7DA',color:'#DC3545'}}>⚠️ فشل الشيت</span>}
        </span>); break
      case 'order_number': inner = <span className="font-mono font-bold" style={{color:'#3CC6B9',fontSize:11}}>{o.order_number}</span>; break
      case 'date': inner = (<>
        <div style={{color:'#495057',fontSize:10}}>{new Date(o.created_at).toLocaleDateString('ar-DZ')}</div>
        <div style={{color:'#868E96',fontSize:10}}>{new Date(o.created_at).toLocaleTimeString('ar-DZ',{hour:'2-digit',minute:'2-digit'})}</div>
      </>); break
      case 'customer_name': inner = <span style={{fontWeight:500,color:'#212529'}}>{o.customer_name}</span>; break
      case 'phone': inner = (
        <button onClick={()=>openWhatsApp(o.customer_phone, o.customer_name)} className="font-mono hover:underline flex items-center gap-1.5" style={{color:'#212529',fontSize:11}} title="واتساب / اتصال">
          <span className="inline-flex items-center justify-center rounded-full" style={{width:18,height:18,background:'#22C55E',color:'#fff',flexShrink:0}}><Phone size={10}/></span>
          +{o.customer_phone}
        </button>); break
      case 'verify': inner = (
        <button onClick={()=>setVerifyModal(o)} className="inline-flex items-center gap-1.5 rounded-full hover:opacity-80" title="التحقق من العميل" style={{background:'#FFFDEE',border:'1px solid #F0EBC8',padding:'2px 8px'}}>
          <span style={{color:'#198754',fontSize:10,fontWeight:800}}>{vc.green}</span>
          <span style={{color:'#CED4DA',fontSize:9}}>·</span>
          <span style={{color:'#DC3545',fontSize:10,fontWeight:800}}>{vc.red}</span>
        </button>); break
      case 'status': inner = <StatusCell order={o}/>; break
      case 'address': inner = <span style={{color:'#495057',fontSize:10,maxWidth:120,display:'block',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{o.address ?? (o.wilaya as any)?.name_ar ?? '—'}</span>; break
      case 'delivery_co': inner = <span style={{fontWeight:600,color:'#495057',fontSize:11}}>{co?.short_name ?? '—'}</span>; break
      case 'delivery_type': inner = (
        <span style={{fontSize:10,fontWeight:600,padding:'2px 6px',borderRadius:999,background:o.delivery_type==='stopdesk'?'#EEE5FF':'#E0F5F2',color:o.delivery_type==='stopdesk'?'#9D76C1':'#3CC6B9'}}>
          {o.delivery_type==='stopdesk'?'المكتب':'المنزل'}
        </span>); break
      case 'wilaya': inner = <span style={{color:'#495057',fontSize:11}}>{(o.wilaya as any)?.name_ar ?? '—'}</span>; break
      case 'baladia': inner = <span style={{color:'#868E96',fontSize:10}}>{(o.commune as any)?.name_ar ?? '—'}</span>; break
      case 'delivery_action': inner = o.tracking_number
        ? <TrackingBadge num={o.tracking_number} type={o.delivery_type ?? 'home'}/>
        : <button onClick={()=>sendToDelivery(o)} className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded hover:opacity-80" style={{background:'#E0F5F2',color:'#3CC6B9',fontFamily:'var(--font-arabic)'}}><Truck size={10}/>إرسال</button>; break
      case 'product': inner = <span style={{color:'#495057',fontSize:11}}>{item0.product_name?.slice(0,18) ?? '—'}</span>; break
      case 'product_price': inner = <span style={{fontWeight:600,color:'#3CC6B9',fontSize:11,fontFamily:'monospace'}}>{item0.unit_price?.toLocaleString('ar-DZ') ?? '—'} دج</span>; break
      case 'quantity': inner = <span style={{fontWeight:600,color:'#212529',fontSize:12}}>{item0.quantity ?? 1}</span>; break
      case 'delivery_price': inner = <span style={{color:'#495057',fontSize:11,fontFamily:'monospace'}}>{(o.declared_delivery_fee ?? o.delivery_fee ?? 0).toLocaleString('ar-DZ')} دج</span>; break
      case 'total_price': inner = <span style={{fontWeight:700,color:'#3CC6B9',fontSize:12,fontFamily:'monospace'}}>{o.total?.toLocaleString('ar-DZ')} دج</span>; break
      case 'notes': inner = <span style={{color:'#868E96',fontSize:10,maxWidth:100,display:'block',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{o.notes ?? '—'}</span>; break
      case 'variant': inner = (item0.variant_key && item0.variant_key !== 'default')
        ? <button onClick={()=>setEditModal({...o})} className="inline-flex items-center gap-1 hover:opacity-80"><span style={{fontSize:10,padding:'1px 6px',borderRadius:999,background:'#D1E7DD',color:'#198754',fontWeight:600}}>{item0.variant_key}</span><Edit2 size={9} style={{color:'#22C55E'}}/></button>
        : <span style={{color:'#DEE2E6',fontSize:10}}>—</span>; break
      case 'sku': inner = <span style={{fontFamily:'monospace',fontSize:10,color:'#868E96'}}>{item0.variant_sku ?? o.sku ?? '—'}</span>; break
      case 'confirmed_by': inner = (
        <ConfirmedByCell order={o} team={team} onSave={(teamId)=>{
          const sb = createClient()
          sb.from('orders').update({ confirmed_by: teamId ?? null }).eq('id', o.id)
          setOrders(prev=>prev.map(x=>x.id===o.id?{...x,confirmed_by:teamId}:x))
        }}/>); break
      default: return null
    }
    return <td key={k} style={td}>{inner}</td>
  }

  // ── MAIN RENDER ───────────────────────────────────────────────
  return (
    <div className="space-y-0" style={{fontFamily:'var(--font-arabic)'}} dir="rtl">
      <Toolbar/>

      {/* TABLE */}
      <div className="overflow-x-auto rounded-xl" style={{scrollbarWidth:'thin'}}>
        <table style={{borderCollapse:'separate',borderSpacing:0,minWidth:'1800px',fontSize:'12px',fontFamily:'var(--font-arabic)'}}>
          <thead>
            <tr style={{background:'#00414D',color:'#fff',userSelect:'none'}}>
              {/* Checkbox */}
              <th style={TH}>
                <input type="checkbox" checked={allSelected}
                  onChange={e => {
                    if (e.target.checked) setSelected(new Set(pagedOrders.map(o=>o.id)))
                    else setSelected(new Set())
                  }}
                  className="w-3.5 h-3.5 accent-[#3CC6B9]"/>
              </th>
              {/* Reorderable columns (order-driven) */}
              {colOrder.map(k => renderHeader(k))}
              {show('actions') && <th style={TH}>الإجراءات</th>}
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

                const vc = verifyStats(o.customer_phone)
                const item0 = (o.items as any[])?.[0] ?? {}
                const co = companies.find(c => c.id === o.delivery_company_id)
                const statusColor = getStatusDef(o.status).color
                const nk = normStatus(o.status)
                const rowBg      = ROW_TINT[nk] ?? hexToRgba(statusColor, 0.10)
                const rowBgHover = hexToRgba(statusColor, 0.20)

                rows.push(
                  <tr key={o.id}
                    style={{
                      background: selected.has(o.id) ? '#E0F5F2' : rowBg,
                      borderBottom:'1px solid #F1F3F5',
                    }}
                    onMouseEnter={e=>(e.currentTarget.style.background=selected.has(o.id)?'#E0F5F2':rowBgHover)}
                    onMouseLeave={e=>(e.currentTarget.style.background=selected.has(o.id)?'#E0F5F2':rowBg)}>

                    {/* Checkbox */}
                    <td style={TD}>
                      <input type="checkbox" checked={selected.has(o.id)}
                        onChange={e => setSelected(prev => { const s=new Set(prev); e.target.checked?s.add(o.id):s.delete(o.id); return s })}
                        className="w-3.5 h-3.5 accent-[#3CC6B9]"/>
                    </td>

                    {/* Reorderable cells (order-driven) */}
                    {colOrder.map(k => renderCell(k, o, vc, item0, co))}

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
      <div className="flex items-center justify-between px-4 py-2.5 border-t" style={{borderColor:'var(--color-border)',background:'#fff'}}>
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
      {showColSettings && <ColSettingsModal visibleCols={visibleCols} order={colOrder} density={density} onSave={saveColSettings} onClose={()=>setShowColSettings(false)}/>}

      {/* Manual order */}
      {showManual && (
        <Modal title="إضافة طلبية يدوية" onClose={()=>setShowManual(false)} width={440}>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <Field label="الاسم الكامل *" required><input className="input text-sm w-full" value={manualForm.customer_name??''} onChange={e=>setManualForm((f:any)=>({...f,customer_name:e.target.value}))}/></Field>
              <Field label="رقم الهاتف *" required><input className="input text-sm w-full" dir="ltr" value={manualForm.customer_phone??''} onChange={e=>setManualForm((f:any)=>({...f,customer_phone:e.target.value}))}/></Field>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Field label="الولاية *" required>
                <select className="input text-sm w-full" value={manualForm.wilaya_id??''} onChange={e=>setManualForm((f:any)=>({...f,wilaya_id:e.target.value,commune_id:''}))}>
                  <option value="">اختر الولاية</option>
                  {wilayasList.map(w=><option key={w.id} value={w.id}>{w.id} - {w.name_ar}</option>)}
                </select>
              </Field>
              <Field label="البلدية">
                <select className="input text-sm w-full" value={manualForm.commune_id??''} disabled={!manualForm.wilaya_id} onChange={e=>setManualForm((f:any)=>({...f,commune_id:e.target.value}))}>
                  <option value="">{manualForm.wilaya_id ? 'اختر البلدية' : 'اختر الولاية أولاً'}</option>
                  {manualCommunes.map(c=><option key={c.id} value={c.id}>{c.name_ar}</option>)}
                </select>
              </Field>
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
              <button onClick={saveManual} disabled={savingManual||!manualForm.customer_name||!manualForm.customer_phone||!manualForm.wilaya_id} className="flex-1 h-9 rounded-xl text-sm font-bold text-white" style={{background:'#3CC6B9'}}>
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
                    <div className="w-2 h-2 rounded-full mt-1.5 flex-shrink-0" style={{background:'#3CC6B9'}}/>
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
              <div className="w-14 h-14 rounded-full mx-auto flex items-center justify-center" style={{background:'#E0F5F2'}}>
                <Package size={26} style={{color:'#3CC6B9'}}/>
              </div>
              <div>
                <p className="font-bold text-sm" style={{color:'#212529'}}>{verifyModal.customer_name}</p>
                <p className="text-xs font-mono" style={{color:'#868E96'}}>{masked}</p>
                <p className="text-xs" style={{color:'#868E96'}}>{(verifyModal.wilaya as any)?.name_ar ?? ''}</p>
                {verifyModal.address && <p className="text-xs mt-0.5" style={{color:'#ADB5BD'}}>{verifyModal.address}</p>}
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
      {showSendReport && (() => {
        const srFiltered = sendReports.filter(r => {
          if (srStatus !== 'all' && r.status !== srStatus) return false
          if (srDate && (r.sent_at ?? '').slice(0,10) !== srDate) return false
          if (srSearch.trim()) {
            const q = srSearch.trim().toLowerCase()
            const hay = `${r.tracking_num ?? ''} ${r.order?.customer_name ?? ''} ${r.order?.order_number ?? ''} ${r.company?.short_name ?? r.company?.name ?? ''}`.toLowerCase()
            if (!hay.includes(q)) return false
          }
          return true
        })
        const srTotalPages = Math.max(1, Math.ceil(srFiltered.length / srPerPage))
        const srPaged = srFiltered.slice((srPage-1)*srPerPage, srPage*srPerPage)
        return (
        <Modal title="تقرير الإرسال" onClose={()=>setShowSendReport(false)} width={560}>
          <div className="space-y-4">
            <div className="grid grid-cols-3 gap-3">
              {[
                {l:'إجمالي الإرسال',v:sendReports.length,c:'#3CC6B9'},
                {l:'نجح',v:sendReports.filter(r=>r.status==='sent').length,c:'#22C55E'},
                {l:'فشل',v:sendReports.filter(r=>r.status==='failed').length,c:'#E23024'},
              ].map(i=>(
                <div key={i.l} className="rounded-xl p-3 text-center" style={{background:'#F8F9FA'}}>
                  <p className="text-2xl font-black" style={{color:i.c,fontFamily:'monospace'}}>{i.v}</p>
                  <p className="text-xs" style={{color:'#868E96'}}>{i.l}</p>
                </div>
              ))}
            </div>

            {/* Filters */}
            <div className="flex flex-wrap items-center gap-2">
              <input value={srSearch} onChange={e=>{setSrSearch(e.target.value);setSrPage(1)}} placeholder="بحث: عميل / رقم تتبع / طلبية" dir="rtl"
                className="flex-1 min-w-[160px] border rounded-lg px-3 h-8 text-xs outline-none" style={{borderColor:'var(--color-border)'}}/>
              <select value={srStatus} onChange={e=>{setSrStatus(e.target.value as any);setSrPage(1)}} className="border rounded-lg px-2 h-8 text-xs outline-none" style={{borderColor:'var(--color-border)'}}>
                <option value="all">كل الحالات</option><option value="sent">نجح</option><option value="failed">فشل</option>
              </select>
              <input type="date" value={srDate} onChange={e=>{setSrDate(e.target.value);setSrPage(1)}} className="border rounded-lg px-2 h-8 text-xs outline-none" style={{borderColor:'var(--color-border)'}}/>
              <select value={srPerPage} onChange={e=>{setSrPerPage(+e.target.value);setSrPage(1)}} className="border rounded-lg px-2 h-8 text-xs outline-none" style={{borderColor:'var(--color-border)'}}>
                {[10,20,50].map(n=><option key={n} value={n}>{n}/صفحة</option>)}
              </select>
            </div>

            <div className="max-h-64 overflow-y-auto space-y-2">
              {srFiltered.length === 0
                ? <p className="text-center py-6 text-sm" style={{color:'#868E96'}}>لا توجد تقارير إرسال</p>
                : srPaged.map(r=>(
                  <div key={r.id} className="flex items-center gap-3 p-3 rounded-xl border" style={{borderColor:'#F1F3F5'}}>
                    <span className="w-2 h-2 rounded-full flex-shrink-0" style={{background:r.status==='sent'?'#22C55E':'#E23024'}}/>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-bold truncate" style={{color:'#212529',fontFamily:'var(--font-arabic)'}}>
                        {r.order?.customer_name ?? '—'}
                        {r.order?.order_number && <span className="font-mono mr-1" style={{color:'#868E96',fontWeight:400}}> #{r.order.order_number}</span>}
                      </p>
                      <p className="font-mono text-[11px] font-bold" style={{color:'#3CC6B9'}}>{r.tracking_num??'—'}</p>
                      <p className="text-[10px]" style={{color:'#868E96'}}>
                        {(r.company?.short_name ?? r.company?.name) ? `🚚 ${r.company.short_name ?? r.company.name} · ` : ''}
                        {r.is_auto?'⚡ تلقائي':'✋ يدوي'} · {new Date(r.sent_at).toLocaleString('ar-DZ')}
                      </p>
                      <p className="text-[10px]" style={{color:r.status==='sent'?'#198754':'#DC3545'}}>{r.status==='sent'?'تم الإرسال بنجاح':'فشل الإرسال'}</p>
                    </div>
                    <span className="text-[10px] px-2 py-0.5 rounded-full font-semibold flex-shrink-0"
                      style={{background:r.status==='sent'?'#D1E7DD':'#F8D7DA',color:r.status==='sent'?'#198754':'#DC3545'}}>
                      {r.status==='sent'?'نجح':'فشل'}
                    </span>
                  </div>
                ))
              }
            </div>

            {/* Pagination */}
            {srFiltered.length > srPerPage && (
              <div className="flex items-center justify-between">
                <span className="text-[11px]" style={{color:'#868E96'}}>
                  {Math.min((srPage-1)*srPerPage+1, srFiltered.length)}-{Math.min(srPage*srPerPage, srFiltered.length)} من {srFiltered.length}
                </span>
                <div className="flex items-center gap-1">
                  <PagBtn label="‹" onClick={()=>setSrPage(p=>Math.max(1,p-1))} disabled={srPage<=1}/>
                  <span className="text-xs px-2" style={{color:'#495057'}}>{srPage} / {srTotalPages}</span>
                  <PagBtn label="›" onClick={()=>setSrPage(p=>Math.min(srTotalPages,p+1))} disabled={srPage>=srTotalPages}/>
                </div>
              </div>
            )}
            <button onClick={()=>setShowSendReport(false)} className="w-full h-9 rounded-xl text-sm font-bold text-white" style={{background:'#DC3545'}}>إغلاق</button>
          </div>
        </Modal>
        )
      })()}
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
        style={{color: current ? '#3CC6B9' : '#868E96', fontFamily:'var(--font-arabic)'}}>
        <Users size={10}/>{current?.name ?? '—'}<ChevronDown size={9}/>
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={()=>setOpen(false)}/>
          <div className="absolute right-0 top-full mt-1 w-40 bg-white border rounded-xl shadow-xl z-20 overflow-hidden" style={{borderColor:'var(--color-border)'}}>
            <button onClick={()=>{onSave(null);setOpen(false)}} className="w-full text-xs px-3 py-1.5 hover:bg-[#F8F9FA] text-right" style={{color:'#868E96'}}>— لا أحد</button>
            {team.map(m=>(
              <button key={m.id} onClick={()=>{onSave(m.id);setOpen(false)}}
                className="w-full text-xs px-3 py-1.5 hover:bg-[#E0F5F2] text-right font-medium"
                style={{color: order.confirmed_by===m.id?'#3CC6B9':'#212529',fontFamily:'var(--font-arabic)'}}>
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
function ColSettingsModal({ visibleCols, order, density, onSave, onClose }: { visibleCols:Set<string>; order:string[]; density:1|2; onSave:(s:Set<string>,o:string[],d:1|2)=>void; onClose:()=>void }) {
  const [local, setLocal]           = useState(new Set(visibleCols))
  const [localOrder, setLocalOrder] = useState<string[]>(order)
  const [style, setStyle]           = useState<1|2>(density)

  const LABELS: Record<string,string> = Object.fromEntries(COL_DEFS.map(c => [c.key, c.label]))
  const DEFAULT_ON = COL_DEFS.filter(c => c.defaultOn && c.key !== 'actions').map(c => c.key)

  const toggle = (key: string) => setLocal(prev => {
    const s = new Set(Array.from(prev)); s.has(key) ? s.delete(key) : s.add(key); return s
  })
  const move = (idx: number, dir: -1|1) => setLocalOrder(prev => {
    const a = [...prev]; const j = idx + dir
    if (j < 0 || j >= a.length) return a
    ;[a[idx], a[j]] = [a[j], a[idx]]; return a
  })

  return (
    <Modal title="إعدادات الأعمدة / تغيير شكل الجدول" onClose={onClose} width={520}>
      <div className="space-y-4">
        {/* Row density (ستايل 01/02) */}
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs font-medium" style={{color:'#495057'}}>شكل الجدول:</span>
          {([1,2] as const).map(s => (
            <button key={s} onClick={()=>setStyle(s)}
              className="px-3 h-7 rounded-lg text-xs font-bold border transition-colors"
              style={{
                background: style===s ? '#3CC6B9' : '#fff',
                color:      style===s ? '#fff'    : '#495057',
                borderColor: style===s ? '#3CC6B9' : 'var(--color-border)',
              }}>
              {s===1 ? 'ستايل 01 — مريح' : 'ستايل 02 — مضغوط'}
            </button>
          ))}
        </div>

        {/* Column list: reorder (▲▼) + On/Off, rendered in saved order */}
        <p className="text-[10px]" style={{color:'#868E96',fontFamily:'var(--font-arabic)'}}>استخدم ▲▼ لإعادة الترتيب والمفتاح للإظهار/الإخفاء</p>
        <div className="space-y-1.5 max-h-72 overflow-y-auto pr-0.5">
          {localOrder.map((key, idx) => {
            const on = local.has(key)
            return (
              <div key={key} className="flex items-center gap-2 px-3 py-1.5 rounded-xl border select-none"
                style={{borderColor: on ? '#DEE2E6' : '#FEE2E2', background: on ? '#FAFFFE' : '#FFFAFA'}}>
                <div className="flex flex-col leading-none">
                  <button onClick={()=>move(idx,-1)} disabled={idx===0} className="text-[10px] disabled:opacity-25 hover:opacity-70" style={{color:'#3CC6B9'}} title="أعلى">▲</button>
                  <button onClick={()=>move(idx,1)} disabled={idx===localOrder.length-1} className="text-[10px] disabled:opacity-25 hover:opacity-70" style={{color:'#3CC6B9'}} title="أسفل">▼</button>
                </div>
                <span className="text-xs font-medium flex-1" style={{fontFamily:'var(--font-arabic)',color:'#212529'}}>{LABELS[key] ?? key}</span>
                <button onClick={()=>toggle(key)} className="w-9 h-5 rounded-full relative flex-shrink-0" style={{background: on?'#22C55E':'#DC3545'}} title={on?'ظاهر':'مخفي'}>
                  <span className="absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-all" style={{[on?'right':'left']:'2px'} as any}/>
                </button>
              </div>
            )
          })}
        </div>

        {/* Action buttons */}
        <div className="flex gap-2 pt-1 flex-wrap">
          <button onClick={()=>{ setLocal(new Set(DEFAULT_ON)); setLocalOrder(MIDDLE_COLS); setStyle(1) }}
            className="flex-1 h-9 rounded-xl text-xs font-bold text-white" style={{background:'#22C55E',minWidth:160}}>
            إعادة تعيين إلى الافتراضي
          </button>
          <button onClick={()=>onSave(local, localOrder, style)} className="flex-1 h-9 rounded-xl text-xs font-bold text-white" style={{background:'#3CC6B9',minWidth:80}}>
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
      className="h-7 min-w-[28px] px-1.5 rounded-full text-xs border transition-colors disabled:opacity-40"
      style={{
        borderColor: active ? '#00414D' : '#3CC6B9',
        background:  active ? '#00414D' : '#fff',
        color:       active ? '#fff'    : '#0A6E66',
        fontFamily:  'var(--font-arabic)',
      }}>
      {label}
    </button>
  )
}

// ─── TABLE CELL STYLES ────────────────────────────────────────
const TH: React.CSSProperties = {
  padding: '10px 10px', textAlign: 'right', fontSize: 11.5, fontWeight: 700,
  whiteSpace: 'nowrap', fontFamily: 'var(--font-arabic)', letterSpacing: 0,
  borderLeft: '1px solid rgba(255,255,255,0.12)', color: '#fff',
}
const TD: React.CSSProperties = {
  padding: '7px 10px', textAlign: 'right', verticalAlign: 'middle',
  borderLeft: '1px solid #F1F3F5', whiteSpace: 'nowrap',
}
