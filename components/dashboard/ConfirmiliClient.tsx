'use client'
import { useState, useMemo, useCallback, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import {
  Bell, X, Phone, TrendingUp, Package,
  Truck, Link2, Calculator, Users, Settings, Video, Bot, QrCode,
  BarChart2, Map, CheckSquare, Warehouse, ArrowUpDown, DollarSign,
  Filter, Plus, Search, RefreshCw, Trash2, Edit2, Eye, Download,
  SlidersHorizontal, Calendar, AlignLeft, ChevronRight, ChevronLeft,
  AlertTriangle, CheckCircle, XCircle, Clock, PhoneCall, Copy, RotateCcw,
  MessageCircle, ChevronDown, History, Languages, Headphones, FileSpreadsheet,
  Globe, Pencil, Table, User, LogOut, Wallet,
} from 'lucide-react'
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  Legend, RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
  PieChart, Pie, Cell, BarChart, Bar,
} from 'recharts'
import { getStatus, statusLabel, STATUS_LIST } from '@/lib/confirmili/statuses'
import ConfirmiliOrders from './ConfirmiliOrders'
// Store-owned delivery module (Confirmili reuses it; store has no reverse dep)
import ConfirmiliDelivery from '@/components/store/StoreDelivery'

// ── Sub-nav tabs ──────────────────────────────────────────
const TABS = [
  { id: 'statistics',        label: 'الإحصائيات',    icon: BarChart2 },
  { id: 'orders',            label: 'الطلبات',        icon: AlignLeft },
  { id: 'tracking',          label: 'التتبع',          icon: Map },
  { id: 'validation',        label: 'التحقق',          icon: CheckSquare },
  { id: 'products',          label: 'المخزون',         icon: Warehouse },
  { id: 'delivery',          label: 'التوصيل',         icon: Truck },
  { id: 'store-integration', label: 'قنوات البيع',     icon: Link2 },
  { id: 'finances',          label: 'الحسابات',        icon: DollarSign },
  { id: 'team',              label: 'الفريق',           icon: Users },
  { id: 'settings',          label: 'الإعدادات',       icon: Settings },
  { id: 'tutorials',         label: 'الفيديوهات',      icon: Video },
  { id: 'ai',                label: 'الذكاء الاصطناعي', icon: Bot },
  { id: 'qr',                label: 'QR',               icon: QrCode },
]

// Status action menu — EXACT Octomatic colors from lib/confirmili/statuses
// (DB persists failed_1/2/3; UI labels failed_01/02/03)
const STATUS_ACTIONS = [
  { status: 'confirmed',  label: 'تأكيد الطلب ✅', color: getStatus('confirmed').color },
  { status: 'failed_1',   label: 'فاشلة 01 📵',    color: getStatus('failed_01').color },
  { status: 'failed_2',   label: 'فاشلة 02 📵',    color: getStatus('failed_02').color },
  { status: 'failed_3',   label: 'فاشلة 03 📵',    color: getStatus('failed_03').color },
  { status: 'postponed',  label: 'مؤجلة 🕐',       color: getStatus('postponed').color },
  { status: 'cancelled',  label: 'إلغاء الطلب ❌', color: getStatus('cancelled').color },
  { status: 'duplicate',  label: 'مكررة 👥',       color: getStatus('duplicate').color },
  { status: 'delivered',  label: 'مسلمة ✅',       color: '#16A34A' },
  { status: 'returned',   label: 'مرجعة 📦',       color: '#DC3545' },
]

const CONFIRM_STATUSES_STATIC = [
  { key:'confirmed', label:'المؤكدة',  color:'#22C55E' },
  { key:'cancelled', label:'الملغاة',  color:'#E23024' },
  { key:'failed_1',  label:'فاشلة 01', color:'#FFA447' },
  { key:'failed_2',  label:'فاشلة 02', color:'#FF8C1A' },
  { key:'failed_3',  label:'فاشلة 03', color:'#E67300' },
  { key:'postponed', label:'مؤجلة',    color:'#9D76C1' },
  { key:'duplicate', label:'مكررة',    color:'#1A1A1A' },
]
const PIE_COLORS = ['#198754','#DC3545','#FFC107','#3CC6B9','#7B2FBE','#FF8C00']

const TUTORIALS = [
  {n:'01',title:'مقدمة'},{n:'02',title:'الإحصائيات'},{n:'03',title:'إعدادات الحساب'},
  {n:'04',title:'ربط المتجر'},{n:'05',title:'إضافة منتج'},{n:'06',title:'فريق العمل'},
  {n:'07',title:'قنوات البيع'},{n:'08',title:'جدول الطلبات ج1'},{n:'09',title:'جدول الطلبات ج2'},
  {n:'10',title:'جدول الطلبات ج3'},{n:'11',title:'جدول التتبع'},{n:'12',title:'المخزون'},
  {n:'13',title:'فريق العمل'},{n:'14',title:'الحسابات'},{n:'15',title:'تخصيص شركات بالولايات'},
  {n:'16',title:'رجل التوصيل'},{n:'17',title:'تحديث الرمز'},{n:'18',title:'ربط ZR Express'},
  {n:'19',title:'تقرير الإرسال'},
]

const COMING_SOON = (
  <div className="flex flex-col items-center justify-center py-24" style={{ color: 'var(--color-text-muted)' }}>
    <span className="text-5xl mb-4">🤖</span>
    <p className="text-lg font-semibold" style={{ color: 'var(--color-text-secondary)' }}>COMING SOON...</p>
    <p className="text-sm mt-1">Cooking our product</p>
  </div>
)

// ── i18n translations ────────────────────────────────────────
const T: Record<string, Record<string, string>> = {
  ar: {
    statistics: 'الإحصائيات', orders: 'الطلبات', tracking: 'التتبع',
    validation: 'التحقق', products: 'المخزون', delivery: 'التوصيل',
    store_integration: 'قنوات البيع', finances: 'الحسابات', team: 'الفريق',
    settings_tab: 'الإعدادات', tutorials: 'الفيديوهات', ai: 'الذكاء الاصطناعي',
    new: 'جديد', confirmed: 'مؤكدة', cancelled: 'ملغاة', delivered: 'مسلمة',
    action: 'إجراء', search: 'بحث...', refresh: 'تحديث', export_csv: 'تصدير CSV',
    today: 'اليوم', yesterday: 'الأمس', week: 'أسبوع', month: 'شهر', all_time: 'كل وقت',
    trash: 'سلة المهملات', confirm_all: 'تأكيد الكل', cancel_all: 'إلغاء الكل',
    whatsapp: 'واتساب', call_attempt: 'محاولة اتصال', move_to_trash: 'نقل للسلة',
    restore: 'استعادة', order_history: 'سجل الطلبية', status_history: 'تاريخ التغييرات',
    no_history: 'لا يوجد سجل لهذه الطلبية', close: 'إغلاق',
    source_dakkani: 'Commerco', source_manual: 'يدوي', source_sheet: 'شيت',
  },
  fr: {
    statistics: 'Statistiques', orders: 'Commandes', tracking: 'Suivi',
    validation: 'Validation', products: 'Stock', delivery: 'Livraison',
    store_integration: 'Intégrations', finances: 'Finances', team: 'Équipe',
    settings_tab: 'Paramètres', tutorials: 'Tutoriels', ai: 'Intelligence AI',
    new: 'Nouveau', confirmed: 'Confirmé', cancelled: 'Annulé', delivered: 'Livré',
    action: 'Action', search: 'Rechercher...', refresh: 'Actualiser', export_csv: 'Export CSV',
    today: "Auj.", yesterday: 'Hier', week: 'Semaine', month: 'Mois', all_time: 'Tout',
    trash: 'Corbeille', confirm_all: 'Tout confirmer', cancel_all: 'Tout annuler',
    whatsapp: 'WhatsApp', call_attempt: 'Tentative appel', move_to_trash: 'Mettre à la corbeille',
    restore: 'Restaurer', order_history: 'Historique', status_history: 'Historique des statuts',
    no_history: 'Aucun historique', close: 'Fermer',
    source_dakkani: 'Commerco', source_manual: 'Manuel', source_sheet: 'Tableur',
  },
  en: {
    statistics: 'Statistics', orders: 'Orders', tracking: 'Tracking',
    validation: 'Validation', products: 'Stock', delivery: 'Delivery',
    store_integration: 'Integrations', finances: 'Finances', team: 'Team',
    settings_tab: 'Settings', tutorials: 'Tutorials', ai: 'AI',
    new: 'New', confirmed: 'Confirmed', cancelled: 'Cancelled', delivered: 'Delivered',
    action: 'Action', search: 'Search...', refresh: 'Refresh', export_csv: 'Export CSV',
    today: 'Today', yesterday: 'Yesterday', week: 'Week', month: 'Month', all_time: 'All time',
    trash: 'Trash', confirm_all: 'Confirm all', cancel_all: 'Cancel all',
    whatsapp: 'WhatsApp', call_attempt: 'Call attempt', move_to_trash: 'Move to trash',
    restore: 'Restore', order_history: 'Order history', status_history: 'Status history',
    no_history: 'No history found', close: 'Close',
    source_dakkani: 'Commerco', source_manual: 'Manual', source_sheet: 'Sheet',
  },
}

interface Props {
  initialTeam?:      any[]
  initialCompanies?: any[]
  storeId?: string
  storeName?: string
  plan?: string
  planOrderLimit?: number
  planOrdersUsed?: number
  balance?: number
  initialOrders?: any[]
  initialProducts?: any[]
}

export default function ConfirmiliClient({ storeId='', storeName='متجري', plan='free', planOrderLimit=1000, planOrdersUsed=0, balance=0, initialOrders=[], initialProducts=[], initialTeam=[], initialCompanies=[] }: Props) {
  const router = useRouter()
  const [activeTab,     setActiveTab]    = useState('statistics')
  const [statsTab,      setStatsTab]     = useState(0)
  const [notifOpen,     setNotifOpen]    = useState(false)
  const [notifTab,      setNotifTab]     = useState(0)
  const [avatarOpen,    setAvatarOpen]   = useState(false)
  const [ordersPerPage, setOrdersPP]     = useState(50)
  const [delivSubTab,   setDelivSubTab]  = useState(0)
  const [trackSubTab,   setTrackSubTab]  = useState(0)
  const [teamSubTab,    setTeamSubTab]   = useState(0)
  const [financeSubTab, setFinanceSubTab]= useState(0)
  const [storeSubTab,   setStoreSubTab]  = useState(0)
  const [settingsTab,   setSettingsTab]  = useState(0)
  const [tutSearch,     setTutSearch]    = useState('')
  const [orderSearch,   setOrderSearch]  = useState('')
  // Language switcher
  const [lang,          setLang]         = useState<'ar'|'fr'|'en'>(() => {
    if (typeof window !== 'undefined') {
      return (localStorage.getItem('confirmili_lang') as 'ar'|'fr'|'en') ?? 'ar'
    }
    return 'ar'
  })
  // Order history modal
  const [historyModal,  setHistoryModal] = useState<{orderId:string;orderNum:string}|null>(null)
  const [orderHistory,  setOrderHistory] = useState<any[]>([])
  const [loadingHistory,setLoadingHistory]= useState(false)
  // Notifications
  const [notifications, setNotifications] = useState<any[]>([])
  const [unreadCount,   setUnreadCount]   = useState(0)
  // Toast (declared early — used by many handlers)
  const [toast,         setToastRaw]      = useState<string|null>(null)
  const setToast = useCallback((msg: string) => {
    setToastRaw(msg)
    window.setTimeout(() => setToastRaw(null), 2200)
  }, [])
  // Team + delivery companies (loaded from confirmili_* tables)
  const [team,          setTeam]          = useState<any[]>(initialTeam)
  const [companies,     setCompanies]     = useState<any[]>(initialCompanies)
  const [teamForm,      setTeamForm]      = useState<any|null>(null) // null=closed, {}=add, {id}=edit
  const [companyForm,   setCompanyForm]   = useState<any|null>(null)
  // Finance config (costs that feed profit calc)
  const [financeCfg,    setFinanceCfg]    = useState<any>({ monthly_ad_cost:0, confirmation_price:0, confirmation_price_mode:'per_confirmed', packaging_price:0, tracking_price:0 })
  // Product CRUD modal
  const [prodForm,      setProdForm]      = useState<any|null>(null) // null=closed, {}=add, {id}=edit
  const [prodSearch,    setProdSearch]    = useState('')
  const [prodList,      setProdList]      = useState<any[]>(initialProducts)
  // Column settings modal (persist to localStorage)
  const DEFAULT_COLS = ['source','order_number','date','name','phone','verify','status','wilaya','product','total','call_attempts','actions']
  const [showColSettings, setShowColSettings] = useState(false)
  const [visibleCols, setVisibleCols] = useState<Set<string>>(() => {
    if (typeof window === 'undefined') return new Set(DEFAULT_COLS)
    try { const s = localStorage.getItem('confirmili_cols'); return s ? new Set(JSON.parse(s)) : new Set(DEFAULT_COLS) } catch { return new Set(DEFAULT_COLS) }
  })
  // Manual order modal
  const [showManual, setShowManual] = useState(false)
  const [manualForm, setManualForm] = useState<any>({})
  const [savingManual, setSavingManual] = useState(false)
  // Send report modal
  const [showSendReport, setShowSendReport] = useState(false)
  const [sendReports,    setSendReports]    = useState<any[]>([])
  // QR
  const [qrResult, setQrResult] = useState<string|null>(null)
  // Store integrations (confirmili_store_integrations)
  const [integrations,   setIntegrations]   = useState<any[]>([])
  const [integForm,      setIntegForm]      = useState<any|null>(null)
  // Delivery pricing (declared/real price lists + wilaya↔company map)
  const [wilayasList,    setWilayasList]    = useState<any[]>([])
  const [declaredPrices, setDeclaredPrices] = useState<Record<number,{home:number;desk:number}>>({})
  const [realPrices,     setRealPrices]     = useState<Record<number,{home:number;desk:number}>>({})
  const [wilayaCompanyMap, setWilayaCompanyMap] = useState<Record<number,string>>({})
  // Realtime subscription ref
  const realtimeRef = useRef<any>(null)
  const declaredListIdRef = useRef<string|null>(null)
  const realListIdRef = useRef<string|null>(null)

  // i18n helper
  const t = useCallback((key: string) => T[lang]?.[key] ?? T.ar[key] ?? key, [lang])
  const setLanguage = (l: 'ar'|'fr'|'en') => {
    setLang(l)
    if (typeof window !== 'undefined') localStorage.setItem('confirmili_lang', l)
  }

  // ─── LOAD NOTIFICATIONS ─────────────────────────────────
  const loadNotifications = useCallback(async () => {
    try {
      const res = await fetch('/api/notifications')
      if (res.ok) {
        const data = await res.json()
        setNotifications(data.notifications ?? [])
        setUnreadCount(data.unread ?? 0)
      }
    } catch {}
  }, [])

  // ─── LOAD TEAM + DELIVERY COMPANIES ─────────────────────
  const loadTeam = useCallback(async () => {
    if (!storeId) return
    const sb = createClient()
    const { data } = await sb.from('confirmili_team').select('*').eq('store_id', storeId).order('created_at', { ascending: false })
    setTeam(data ?? [])
  }, [storeId])

  const loadCompanies = useCallback(async () => {
    if (!storeId) return
    const sb = createClient()
    const { data } = await sb.from('confirmili_delivery_companies').select('*').eq('store_id', storeId).order('created_at', { ascending: true })
    setCompanies(data ?? [])
  }, [storeId])

  // ─── DELIVERY PRICING ────────────────────────────────────
  const loadDeliveryPricing = useCallback(async () => {
    if (!storeId) return
    const sb = createClient()
    const [wRes, mapRes] = await Promise.all([
      sb.from('wilayas').select('id,name_ar').order('id'),
      sb.from('confirmili_wilaya_company_map').select('wilaya_id,company_id').eq('store_id', storeId),
    ])
    setWilayasList(wRes.data ?? [])
    const map: Record<number,string> = {}
    ;(mapRes.data ?? []).forEach((r:any) => { map[r.wilaya_id] = r.company_id })
    setWilayaCompanyMap(map)

    for (const kind of ['declared','real'] as const) {
      const { data: list } = await sb.from('confirmili_price_lists').select('id').eq('store_id', storeId).eq('kind', kind).maybeSingle()
      let listId = list?.id
      if (!listId) {
        const { data: created } = await sb.from('confirmili_price_lists')
          .insert({ store_id: storeId, name: kind === 'declared' ? 'الأسعار المعلنة' : 'الأسعار الحقيقية', kind })
          .select('id').single()
        listId = created?.id
      }
      if (!listId) continue
      const { data: rows } = await sb.from('confirmili_price_list_wilayas').select('wilaya_id,price_home,price_desk').eq('price_list_id', listId)
      const prices: Record<number,{home:number;desk:number}> = {}
      ;(rows ?? []).forEach((r:any) => { prices[r.wilaya_id] = { home: r.price_home ?? 0, desk: r.price_desk ?? 0 } })
      if (kind === 'declared') { setDeclaredPrices(prices); declaredListIdRef.current = listId }
      else { setRealPrices(prices); realListIdRef.current = listId }
    }
  }, [storeId])

  const savePrice = useCallback(async (kind: 'declared'|'real', wilayaId: number, field: 'home'|'desk', value: number) => {
    const sb = createClient()
    const listId = kind === 'declared' ? declaredListIdRef.current : realListIdRef.current
    if (!listId) return
    const current = (kind === 'declared' ? declaredPrices : realPrices)[wilayaId] ?? { home: 0, desk: 0 }
    const next = { ...current, [field]: value }
    if (kind === 'declared') setDeclaredPrices(p => ({ ...p, [wilayaId]: next })); else setRealPrices(p => ({ ...p, [wilayaId]: next }))
    await sb.from('confirmili_price_list_wilayas').upsert(
      { price_list_id: listId, wilaya_id: wilayaId, price_home: next.home, price_desk: next.desk },
      { onConflict: 'price_list_id,wilaya_id' }
    )
  }, [declaredPrices, realPrices])

  const saveWilayaCompany = useCallback(async (wilayaId: number, companyId: string) => {
    const sb = createClient()
    setWilayaCompanyMap(m => ({ ...m, [wilayaId]: companyId }))
    if (!companyId) {
      await sb.from('confirmili_wilaya_company_map').delete().eq('store_id', storeId).eq('wilaya_id', wilayaId)
      return
    }
    await sb.from('confirmili_wilaya_company_map').upsert(
      { store_id: storeId, wilaya_id: wilayaId, company_id: companyId },
      { onConflict: 'store_id,wilaya_id' }
    )
  }, [storeId])

  const loadFinanceCfg = useCallback(async () => {
    if (!storeId) return
    const sb = createClient()
    const { data } = await sb.from('confirmili_finance_config').select('*').eq('store_id', storeId).maybeSingle()
    if (data) setFinanceCfg(data)
  }, [storeId])

  const saveFinanceCfg = useCallback(async () => {
    const sb = createClient()
    await sb.from('confirmili_finance_config').upsert(
      { store_id: storeId, ...financeCfg, updated_at: new Date().toISOString() },
      { onConflict: 'store_id' }
    )
    setToast('تم حفظ إعدادات التكاليف')
  }, [storeId, financeCfg, setToast])

  // ─── LOAD STORE INTEGRATIONS ────────────────────────────
  const loadIntegrations = useCallback(async () => {
    if (!storeId) return
    const sb = createClient()
    const { data } = await sb.from('confirmili_store_integrations').select('*').eq('store_id', storeId).order('created_at', { ascending: false })
    setIntegrations(data ?? [])
  }, [storeId])

  const saveIntegration = useCallback(async () => {
    if (!integForm?.name) return
    const sb = createClient()
    const payload = { store_id: storeId, name: integForm.name, platform: integForm.platform ?? 'youcan', status: integForm.status ?? true, config: integForm.config ?? {} }
    if (integForm.id) await sb.from('confirmili_store_integrations').update(payload).eq('id', integForm.id)
    else              await sb.from('confirmili_store_integrations').insert(payload)
    setIntegForm(null); setToast('تم الحفظ'); loadIntegrations()
  }, [integForm, storeId, setToast, loadIntegrations])

  const toggleIntegration = useCallback(async (it: any) => {
    const sb = createClient()
    await sb.from('confirmili_store_integrations').update({ status: !it.status }).eq('id', it.id)
    setIntegrations(prev => prev.map(x => x.id === it.id ? { ...x, status: !x.status } : x))
  }, [])

  const deleteIntegration = useCallback(async (id: string) => {
    if (!window.confirm('حذف هذا التكامل؟')) return
    const sb = createClient()
    await sb.from('confirmili_store_integrations').delete().eq('id', id)
    setIntegrations(prev => prev.filter(x => x.id !== id)); setToast('تم الحذف')
  }, [setToast])

  // ─── LOAD SEND REPORTS ──────────────────────────────────
  const loadSendReports = useCallback(async () => {
    if (!storeId) return
    const sb = createClient()
    const { data } = await sb.from('confirmili_send_reports').select('*').eq('store_id', storeId).order('sent_at', { ascending: false }).limit(50)
    setSendReports(data ?? [])
  }, [storeId])

  // ─── COLUMN SETTINGS SAVE ───────────────────────────────
  const saveColSettings = useCallback((cols: Set<string>) => {
    setVisibleCols(cols)
    if (typeof window !== 'undefined') localStorage.setItem('confirmili_cols', JSON.stringify(Array.from(cols)))
    setShowColSettings(false); setToast('تم حفظ إعدادات الأعمدة')
  }, [setToast])

  // ─── MANUAL ORDER ───────────────────────────────────────
  const saveManualOrder = useCallback(async () => {
    if (!manualForm.customer_name || !manualForm.customer_phone) return
    setSavingManual(true)
    try {
      const res = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          store_id: storeId, source: 'manual', payment_method: 'cod',
          customer_name: manualForm.customer_name, customer_phone: manualForm.customer_phone,
          wilaya_id: manualForm.wilaya_id ? +manualForm.wilaya_id : 1,
          delivery_type: manualForm.delivery_type ?? 'home',
          notes: manualForm.notes ?? '',
          items: manualForm.product_id ? [{ product_id: manualForm.product_id, quantity: manualForm.qty ?? 1, variant_key:'default' }] : [],
        }),
      })
      const data = await res.json()
      if (data.success) {
        setShowManual(false); setManualForm({})
        setToast('تم إنشاء الطلبية'); // reload
      } else setToast(data.error ?? 'خطأ في الحفظ')
    } catch { setToast('خطأ في الشبكة') }
    finally { setSavingManual(false) }
  }, [manualForm, storeId, setToast])

  // ─── PRODUCT CRUD ───────────────────────────────────────
  const saveProd = useCallback(async () => {
    if (!prodForm?.name && !prodForm?.name_ar) return
    const sb = createClient()
    const patch: any = {
      name: prodForm.name ?? prodForm.name_ar,
      name_ar: prodForm.name_ar ?? prodForm.name,
      price: +(prodForm.price ?? 0),
      sku: prodForm.sku ?? null,
      min_stock_alert: +(prodForm.min_stock_alert ?? 5),
      confirmili_is_known: prodForm.confirmili_is_known ?? true,
      confirmili_team_note: prodForm.confirmili_team_note ?? null,
    }
    if (!prodForm.id) return
    await sb.from('products').update(patch).eq('id', prodForm.id)
    const { data } = await sb.from('products').select('id,name,name_ar,sku,price,cost_price,images,min_stock_alert,confirmili_is_known,confirmili_team_note').eq('store_id', storeId).eq('is_active', true).order('name')
    setProdList(data ?? []); setProdForm(null); setToast('تم حفظ المنتج')
  }, [prodForm, storeId, setToast])

  const deleteProd = useCallback(async (id: string) => {
    if (!window.confirm('حذف هذا المنتج؟')) return
    const sb = createClient()
    await sb.from('products').update({ is_active: false }).eq('id', id)
    setProdList(prev => prev.filter(x => x.id !== id)); setToast('تم الحذف')
  }, [setToast])

  useEffect(() => { loadTeam(); loadCompanies(); loadFinanceCfg(); loadIntegrations(); loadDeliveryPricing() }, [loadTeam, loadCompanies, loadFinanceCfg, loadIntegrations, loadDeliveryPricing])

  // ─── TEAM CRUD ──────────────────────────────────────────
  const saveTeamMember = useCallback(async () => {
    if (!teamForm?.name) return
    const sb = createClient()
    const payload = {
      store_id: storeId, name: teamForm.name, phone: teamForm.phone ?? null,
      email: teamForm.email ?? null, role: teamForm.role ?? 'confirmer',
      is_active: teamForm.is_active ?? true,
    }
    if (teamForm.id) await sb.from('confirmili_team').update(payload).eq('id', teamForm.id)
    else            await sb.from('confirmili_team').insert(payload)
    setTeamForm(null); setToast('تم حفظ العضو'); loadTeam()
  }, [teamForm, storeId, setToast, loadTeam])

  const toggleTeamMember = useCallback(async (m: any) => {
    const sb = createClient()
    await sb.from('confirmili_team').update({ is_active: !m.is_active }).eq('id', m.id)
    setTeam(prev => prev.map(x => x.id === m.id ? { ...x, is_active: !x.is_active } : x))
  }, [])

  const deleteTeamMember = useCallback(async (id: string) => {
    if (!window.confirm('حذف هذا العضو؟')) return
    const sb = createClient()
    await sb.from('confirmili_team').delete().eq('id', id)
    setTeam(prev => prev.filter(x => x.id !== id)); setToast('تم الحذف')
  }, [setToast])

  // ─── DELIVERY COMPANY CRUD ──────────────────────────────
  const saveCompany = useCallback(async () => {
    if (!companyForm?.name) return
    const sb = createClient()
    const payload = {
      store_id: storeId, name: companyForm.name,
      short_name: companyForm.short_name ?? companyForm.name.slice(0,2).toUpperCase(),
      is_active: companyForm.is_active ?? true, is_automatic: companyForm.is_automatic ?? false,
    }
    if (companyForm.id) await sb.from('confirmili_delivery_companies').update(payload).eq('id', companyForm.id)
    else                await sb.from('confirmili_delivery_companies').insert(payload)
    setCompanyForm(null); setToast('تم حفظ الشركة'); loadCompanies()
  }, [companyForm, storeId, setToast, loadCompanies])

  const toggleCompany = useCallback(async (c: any, field: 'is_active'|'is_automatic') => {
    const sb = createClient()
    await sb.from('confirmili_delivery_companies').update({ [field]: !c[field] }).eq('id', c.id)
    setCompanies(prev => prev.map(x => x.id === c.id ? { ...x, [field]: !x[field] } : x))
  }, [])

  const deleteCompany = useCallback(async (id: string) => {
    if (!window.confirm('حذف هذه الشركة؟')) return
    const sb = createClient()
    await sb.from('confirmili_delivery_companies').delete().eq('id', id)
    setCompanies(prev => prev.filter(x => x.id !== id)); setToast('تم الحذف')
  }, [setToast])

  // ─── ORDER HISTORY MODAL ────────────────────────────────
  const openHistory = useCallback(async (orderId: string, orderNum: string) => {
    setHistoryModal({ orderId, orderNum })
    setLoadingHistory(true)
    try {
      const res = await fetch(`/api/orders/${orderId}/history`)
      if (res.ok) {
        const data = await res.json()
        setOrderHistory(data.history ?? [])
      }
    } catch {}
    setLoadingHistory(false)
  }, [])

  // ─── REALTIME SUBSCRIPTION ───────────────────────────────
  useEffect(() => {
    loadNotifications()

    if (!storeId) return
    const sb = createClient()

    // Subscribe to new orders in real-time
    const channel = sb.channel(`confirmili-${storeId}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'orders',
        filter: `store_id=eq.${storeId}`,
      }, (payload: any) => {
        // New order arrived — prepend to local orders
        setLocalOrders(prev => [payload.new, ...prev])
        // Increment unread count
        setUnreadCount(c => c + 1)
      })
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'confirmili_notifications',
        filter: `store_id=eq.${storeId}`,
      }, () => {
        loadNotifications()
      })
      .subscribe()

    realtimeRef.current = channel

    return () => {
      sb.removeChannel(channel)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [storeId])

  // ─── ORDER STATE ─────────────────────────────────────────
  // Local mirror of orders so UI updates instantly
  const [localOrders,    setLocalOrders]    = useState<any[]>(initialOrders)
  const [dateFilter,     setDateFilter]     = useState<'all'|'today'|'yesterday'|'week'|'month'>('all')
  const [selectedOrders, setSelectedOrders] = useState<Set<string>>(new Set())
  const [trashedOrders,  setTrashedOrders]  = useState<Set<string>>(
    () => new Set<string>(initialOrders.filter((o:any) => o.is_trashed).map((o:any) => o.id))
  )
  const [showTrash,      setShowTrash]      = useState(false)
  const [currentPage,    setCurrentPage]    = useState(1)
  const [actionMenu,     setActionMenu]     = useState<string|null>(null) // orderId with open menu
  const [statusMenu,     setStatusMenu]     = useState<string|null>(null) // orderId with open status dropdown
  const [updating,       setUpdating]       = useState<string|null>(null) // orderId being updated
  const [verifyModal,    setVerifyModal]    = useState<any|null>(null) // order being verified
  const [bulkUpdating,   setBulkUpdating]   = useState(false)
  const [statsDateFilter,setStatsDateFilter]= useState<'all'|'today'|'yesterday'|'week'|'month'>('all')
  // Statistics shared filter chips (source / carrier / product / agent)
  const [statsSource,   setStatsSource]   = useState<string>('')
  const [statsCarrier,  setStatsCarrier]  = useState<string>('')
  const [statsProduct,  setStatsProduct]  = useState<string>('')
  const [statsAgent,    setStatsAgent]    = useState<string>('')
  const [teamStatsOn,   setTeamStatsOn]   = useState(false)   // إحصائيات الفريق toggle
  const [wilayaSort,    setWilayaSort]    = useState<'t'|'d'|'r'|'rate'>('t')
  const [top5Sort,      setTop5Sort]      = useState<'count'|'alpha'>('count')

  // ─── STATUS UPDATE ───────────────────────────────────────
  const updateOrderStatus = useCallback(async (orderId: string, newStatus: string) => {
    setUpdating(orderId)
    setActionMenu(null)
    try {
      // Use API route for history tracking + auto-send
      const res = await fetch(`/api/orders/${orderId}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus, changed_by: 'confirmili' }),
      })

      if (!res.ok) {
        // Fallback: direct DB update
        const sb = createClient()
        await sb.from('orders').update({
          status: newStatus,
          ...(newStatus === 'confirmed' ? { confirmed_at: new Date().toISOString() } : {}),
          ...(newStatus === 'delivered' ? { delivered_at: new Date().toISOString() } : {}),
          ...(newStatus === 'shipped'   ? { shipped_at:   new Date().toISOString() } : {}),
        }).eq('id', orderId)
      }

      // Instant local update
      setLocalOrders(prev => prev.map(o => o.id === orderId ? { ...o, status: newStatus } : o))
      setToast(`✓ ${statusLabel(newStatus, lang)}`)
    } catch (e) {
      console.error(e)
      setToast('❌ خطأ في تغيير الحالة')
    } finally {
      setUpdating(null)
    }
  }, [lang, setToast])

  const updateCallAttempt = useCallback(async (orderId: string, currentAttempts: number) => {
    setUpdating(orderId)
    setActionMenu(null)
    const newAttempts = (currentAttempts ?? 0) + 1
    const newStatus = `failed_${Math.min(newAttempts, 3)}`
    try {
      // Update via API for history tracking
      await fetch(`/api/orders/${orderId}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: newStatus,
          changed_by: 'confirmili',
          notes: `محاولة اتصال رقم ${newAttempts}`,
        }),
      })
      // Also update call_attempts directly
      const sb = createClient()
      await sb.from('orders').update({
        call_attempts: newAttempts,
        last_call_at: new Date().toISOString(),
      }).eq('id', orderId)
      setLocalOrders(prev => prev.map(o => o.id === orderId
        ? { ...o, call_attempts: newAttempts, status: newStatus } : o))
      setToast(`📞 محاولة ${newAttempts} — ${statusLabel(newStatus, lang)}`)
    } catch (e) {
      console.error(e)
    } finally {
      setUpdating(null)
    }
  }, [lang, setToast])

  const bulkUpdateStatus = useCallback(async (newStatus: string) => {
    if (selectedOrders.size === 0) return
    setBulkUpdating(true)
    try {
      const sb = createClient()
      const ids = Array.from(selectedOrders.values())
      await sb.from('orders').update({ status: newStatus }).in('id', ids)
      setLocalOrders(prev => prev.map(o => ids.includes(o.id) ? { ...o, status: newStatus } : o))
      setSelectedOrders(new Set<string>())
      setToast(`✓ ${ids.length} طلبية — ${statusLabel(newStatus, lang)}`)
    } catch (e) {
      console.error(e); setToast('❌ خطأ في التحديث الجماعي')
    } finally {
      setBulkUpdating(false)
    }
  }, [selectedOrders, lang, setToast])

  const softDelete = useCallback((orderId: string) => {
    setActionMenu(null)
    if (!window.confirm('هل أنت متأكد؟ سيتم نقل الطلبية إلى سلة المهملات.')) return
    setTrashedOrders(prev => { const s = new Set<string>(Array.from(prev.values())); s.add(orderId); return s })
    // persist (column added in migration 011 — best-effort)
    createClient().from('orders').update({ is_trashed: true }).eq('id', orderId).then(()=>{}, ()=>{})
    setToast('تم النقل إلى سلة المهملات')
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [setToast])

  const restoreOrder = useCallback((orderId: string) => {
    setTrashedOrders(prev => { const s = new Set(prev); s.delete(orderId); return s })
    createClient().from('orders').update({ is_trashed: false }).eq('id', orderId).then(()=>{}, ()=>{})
    setToast('تمت الاستعادة')
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [setToast])

  const openWhatsApp = useCallback((phone: string, customerName: string) => {
    const clean = (phone ?? '').replace(/\D/g, '').replace(/^0/, '213')
    const msg = encodeURIComponent(`السلام عليكم ${customerName}، نتصل بكم بخصوص طلبكم`)
    window.open(`https://wa.me/${clean}?text=${msg}`, '_blank')
  }, [])

  // ─── DATE FILTERING ──────────────────────────────────────
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const getDateRange = useCallback((filter: string) => {
    const now = new Date()
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    switch (filter) {
      case 'today':     return [today, new Date(today.getTime() + 86400000)]
      case 'yesterday': return [new Date(today.getTime() - 86400000), today]
      case 'week':      return [new Date(today.getTime() - 7*86400000), now]
      case 'month':     return [new Date(today.getTime() - 30*86400000), now]
      default:          return null
    }
  }, [])

  // ─── FILTERED ORDERS ─────────────────────────────────────
  const filteredOrders = useMemo(() => {
    let orders = showTrash
      ? localOrders.filter(o => trashedOrders.has(o.id))
      : localOrders.filter(o => !trashedOrders.has(o.id))

    // Date filter
    const range = getDateRange(dateFilter)
    if (range) {
      orders = orders.filter(o => {
        const d = new Date(o.created_at)
        return d >= range[0] && d < range[1]
      })
    }

    // Search
    if (orderSearch) {
      const q = orderSearch.toLowerCase()
      orders = orders.filter(o =>
        o.customer_name?.toLowerCase().includes(q) ||
        o.customer_phone?.includes(q) ||
        o.order_number?.toLowerCase().includes(q)
      )
    }

    return orders
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [localOrders, showTrash, trashedOrders, dateFilter, orderSearch])

  const totalPages   = Math.ceil(filteredOrders.length / ordersPerPage)
  const pagedOrders  = filteredOrders.slice((currentPage-1)*ordersPerPage, currentPage*ordersPerPage)

  const allSelected  = pagedOrders.length > 0 && pagedOrders.every(o => selectedOrders.has(o.id))
  const toggleAll    = () => {
    if (allSelected) setSelectedOrders(new Set())
    else setSelectedOrders(new Set(pagedOrders.map(o => o.id)))
  }

  // ─── STATS FILTERING ─────────────────────────────────────
  const statsOrders = useMemo(() => {
    const range = getDateRange(statsDateFilter)
    return localOrders.filter(o => {
      if (trashedOrders.has(o.id)) return false
      if (range) {
        const d = new Date(o.created_at)
        if (d < range[0] || d >= range[1]) return false
      }
      if (statsSource  && (o.utm_source ?? o.source ?? 'مباشر') !== statsSource) return false
      if (statsCarrier && o.delivery_company_id !== statsCarrier) return false
      if (statsProduct && !(o.items ?? []).some((i:any) => i.product_name === statsProduct)) return false
      if (statsAgent   && o.confirmed_by !== statsAgent) return false
      return true
    })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [localOrders, statsDateFilter, trashedOrders, statsSource, statsCarrier, statsProduct, statsAgent])

  const delivered    = statsOrders.filter(o => o.status === 'delivered')
  const cancelled    = statsOrders.filter(o => o.status === 'cancelled')
  const confirmedArr = statsOrders.filter(o => o.status === 'confirmed')
  const totalRevenue      = delivered.reduce((s,o) => s+o.total,0)
  const totalDeliveryFee  = delivered.reduce((s,o) => s+o.delivery_fee,0)
  const netRevenue        = totalRevenue - totalDeliveryFee

  // ─── EXPORT ──────────────────────────────────────────────
  const exportExcel = useCallback(async () => {
    const orders = selectedOrders.size > 0
      ? filteredOrders.filter(o => selectedOrders.has(o.id))
      : filteredOrders
    const rows = orders.map(o => ({
      'رقم الطلب': o.order_number,
      'الاسم': o.customer_name,
      'الهاتف': o.customer_phone,
      'الولاية': o.wilaya?.name_ar ?? '',
      'المنتج': o.items?.[0]?.product_name ?? '',
      'السعر': o.total,
      'الحالة': statusLabel(o.status),
      'التاريخ': o.created_at?.slice(0,10) ?? '',
    }))
    const XLSX = await import('xlsx')
    const ws = XLSX.utils.json_to_sheet(rows)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'الطلبات')
    XLSX.writeFile(wb, `orders-${new Date().toISOString().slice(0,10)}.xlsx`)
  }, [filteredOrders, selectedOrders])

  // ─── DELIVERY PRICE INPUT (save on blur) ────────────────
  const PriceInput = ({ value, onSave }: { value: number; onSave: (v: number) => void }) => {
    const [v, setV] = useState(String(value))
    useEffect(() => { setV(String(value)) }, [value])
    return (
      <input type="number" className="input text-xs w-24" dir="ltr" value={v}
        onChange={e=>setV(e.target.value)}
        onBlur={()=>onSave(+v || 0)}/>
    )
  }

  // ─── TAB BAR ─────────────────────────────────────────────
  const TabBar = ({ tabs, active, onChange }: { tabs: string[]; active: number; onChange: (i: number) => void }) => (
    <div className="tab-bar mb-4">
      {tabs.map((t, i) => (
        <button key={t} onClick={() => onChange(i)} className={`tab-item ${active === i ? 'active' : ''}`}>
          {t}
        </button>
      ))}
    </div>
  )

  // ─── SOURCE ICONS ────────────────────────────────────────
  const SourceIcon = ({ source }: { source: string }) => {
    if (!source || source === 'direct' || source === 'manual') {
      return <span title="يدوي" className="inline-flex items-center justify-center w-5 h-5 rounded text-[9px] font-bold" style={{background:'#EEE5FF',color:'#7B2FBE'}}>✎</span>
    }
    if (source === 'storefront' || source === 'Dakkani') {
      return <span title="Commerco" className="inline-flex items-center justify-center w-5 h-5 rounded text-[9px] font-bold" style={{background:'#E0F5F2',color:'#3CC6B9'}}>C</span>
    }
    if (source?.includes('sheet') || source?.includes('Sheet')) {
      return <span title="Google Sheet" className="inline-flex items-center justify-center w-5 h-5 rounded text-[9px] font-bold" style={{background:'#D1E7DD',color:'#198754'}}>📊</span>
    }
    if (source?.includes('facebook') || source === 'fb') {
      return <span title="Facebook" className="inline-flex items-center justify-center w-5 h-5 rounded text-[9px] font-bold" style={{background:'#E0F5F2',color:'#1877F2'}}>f</span>
    }
    return <span title={source} className="inline-flex items-center justify-center w-5 h-5 rounded text-[9px] font-bold" style={{background:'#F1F3F5',color:'#495057'}}>{source[0]?.toUpperCase()}</span>
  }

  // ─── TRACKING BADGE (SD/HM) ──────────────────────────────
  const TrackingBadge = ({ trackingNum, deliveryType }: { trackingNum: string; deliveryType: string }) => {
    const [copied, setCopied] = useState(false)
    const prefix = deliveryType === 'stopdesk' ? 'SD' : 'HM'
    const prefixBg = deliveryType === 'stopdesk' ? '#EEE5FF' : '#E0F5F2'
    const prefixColor = deliveryType === 'stopdesk' ? '#7B2FBE' : '#3CC6B9'
    const copy = () => {
      navigator.clipboard.writeText(trackingNum)
      setCopied(true)
      setToast(`✓ تم نسخ: ${trackingNum}`)
      setTimeout(() => setCopied(false), 2000)
    }
    return (
      <div className="flex items-center gap-1">
        <span className="text-[9px] font-black px-1 py-0.5 rounded" style={{background:prefixBg,color:prefixColor}}>{prefix}</span>
        <span className="font-mono text-xs">{trackingNum}</span>
        <button onClick={copy} title={copied ? 'تم النسخ ✓' : 'نسخ'} className="p-0.5 rounded hover:bg-[#F8F9FA]">
          {copied ? <CheckCircle size={10} style={{color:'#198754'}}/> : <Copy size={10} style={{color:'#868E96'}}/>}
        </button>
      </div>
    )
  }

  // ─── ACTION DROPDOWN ─────────────────────────────────────
  const ActionDropdown = ({ order }: { order: any }) => {
    const isOpen = actionMenu === order.id
    return (
      <div className="relative">
        <button
          onClick={e => { e.stopPropagation(); setActionMenu(isOpen ? null : order.id) }}
          disabled={updating === order.id}
          className="flex items-center gap-1 btn btn-sm text-xs"
          style={{ background: '#E0F5F2', color: 'var(--color-accent)', border: 'none', minHeight: '26px', padding: '0 8px' }}
        >
          {updating === order.id ? '⏳' : 'إجراء'}<ChevronDown size={10}/>
        </button>
        {isOpen && (
          <>
            <div className="fixed inset-0 z-10" onClick={() => setActionMenu(null)}/>
            <div className="absolute left-0 top-full mt-1 w-44 bg-white border rounded-xl shadow-xl z-20 overflow-hidden animate-scale-in" style={{borderColor:'var(--color-border)'}}>
              {/* WhatsApp */}
              <button
                onClick={() => { openWhatsApp(order.customer_phone, order.customer_name); setActionMenu(null) }}
                className="w-full flex items-center gap-2 px-3 py-2 text-xs hover:bg-[#F8F9FA] transition-colors text-right"
                style={{ color: '#25D366', fontFamily: 'var(--font-arabic)' }}
              >
                <MessageCircle size={13} />واتساب
              </button>
              <div className="h-px" style={{ background: 'var(--color-border)' }}/>
              {/* Status actions */}
              {STATUS_ACTIONS.map(action => (
                <button
                  key={action.status}
                  onClick={() => updateOrderStatus(order.id, action.status)}
                  className="w-full flex items-center gap-2 px-3 py-2 text-xs hover:bg-[#F8F9FA] transition-colors text-right"
                  style={{ color: action.color, fontFamily: 'var(--font-arabic)' }}
                >
                  <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: action.color }}/>
                  {action.label}
                </button>
              ))}
              <div className="h-px" style={{ background: 'var(--color-border)' }}/>
              {/* Call attempt */}
              <button
                onClick={() => updateCallAttempt(order.id, order.call_attempts ?? 0)}
                className="w-full flex items-center gap-2 px-3 py-2 text-xs hover:bg-[#F8F9FA] transition-colors text-right"
                style={{ color: '#3CC6B9', fontFamily: 'var(--font-arabic)' }}
              >
                <PhoneCall size={13}/>محاولة اتصال ({order.call_attempts ?? 0})
              </button>
              <div className="h-px" style={{ background: 'var(--color-border)' }}/>
              {/* History */}
              <button
                onClick={() => { openHistory(order.id, order.order_number); setActionMenu(null) }}
                className="w-full flex items-center gap-2 px-3 py-2 text-xs hover:bg-[#F8F9FA] transition-colors text-right"
                style={{ color: '#495057', fontFamily: 'var(--font-arabic)' }}
              >
                <History size={13}/>سجل الطلبية
              </button>
              <div className="h-px" style={{ background: 'var(--color-border)' }}/>
              {/* Trash */}
              <button
                onClick={() => softDelete(order.id)}
                className="w-full flex items-center gap-2 px-3 py-2 text-xs hover:bg-red-50 transition-colors text-right"
                style={{ color: '#DC3545', fontFamily: 'var(--font-arabic)' }}
              >
                <Trash2 size={13}/>نقل للسلة
              </button>
            </div>
          </>
        )}
      </div>
    )
  }

  // ─── STATUS CELL (clickable badge → status dropdown) ─────
  // Exact Octomatic colors (solid bg + white text). Click opens
  // the 8-status list; "فاشلة" auto-escalates 01→02→03.
  const StatusCell = ({ order }: { order: any }) => {
    const isOpen = statusMenu === order.id
    const def = getStatus(order.status)
    return (
      <div className="relative inline-block">
        <button
          onClick={e => { e.stopPropagation(); setStatusMenu(isOpen ? null : order.id) }}
          disabled={updating === order.id}
          className="inline-flex items-center gap-1 rounded-full px-2.5 h-[22px] text-[11px] font-bold transition-transform hover:scale-[1.04]"
          style={{ background: def.color, color: def.text, fontFamily: 'var(--font-arabic)' }}
        >
          {updating === order.id ? '⏳' : statusLabel(order.status, lang)}
          <ChevronDown size={10}/>
        </button>
        {isOpen && (
          <>
            <div className="fixed inset-0 z-10" onClick={() => setStatusMenu(null)}/>
            <div className="absolute right-0 top-full mt-1 w-40 bg-white border rounded-xl shadow-xl z-20 overflow-hidden animate-scale-in" style={{borderColor:'var(--color-border)'}}>
              {STATUS_LIST.map(s => {
                // map UI failed_0x → DB failed_x; clicking "فاشلة 0x" sets that exact level
                const dbStatus = s.key === 'failed_01' ? 'failed_1'
                  : s.key === 'failed_02' ? 'failed_2'
                  : s.key === 'failed_03' ? 'failed_3'
                  : s.key === 'pending'   ? 'new'
                  : s.key
                return (
                  <button key={s.key}
                    onClick={() => { setStatusMenu(null); updateOrderStatus(order.id, dbStatus) }}
                    className="w-full flex items-center gap-2 px-3 py-1.5 text-xs hover:bg-[#F8F9FA] transition-colors text-right"
                    style={{ fontFamily: 'var(--font-arabic)' }}>
                    <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: s.dot }}/>
                    {lang === 'fr' ? s.labelFr : lang === 'en' ? s.labelEn : s.label}
                  </button>
                )
              })}
            </div>
          </>
        )}
      </div>
    )
  }

  // ─── RENDER STATISTICS ───────────────────────────────────
  const renderStatistics = () => {
    const tabs = ['احصائيات المداخيل','احصائيات التأكيد','إحصائيات التوصيل','أفضل 5 مؤشرات']

    // Chart data from statsOrders
    const revenueByDay: Record<string, any> = {}
    statsOrders.forEach(o => {
      const d = o.created_at?.slice(5,10) ?? 'unknown'
      if (!revenueByDay[d]) revenueByDay[d] = {date:d, income:0, delivery_cost:0, net:0, confirmed:0, failed:0, pending:0, cancelled:0}
      if (o.status === 'delivered') {
        revenueByDay[d].income += o.total ?? 0
        revenueByDay[d].delivery_cost += o.delivery_fee ?? 0
        revenueByDay[d].net += (o.total ?? 0) - (o.delivery_fee ?? 0)
      }
      if (['confirmed','delivered'].includes(o.status)) revenueByDay[d].confirmed++
      if (o.status === 'cancelled') revenueByDay[d].cancelled++
      if (o.status === 'new') revenueByDay[d].pending++
      if (o.status?.startsWith('failed')) revenueByDay[d].failed++
    })
    const chartData = Object.values(revenueByDay).sort((a,b) => a.date.localeCompare(b.date))

    // Wilaya delivery stats
    const wilayaStats: Record<string, {d:number;r:number;t:number}> = {}
    statsOrders.forEach(o => {
      const n = o.wilaya?.name_ar ?? 'غير محدد'
      if (!wilayaStats[n]) wilayaStats[n] = {d:0,r:0,t:0}
      wilayaStats[n].t++
      if (o.status === 'delivered') wilayaStats[n].d++
      if (o.status === 'returned')  wilayaStats[n].r++
    })
    const wilayaRows = Object.entries(wilayaStats).sort(([,a],[,b]) => {
      if (wilayaSort === 'rate') {
        const ra = a.t ? a.d/a.t : 0, rb = b.t ? b.d/b.t : 0
        return rb - ra
      }
      return b[wilayaSort] - a[wilayaSort]
    })
    const totalDelivered = Object.values(wilayaStats).reduce((s,w)=>s+w.d,0)
    const totalReturned  = Object.values(wilayaStats).reduce((s,w)=>s+w.r,0)
    const deliveryRate   = (totalDelivered+totalReturned) > 0 ? Math.round(totalDelivered/(totalDelivered+totalReturned)*100) : 0

    // Top indicators
    const srcCount: Record<string,number> = {}
    const prodCount: Record<string,number> = {}
    const wilayaCount: Record<string,number> = {}
    statsOrders.forEach(o => {
      const s = o.utm_source ?? o.source ?? 'مباشر'
      srcCount[s] = (srcCount[s]??0)+1
      const w = o.wilaya?.name_ar ?? 'غير محدد'
      wilayaCount[w] = (wilayaCount[w]??0)+1
      ;(o.items ?? []).forEach((i:any) => { prodCount[i.product_name] = (prodCount[i.product_name]??0)+(i.quantity??1) })
    })
    const top5sort = (entries: [string,number][]) =>
      top5Sort === 'alpha'
        ? [...entries].sort(([a],[b]) => a.localeCompare(b,'ar')).slice(0,5)
        : [...entries].sort(([,a],[,b]) => b-a).slice(0,5)
    const topWilayas  = top5sort(Object.entries(wilayaCount))
    const topSources  = top5sort(Object.entries(srcCount))
    const topProducts = top5sort(Object.entries(prodCount))
    const agentCount: Record<string,number> = {}
    statsOrders.forEach(o => { if (o.confirmed_by) agentCount[o.confirmed_by] = (agentCount[o.confirmed_by]??0)+1 })
    const topAgents = top5sort(Object.entries(agentCount))
    const MiniBar = ({label,count,max}:{label:string,count:number,max:number}) => (
      <div className="flex items-center gap-2 py-1">
        <span className="text-xs truncate w-24 flex-shrink-0" style={{color:'var(--color-text-secondary)'}}>{label}</span>
        <div className="flex-1 h-2 rounded-full" style={{background:'#F1F3F5'}}>
          <div className="h-2 rounded-full" style={{width:`${max?count/max*100:0}%`,background:'var(--color-accent)'}}/>
        </div>
        <span className="text-xs w-6 text-left" style={{color:'var(--color-text-muted)'}}>{count}</span>
      </div>
    )

    return (
      <div>
        {/* Date filter buttons — FUNCTIONAL */}
        <div className="flex flex-wrap gap-2 mb-4">
          {(['all','today','yesterday','week','month'] as const).map((f) => {
            const labels = {all:'كل وقت',today:'اليوم',yesterday:'الأمس',week:'أسبوع',month:'شهر'} as const
            return (
              <button key={f} onClick={() => setStatsDateFilter(f)}
                className="btn btn-sm"
                style={{
                  border: '1px solid',
                  borderColor: statsDateFilter===f ? 'var(--color-accent)' : 'var(--color-border)',
                  background: statsDateFilter===f ? 'var(--color-accent)' : '#fff',
                  color: statsDateFilter===f ? '#fff' : 'var(--color-text-secondary)',
                }}>
                {labels[f]}
              </button>
            )
          })}
          <button onClick={() => setStatsDateFilter('all')}
            className="btn btn-sm" style={{border:'1px solid var(--color-border)',background:'#fff',color:'var(--color-text-secondary)'}}>
            إعادة الضبط
          </button>
          <span className="text-xs self-center" style={{color:'var(--color-text-muted)'}}>
            ({statsOrders.length} طلب)
          </span>
        </div>

        {/* Shared filter chips: source / carrier / product / agent */}
        <div className="flex flex-wrap gap-2 mb-4">
          <select className="input text-xs h-8" value={statsSource} onChange={e=>setStatsSource(e.target.value)} style={{fontFamily:'var(--font-arabic)'}}>
            <option value="">كل المصادر</option>
            {Array.from(new Set(localOrders.map(o => o.utm_source ?? o.source ?? 'مباشر'))).map(s => <option key={s} value={s}>{s}</option>)}
          </select>
          <select className="input text-xs h-8" value={statsCarrier} onChange={e=>setStatsCarrier(e.target.value)} style={{fontFamily:'var(--font-arabic)'}}>
            <option value="">كل شركات التوصيل</option>
            {companies.map(co => <option key={co.id} value={co.id}>{co.name}</option>)}
          </select>
          <select className="input text-xs h-8" value={statsProduct} onChange={e=>setStatsProduct(e.target.value)} style={{fontFamily:'var(--font-arabic)'}}>
            <option value="">كل المنتجات</option>
            {Array.from(new Set(localOrders.flatMap(o => (o.items ?? []).map((i:any) => i.product_name)).filter(Boolean))).map(p => <option key={p as string} value={p as string}>{(p as string).slice(0,30)}</option>)}
          </select>
          <select className="input text-xs h-8" value={statsAgent} onChange={e=>setStatsAgent(e.target.value)} style={{fontFamily:'var(--font-arabic)'}}>
            <option value="">كل المؤكدين</option>
            {Array.from(new Set(localOrders.map(o => o.confirmed_by).filter(Boolean))).map(a => <option key={a as string} value={a as string}>{a as string}</option>)}
          </select>
          {(statsSource || statsCarrier || statsProduct || statsAgent) && (
            <button onClick={()=>{setStatsSource('');setStatsCarrier('');setStatsProduct('');setStatsAgent('')}}
              className="btn btn-sm text-xs" style={{border:'1px solid var(--color-border)',background:'#fff',color:'#DC3545',fontFamily:'var(--font-arabic)'}}>
              <X size={11}/>مسح الفلاتر
            </button>
          )}
        </div>

        <TabBar tabs={tabs} active={statsTab} onChange={setStatsTab} />

        {statsTab === 0 && (
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {[
                { label:'إجمالي الدخل', value:`${totalRevenue.toLocaleString('ar-DZ')} دج`, icon:'💲' },
                { label:'مصاريف التوصيل', value:`${totalDeliveryFee.toLocaleString('ar-DZ')} دج`, icon:'🚚' },
                { label:'صافي الدخل', value:`${netRevenue.toLocaleString('ar-DZ')} دج`, icon:'📈' },
              ].map(c => (
                <div key={c.label} className="card p-4 flex items-center gap-3">
                  <div className="text-2xl">{c.icon}</div>
                  <div>
                    <p className="font-bold text-lg" style={{ color: 'var(--color-accent)', fontFamily: 'var(--font-primary)' }}>{c.value}</p>
                    <p className="text-xs" style={{ color: 'var(--color-text-muted)', fontFamily: 'var(--font-arabic)' }}>{c.label}</p>
                  </div>
                </div>
              ))}
            </div>
            <div className="card p-4">
              <h3 className="font-semibold text-sm mb-3" style={{ fontFamily: 'var(--font-arabic)', color: 'var(--color-text-primary)' }}>تطور المداخيل</h3>
              <ResponsiveContainer width="100%" height={220}>
                <LineChart data={chartData.length > 0 ? chartData : [{date:'-',income:0,delivery_cost:0,net:0}]}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#F1F3F5"/>
                  <XAxis dataKey="date" tick={{fontSize:10,fill:'#868E96'}}/>
                  <YAxis tick={{fontSize:10,fill:'#868E96'}} tickFormatter={v=>`${(v/1000).toFixed(0)}k`}/>
                  <Tooltip formatter={(v:number) => [`${v.toLocaleString('ar-DZ')} دج`]}/>
                  <Legend/>
                  <Line type="monotone" dataKey="income" stroke="#3CC6B9" strokeWidth={2} dot={false} name="الدخل"/>
                  <Line type="monotone" dataKey="delivery_cost" stroke="#DC3545" strokeWidth={2} dot={false} name="التوصيل"/>
                  <Line type="monotone" dataKey="net" stroke="#198754" strokeWidth={2} dot={false} name="الصافي"/>
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        {statsTab === 1 && (
          <div className="space-y-4">
            {/* Team stats toggle */}
            <div className="flex items-center justify-between card p-3">
              <span className="text-xs font-medium" style={{fontFamily:'var(--font-arabic)',color:'var(--color-text-secondary)'}}>إحصائيات الفريق</span>
              <button onClick={()=>setTeamStatsOn(v=>!v)}
                className="w-9 h-5 rounded-full flex items-center transition-colors" style={{background: teamStatsOn ? '#3CC6B9' : '#DEE2E6'}}>
                <span className="w-4 h-4 bg-white rounded-full shadow transition-transform" style={{transform: teamStatsOn ? 'translateX(-2px)' : 'translateX(-18px)'}}/>
              </button>
            </div>
            {teamStatsOn && (
              <div className="card overflow-hidden">
                <div className="px-4 py-3 border-b font-semibold text-sm" style={{borderColor:'var(--color-border)',fontFamily:'var(--font-arabic)'}}>أداء أعضاء الفريق</div>
                <table className="data-table" style={{fontFamily:'var(--font-arabic)'}}>
                  <thead><tr><th>العضو</th><th>مؤكدة</th><th>ملغاة</th><th>الكل</th><th>نسبة التأكيد %</th></tr></thead>
                  <tbody>
                    {team.length === 0
                      ? <tr><td colSpan={5} className="text-center py-8 text-sm" style={{color:'var(--color-text-muted)'}}>لا يوجد أعضاء فريق</td></tr>
                      : team.map(m => {
                          const mine = statsOrders.filter(o => o.confirmed_by === m.name || o.confirmed_by === m.id)
                          const conf = mine.filter(o => ['confirmed','delivered'].includes(o.status)).length
                          const canc = mine.filter(o => o.status === 'cancelled').length
                          const rate = mine.length ? Math.round(conf/mine.length*100) : 0
                          return (
                            <tr key={m.id}>
                              <td className="font-medium text-sm">{m.name}</td>
                              <td style={{color:'#198754'}}>{conf}</td>
                              <td style={{color:'#DC3545'}}>{canc}</td>
                              <td>{mine.length}</td>
                              <td>{rate}%</td>
                            </tr>
                          )
                        })}
                  </tbody>
                </table>
              </div>
            )}
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {CONFIRM_STATUSES_STATIC.map(s => {
                const count = statsOrders.filter(o => o.status === s.key).length
                const pct   = statsOrders.length ? Math.round(count/statsOrders.length*100) : 0
                return (
                  <div key={s.key} className="card p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-bold text-xl" style={{ color: s.color, fontFamily: 'var(--font-primary)' }}>{count}</p>
                        <p className="text-xs mt-0.5" style={{ color: 'var(--color-text-muted)', fontFamily: 'var(--font-arabic)' }}>{s.label}</p>
                      </div>
                      <p className="text-sm font-semibold" style={{color:s.color}}>{pct}%</p>
                    </div>
                  </div>
                )
              })}
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="card p-4">
                <h3 className="font-semibold text-sm mb-3">تطور التأكيدات</h3>
                <ResponsiveContainer width="100%" height={180}>
                  <LineChart data={chartData.length > 0 ? chartData : [{date:'-',confirmed:0,cancelled:0,failed:0}]}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#F1F3F5"/>
                    <XAxis dataKey="date" tick={{fontSize:10,fill:'#868E96'}}/>
                    <YAxis tick={{fontSize:10,fill:'#868E96'}}/>
                    <Tooltip/>
                    <Line type="monotone" dataKey="confirmed" stroke="#198754" strokeWidth={2} dot={false} name="مؤكدة"/>
                    <Line type="monotone" dataKey="failed" stroke="#FFC107" strokeWidth={2} dot={false} name="فاشلة"/>
                    <Line type="monotone" dataKey="cancelled" stroke="#DC3545" strokeWidth={2} dot={false} name="ملغاة"/>
                  </LineChart>
                </ResponsiveContainer>
              </div>
              <div className="card p-4">
                <h3 className="font-semibold text-sm mb-3">توزيع الحالات</h3>
                <ResponsiveContainer width="100%" height={180}>
                  <PieChart>
                    <Pie
                      data={CONFIRM_STATUSES_STATIC.map(s => ({
                        name: s.label,
                        value: statsOrders.filter(o => o.status === s.key).length
                      })).filter(x => x.value > 0)}
                      dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={70}
                    >
                      {CONFIRM_STATUSES_STATIC.map((s,i) => <Cell key={i} fill={s.color}/>)}
                    </Pie>
                    <Tooltip/>
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        )}

        {statsTab === 2 && (
          <div className="space-y-4">
            {/* Radial delivered/returned gauge */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="card p-4 flex flex-col items-center justify-center">
                <h3 className="font-semibold text-sm mb-2" style={{fontFamily:'var(--font-arabic)',color:'var(--color-text-primary)'}}>نسبة التوصيل</h3>
                <div className="relative w-32 h-32">
                  <svg viewBox="0 0 120 120" className="w-full h-full -rotate-90">
                    <circle cx="60" cy="60" r="50" fill="none" stroke="#F1F3F5" strokeWidth="12"/>
                    <circle cx="60" cy="60" r="50" fill="none" stroke="#198754" strokeWidth="12" strokeLinecap="round"
                      strokeDasharray={`${deliveryRate*3.14} 314`}/>
                  </svg>
                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <span className="font-black text-2xl" style={{color:'#198754',fontFamily:'var(--font-primary)'}}>{deliveryRate}%</span>
                  </div>
                </div>
              </div>
              <div className="card p-4 flex flex-col items-center justify-center">
                <p className="font-black text-3xl" style={{color:'#198754',fontFamily:'var(--font-primary)'}}>{totalDelivered}</p>
                <p className="text-xs mt-1" style={{color:'var(--color-text-muted)',fontFamily:'var(--font-arabic)'}}>طلبات مسلمة</p>
              </div>
              <div className="card p-4 flex flex-col items-center justify-center">
                <p className="font-black text-3xl" style={{color:'#DC3545',fontFamily:'var(--font-primary)'}}>{totalReturned}</p>
                <p className="text-xs mt-1" style={{color:'var(--color-text-muted)',fontFamily:'var(--font-arabic)'}}>طلبات مرجعة</p>
              </div>
            </div>
            <div className="card overflow-hidden">
              <div className="px-4 py-3 border-b flex items-center justify-between" style={{borderColor:'var(--color-border)'}}>
                <span className="font-semibold text-sm">احصائيات الولايات ({statsOrders.length} طلب)</span>
                <select className="input text-xs h-7" value={wilayaSort} onChange={e=>setWilayaSort(e.target.value as any)} style={{fontFamily:'var(--font-arabic)'}}>
                  <option value="t">ترتيب: الكل</option>
                  <option value="d">ترتيب: المسلمة</option>
                  <option value="r">ترتيب: المرجعة</option>
                  <option value="rate">ترتيب: نسبة التوصيل</option>
                </select>
              </div>
              <div className="overflow-x-auto" style={{maxHeight:480,overflowY:'auto'}}>
                <table className="data-table" style={{fontFamily:'var(--font-arabic)'}}>
                  <thead>
                    <tr>{['الولاية','المسلمة','المرجعة','الكل','نسبة التوصيل %'].map(h=><th key={h}>{h}</th>)}</tr>
                  </thead>
                  <tbody>
                    {wilayaRows.length === 0
                      ? <tr><td colSpan={5} className="text-center py-8 text-sm" style={{color:'var(--color-text-muted)'}}>لا توجد بيانات</td></tr>
                      : wilayaRows.map(([name, s]) => {
                          const rate = s.t > 0 ? Math.round(s.d/s.t*100) : 0
                          return (
                          <tr key={name}>
                            <td className="font-medium">{name}</td>
                            <td className="font-semibold" style={{color:'#198754'}}>{s.d}</td>
                            <td className="font-semibold" style={{color:'#DC3545'}}>{s.r}</td>
                            <td>{s.t}</td>
                            <td>
                              <div className="flex items-center gap-2">
                                <div className="flex-1 h-1.5 rounded-full" style={{background:'#F1F3F5'}}>
                                  <div className="h-1.5 rounded-full" style={{width:`${rate}%`,background:'#198754'}}/>
                                </div>
                                <span className="text-xs">{rate}%</span>
                              </div>
                            </td>
                          </tr>
                        )})
                    }
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {statsTab === 3 && (
          <div className="space-y-4">
            <div className="flex justify-end">
              <button onClick={()=>setTop5Sort(s=>s==='count'?'alpha':'count')}
                className="btn btn-sm text-xs gap-1" style={{border:'1px solid var(--color-border)',background:'#fff',color:'var(--color-text-secondary)',fontFamily:'var(--font-arabic)'}}>
                <ArrowUpDown size={11}/>{top5Sort==='count' ? 'ترتيب: العدد' : 'ترتيب: أبجدي'}
              </button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="card p-4">
                <h3 className="font-semibold text-sm mb-3" style={{fontFamily:'var(--font-arabic)',color:'var(--color-text-primary)'}}>أفضل الولايات</h3>
                {topWilayas.length > 0 ? topWilayas.map(([w,c]) => <MiniBar key={w} label={w} count={c} max={Math.max(...topWilayas.map(([,n])=>n),1)}/>) : <p className="text-xs text-center py-4" style={{color:'var(--color-text-muted)'}}>لا توجد بيانات</p>}
              </div>
              <div className="card p-4">
                <h3 className="font-semibold text-sm mb-3" style={{fontFamily:'var(--font-arabic)',color:'var(--color-text-primary)'}}>أفضل المصادر</h3>
                {topSources.length > 0 ? topSources.map(([s,c]) => <MiniBar key={s} label={s} count={c} max={Math.max(...topSources.map(([,n])=>n),1)}/>) : <p className="text-xs text-center py-4" style={{color:'var(--color-text-muted)'}}>لا توجد بيانات</p>}
              </div>
              <div className="card p-4">
                <h3 className="font-semibold text-sm mb-3" style={{fontFamily:'var(--font-arabic)',color:'var(--color-text-primary)'}}>أفضل المنتجات</h3>
                {topProducts.length > 0 ? topProducts.map(([p,c]) => <MiniBar key={p} label={p.slice(0,16)} count={c} max={Math.max(...topProducts.map(([,n])=>n),1)}/>) : <p className="text-xs text-center py-4" style={{color:'var(--color-text-muted)'}}>لا توجد بيانات</p>}
              </div>
              <div className="card p-4">
                <h3 className="font-semibold text-sm mb-3" style={{fontFamily:'var(--font-arabic)',color:'var(--color-text-primary)'}}>أفضل المؤكدين</h3>
                {topAgents.length > 0 ? topAgents.map(([a,c]) => <MiniBar key={a} label={a.slice(0,16)} count={c} max={Math.max(...topAgents.map(([,n])=>n),1)}/>) : <p className="text-xs text-center py-4" style={{color:'var(--color-text-muted)'}}>لا توجد بيانات</p>}
              </div>
            </div>
          </div>
        )}
      </div>
    )
  }

  // ─── RENDER ORDERS ───────────────────────────────────────
  const renderOrders = () => (
    <ConfirmiliOrders
      storeId={storeId}
      storeName={storeName}
      orders={localOrders}
      products={initialProducts}
      team={team}
      companies={companies}
      onRefresh={() => { router.refresh(); setLocalOrders(initialOrders) }}
      setToast={setToast}
      lang={lang}
    />
  )

  // ─── TRACKING ────────────────────────────────────────────
  const renderTracking = () => {
    const trackingOrders = localOrders.filter(o =>
      ['shipped','in_transit','out_for_delivery','with_driver','at_stopdesk'].includes(o.status) &&
      !trashedOrders.has(o.id)
    )
    const driverTeam = team.filter(m => m.role === 'delivery')
    return (
    <div className="space-y-3">
      <div className="flex gap-2 mb-3">
        {['شركة التوصيل','رجل التوصيل'].map((t,i) => (
          <button key={t} onClick={()=>setTrackSubTab(i)} className={`tab-item ${trackSubTab===i?'active':''}`}>{t}</button>
        ))}
      </div>
      {trackSubTab === 0 && (
      <div className="card overflow-hidden">
        <table className="data-table" style={{fontFamily:'var(--font-arabic)'}}>
          <thead>
            <tr>{['رقم التتبع','شركة التوصيل','الحالة','الهاتف','الاسم','المنتج','الولاية','الإجمالي','إجراء'].map(h=><th key={h}>{h}</th>)}</tr>
          </thead>
          <tbody>
            {trackingOrders.length === 0
              ? <tr><td colSpan={9} className="text-center py-12 text-sm" style={{color:'var(--color-text-muted)'}}>
                  لا توجد طلبات للتتبع — الطلبات المشحونة تظهر هنا
                </td></tr>
              : trackingOrders.slice(0,50).map(o => (
                <tr key={o.id}>
                  {/* 9.2 — Tracking number badges (SD/HM) + copy */}
                  <td>
                    {o.tracking_number
                      ? <TrackingBadge trackingNum={o.tracking_number} deliveryType={o.delivery_type ?? 'home'}/>
                      : <span className="text-xs" style={{color:'var(--color-text-muted)'}}>—</span>
                    }
                  </td>
                  <td className="text-xs">{companies.find(c=>c.id===o.delivery_company_id)?.name ?? '—'}</td>
                  <td>
                    <span className="inline-flex items-center rounded-full px-2.5 h-[22px] text-[11px] font-bold"
                      style={{ background: getStatus(o.status).color, color:'#fff', fontFamily:'var(--font-arabic)' }}>
                      {statusLabel(o.status, lang)}
                    </span>
                  </td>
                  <td><button onClick={()=>openWhatsApp(o.customer_phone,o.customer_name)} className="text-xs" style={{color:'#25D366'}}>{o.customer_phone}</button></td>
                  <td className="font-medium text-sm">{o.customer_name}</td>
                  <td className="text-xs">{(o.items?.[0] as any)?.product_name?.slice(0,16) ?? '—'}</td>
                  <td className="text-xs">{(o.wilaya as any)?.name_ar ?? '—'}</td>
                  <td className="font-semibold text-sm" style={{color:'var(--color-accent)'}}>{o.total?.toLocaleString('ar-DZ')} دج</td>
                  <td><ActionDropdown order={o}/></td>
                </tr>
              ))}
          </tbody>
        </table>
      </div>
      )}
      {trackSubTab === 1 && (
      <div className="card overflow-hidden">
        <table className="data-table" style={{fontFamily:'var(--font-arabic)'}}>
          <thead>
            <tr>{['رجل التوصيل','الهاتف','طلبات قيد التوصيل','إجراء'].map(h=><th key={h}>{h}</th>)}</tr>
          </thead>
          <tbody>
            {driverTeam.length === 0
              ? <tr><td colSpan={4} className="text-center py-12 text-sm" style={{color:'var(--color-text-muted)'}}>
                  لا يوجد أعضاء فريق توصيل — أضفهم من تبويب الفريق
                </td></tr>
              : driverTeam.map(m => (
                <tr key={m.id}>
                  <td className="font-medium text-sm">{m.name}</td>
                  <td><button onClick={()=>openWhatsApp(m.phone,m.name)} className="text-xs" style={{color:'#25D366'}}>{m.phone ?? '—'}</button></td>
                  <td className="font-semibold text-sm" style={{color:'var(--color-accent)'}}>{trackingOrders.length}</td>
                  <td>
                    <button onClick={()=>openWhatsApp(m.phone,m.name)} className="btn btn-sm" style={{background:'#25D366',color:'#fff',fontFamily:'var(--font-arabic)'}}>
                      <MessageCircle size={12}/>تواصل
                    </button>
                  </td>
                </tr>
              ))}
          </tbody>
        </table>
      </div>
      )}
    </div>
  )}

  const renderValidation = () => {
    // 9.10 — Exact empty states for validation tabs
    const COMING_SOON_CARD = (
      <div className="flex flex-col items-center justify-center py-16 rounded-2xl border-2 border-dashed" style={{borderColor:'var(--color-border)'}}>
        <div className="w-16 h-16 rounded-2xl flex items-center justify-center mb-4" style={{background:'var(--color-accent-soft)'}}>
          <CheckSquare size={28} style={{color:'var(--color-accent)'}}/>
        </div>
        <p className="font-black text-lg mb-1" style={{color:'var(--color-text-primary)'}}>COMING SOON...</p>
        <p className="text-sm" style={{color:'var(--color-text-muted)'}}>نطبخ منتجنا 🍳</p>
      </div>
    )
    return (
      <div>
        <TabBar tabs={['التحقق من الارسال','التحقق من الارجاع','التحقق من الدفع']} active={0} onChange={()=>{}} />
        {COMING_SOON_CARD}
      </div>
    )
  }

  const renderProducts = () => {
    const shown = prodList.filter(p => !prodSearch || (p.name_ar??p.name??'').toLowerCase().includes(prodSearch.toLowerCase()) || (p.sku??'').includes(prodSearch))
    return (
      <div className="space-y-3">
        <div className="flex items-center gap-2 flex-wrap">
          <div className="relative flex-1 max-w-xs">
            <Search size={12} className="absolute right-3 top-1/2 -translate-y-1/2" style={{color:'var(--color-text-muted)'}}/>
            <input value={prodSearch} onChange={e=>setProdSearch(e.target.value)} placeholder="ابحث..." className="input pr-8 text-sm h-9 w-full"/>
          </div>
          <a href="/products/new" className="btn btn-primary btn-sm gap-1.5"><Plus size={13}/>إضافة منتج</a>
        </div>
        <div className="card overflow-hidden">
          <table className="data-table" style={{fontFamily:'var(--font-arabic)'}}>
            <thead>
              <tr>{['الصورة','الاسم','المرجع','السعر','معرفة؟','الإجراءات'].map(h=><th key={h}>{h}</th>)}</tr>
            </thead>
            <tbody>
              {shown.length === 0
                ? <tr><td colSpan={6} className="text-center py-14">
                    <Package size={28} className="mx-auto mb-2" style={{color:'var(--color-text-muted)',opacity:0.4}}/>
                    <p className="text-sm" style={{color:'var(--color-text-muted)'}}>لا توجد منتجات — أضف منتجاتك</p>
                  </td></tr>
                : shown.map((p: any) => (
                  <tr key={p.id}>
                    <td>
                      <div className="w-10 h-10 rounded-lg overflow-hidden flex-shrink-0 flex items-center justify-center" style={{background:'var(--color-bg-soft)'}}>
                        {(p.images as any[])?.[0]?.url
                          ? <img src={(p.images as any[])[0].url} alt="" className="w-full h-full object-cover"/>
                          : <div className="w-full h-full flex flex-col items-center justify-center gap-0.5" style={{background:'var(--color-bg-muted)'}}>
                              <Package size={12} style={{color:'var(--color-text-muted)'}}/>
                              <span className="text-[8px]" style={{color:'var(--color-text-muted)'}}>لا توجد صورة</span>
                            </div>}
                      </div>
                    </td>
                    <td>
                      <p className="font-medium text-sm">{p.name_ar??p.name}</p>
                      {p.confirmili_team_note && <p className="text-[10px] mt-0.5" style={{color:'var(--color-text-muted)'}}>{p.confirmili_team_note}</p>}
                    </td>
                    <td className="text-xs font-mono" style={{color:'var(--color-text-muted)'}}>{p.sku??'—'}</td>
                    <td className="font-semibold text-sm" style={{color:'var(--color-accent)',fontFamily:'var(--font-primary)'}}>{p.price?.toLocaleString('ar-DZ')} دج</td>
                    <td>
                      <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-1.5 py-0.5 rounded-full"
                        style={{ background: p.confirmili_is_known ? '#D1E7DD' : '#F8D7DA', color: p.confirmili_is_known ? '#198754' : '#DC3545' }}>
                        {p.confirmili_is_known ? '✓ معروف' : '✗ غير معروف'}
                      </span>
                    </td>
                    <td>
                      <div className="flex items-center gap-1">
                        <button onClick={()=>setProdForm(p)} className="p-1.5 rounded hover:bg-[#F8F9FA]"><Edit2 size={12} style={{color:'var(--color-text-muted)'}}/></button>
                        <button onClick={()=>openHistory(p.id, p.name_ar??p.name)} className="p-1.5 rounded hover:bg-[#F8F9FA]"><Clock size={12} style={{color:'var(--color-text-muted)'}}/></button>
                        <button onClick={()=>deleteProd(p.id)} className="p-1.5 rounded hover:bg-red-50"><Trash2 size={12} style={{color:'#DC3545'}}/></button>
                      </div>
                    </td>
                  </tr>
                ))
              }
            </tbody>
          </table>
        </div>
      </div>
    )
  }

  // Reuses the store delivery module (also available standalone at /store/delivery).
  const renderDelivery = () => <ConfirmiliDelivery storeId={storeId} setToast={setToast} />

  const _renderDeliveryOLD = () => {
    const dTabs = ['شركة التوصيل','أسعار التوصيل المعلنة','الولاية ↔ شركة التوصيل','أسعار التوصيل الحقيقية']
    return (
      <div>
        <TabBar tabs={dTabs} active={delivSubTab} onChange={setDelivSubTab}/>
        {delivSubTab === 0 && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-start gap-2 p-3 rounded-lg border flex-1" style={{borderColor:'var(--color-info)',background:'var(--color-info-soft)'}}>
                <AlertTriangle size={13} style={{color:'var(--color-info)',marginTop:1,flexShrink:0}}/>
                <p className="text-xs" style={{color:'var(--color-info)'}}>
                  عمود &quot;تلقائي&quot; يعني: عند تأكيد طلب مرتبط بهذه الشركة، يُرسل تلقائياً دون النقر على زر الإرسال.
                </p>
              </div>
              <button onClick={() => setCompanyForm({ is_active:true, is_automatic:false })} className="btn btn-primary btn-sm gap-1.5 mr-3 flex-shrink-0"><Plus size={13}/>شركة جديدة</button>
            </div>
            <div className="card overflow-hidden">
              <table className="data-table">
                <thead>
                  <tr>{['اسم الشركة','الاسم القصير','تلقائي ⚡','الحالة','الإجراءات'].map(h=><th key={h}>{h}</th>)}</tr>
                </thead>
                <tbody>
                  {companies.length === 0 ? (
                    <tr><td colSpan={5} className="text-center py-10 text-sm" style={{color:'var(--color-text-muted)'}}>
                      لا توجد شركات توصيل — أضف شركة جديدة
                    </td></tr>
                  ) : companies.map(co => (
                    <tr key={co.id}>
                      <td className="font-medium text-sm">{co.name}</td>
                      <td className="font-mono text-xs" style={{color:'var(--color-accent)'}}>{co.short_name}</td>
                      <td>
                        {/* 9.1 / 8.1 — Automatic sending toggle (functional) */}
                        <button onClick={() => toggleCompany(co, 'is_automatic')} className="flex items-center gap-2" title="إرسال تلقائي عند التأكيد">
                          <span className="w-8 h-4 rounded-full relative transition-colors" style={{background: co.is_automatic ? '#3CC6B9' : '#DEE2E6'}}>
                            <span className="absolute top-0.5 w-3 h-3 bg-white rounded-full shadow transition-all" style={{[co.is_automatic?'right':'left']:'2px'} as any}/>
                          </span>
                          <span className="text-xs" style={{color: co.is_automatic ? 'var(--color-accent)' : 'var(--color-text-muted)'}}>{co.is_automatic ? 'تلقائي' : 'يدوي'}</span>
                        </button>
                      </td>
                      <td>
                        <button onClick={() => toggleCompany(co, 'is_active')}
                          className="w-9 h-5 rounded-full flex items-center transition-colors" style={{background: co.is_active ? '#22C55E' : '#DEE2E6'}}>
                          <span className="w-4 h-4 bg-white rounded-full shadow transition-transform" style={{transform: co.is_active ? 'translateX(-2px)' : 'translateX(-18px)'}}/>
                        </button>
                      </td>
                      <td>
                        <div className="flex items-center gap-1">
                          <button onClick={() => setCompanyForm(co)} className="p-1.5 rounded hover:bg-[#F8F9FA]"><Edit2 size={12} style={{color:'var(--color-text-muted)'}}/></button>
                          <button onClick={() => deleteCompany(co.id)} className="p-1.5 rounded hover:bg-red-50"><Trash2 size={12} style={{color:'#DC3545'}}/></button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
        {delivSubTab === 1 && (
          <div className="space-y-3">
            <div className="p-3 rounded-lg border flex items-start gap-2" style={{borderColor:'var(--color-error)',background:'var(--color-error-soft)'}}>
              <AlertTriangle size={14} style={{color:'var(--color-error)',flexShrink:0,marginTop:1}}/>
              <p className="text-xs" style={{color:'var(--color-error)'}}>
                أسعار التوصيل المعلنة هي الأسعار التي تُعلنها لزبائنك وتُضاف لمجموع الطلبية. تختلف عن الأسعار الحقيقية المستخدمة لحساب الأرباح.
              </p>
            </div>
            <div className="card overflow-hidden">
              <table className="data-table">
                <thead><tr><th>الولاية</th><th>مكتب (دج)</th><th>المنزل (دج)</th></tr></thead>
                <tbody>
                  {wilayasList.length === 0 ? (
                    <tr><td colSpan={3} className="text-center py-8 text-sm" style={{color:'var(--color-text-muted)'}}>جارٍ التحميل...</td></tr>
                  ) : wilayasList.map(w => (
                    <tr key={w.id}>
                      <td className="text-sm font-medium">{w.name_ar}</td>
                      <td><PriceInput value={declaredPrices[w.id]?.desk ?? 0} onSave={v=>savePrice('declared', w.id, 'desk', v)}/></td>
                      <td><PriceInput value={declaredPrices[w.id]?.home ?? 0} onSave={v=>savePrice('declared', w.id, 'home', v)}/></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
        {delivSubTab === 2 && (
          <div className="card overflow-hidden">
            <table className="data-table">
              <thead><tr><th>الولاية</th><th>شركة التوصيل</th></tr></thead>
              <tbody>
                {wilayasList.length === 0 ? (
                  <tr><td colSpan={2} className="text-center py-8 text-sm" style={{color:'var(--color-text-muted)'}}>جارٍ التحميل...</td></tr>
                ) : wilayasList.map(w => (
                  <tr key={w.id}>
                    <td className="text-sm font-medium">{w.name_ar}</td>
                    <td>
                      <select className="input text-xs" value={wilayaCompanyMap[w.id] ?? ''} onChange={e=>saveWilayaCompany(w.id, e.target.value)}>
                        <option value="">الشركة الافتراضية</option>
                        {companies.map(co => <option key={co.id} value={co.id}>{co.name}</option>)}
                      </select>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {delivSubTab === 3 && (
          <div className="space-y-2">
            <div className="p-3 rounded-lg" style={{background:'var(--color-warning-soft)'}}>
              <p className="text-xs" style={{color:'#856404'}}>أسعار التوصيل الحقيقية تُستخدم فقط في حساب الأرباح (لا تُضاف للزبون).</p>
            </div>
            <div className="card overflow-hidden">
              <table className="data-table">
                <thead><tr><th>الولاية</th><th>مكتب (دج)</th><th>المنزل (دج)</th></tr></thead>
                <tbody>
                  {wilayasList.length === 0 ? (
                    <tr><td colSpan={3} className="text-center py-8 text-sm" style={{color:'var(--color-text-muted)'}}>جارٍ التحميل...</td></tr>
                  ) : wilayasList.map(w => (
                    <tr key={w.id}>
                      <td className="text-sm font-medium">{w.name_ar}</td>
                      <td><PriceInput value={realPrices[w.id]?.desk ?? 0} onSave={v=>savePrice('real', w.id, 'desk', v)}/></td>
                      <td><PriceInput value={realPrices[w.id]?.home ?? 0} onSave={v=>savePrice('real', w.id, 'home', v)}/></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    )
  }

  const renderStoreIntegration = () => {
    const sTabs = ['ربط المتاجر','قوقل شيت','فيسبوك ليدس']
    const PLATFORM_ICONS: Record<string,string> = { youcan:'🛒', shopify:'🏪', woocommerce:'⚙️', google_sheet:'📊', dakkani:'🔵' }
    return (
      <div>
        <TabBar tabs={sTabs} active={storeSubTab} onChange={setStoreSubTab}/>
        {storeSubTab === 0 && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs" style={{color:'var(--color-text-muted)'}}>ربط منصات التجارة الإلكترونية بـ Confirmili</span>
              <button onClick={()=>setIntegForm({platform:'youcan',status:true})} className="btn btn-primary btn-sm gap-1.5"><Plus size={13}/>ربط متجر</button>
            </div>
            <div className="card overflow-hidden">
              <table className="data-table">
                <thead><tr>{['المنصة','الاسم','الحالة','الإجراءات'].map(h=><th key={h}>{h}</th>)}</tr></thead>
                <tbody>
                  {/* Commerco always shown as connected */}
                  <tr>
                    <td><div className="flex items-center gap-2"><span>🔵</span><span className="text-xs font-mono" style={{color:'var(--color-accent)'}}>Commerco</span></div></td>
                    <td className="font-medium text-sm">{storeName}</td>
                    <td><span className="inline-flex items-center text-[10px] px-2 py-0.5 rounded-full font-semibold" style={{background:'#D1E7DD',color:'#198754'}}>متصل ✓</span></td>
                    <td><a href="/settings" className="btn btn-sm" style={{background:'#E0F5F2',color:'var(--color-accent)'}}>إعدادات</a></td>
                  </tr>
                  {integrations.filter(i=>i.platform!=='google_sheet').map(it => (
                    <tr key={it.id}>
                      <td><div className="flex items-center gap-2"><span>{PLATFORM_ICONS[it.platform]??'🔗'}</span><span className="text-xs" style={{color:'var(--color-text-muted)'}}>{it.platform}</span></div></td>
                      <td className="font-medium text-sm">{it.name}</td>
                      <td>
                        <button onClick={()=>toggleIntegration(it)} className="w-9 h-5 rounded-full flex items-center transition-colors" style={{background:it.status?'#22C55E':'#DEE2E6'}}>
                          <span className="w-4 h-4 bg-white rounded-full shadow transition-transform" style={{transform:it.status?'translateX(-2px)':'translateX(-18px)'}}/>
                        </button>
                      </td>
                      <td>
                        <div className="flex items-center gap-1">
                          <button onClick={()=>setIntegForm(it)} className="p-1.5 rounded hover:bg-[#F8F9FA]"><Edit2 size={12} style={{color:'var(--color-text-muted)'}}/></button>
                          <button onClick={()=>deleteIntegration(it.id)} className="p-1.5 rounded hover:bg-red-50"><Trash2 size={12} style={{color:'#DC3545'}}/></button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {integrations.filter(i=>i.platform!=='google_sheet').length === 0 && (
                    <tr><td colSpan={4} className="text-center py-8 text-sm" style={{color:'var(--color-text-muted)'}}>لا توجد تكاملات إضافية</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
        {storeSubTab === 1 && (
          <div className="space-y-3">
            <div className="flex gap-2">
              <button onClick={()=>setIntegForm({platform:'google_sheet',status:true})} className="btn btn-primary btn-sm gap-1.5"><Plus size={13}/>إضافة شيت</button>
            </div>
            <div className="card overflow-hidden">
              <table className="data-table">
                <thead><tr><th>الاسم</th><th>الحالة</th><th>إجراءات</th></tr></thead>
                <tbody>
                  {integrations.filter(i=>i.platform==='google_sheet').length === 0
                    ? <tr><td colSpan={3} className="text-center py-10 text-sm" style={{color:'var(--color-text-muted)'}}>لا توجد شيتات — أضف أول شيت</td></tr>
                    : integrations.filter(i=>i.platform==='google_sheet').map(it => (
                      <tr key={it.id}>
                        <td className="font-medium text-sm">{it.name}</td>
                        <td>
                          <button onClick={()=>toggleIntegration(it)} className="w-9 h-5 rounded-full flex items-center transition-colors" style={{background:it.status?'#22C55E':'#DEE2E6'}}>
                            <span className="w-4 h-4 bg-white rounded-full shadow transition-transform" style={{transform:it.status?'translateX(-2px)':'translateX(-18px)'}}/>
                          </button>
                        </td>
                        <td>
                          <div className="flex items-center gap-1">
                            <button onClick={()=>setIntegForm(it)} className="p-1.5 rounded hover:bg-[#F8F9FA]"><Edit2 size={12} style={{color:'var(--color-text-muted)'}}/></button>
                            <button onClick={()=>deleteIntegration(it.id)} className="p-1.5 rounded hover:bg-red-50"><Trash2 size={12} style={{color:'#DC3545'}}/></button>
                          </div>
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
        {storeSubTab === 2 && (
          <div className="flex flex-col items-center justify-center py-20 rounded-2xl border-2 border-dashed" style={{borderColor:'var(--color-border)'}}>
            <span className="text-5xl mb-4">🍳</span>
            <p className="font-black text-xl mb-2" style={{color:'var(--color-text-primary)'}}>COMING SOON...</p>
            <p className="text-sm" style={{color:'var(--color-text-muted)'}}>ربط فيسبوك leads — نطبخ منتجنا</p>
          </div>
        )}
      </div>
    )
  }

  const renderFinances = () => {
    const fTabs = ['حساب الأرباح','حسابات التأكيد و التتبع','حسابات التوصيل','تنظيم مدير الأعمال']

    // 9.6 — Declared vs Real prices logic
    // Declared delivery fee = what customer paid (stored in orders.delivery_fee or declared_delivery_fee)
    // Real delivery fee = actual carrier cost (stored in orders.real_delivery_fee)
    // Revenue = product price * qty + declared_delivery_fee (what customer paid)
    // Net profit = Revenue - real_delivery_fee - cost_price
    const deliveredOrders = localOrders.filter(o => o.status === 'delivered' && !trashedOrders.has(o.id))
    const grossRevenue       = deliveredOrders.reduce((s,o) => s + (o.total ?? 0), 0)
    const declaredDelivery   = deliveredOrders.reduce((s,o) => s + (o.declared_delivery_fee ?? o.delivery_fee ?? 0), 0)
    const realDelivery       = deliveredOrders.reduce((s,o) => s + (o.real_delivery_fee ?? o.delivery_fee ?? 0), 0)
    const productRevenue     = grossRevenue - declaredDelivery // pure product revenue
    // Operating costs from finance config
    const confirmedCount     = localOrders.filter(o => ['confirmed','delivered'].includes(o.status) && !trashedOrders.has(o.id)).length
    const costBase           = financeCfg.confirmation_price_mode === 'per_delivered' ? deliveredOrders.length : confirmedCount
    const confirmationCost   = (financeCfg.confirmation_price ?? 0) * costBase
    const packagingCost      = (financeCfg.packaging_price ?? 0) * deliveredOrders.length
    const trackingCost       = (financeCfg.tracking_price ?? 0) * deliveredOrders.length
    const adCost             = financeCfg.monthly_ad_cost ?? 0
    const otherCost          = Array.isArray(financeCfg.other_costs) ? financeCfg.other_costs.reduce((s:number,c:any)=>s+(c.amount??0),0) : 0
    const netProfit          = productRevenue - realDelivery - confirmationCost - packagingCost - trackingCost - adCost - otherCost

    return (
      <div>
        <TabBar tabs={fTabs} active={financeSubTab} onChange={setFinanceSubTab}/>
        {financeSubTab === 0 && (
          <div className="space-y-4">
            {/* (9.6) Declared vs Real breakdown */}
            <div className="card p-4">
              <div className="flex items-center gap-2 mb-3">
                <Calculator size={15} style={{color:'var(--color-accent)'}}/>
                <h3 className="font-semibold text-sm" style={{color:'var(--color-text-primary)'}}>حساب الأرباح الدقيق</h3>
                <span className="badge badge-blue text-[10px]">مسلمة فقط</span>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {[
                  {label:'إجمالي المبيعات', v:`${grossRevenue.toLocaleString('ar-DZ')} دج`, color:'var(--color-accent)', tip:'السعر الكلي المدفوع من الزبون'},
                  {label:'رسوم التوصيل المعلنة', v:`${declaredDelivery.toLocaleString('ar-DZ')} دج`, color:'#FFA500', tip:'رسوم التوصيل المضافة للزبون'},
                  {label:'دخل المنتجات', v:`${productRevenue.toLocaleString('ar-DZ')} دج`, color:'#3CC6B9', tip:'إجمالي - رسوم التوصيل المعلنة'},
                  {label:'رسوم التوصيل الحقيقية', v:`${realDelivery.toLocaleString('ar-DZ')} دج`, color:'#DC3545', tip:'التكلفة الحقيقية للشركة'},
                  {label:'صافي الربح', v:`${netProfit.toLocaleString('ar-DZ')} دج`, color:'#198754', tip:'دخل المنتجات - رسوم الشركة'},
                  {label:'نسبة الربح', v:`${grossRevenue > 0 ? Math.round(netProfit/grossRevenue*100) : 0}%`, color:'#198754', tip:''},
                ].map(c => (
                  <div key={c.label} className="p-3 rounded-lg" style={{background:'var(--color-bg-soft)'}}>
                    <p className="font-black text-base" style={{color:c.color,fontFamily:'var(--font-primary)'}}>{c.v}</p>
                    <p className="text-xs mt-0.5" style={{color:'var(--color-text-muted)'}}>{c.label}</p>
                    {c.tip && <p className="text-[9px] mt-0.5" style={{color:'var(--color-text-muted)',fontStyle:'italic'}}>{c.tip}</p>}
                  </div>
                ))}
              </div>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {(() => {
                const n = localOrders.filter(o=>!trashedOrders.has(o.id)).length
                const pct = (v:number) => n ? `${v} (${Math.round(v/n*100)}%)` : '0 (0%)'
                return [
                  {label:'جميع الطلبيات',v:String(n)},
                  {label:'مؤكدة',v:pct(localOrders.filter(o=>o.status==='confirmed').length)},
                  {label:'ملغاة',v:pct(localOrders.filter(o=>o.status==='cancelled').length)},
                  {label:'قيد التأكيد',v:pct(localOrders.filter(o=>o.status==='new').length)},
                  {label:'مسلمة',v:pct(deliveredOrders.length)},
                  {label:'مرجعة',v:pct(localOrders.filter(o=>o.status==='returned').length)},
                  {label:'مكررة',v:pct(localOrders.filter(o=>o.status==='duplicate').length)},
                  {label:'فاشلة',v:pct(localOrders.filter(o=>o.status?.startsWith('failed')).length)},
                ].map(c => (
                  <div key={c.label} className="card p-3 text-center">
                    <p className="font-bold text-base" style={{color:'var(--color-accent)',fontFamily:'var(--font-primary)'}}>{c.v}</p>
                    <p className="text-xs mt-0.5" style={{color:'var(--color-text-muted)',fontFamily:'var(--font-arabic)'}}>{c.label}</p>
                  </div>
                ))
              })()}
            </div>
            {/* Cost inputs (persist to confirmili_finance_config) */}
            <div className="card p-4">
              <h3 className="font-semibold text-sm mb-3" style={{color:'var(--color-text-primary)'}}>التكاليف التشغيلية (دج)</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <div>
                  <label className="block text-xs mb-1" style={{color:'var(--color-text-muted)'}}>مصاريف الإعلان الشهرية</label>
                  <input type="number" className="input text-sm w-full" value={financeCfg.monthly_ad_cost ?? 0}
                    onChange={e=>setFinanceCfg((f:any)=>({...f,monthly_ad_cost:+e.target.value}))}/>
                </div>
                <div>
                  <label className="block text-xs mb-1" style={{color:'var(--color-text-muted)'}}>سعر التأكيد</label>
                  <input type="number" className="input text-sm w-full" value={financeCfg.confirmation_price ?? 0}
                    onChange={e=>setFinanceCfg((f:any)=>({...f,confirmation_price:+e.target.value}))}/>
                  <select className="input text-xs w-full mt-1" value={financeCfg.confirmation_price_mode ?? 'per_confirmed'}
                    onChange={e=>setFinanceCfg((f:any)=>({...f,confirmation_price_mode:e.target.value}))}>
                    <option value="per_confirmed">لكل مؤكدة</option>
                    <option value="per_delivered">لكل مسلمة</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs mb-1" style={{color:'var(--color-text-muted)'}}>سعر التغليف</label>
                  <input type="number" className="input text-sm w-full" value={financeCfg.packaging_price ?? 0}
                    onChange={e=>setFinanceCfg((f:any)=>({...f,packaging_price:+e.target.value}))}/>
                </div>
                <div>
                  <label className="block text-xs mb-1" style={{color:'var(--color-text-muted)'}}>سعر التتبع</label>
                  <input type="number" className="input text-sm w-full" value={financeCfg.tracking_price ?? 0}
                    onChange={e=>setFinanceCfg((f:any)=>({...f,tracking_price:+e.target.value}))}/>
                </div>
              </div>
              <p className="text-xs mt-3" style={{color:'var(--color-text-muted)'}}>
                التكاليف: تأكيد {confirmationCost.toLocaleString('ar-DZ')} · تغليف {packagingCost.toLocaleString('ar-DZ')} · تتبع {trackingCost.toLocaleString('ar-DZ')} · إعلان {adCost.toLocaleString('ar-DZ')} دج
              </p>
            </div>
            <div className="flex gap-2">
              <button onClick={saveFinanceCfg} className="btn btn-primary btn-sm" style={{fontFamily:'var(--font-arabic)'}}>حفظ التكاليف</button>
              <button onClick={exportExcel} className="btn btn-sm" style={{background:'var(--color-success)',color:'#fff',fontFamily:'var(--font-arabic)'}}>
                <Download size={13}/>تصدير Excel
              </button>
            </div>
          </div>
        )}
        {financeSubTab === 1 && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {/* Team confirmation stats */}
              {[
                {label:'معدل التأكيد', v: localOrders.length ? `${Math.round((localOrders.filter(o=>['confirmed','delivered'].includes(o.status)).length/localOrders.length)*100)}%` : '0%'},
                {label:'متوسط وقت التأكيد', v:'—'},
                {label:'أعلى معدل تأكيد', v:'اليوم'},
                {label:'نسبة الرد على الاتصالات', v: localOrders.filter(o=>o.call_attempts>0).length > 0 ? `${Math.round((localOrders.filter(o=>['confirmed','delivered'].includes(o.status)&&o.call_attempts>0).length/localOrders.filter(o=>o.call_attempts>0).length)*100)}%` : '—'},
              ].map(c => (
                <div key={c.label} className="card p-3 text-center">
                  <p className="font-bold text-base" style={{color:'var(--color-accent)',fontFamily:'var(--font-primary)'}}>{c.v}</p>
                  <p className="text-xs mt-0.5" style={{color:'var(--color-text-muted)'}}>{c.label}</p>
                </div>
              ))}
            </div>
            <div className="card overflow-hidden">
              <div className="px-4 py-3 border-b font-semibold text-sm" style={{borderColor:'var(--color-border)'}}>محاولات الاتصال حسب الحالة</div>
              <table className="data-table">
                <thead><tr><th>عدد المحاولات</th><th>طلبات مؤكدة</th><th>طلبات ملغاة</th><th>المجموع</th></tr></thead>
                <tbody>
                  {[1,2,3].map(n => {
                    const withN = localOrders.filter(o => o.call_attempts === n)
                    const confirmed = withN.filter(o => ['confirmed','delivered'].includes(o.status)).length
                    const cancelled = withN.filter(o => o.status === 'cancelled').length
                    return (
                      <tr key={n}>
                        <td className="font-semibold">{n} {n === 1 ? 'محاولة' : 'محاولات'}</td>
                        <td style={{color:'#198754'}}>{confirmed}</td>
                        <td style={{color:'#DC3545'}}>{cancelled}</td>
                        <td>{withN.length}</td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
        {financeSubTab === 2 && (
          <div className="space-y-3">
            <div className="card p-4">
              <h3 className="font-semibold text-sm mb-3" style={{fontFamily:'var(--font-arabic)'}}>مقارنة أسعار التوصيل (معلنة vs حقيقية)</h3>
              <div className="overflow-x-auto">
                <table className="data-table">
                  <thead><tr><th>الولاية</th><th>المعلنة (دج)</th><th>الحقيقية (دج)</th><th>الفرق</th></tr></thead>
                  <tbody>
                    {(() => {
                      const byWilaya: Record<string, {declared:number;real:number;count:number}> = {}
                      deliveredOrders.forEach(o => {
                        const w = (o.wilaya as any)?.name_ar ?? 'غير محدد'
                        if (!byWilaya[w]) byWilaya[w] = {declared:0,real:0,count:0}
                        byWilaya[w].declared += o.declared_delivery_fee ?? o.delivery_fee ?? 0
                        byWilaya[w].real += o.real_delivery_fee ?? o.delivery_fee ?? 0
                        byWilaya[w].count++
                      })
                      const rows = Object.entries(byWilaya).sort(([,a],[,b]) => b.count - a.count).slice(0,15)
                      if (rows.length === 0) return <tr><td colSpan={4} className="text-center py-8 text-sm" style={{color:'var(--color-text-muted)'}}>لا توجد بيانات</td></tr>
                      return rows.map(([w, s]) => {
                        const diff = s.declared - s.real
                        return (
                          <tr key={w}>
                            <td className="font-medium text-sm">{w}</td>
                            <td className="text-sm" style={{color:'#FFA500'}}>{(s.declared/Math.max(1,s.count)).toFixed(0)} دج</td>
                            <td className="text-sm" style={{color:'#DC3545'}}>{(s.real/Math.max(1,s.count)).toFixed(0)} دج</td>
                            <td className="text-sm font-semibold" style={{color: diff >= 0 ? '#198754' : '#DC3545'}}>
                              {diff >= 0 ? '+' : ''}{(diff/Math.max(1,s.count)).toFixed(0)} دج
                            </td>
                          </tr>
                        )
                      })
                    })()}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
        {financeSubTab === 3 && (
          <div className="card p-5 space-y-4">
            <h3 className="font-semibold text-sm" style={{color:'var(--color-text-primary)'}}>تنظيم مدير الأعمال</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium mb-1.5" style={{color:'var(--color-text-secondary)'}}>ميزانية الإعلانات</label>
                <input type="number" placeholder="0 دج" className="input text-sm" dir="ltr"
                  value={financeCfg.monthly_ad_cost ?? 0}
                  onChange={e=>setFinanceCfg((f:any)=>({...f,monthly_ad_cost:+e.target.value}))}/>
              </div>
              <div>
                <label className="block text-xs font-medium mb-1.5" style={{color:'var(--color-text-secondary)'}}>تكلفة التأكيد (لكل طلب)</label>
                <input type="number" placeholder="0 دج" className="input text-sm" dir="ltr"
                  value={financeCfg.confirmation_price ?? 0}
                  onChange={e=>setFinanceCfg((f:any)=>({...f,confirmation_price:+e.target.value}))}/>
              </div>
              <div>
                <label className="block text-xs font-medium mb-1.5" style={{color:'var(--color-text-secondary)'}}>تكلفة التغليف (لكل طلب)</label>
                <input type="number" placeholder="0 دج" className="input text-sm" dir="ltr"
                  value={financeCfg.packaging_price ?? 0}
                  onChange={e=>setFinanceCfg((f:any)=>({...f,packaging_price:+e.target.value}))}/>
              </div>
              <div>
                <label className="block text-xs font-medium mb-1.5" style={{color:'var(--color-text-secondary)'}}>مصاريف أخرى</label>
                <input type="number" placeholder="0 دج" className="input text-sm" dir="ltr"
                  value={Array.isArray(financeCfg.other_costs) ? (financeCfg.other_costs[0]?.amount ?? 0) : 0}
                  onChange={e=>setFinanceCfg((f:any)=>({...f,other_costs:[{label:'مصاريف أخرى',amount:+e.target.value}]}))}/>
              </div>
            </div>
            <button onClick={saveFinanceCfg} className="btn btn-primary btn-sm" style={{fontFamily:'var(--font-arabic)'}}>حفظ وحساب الأرباح</button>
            <div className="p-3 rounded-lg" style={{background:'var(--color-bg-soft)'}}>
              <p className="text-xs" style={{color:'var(--color-text-muted)'}}>💡 هذه المصاريف تُطرح من صافي الربح في تبويب &quot;حساب الأرباح&quot;</p>
            </div>
          </div>
        )}
      </div>
    )
  }

  const renderTeam = () => {
    const tTabs = ['فريق التأكيد و التتبع','فريق التوصيل','عضو ↔ مسير']
    const managers = team.filter(m => m.role === 'manager')
    return (
      <div>
        <TabBar tabs={tTabs} active={teamSubTab} onChange={setTeamSubTab}/>
        {teamSubTab < 2 && (
          <div className="space-y-3">
            <div className="flex justify-end">
              <button onClick={() => setTeamForm({ role: teamSubTab === 1 ? 'delivery' : 'confirmer', is_active: true })}
                className="btn btn-primary btn-sm gap-1.5"><Plus size={13}/>إضافة عضو</button>
            </div>
            <div className="card overflow-hidden">
              <table className="data-table">
                <thead>
                  <tr>{['الاسم','الهاتف','البريد الإلكتروني','الحالة','الدور','الإجراءات'].map(h=><th key={h}>{h}</th>)}</tr>
                </thead>
                <tbody>
                  {team.length === 0 ? (
                    <tr><td colSpan={6}>
                      <div className="text-center py-12">
                        <Users size={28} className="mx-auto mb-2" style={{color:'var(--color-text-muted)',opacity:0.4}}/>
                        <p className="text-sm font-medium mb-1" style={{color:'var(--color-text-muted)'}}>لا يوجد أعضاء</p>
                        <button onClick={() => setTeamForm({ role:'confirmer', is_active:true })} className="btn btn-primary btn-sm gap-1.5 mt-2"><Plus size={13}/>إضافة عضو</button>
                      </div>
                    </td></tr>
                  ) : team.map(m => (
                    <tr key={m.id}>
                      <td className="font-medium text-sm">{m.name}</td>
                      <td className="text-xs font-mono" style={{color:'var(--color-text-muted)'}}>{m.phone ?? '—'}</td>
                      <td className="text-xs" style={{color:'var(--color-text-muted)'}}>{m.email ?? '—'}</td>
                      <td>
                        <button onClick={() => toggleTeamMember(m)}
                          className="w-9 h-5 rounded-full flex items-center transition-colors" style={{background: m.is_active ? '#22C55E' : '#DEE2E6'}}>
                          <span className="w-4 h-4 bg-white rounded-full shadow transition-transform" style={{transform: m.is_active ? 'translateX(-2px)' : 'translateX(-18px)'}}/>
                        </button>
                      </td>
                      <td className="text-xs">{m.role === 'manager' ? 'مسير' : m.role === 'delivery' ? 'توصيل' : 'عضو'}</td>
                      <td>
                        <div className="flex items-center gap-1">
                          <button onClick={() => setTeamForm(m)} className="p-1.5 rounded hover:bg-[#F8F9FA]"><Edit2 size={12} style={{color:'var(--color-text-muted)'}}/></button>
                          <button onClick={() => deleteTeamMember(m.id)} className="p-1.5 rounded hover:bg-red-50"><Trash2 size={12} style={{color:'#DC3545'}}/></button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
        {teamSubTab === 2 && (
          <div className="card p-5 space-y-3">
            <h3 className="font-semibold text-sm" style={{color:'var(--color-text-primary)'}}>عضو ↔ مسير</h3>
            {managers.length === 0
              ? <p className="text-sm py-6 text-center" style={{color:'var(--color-text-muted)'}}>أضف عضواً بدور &quot;مسير&quot; أولاً لربط الأعضاء به</p>
              : managers.map(mgr => (
                <div key={mgr.id} className="rounded-xl border p-3" style={{borderColor:'var(--color-border)'}}>
                  <p className="text-sm font-semibold mb-2" style={{color:'var(--color-text-primary)'}}>عملاء {mgr.name}</p>
                  <div className="flex flex-wrap gap-2">
                    {team.filter(m => m.role !== 'manager').map(m => (
                      <span key={m.id} className="text-xs px-2 py-1 rounded-full" style={{background:'#E0F5F2',color:'#3CC6B9'}}>{m.name}</span>
                    ))}
                  </div>
                </div>
              ))
            }
          </div>
        )}
      </div>
    )
  }

  // ─── SETTINGS CONTENT (password change + account info) ──
  const SettingsContent = () => {
    const [pw, setPw] = useState({old:'',new_:'',confirm:''})
    const [showPw, setShowPw] = useState(false)
    const [savingPw, setSavingPw] = useState(false)
    const changePassword = async () => {
      if (pw.new_ !== pw.confirm) { setToast('كلمتا المرور غير متطابقتين'); return }
      if (pw.new_.length < 8)     { setToast('كلمة المرور يجب أن تكون 8 أحرف على الأقل'); return }
      setSavingPw(true)
      
      try {
        const res = await fetch('/api/auth/update-password', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ password: pw.new_ })
        })
        const data = await res.json()
        setSavingPw(false)
        if (!res.ok || data.error) {
          setToast(`❌ ${data.error || 'فشلت عملية تغيير كلمة المرور.'}`)
          return
        }
        setToast('✓ تم تغيير كلمة المرور')
        setPw({old:'',new_:'',confirm:''})
      } catch (err) {
        setSavingPw(false)
        setToast('❌ حدث خطأ أثناء الاتصال بالخادم. يرجى المحاولة لاحقاً.')
      }
    }
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6" style={{fontFamily:'var(--font-arabic)'}}>
        <div className="card p-5 space-y-4">
          <h3 className="font-semibold text-sm" style={{color:'var(--color-text-primary)'}}>معلومات المتجر</h3>
          <div>
            <label className="block text-xs mb-1" style={{color:'var(--color-text-muted)'}}>اسم المتجر</label>
            <div className="flex gap-2">
              <input className="input text-sm flex-1" defaultValue={storeName} readOnly/>
              <button onClick={() => { navigator.clipboard.writeText(storeName); setToast('✓ تم نسخ الاسم') }} className="btn btn-sm" style={{border:'1px solid var(--color-border)',background:'#fff'}}>
                <Copy size={12}/>
              </button>
            </div>
          </div>
          <div><label className="block text-xs mb-1" style={{color:'var(--color-text-muted)'}}>الخطة الحالية</label>
            <input className="input text-sm" value={plan.toUpperCase()} readOnly/>
          </div>
          <a href="/settings" className="btn btn-sm w-full justify-center gap-1.5" style={{background:'var(--color-accent)',color:'#fff'}}>⚙️ إعدادات المتجر الكاملة ↗</a>
        </div>
        <div className="card p-5 space-y-4">
          <h3 className="font-semibold text-sm" style={{color:'var(--color-text-primary)'}}>تغيير كلمة المرور</h3>
          {[{l:'كلمة المرور الجديدة',k:'new_'},{l:'تأكيد كلمة المرور',k:'confirm'}].map(f => (
            <div key={f.k}>
              <label className="block text-xs mb-1" style={{color:'var(--color-text-muted)'}}>{f.l}</label>
              <div className="relative">
                <input type={showPw ? 'text' : 'password'} className="input text-sm h-9 w-full pr-9"
                  value={(pw as any)[f.k]} onChange={e=>setPw(p=>({...p,[f.k]:e.target.value}))} placeholder="••••••••"/>
                <button onClick={()=>setShowPw(v=>!v)} className="absolute left-2 top-1/2 -translate-y-1/2 text-xs" style={{color:'var(--color-text-muted)'}}>
                  {showPw ? '🙈' : '👁'}
                </button>
              </div>
            </div>
          ))}
          <button onClick={changePassword} disabled={savingPw || !pw.new_ || !pw.confirm} className="btn btn-primary btn-sm w-full gap-1.5">
            {savingPw ? 'جارٍ الحفظ...' : '✓ تغيير كلمة المرور'}
          </button>
        </div>
      </div>
    )
  }

  const renderSettings = () => {
    const sTabs = ['معلومات المستخدم','الدفع']
    return (
      <div>
        <TabBar tabs={sTabs} active={settingsTab} onChange={setSettingsTab}/>
        {settingsTab === 0 && <SettingsContent />}
        {settingsTab === 1 && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {[
                {l:'إجمالي الإيرادات', v:`${totalRevenue.toLocaleString('ar-DZ')} دج`, color:'var(--color-accent)'},
                {l:'طلبات مسلمة',       v:String(delivered.length),                     color:'#22C55E'},
                {l:'طلبات مؤكدة',       v:String(confirmedArr.length),                  color:'#3CC6B9'},
                {l:'الخطة الحالية',     v:plan.toUpperCase(),                           color:'#9D76C1'},
              ].map(({l,v,color}) => (
                <div key={l} className="card p-4 text-center">
                  <p className="font-bold text-lg" style={{color,fontFamily:'var(--font-primary)'}}>{v}</p>
                  <p className="text-xs mt-0.5" style={{color:'var(--color-text-muted)',fontFamily:'var(--font-arabic)'}}>{l}</p>
                </div>
              ))}
            </div>
            <div className="card p-5">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-sm" style={{fontFamily:'var(--font-arabic)'}}>تاريخ المدفوعات</h3>
                <a href="/billing/plans" className="btn btn-primary btn-sm" style={{fontFamily:'var(--font-arabic)'}}>ترقية الخطة ↗</a>
              </div>
              <table className="data-table">
                <thead><tr>{['التاريخ','المبلغ','الحالة'].map(h=><th key={h}>{h}</th>)}</tr></thead>
                <tbody>
                  <tr><td colSpan={3} className="text-center py-8 text-sm" style={{color:'var(--color-text-muted)'}}>لا توجد مدفوعات</td></tr>
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    )
  }

  const renderTutorials = () => {
    const filtered = TUTORIALS.filter(t => !tutSearch || t.title.includes(tutSearch))
    return (
      <div className="space-y-4">
        <div className="relative max-w-xs">
          <Search size={13} className="absolute right-3 top-1/2 -translate-y-1/2" style={{color:'var(--color-text-muted)'}}/>
          <input value={tutSearch} onChange={e=>setTutSearch(e.target.value)} placeholder="ابحث عن درس..." className="input pr-8 text-sm h-9"/>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
          {filtered.map(v => (
            <div key={v.n} className="card overflow-hidden hover:shadow-md transition-shadow cursor-pointer">
              <div className="aspect-video flex items-center justify-center" style={{background:'#111'}}>
                <div className="text-center">
                  <div className="w-10 h-10 bg-red-600 rounded-full flex items-center justify-center mx-auto mb-1.5">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="white"><path d="M8 5v14l11-7z"/></svg>
                  </div>
                  <p className="text-white/60 text-xs">{v.n}</p>
                </div>
              </div>
              <div className="p-3">
                <p className="font-medium text-sm" style={{fontFamily:'var(--font-arabic)',color:'var(--color-text-primary)'}}>{v.title}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    )
  }

  const SECTION_RENDERERS: Record<string, () => React.ReactNode> = {
    statistics:        renderStatistics,
    orders:            renderOrders,
    tracking:          renderTracking,
    validation:        renderValidation,
    products:          renderProducts,
    delivery:          renderDelivery,
    'store-integration': renderStoreIntegration,
    finances:          renderFinances,
    team:              renderTeam,
    settings:          renderSettings,
    tutorials:         renderTutorials,
    ai: () => (
      <div className="space-y-6">
        <div className="flex flex-col items-center justify-center py-16 rounded-2xl border-2 border-dashed" style={{borderColor:'var(--color-border)'}}>
          <div className="w-20 h-20 rounded-2xl flex items-center justify-center mb-6" style={{background:'linear-gradient(135deg,#EEE5FF,#E0F5F2)'}}>
            <Bot size={36} style={{color:'var(--color-accent)'}}/>
          </div>
          <p className="font-black text-xl mb-2" style={{color:'var(--color-text-primary)'}}>الذكاء الاصطناعي 🤖</p>
          <p className="text-sm mb-4" style={{color:'var(--color-text-muted)'}}>ردود تلقائية بالدارجة الجزائرية — قريباً</p>
          <div className="grid grid-cols-3 gap-4 max-w-lg mt-4">
            {['ردود WhatsApp تلقائية','تحليل أسباب الإلغاء','توقع الطلبيات'].map(f => (
              <div key={f} className="p-3 rounded-xl text-center" style={{background:'var(--color-bg-soft)'}}>
                <p className="text-xs font-medium" style={{color:'var(--color-text-secondary)'}}>{f}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    ),
    qr: () => {
      const scanOrder = async (code: string) => {
        const found = localOrders.find(o => o.order_number === code || o.tracking_number === code)
        if (found) {
          setQrResult(`✅ طلبية موجودة — ${found.customer_name} — ${statusLabel(found.status, lang)}`)
        } else {
          setQrResult(`❌ لا توجد طلبية بهذا الرمز: ${code}`)
        }
      }
      return (
        <div className="flex flex-col items-center justify-center py-10 gap-5" dir="rtl">
          <QRScanner onScan={scanOrder}/>
          {/* Manual code entry (for barcode scanners that type) */}
          <div className="w-72 space-y-2">
            <p className="text-xs text-center" style={{color:'var(--color-text-muted)',fontFamily:'var(--font-arabic)'}}>أو أدخل رقم الطلبية / التتبع يدوياً</p>
            <div className="flex gap-2">
              <input id="qr-input" dir="ltr" placeholder="ORD-xxxx / SD-xxxx"
                className="input text-sm flex-1 h-9"
                onKeyDown={e => { if (e.key === 'Enter') { scanOrder((e.target as HTMLInputElement).value.trim()); (e.target as HTMLInputElement).value = '' } }}
              />
              <button className="btn btn-primary btn-sm" onClick={() => {
                const el = document.getElementById('qr-input') as HTMLInputElement
                if (el?.value) { scanOrder(el.value.trim()); el.value = '' }
              }}>بحث</button>
            </div>
          </div>
          <div className="card p-4 text-center w-72" style={{minHeight:56}}>
            <p className="text-sm font-medium" style={{fontFamily:'var(--font-arabic)',color: qrResult?.startsWith('✅') ? '#198754' : qrResult?.startsWith('❌') ? '#DC3545' : 'var(--color-text-muted)'}}>
              {qrResult ?? 'النتيجة: لا توجد نتيجة بعد!'}
            </p>
          </div>
        </div>
      )
    },
  }

  // ── ORDER HISTORY MODAL ─────────────────────────────────
  const HistoryModal = () => {
    if (!historyModal) return null
    const STATUS_AR: Record<string, string> = {
      new:'جديد', confirmed:'مؤكدة', cancelled:'ملغاة', delivered:'مسلمة',
      processing:'يُعالج', shipped:'شُحن', returned:'مرجعة', failed:'فاشل',
      failed_1:'فاشلة 01', failed_2:'فاشلة 02', failed_3:'فاشلة 03',
      postponed:'مؤجلة', duplicate:'مكررة', null:'—',
    }
    return (
      <>
        <div className="fixed inset-0 bg-black/60 z-50" onClick={() => setHistoryModal(null)}/>
        <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-md bg-white rounded-2xl shadow-2xl z-50 overflow-hidden"
          dir={lang === 'ar' ? 'rtl' : 'ltr'}>
          <div className="flex items-center justify-between p-4 border-b" style={{borderColor:'var(--color-border)'}}>
            <h3 className="font-bold text-sm" style={{color:'var(--color-text-primary)'}}>{t('order_history')} — {historyModal.orderNum}</h3>
            <button onClick={() => setHistoryModal(null)} className="p-1.5 rounded hover:bg-[#F8F9FA]"><X size={16}/></button>
          </div>
          <div className="p-4 max-h-80 overflow-y-auto">
            {loadingHistory ? (
              <div className="text-center py-8 text-sm" style={{color:'var(--color-text-muted)'}}>جارٍ التحميل...</div>
            ) : orderHistory.length === 0 ? (
              <div className="text-center py-8 text-sm" style={{color:'var(--color-text-muted)'}}>{t('no_history')}</div>
            ) : (
              <div className="space-y-0">
                {orderHistory.map((h, i) => (
                  <div key={h.id} className="flex gap-3">
                    <div className="flex flex-col items-center">
                      <div className="w-3 h-3 rounded-full mt-1 flex-shrink-0" style={{background:'var(--color-accent)'}}/>
                      {i < orderHistory.length - 1 && <div className="w-0.5 flex-1 mt-1" style={{background:'var(--color-border)'}}/>}
                    </div>
                    <div className="pb-4 min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        {h.old_status && <span className="text-xs px-1.5 py-0.5 rounded" style={{background:'#F1F3F5',color:'#495057'}}>{STATUS_AR[h.old_status] ?? h.old_status}</span>}
                        {h.old_status && <span className="text-xs" style={{color:'var(--color-text-muted)'}}>→</span>}
                        <span className="text-xs font-semibold px-1.5 py-0.5 rounded" style={{background:'var(--color-accent-soft)',color:'var(--color-accent)'}}>{STATUS_AR[h.new_status] ?? h.new_status}</span>
                      </div>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-[10px]" style={{color:'var(--color-text-muted)'}}>
                          {new Date(h.created_at).toLocaleString('ar-DZ', {weekday:'short',day:'numeric',month:'short',hour:'2-digit',minute:'2-digit'})}
                        </span>
                        <span className="text-[10px]" style={{color:'var(--color-text-muted)'}}>· {h.changed_by}</span>
                      </div>
                      {h.notes && <p className="text-xs mt-0.5" style={{color:'var(--color-text-secondary)'}}>{h.notes}</p>}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </>
    )
  }

  return (
    <div className="confirmili-theme flex h-full" dir={lang === 'ar' ? 'rtl' : 'ltr'} onClick={() => actionMenu && setActionMenu(null)}>
      {/* ── Right-edge vertical icon sidebar ───────────────── */}
      <aside className="cf-sidebar">
        <a href="/dashboard" title="العودة إلى لوحة Commerco"
          className="w-10 h-10 rounded-xl flex items-center justify-center mb-2 flex-shrink-0 transition-transform hover:scale-105" style={{background:'var(--cf-turq)',color:'#00414D',fontWeight:800,fontSize:18}}>C</a>
        {TABS.map(tab => {
          const newCount = tab.id === 'orders' ? localOrders.filter(o=>o.status==='new'&&!trashedOrders.has(o.id)).length : 0
          return (
            <button key={tab.id} onClick={() => setActiveTab(tab.id)} title={tab.label}
              className={`cf-side-btn ${activeTab === tab.id ? 'active' : ''}`}>
              <tab.icon size={19}/>
              {newCount > 0 && (
                <span className="absolute -top-0.5 -left-0.5 min-w-[16px] h-4 px-1 rounded-full text-[9px] font-bold text-white flex items-center justify-center" style={{background:'#DC2626'}}>{newCount}</span>
              )}
            </button>
          )
        })}
        <a href="https://wa.me/213555000000?text=مرحبا، أحتاج دعم في Confirmili" target="_blank" rel="noopener noreferrer"
          title="الدعم" className="mt-auto w-11 h-11 rounded-full flex items-center justify-center flex-shrink-0 transition-transform hover:scale-110" style={{background:'#22C55E',color:'#fff'}}>
          <Headphones size={19}/>
        </a>
      </aside>

      {/* ── Main column ────────────────────────────────────── */}
      <div className="flex flex-col flex-1 min-w-0 h-full overflow-hidden">
      {/* HistoryModal */}
      <HistoryModal />

      {/* Toast */}
      {toast && (
        <div className="fixed bottom-6 right-6 z-[60] px-4 py-2.5 rounded-xl shadow-xl text-sm font-medium text-white animate-scale-in"
          style={{ background:'#212529', fontFamily:'var(--font-arabic)' }}>
          {toast}
        </div>
      )}

      {/* Verify modal (8.8) — blacklist across all orders by phone */}
      {verifyModal && (() => {
        const phone = verifyModal.customer_phone
        const same = localOrders.filter(x => x.customer_phone === phone)
        const delivered = same.filter(x => x.status === 'delivered').length
        const returned  = same.filter(x => ['returned','cancelled','failed_1','failed_2','failed_3'].includes(x.status)).length
        const denom = delivered + returned
        const risk = denom > 0 ? Math.round(returned / denom * 100) : 0
        const masked = phone ? phone.slice(0,4) + '****' + phone.slice(-2) : '—'
        return (
          <>
            <div className="fixed inset-0 bg-black/60 z-50" onClick={() => setVerifyModal(null)}/>
            <div className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-[340px] bg-white rounded-2xl shadow-2xl overflow-hidden" dir="rtl">
              <div className="flex items-center justify-between px-5 py-3 border-b" style={{borderColor:'var(--color-border)'}}>
                <h3 className="font-bold text-sm" style={{color:'var(--color-text-primary)',fontFamily:'var(--font-arabic)'}}>التحقق من العميل</h3>
                <button onClick={() => setVerifyModal(null)} className="p-1.5 rounded hover:bg-[#F8F9FA]"><X size={16}/></button>
              </div>
              <div className="p-5 space-y-4 text-center" style={{fontFamily:'var(--font-arabic)'}}>
                <div className="w-14 h-14 rounded-full mx-auto flex items-center justify-center" style={{background:'#E0F5F2'}}>
                  <Package size={26} style={{color:'#3CC6B9'}}/>
                </div>
                <div>
                  <p className="font-bold text-sm" style={{color:'var(--color-text-primary)'}}>{verifyModal.customer_name}</p>
                  <p className="text-xs font-mono" style={{color:'var(--color-text-muted)'}}>{masked}</p>
                  <p className="text-xs mt-0.5" style={{color:'var(--color-text-muted)'}}>{(verifyModal.wilaya as any)?.name_ar ?? ''}</p>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="rounded-xl p-3" style={{background:'#D1E7DD'}}>
                    <p className="text-2xl font-black" style={{color:'#198754',fontFamily:'var(--font-primary)'}}>{delivered}</p>
                    <p className="text-xs" style={{color:'#198754'}}>تم التسليم</p>
                  </div>
                  <div className="rounded-xl p-3" style={{background:'#F8D7DA'}}>
                    <p className="text-2xl font-black" style={{color:'#DC3545',fontFamily:'var(--font-primary)'}}>{returned}</p>
                    <p className="text-xs" style={{color:'#DC3545'}}>مرتجع / فاشل</p>
                  </div>
                </div>
                {/* Risk gauge */}
                <div>
                  <div className="flex items-center justify-between text-xs mb-1">
                    <span style={{color:'var(--color-text-muted)'}}>نسبة الخطورة</span>
                    <span className="font-bold" style={{color: risk >= 50 ? '#DC3545' : risk >= 25 ? '#FFA447' : '#198754'}}>{risk}%</span>
                  </div>
                  <div className="h-2 rounded-full overflow-hidden" style={{background:'#F1F3F5'}}>
                    <div className="h-full rounded-full transition-all" style={{width:`${risk}%`, background: risk >= 50 ? '#DC3545' : risk >= 25 ? '#FFA447' : '#198754'}}/>
                  </div>
                  <p className="text-[11px] mt-2" style={{color:'var(--color-text-muted)'}}>
                    إجمالي {same.length} طلبية بهذا الرقم
                  </p>
                </div>
              </div>
            </div>
          </>
        )
      })()}

      {/* Team member form modal */}
      {teamForm && (
        <>
          <div className="fixed inset-0 bg-black/60 z-50" onClick={() => setTeamForm(null)}/>
          <div className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-[360px] bg-white rounded-2xl shadow-2xl overflow-hidden" dir="rtl">
            <div className="flex items-center justify-between px-5 py-3 border-b" style={{borderColor:'var(--color-border)'}}>
              <h3 className="font-bold text-sm" style={{fontFamily:'var(--font-arabic)'}}>{teamForm.id ? 'تعديل عضو' : 'إضافة عضو'}</h3>
              <button onClick={() => setTeamForm(null)} className="p-1.5 rounded hover:bg-[#F8F9FA]"><X size={16}/></button>
            </div>
            <div className="p-5 space-y-3" style={{fontFamily:'var(--font-arabic)'}}>
              <input className="input text-sm w-full" placeholder="الاسم *" value={teamForm.name ?? ''} onChange={e=>setTeamForm((f:any)=>({...f,name:e.target.value}))}/>
              <input className="input text-sm w-full" placeholder="الهاتف" dir="ltr" value={teamForm.phone ?? ''} onChange={e=>setTeamForm((f:any)=>({...f,phone:e.target.value}))}/>
              <input className="input text-sm w-full" placeholder="البريد الإلكتروني" dir="ltr" value={teamForm.email ?? ''} onChange={e=>setTeamForm((f:any)=>({...f,email:e.target.value}))}/>
              <select className="input text-sm w-full" value={teamForm.role ?? 'confirmer'} onChange={e=>setTeamForm((f:any)=>({...f,role:e.target.value}))}>
                <option value="confirmer">عضو تأكيد</option>
                <option value="delivery">عضو توصيل</option>
                <option value="manager">مسير</option>
              </select>
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={teamForm.is_active ?? true} onChange={e=>setTeamForm((f:any)=>({...f,is_active:e.target.checked}))} className="w-4 h-4 accent-[#3CC6B9]"/>
                نشط
              </label>
              <div className="flex gap-2 pt-1">
                <button onClick={saveTeamMember} disabled={!teamForm.name} className="btn btn-primary btn-sm flex-1">حفظ</button>
                <button onClick={() => setTeamForm(null)} className="btn btn-sm flex-1" style={{border:'1px solid var(--color-border)'}}>إلغاء</button>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Delivery company form modal */}
      {companyForm && (
        <>
          <div className="fixed inset-0 bg-black/60 z-50" onClick={() => setCompanyForm(null)}/>
          <div className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-[360px] bg-white rounded-2xl shadow-2xl overflow-hidden" dir="rtl">
            <div className="flex items-center justify-between px-5 py-3 border-b" style={{borderColor:'var(--color-border)'}}>
              <h3 className="font-bold text-sm" style={{fontFamily:'var(--font-arabic)'}}>{companyForm.id ? 'تعديل شركة' : 'إضافة شركة توصيل'}</h3>
              <button onClick={() => setCompanyForm(null)} className="p-1.5 rounded hover:bg-[#F8F9FA]"><X size={16}/></button>
            </div>
            <div className="p-5 space-y-3" style={{fontFamily:'var(--font-arabic)'}}>
              <input className="input text-sm w-full" placeholder="اسم الشركة *" value={companyForm.name ?? ''} onChange={e=>setCompanyForm((f:any)=>({...f,name:e.target.value}))}/>
              <input className="input text-sm w-full" placeholder="الاختصار (مثل ZR)" dir="ltr" value={companyForm.short_name ?? ''} onChange={e=>setCompanyForm((f:any)=>({...f,short_name:e.target.value}))}/>
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={companyForm.is_automatic ?? false} onChange={e=>setCompanyForm((f:any)=>({...f,is_automatic:e.target.checked}))} className="w-4 h-4 accent-[#3CC6B9]"/>
                إرسال تلقائي عند التأكيد
              </label>
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={companyForm.is_active ?? true} onChange={e=>setCompanyForm((f:any)=>({...f,is_active:e.target.checked}))} className="w-4 h-4 accent-[#3CC6B9]"/>
                مفعّلة
              </label>
              <div className="flex gap-2 pt-1">
                <button onClick={saveCompany} disabled={!companyForm.name} className="btn btn-primary btn-sm flex-1">حفظ</button>
                <button onClick={() => setCompanyForm(null)} className="btn btn-sm flex-1" style={{border:'1px solid var(--color-border)'}}>إلغاء</button>
              </div>
            </div>
          </div>
        </>
      )}

      {/* ── PRODUCT FORM MODAL ──────────────────────────────── */}
      {prodForm && (
        <>
          <div className="fixed inset-0 bg-black/60 z-50" onClick={()=>setProdForm(null)}/>
          <div className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-[380px] bg-white rounded-2xl shadow-2xl overflow-hidden" dir="rtl">
            <div className="flex items-center justify-between px-5 py-3 border-b" style={{borderColor:'var(--color-border)'}}>
              <h3 className="font-bold text-sm">تعديل منتج</h3>
              <button onClick={()=>setProdForm(null)} className="p-1.5 rounded hover:bg-[#F8F9FA]"><X size={16}/></button>
            </div>
            <div className="p-5 space-y-3" style={{fontFamily:'var(--font-arabic)'}}>
              <input className="input text-sm w-full" placeholder="الاسم بالعربية *" value={prodForm.name_ar??''} onChange={e=>setProdForm((f:any)=>({...f,name_ar:e.target.value,name:e.target.value}))}/>
              <div className="grid grid-cols-2 gap-3">
                <input className="input text-sm" placeholder="السعر دج" type="number" value={prodForm.price??''} onChange={e=>setProdForm((f:any)=>({...f,price:+e.target.value}))}/>
                <input className="input text-sm" placeholder="المرجع SKU" dir="ltr" value={prodForm.sku??''} onChange={e=>setProdForm((f:any)=>({...f,sku:e.target.value}))}/>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <input className="input text-sm" placeholder="حد التنبيه للمخزون" type="number" value={prodForm.min_stock_alert??5} onChange={e=>setProdForm((f:any)=>({...f,min_stock_alert:+e.target.value}))}/>
                <label className="flex items-center gap-2 text-sm cursor-pointer">
                  <input type="checkbox" checked={prodForm.confirmili_is_known??true} onChange={e=>setProdForm((f:any)=>({...f,confirmili_is_known:e.target.checked}))} className="w-4 h-4 accent-[#3CC6B9]"/>
                  معروف؟
                </label>
              </div>
              <textarea className="input text-sm w-full" placeholder="ملاحظة لفريق العمل" rows={2} value={prodForm.confirmili_team_note??''} onChange={e=>setProdForm((f:any)=>({...f,confirmili_team_note:e.target.value}))}/>
              <div className="flex gap-2 pt-1">
                <button onClick={saveProd} disabled={!prodForm.name_ar&&!prodForm.name} className="btn btn-primary btn-sm flex-1">حفظ</button>
                <button onClick={()=>setProdForm(null)} className="btn btn-sm flex-1" style={{border:'1px solid var(--color-border)'}}>إلغاء</button>
              </div>
            </div>
          </div>
        </>
      )}

      {/* ── COLUMN SETTINGS MODAL ──────────────────────────── */}
      {showColSettings && (() => {
        const COLS = [
          {key:'source',label:'المصدر'},{key:'order_number',label:'ر.الطلبية'},
          {key:'date',label:'التاريخ'},{key:'name',label:'الاسم'},{key:'phone',label:'الهاتف'},
          {key:'verify',label:'تحقق'},{key:'status',label:'الحالة'},{key:'wilaya',label:'الولاية'},
          {key:'commune',label:'البلدية'},{key:'product',label:'المنتج'},{key:'total',label:'السعر الكلي'},
          {key:'delivery_type',label:'نوع التوصيل'},{key:'delivery_fee',label:'س.التوصيل'},
          {key:'notes',label:'ملاحظات'},{key:'call_attempts',label:'محاولات الاتصال'},{key:'actions',label:'الإجراءات'},
        ]
        const tempCols = new Set(visibleCols)
        return (
          <>
            <div className="fixed inset-0 bg-black/60 z-50" onClick={()=>setShowColSettings(false)}/>
            <div className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-[420px] bg-white rounded-2xl shadow-2xl overflow-hidden" dir="rtl">
              <div className="flex items-center justify-between px-5 py-3 border-b" style={{borderColor:'var(--color-border)'}}>
                <h3 className="font-bold text-sm">إعدادات الأعمدة</h3>
                <button onClick={()=>setShowColSettings(false)} className="p-1.5 rounded hover:bg-[#F8F9FA]"><X size={16}/></button>
              </div>
              <div className="p-5">
                <div className="grid grid-cols-2 gap-2 mb-4">
                  {COLS.map(c => (
                    <label key={c.key} className="flex items-center gap-2 text-sm cursor-pointer">
                      <input type="checkbox" defaultChecked={tempCols.has(c.key)}
                        onChange={e => { e.target.checked ? tempCols.add(c.key) : tempCols.delete(c.key) }}
                        className="w-3.5 h-3.5 accent-[#3CC6B9]"/>
                      {c.label}
                    </label>
                  ))}
                </div>
                <div className="flex gap-2">
                  <button onClick={()=>saveColSettings(new Set(tempCols))} className="btn btn-primary btn-sm flex-1">حفظ</button>
                  <button onClick={()=>{setVisibleCols(new Set(DEFAULT_COLS));setShowColSettings(false);localStorage.removeItem('confirmili_cols')}} className="btn btn-sm flex-1" style={{border:'1px solid var(--color-border)'}}>إعادة تعيين</button>
                  <button onClick={()=>setShowColSettings(false)} className="btn btn-sm" style={{border:'1px solid var(--color-border)'}}>إلغاء</button>
                </div>
              </div>
            </div>
          </>
        )
      })()}

      {/* ── MANUAL ORDER MODAL ─────────────────────────────── */}
      {showManual && (
        <>
          <div className="fixed inset-0 bg-black/60 z-50" onClick={()=>setShowManual(false)}/>
          <div className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-[400px] bg-white rounded-2xl shadow-2xl overflow-hidden" dir="rtl">
            <div className="flex items-center justify-between px-5 py-3 border-b" style={{borderColor:'var(--color-border)'}}>
              <h3 className="font-bold text-sm">إنشاء طلبية يدوية</h3>
              <button onClick={()=>setShowManual(false)} className="p-1.5 rounded hover:bg-[#F8F9FA]"><X size={16}/></button>
            </div>
            <div className="p-5 space-y-3" style={{fontFamily:'var(--font-arabic)'}}>
              <input className="input text-sm w-full" placeholder="الاسم الكامل *" value={manualForm.customer_name??''} onChange={e=>setManualForm((f:any)=>({...f,customer_name:e.target.value}))}/>
              <input className="input text-sm w-full" placeholder="رقم الهاتف *" dir="ltr" value={manualForm.customer_phone??''} onChange={e=>setManualForm((f:any)=>({...f,customer_phone:e.target.value}))}/>
              <select className="input text-sm w-full" value={manualForm.delivery_type??'home'} onChange={e=>setManualForm((f:any)=>({...f,delivery_type:e.target.value}))}>
                <option value="home">توصيل للمنزل</option>
                <option value="stopdesk">نقطة توزيع</option>
              </select>
              <select className="input text-sm w-full" value={manualForm.product_id??''} onChange={e=>setManualForm((f:any)=>({...f,product_id:e.target.value}))}>
                <option value="">اختر منتج (اختياري)</option>
                {prodList.map(p=><option key={p.id} value={p.id}>{p.name_ar??p.name} — {p.price?.toLocaleString('ar-DZ')} دج</option>)}
              </select>
              {manualForm.product_id && (
                <input className="input text-sm w-full" placeholder="الكمية" type="number" min="1" value={manualForm.qty??1} onChange={e=>setManualForm((f:any)=>({...f,qty:+e.target.value}))}/>
              )}
              <textarea className="input text-sm w-full" placeholder="ملاحظات" rows={2} value={manualForm.notes??''} onChange={e=>setManualForm((f:any)=>({...f,notes:e.target.value}))}/>
              <div className="flex gap-2 pt-1">
                <button onClick={saveManualOrder} disabled={savingManual||!manualForm.customer_name||!manualForm.customer_phone} className="btn btn-primary btn-sm flex-1">
                  {savingManual ? 'جارٍ الحفظ...' : 'إنشاء الطلبية'}
                </button>
                <button onClick={()=>setShowManual(false)} className="btn btn-sm flex-1" style={{border:'1px solid var(--color-border)'}}>إلغاء</button>
              </div>
            </div>
          </div>
        </>
      )}

      {/* ── SEND REPORT MODAL ──────────────────────────────── */}
      {showSendReport && (
        <>
          <div className="fixed inset-0 bg-black/60 z-50" onClick={()=>setShowSendReport(false)}/>
          <div className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-[480px] max-h-[80vh] bg-white rounded-2xl shadow-2xl overflow-hidden flex flex-col" dir="rtl">
            <div className="flex items-center justify-between px-5 py-3 border-b flex-shrink-0" style={{borderColor:'var(--color-border)'}}>
              <h3 className="font-bold text-sm">تقرير الإرسال</h3>
              <button onClick={()=>setShowSendReport(false)} className="p-1.5 rounded hover:bg-[#F8F9FA]"><X size={16}/></button>
            </div>
            <div className="overflow-auto p-4 space-y-3 flex-1">
              <div className="grid grid-cols-2 gap-3">
                {[
                  {label:'إجمالي الإرسال', v:String(sendReports.length), color:'var(--color-accent)'},
                  {label:'ناجح',v:String(sendReports.filter(r=>r.status==='sent').length),color:'#22C55E'},
                  {label:'فاشل',v:String(sendReports.filter(r=>r.status==='failed').length),color:'#E23024'},
                  {label:'تلقائي',v:String(sendReports.filter(r=>r.is_auto).length),color:'#9D76C1'},
                ].map(c => (
                  <div key={c.label} className="rounded-xl p-3 text-center" style={{background:'var(--color-bg-soft)'}}>
                    <p className="font-black text-lg" style={{color:c.color,fontFamily:'var(--font-primary)'}}>{c.v}</p>
                    <p className="text-xs" style={{color:'var(--color-text-muted)'}}>{c.label}</p>
                  </div>
                ))}
              </div>
              {sendReports.length === 0
                ? <p className="text-center py-8 text-sm" style={{color:'var(--color-text-muted)'}}>لا توجد تقارير إرسال</p>
                : sendReports.map(r => (
                  <div key={r.id} className="flex items-center gap-3 p-3 rounded-xl border" style={{borderColor:'var(--color-border)'}}>
                    <span className="w-2 h-2 rounded-full flex-shrink-0" style={{background:r.status==='sent'?'#22C55E':'#E23024'}}/>
                    <div className="flex-1 min-w-0">
                      <p className="font-mono text-xs" style={{color:'var(--color-accent)'}}>{r.tracking_num ?? '—'}</p>
                      <p className="text-[10px]" style={{color:'var(--color-text-muted)'}}>{r.is_auto ? '⚡ تلقائي' : '✋ يدوي'} · {new Date(r.sent_at).toLocaleString('ar-DZ')}</p>
                    </div>
                    <span className="text-[10px] px-2 py-0.5 rounded-full font-semibold" style={{background:r.status==='sent'?'#D1E7DD':'#F8D7DA',color:r.status==='sent'?'#198754':'#DC3545'}}>
                      {r.status === 'sent' ? 'نجح' : 'فشل'}
                    </span>
                  </div>
                ))}
            </div>
          </div>
        </>
      )}

      {/* ── INTEGRATION FORM MODAL ─────────────────────────── */}
      {integForm && (
        <>
          <div className="fixed inset-0 bg-black/60 z-50" onClick={()=>setIntegForm(null)}/>
          <div className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-[360px] bg-white rounded-2xl shadow-2xl overflow-hidden" dir="rtl">
            <div className="flex items-center justify-between px-5 py-3 border-b" style={{borderColor:'var(--color-border)'}}>
              <h3 className="font-bold text-sm">{integForm.id ? 'تعديل التكامل' : 'إضافة تكامل'}</h3>
              <button onClick={()=>setIntegForm(null)} className="p-1.5 rounded hover:bg-[#F8F9FA]"><X size={16}/></button>
            </div>
            <div className="p-5 space-y-3" style={{fontFamily:'var(--font-arabic)'}}>
              <input className="input text-sm w-full" placeholder="الاسم *" value={integForm.name??''} onChange={e=>setIntegForm((f:any)=>({...f,name:e.target.value}))}/>
              <select className="input text-sm w-full" value={integForm.platform??'youcan'} onChange={e=>setIntegForm((f:any)=>({...f,platform:e.target.value}))}>
                <option value="youcan">YouCan</option>
                <option value="shopify">Shopify</option>
                <option value="woocommerce">WooCommerce</option>
                <option value="google_sheet">Google Sheet</option>
              </select>
              {integForm.platform === 'google_sheet' && (
                <input className="input text-sm w-full" placeholder="رابط الشيت" dir="ltr" value={integForm.config?.url??''} onChange={e=>setIntegForm((f:any)=>({...f,config:{...f.config,url:e.target.value}}))}/>
              )}
              <div className="flex gap-2 pt-1">
                <button onClick={saveIntegration} disabled={!integForm.name} className="btn btn-primary btn-sm flex-1">حفظ</button>
                <button onClick={()=>setIntegForm(null)} className="btn btn-sm flex-1" style={{border:'1px solid var(--color-border)'}}>إلغاء</button>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Floating support button (9.5) */}
      <a href="https://wa.me/213555000000?text=مرحبا، أحتاج دعم في Confirmili" target="_blank" rel="noopener noreferrer"
        className="fixed bottom-6 left-6 z-50 w-12 h-12 rounded-full flex items-center justify-center shadow-xl transition-transform hover:scale-110"
        style={{background:'#25D366',color:'#fff'}}
        title="دعم Confirmili">
        <Headphones size={22}/>
      </a>

      {/* Feature banner — deep teal */}
      <div className="flex items-center justify-center gap-3 px-4 py-2 text-white text-xs" style={{background:'var(--cf-teal)',fontFamily:'var(--font-arabic)'}}>
        <span>📦 تقرير الإرسال متاح الآن — Confirmili إدارة الطلبات الاحترافية</span>
        <button onClick={() => { setActiveTab('tutorials') }} className="flex items-center gap-1 underline font-semibold flex-shrink-0">
          <Video size={12}/>الفيديو
        </button>
      </div>

      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2.5 border-b bg-white flex-wrap gap-2" style={{borderColor:'var(--color-border)'}}>
        <div className="flex items-center gap-3">
          <div className="relative">
            <button onClick={e=>{e.stopPropagation();setNotifOpen(o=>!o)}} className="relative p-1.5 rounded-md hover:bg-[#F8F9FA] transition-colors">
              <Bell size={16} style={{color:'var(--color-text-secondary)'}}/>
              {(unreadCount > 0 || localOrders.filter(o=>o.status==='new'&&!trashedOrders.has(o.id)).length > 0) && (
                <span className="absolute top-0.5 right-0.5 w-4 h-4 rounded-full text-[9px] font-bold text-white flex items-center justify-center" style={{background:'var(--color-error)'}}>
                  {Math.max(unreadCount, localOrders.filter(o=>o.status==='new'&&!trashedOrders.has(o.id)).length)}
                </span>
              )}
            </button>
            {notifOpen && (
              <>
                <div className="fixed inset-0 z-10" onClick={()=>setNotifOpen(false)}/>
                <div className="absolute top-full mt-1 right-0 w-72 bg-white border rounded-xl shadow-lg z-20 overflow-hidden" style={{borderColor:'var(--color-border)'}}>
                  {/* 3 tabs: الكل / تنبيه المخزون / طلبات */}
                  <div className="flex border-b" style={{borderColor:'var(--color-border)'}}>
                    {[
                      {label:'الكل', count: notifications.filter(n=>!n.is_read).length},
                      {label:'المخزون', count: notifications.filter(n=>n.type==='stock'&&!n.is_read).length},
                      {label:'طلبات', count: notifications.filter(n=>n.type==='order'&&!n.is_read).length},
                    ].map(({label,count},i)=>(
                      <button key={label} onClick={()=>setNotifTab(i)}
                        className={`flex-1 py-2.5 text-xs font-medium flex items-center justify-center gap-1 ${notifTab===i?'text-[#3CC6B9] border-b-2 border-[#3CC6B9]':'text-[#868E96]'}`}>
                        {label}
                        {count > 0 && <span className="w-4 h-4 rounded-full text-[8px] font-bold text-white flex items-center justify-center" style={{background:'#3CC6B9'}}>{count}</span>}
                      </button>
                    ))}
                  </div>
                  <div className="p-2 space-y-1 max-h-60 overflow-y-auto">
                    {(() => {
                      const filtered = notifTab === 0 ? notifications
                        : notifTab === 1 ? notifications.filter(n=>n.type==='stock')
                        : notifications.filter(n=>n.type==='order')
                      if (filtered.length === 0) return (
                        <p className="text-center text-xs py-6" style={{color:'var(--color-text-muted)'}}>
                          {notifTab === 1 ? 'لا توجد تنبيهات مخزون' : notifTab === 2 ? 'لا توجد طلبات جديدة' : 'لا توجد إشعارات'}
                        </p>
                      )
                      return filtered.map(n => (
                        <div key={n.id} className="flex items-start gap-2 p-2 rounded-lg hover:bg-[#F8F9FA] transition-colors">
                          <span className="w-1.5 h-1.5 rounded-full mt-1.5 flex-shrink-0" style={{background: n.is_read ? '#DEE2E6' : '#3CC6B9'}}/>
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-medium truncate" style={{color:'var(--color-text-primary)'}}>{n.title ?? n.message}</p>
                            {n.message && n.message !== n.title && <p className="text-[10px] truncate" style={{color:'var(--color-text-muted)'}}>{n.message}</p>}
                            <p className="text-[9px] mt-0.5" style={{color:'var(--color-text-muted)'}}>{new Date(n.created_at).toLocaleTimeString('ar-DZ')}</p>
                          </div>
                          {n.type === 'order' && n.is_read === false && (
                            <button onClick={()=>{setActiveTab('orders');setNotifOpen(false)}}
                              className="text-[9px] px-1.5 py-0.5 rounded flex-shrink-0" style={{background:'#E0F5F2',color:'#3CC6B9'}}>عرض</button>
                          )}
                        </div>
                      ))
                    })()}
                    <button onClick={() => { fetch('/api/notifications', {method:'PATCH'}); setUnreadCount(0); setNotifications(prev=>prev.map(n=>({...n,is_read:true}))) }}
                      className="w-full text-center text-[10px] py-1.5 hover:bg-[#F8F9FA] transition-colors border-t mt-1" style={{color:'var(--color-accent)',borderColor:'var(--color-border)'}}>
                      ✓ تحديد الكل كمقروء
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
          <span className="badge badge-blue text-xs">{plan === 'pro' ? 'Pro' : plan === 'elite' ? 'Elite' : 'Free'}</span>
        </div>
        <div className="flex items-center gap-3">
          <div className="text-xs" style={{color:'var(--color-text-muted)',fontFamily:'var(--font-arabic)'}}>
            الطلبات: <strong style={{color:'var(--color-accent)'}}>{localOrders.filter(o=>!trashedOrders.has(o.id)).length}</strong>
          </div>
          <div className="text-xs" style={{color:'var(--color-text-muted)',fontFamily:'var(--font-arabic)'}}>
            المؤكدة: <strong style={{color:'#198754'}}>{confirmedArr.length + delivered.length}</strong>
          </div>
          <div className="text-xs" style={{color:'var(--color-text-muted)',fontFamily:'var(--font-arabic)'}}>
            إيرادات: <strong style={{color:'var(--color-accent)'}}>{totalRevenue.toLocaleString('ar-DZ')} دج</strong>
          </div>
          {/* الرصيد (balance) */}
          <a href="/billing/plans" className="flex items-center gap-1 px-2 py-0.5 rounded-lg text-xs" style={{background:'var(--color-bg-soft)',color:'var(--color-text-secondary)',fontFamily:'var(--font-arabic)'}} title="الرصيد">
            <Wallet size={12} style={{color:'var(--color-accent)'}}/>
            <span>الرصيد:</span>
            <strong style={{fontFamily:'var(--font-primary)',color:'var(--color-accent)'}}>{balance.toLocaleString('ar-DZ')} دج</strong>
          </a>
          {/* Quota display (9.9) — red when remaining < 20% */}
          {(() => {
            const remaining = Math.max(0, planOrderLimit - planOrdersUsed)
            const pct = planOrderLimit > 0 ? remaining / planOrderLimit : 1
            const isLow = pct < 0.2
            return (
              <div className="flex items-center gap-1 px-2 py-0.5 rounded-lg text-xs"
                style={{ background: isLow ? '#FEE2E2' : 'var(--color-bg-soft)', color: isLow ? '#DC3545' : 'var(--color-text-muted)', fontFamily:'var(--font-arabic)' }}>
                {isLow && <AlertTriangle size={10} style={{color:'#DC3545'}}/>}
                <span>المتبقية:</span>
                <strong style={{ fontFamily:'var(--font-primary)', color: isLow ? '#DC3545' : 'var(--color-accent)' }}>
                  {remaining.toLocaleString('ar-DZ')}/{planOrderLimit.toLocaleString('ar-DZ')}
                </strong>
              </div>
            )
          })()}
          {/* Language switcher (9.4) */}
          <div className="flex items-center gap-1 border rounded-lg overflow-hidden" style={{borderColor:'var(--color-border)'}}>
            {(['ar','fr','en'] as const).map(l => (
              <button key={l} onClick={() => setLanguage(l)}
                className="px-2 py-1 text-[10px] font-bold transition-colors"
                style={{
                  background: lang===l ? 'var(--color-accent)' : '#fff',
                  color: lang===l ? '#fff' : 'var(--color-text-muted)',
                }}>
                {l === 'ar' ? '🇩🇿' : l === 'fr' ? '🇫🇷' : '🇺🇸'}
              </button>
            ))}
          </div>
          {/* User name */}
          <span className="hidden sm:inline text-xs font-bold max-w-[120px] truncate" style={{color:'var(--cf-teal)',fontFamily:'var(--font-arabic)'}} title={storeName}>{storeName}</span>
          {/* Avatar dropdown */}
          <div className="relative">
            <button onClick={e=>{e.stopPropagation();setAvatarOpen(o=>!o)}}
              className="w-8 h-8 rounded-full flex items-center justify-center transition-colors hover:opacity-80"
              style={{background:'var(--color-accent-soft)',color:'var(--color-accent)'}}>
              <User size={15}/>
            </button>
            {avatarOpen && (
              <>
                <div className="fixed inset-0 z-10" onClick={()=>setAvatarOpen(false)}/>
                <div className="absolute top-full mt-1 left-0 w-48 bg-white border rounded-xl shadow-lg z-20 overflow-hidden" style={{borderColor:'var(--color-border)',fontFamily:'var(--font-arabic)'}}>
                  <div className="px-3 py-2 border-b" style={{borderColor:'var(--color-border)'}}>
                    <p className="text-xs font-bold truncate" style={{color:'var(--color-text-primary)'}}>{storeName}</p>
                  </div>
                  <a href="/settings" className="flex items-center gap-2 px-3 py-2 text-xs hover:bg-[#F8F9FA] transition-colors" style={{color:'var(--color-text-secondary)'}}>
                    <Settings size={13}/>إعدادات الحساب
                  </a>
                  <a href="https://wa.me/213555000000?text=مرحبا، أحتاج دعم في Confirmili" target="_blank" rel="noopener noreferrer"
                    className="flex items-center gap-2 px-3 py-2 text-xs hover:bg-[#F8F9FA] transition-colors" style={{color:'var(--color-text-secondary)'}}>
                    <Headphones size={13}/>الدعم
                  </a>
                  <button onClick={async ()=>{ const sb=createClient(); await sb.auth.signOut(); router.push('/login'); router.refresh() }}
                    className="w-full flex items-center gap-2 px-3 py-2 text-xs hover:bg-red-50 transition-colors text-right" style={{color:'#DC3545'}}>
                    <LogOut size={13}/>تسجيل الخروج
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Page-title strip (tabs now live in the teal sidebar) */}
      <div className="bg-white border-b px-4 py-2 flex items-center gap-2" style={{borderColor:'var(--color-border)'}}>
        {(() => { const at = TABS.find(t=>t.id===activeTab); const Icon = at?.icon; return (
          <>
            {Icon && <Icon size={16} style={{color:'var(--cf-teal)'}}/>}
            <h2 className="text-sm font-bold" style={{color:'var(--cf-teal)',fontFamily:'var(--font-arabic)'}}>{at?.label ?? 'Confirmili'}</h2>
          </>
        )})()}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4 md:p-6">
        {SECTION_RENDERERS[activeTab]?.() ?? COMING_SOON}
      </div>
      </div>{/* /main column */}
    </div>
  )
}

// ── QR CAMERA SCANNER (html5-qrcode) ─────────────────────────
function QRScanner({ onScan }: { onScan: (text: string) => void }) {
  const scannerRef = useRef<any>(null)
  const [active, setActive] = useState(false)
  const [error, setError] = useState<string|null>(null)

  useEffect(() => {
    return () => { scannerRef.current?.stop?.().catch(() => {}) }
  }, [])

  const stop = useCallback(async () => {
    try { await scannerRef.current?.stop(); scannerRef.current?.clear() } catch {}
    setActive(false)
  }, [])

  const start = useCallback(async () => {
    setError(null)
    try {
      const { Html5Qrcode } = await import('html5-qrcode')
      const scanner = new Html5Qrcode('qr-reader-box')
      scannerRef.current = scanner
      await scanner.start(
        { facingMode: 'environment' },
        { fps: 10, qrbox: 220 },
        (decodedText: string) => { onScan(decodedText); stop() },
        () => {}
      )
      setActive(true)
    } catch (e: any) {
      setError(e?.message ?? 'تعذر تشغيل الكاميرا — تحقق من الأذونات')
    }
  }, [onScan, stop])

  return (
    <div className="flex flex-col items-center gap-3">
      <div id="qr-reader-box" className="w-56 h-56 rounded-2xl overflow-hidden" style={{background:'#000'}}/>
      {!active ? (
        <button onClick={start} className="btn btn-primary btn-sm" style={{fontFamily:'var(--font-arabic)'}}>تشغيل الكاميرا</button>
      ) : (
        <button onClick={stop} className="btn btn-sm" style={{background:'#DC3545',color:'#fff',fontFamily:'var(--font-arabic)'}}>إيقاف الكاميرا</button>
      )}
      {error && <p className="text-xs text-center" style={{color:'#DC3545',fontFamily:'var(--font-arabic)'}}>{error}</p>}
    </div>
  )
}
