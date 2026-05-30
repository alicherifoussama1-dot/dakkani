'use client'
import { useState, useMemo, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import {
  Bell, X, Phone, TrendingUp, Package,
  Truck, Link2, Calculator, Users, Settings, Video, Bot, QrCode,
  BarChart2, Map, CheckSquare, Warehouse, ArrowUpDown, DollarSign,
  Filter, Plus, Search, RefreshCw, Trash2, Edit2, Eye, Download,
  SlidersHorizontal, Calendar, AlignLeft, ChevronRight, ChevronLeft,
  AlertTriangle, CheckCircle, XCircle, Clock, PhoneCall, Copy, RotateCcw,
  MessageCircle, ChevronDown,
} from 'lucide-react'
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  Legend, RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
  PieChart, Pie, Cell, BarChart, Bar,
} from 'recharts'
import StatusBadge from '@/components/ui/StatusBadge'

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

// Status action menu
const STATUS_ACTIONS = [
  { status: 'confirmed',  label: 'تأكيد الطلب ✅',    color: '#198754', bg: '#D1E7DD' },
  { status: 'cancelled',  label: 'إلغاء الطلب ❌',    color: '#DC3545', bg: '#F8D7DA' },
  { status: 'failed_1',   label: 'فاشلة 01 📵',       color: '#FFA500', bg: '#FFF3CD' },
  { status: 'failed_2',   label: 'فاشلة 02 📵',       color: '#FF8C00', bg: '#FFE8C0' },
  { status: 'failed_3',   label: 'فاشلة 03 📵',       color: '#DC3545', bg: '#F8D7DA' },
  { status: 'postponed',  label: 'مؤجلة 🕐',          color: '#7B2FBE', bg: '#EEE5FF' },
  { status: 'duplicate',  label: 'مكررة 👥',          color: '#212529', bg: '#DEE2E6' },
  { status: 'delivered',  label: 'مسلمة ✅',          color: '#198754', bg: '#D1E7DD' },
  { status: 'returned',   label: 'مرجعة 📦',          color: '#DC3545', bg: '#F8D7DA' },
]

const CONFIRM_STATUSES_STATIC = [
  { key:'confirmed', label:'المؤكدة',  color:'#198754' },
  { key:'cancelled', label:'الملغاة',  color:'#DC3545' },
  { key:'failed_1',  label:'فاشلة 01', color:'#FFA500' },
  { key:'failed_2',  label:'فاشلة 02', color:'#FF8C00' },
  { key:'failed_3',  label:'فاشلة 03', color:'#DC3545' },
  { key:'postponed', label:'مؤجلة',    color:'#7B2FBE' },
  { key:'duplicate', label:'مكررة',    color:'#212529' },
]
const PIE_COLORS = ['#198754','#DC3545','#FFC107','#0D6EFD','#7B2FBE','#FF8C00']

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

interface Props {
  storeId?: string
  storeName?: string
  plan?: string
  initialOrders?: any[]
  initialProducts?: any[]
}

export default function ConfirmiliClient({ storeId='', storeName='متجري', plan='free', initialOrders=[], initialProducts=[] }: Props) {
  const router = useRouter()
  const [activeTab,     setActiveTab]    = useState('statistics')
  const [statsTab,      setStatsTab]     = useState(0)
  const [notifOpen,     setNotifOpen]    = useState(false)
  const [notifTab,      setNotifTab]     = useState(0)
  const [ordersPerPage, setOrdersPP]     = useState(50)
  const [delivSubTab,   setDelivSubTab]  = useState(0)
  const [teamSubTab,    setTeamSubTab]   = useState(0)
  const [financeSubTab, setFinanceSubTab]= useState(0)
  const [storeSubTab,   setStoreSubTab]  = useState(0)
  const [settingsTab,   setSettingsTab]  = useState(0)
  const [tutSearch,     setTutSearch]    = useState('')
  const [orderSearch,   setOrderSearch]  = useState('')

  // ─── ORDER STATE ─────────────────────────────────────────
  // Local mirror of orders so UI updates instantly
  const [localOrders,    setLocalOrders]    = useState<any[]>(initialOrders)
  const [dateFilter,     setDateFilter]     = useState<'all'|'today'|'yesterday'|'week'|'month'>('all')
  const [selectedOrders, setSelectedOrders] = useState<Set<string>>(new Set())
  const [trashedOrders,  setTrashedOrders]  = useState<Set<string>>(new Set())
  const [showTrash,      setShowTrash]      = useState(false)
  const [currentPage,    setCurrentPage]    = useState(1)
  const [actionMenu,     setActionMenu]     = useState<string|null>(null) // orderId with open menu
  const [updating,       setUpdating]       = useState<string|null>(null) // orderId being updated
  const [bulkUpdating,   setBulkUpdating]   = useState(false)
  const [statsDateFilter,setStatsDateFilter]= useState<'all'|'today'|'yesterday'|'week'|'month'>('all')

  // ─── STATUS UPDATE ───────────────────────────────────────
  const updateOrderStatus = useCallback(async (orderId: string, newStatus: string) => {
    setUpdating(orderId)
    setActionMenu(null)
    try {
      const sb = createClient()
      await sb.from('orders').update({
        status: newStatus,
        ...(newStatus === 'confirmed' ? { confirmed_at: new Date().toISOString() } : {}),
        ...(newStatus === 'delivered' ? { delivered_at: new Date().toISOString() } : {}),
        ...(newStatus === 'shipped'   ? { shipped_at:   new Date().toISOString() } : {}),
      }).eq('id', orderId)
      // Instant local update
      setLocalOrders(prev => prev.map(o => o.id === orderId ? { ...o, status: newStatus } : o))
    } catch (e) {
      console.error(e)
    } finally {
      setUpdating(null)
    }
  }, [])

  const updateCallAttempt = useCallback(async (orderId: string, currentAttempts: number) => {
    setUpdating(orderId)
    setActionMenu(null)
    const newAttempts = (currentAttempts ?? 0) + 1
    const newStatus = `failed_${Math.min(newAttempts, 3)}`
    try {
      const sb = createClient()
      await sb.from('orders').update({
        call_attempts: newAttempts,
        last_call_at: new Date().toISOString(),
        status: newStatus,
      }).eq('id', orderId)
      setLocalOrders(prev => prev.map(o => o.id === orderId
        ? { ...o, call_attempts: newAttempts, status: newStatus } : o))
    } catch (e) {
      console.error(e)
    } finally {
      setUpdating(null)
    }
  }, [])

  const bulkUpdateStatus = useCallback(async (newStatus: string) => {
    if (selectedOrders.size === 0) return
    setBulkUpdating(true)
    try {
      const sb = createClient()
      const ids = Array.from(selectedOrders.values())
      await sb.from('orders').update({ status: newStatus }).in('id', ids)
      setLocalOrders(prev => prev.map(o => ids.includes(o.id) ? { ...o, status: newStatus } : o))
      setSelectedOrders(new Set<string>())
    } catch (e) {
      console.error(e)
    } finally {
      setBulkUpdating(false)
    }
  }, [selectedOrders])

  const softDelete = useCallback((orderId: string) => {
    setTrashedOrders(prev => { const s = new Set<string>(Array.from(prev.values())); s.add(orderId); return s })
    setActionMenu(null)
  }, [])

  const restoreOrder = useCallback((orderId: string) => {
    setTrashedOrders(prev => { const s = new Set(prev); s.delete(orderId); return s })
  }, [])

  const openWhatsApp = useCallback((phone: string, customerName: string) => {
    const clean = (phone ?? '').replace(/\D/g, '').replace(/^0/, '213')
    const msg = encodeURIComponent(`السلام عليكم ${customerName}، نتصل بكم بخصوص طلبكم`)
    window.open(`https://wa.me/${clean}?text=${msg}`, '_blank')
  }, [])

  // ─── DATE FILTERING ──────────────────────────────────────
  const getDateRange = (filter: typeof dateFilter) => {
    const now = new Date()
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    switch (filter) {
      case 'today':     return [today, new Date(today.getTime() + 86400000)]
      case 'yesterday': return [new Date(today.getTime() - 86400000), today]
      case 'week':      return [new Date(today.getTime() - 7*86400000), now]
      case 'month':     return [new Date(today.getTime() - 30*86400000), now]
      default:          return null
    }
  }

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
    if (!range) return localOrders.filter(o => !trashedOrders.has(o.id))
    return localOrders.filter(o => {
      if (trashedOrders.has(o.id)) return false
      const d = new Date(o.created_at)
      return d >= range[0] && d < range[1]
    })
  }, [localOrders, statsDateFilter, trashedOrders])

  const delivered    = statsOrders.filter(o => o.status === 'delivered')
  const cancelled    = statsOrders.filter(o => o.status === 'cancelled')
  const confirmedArr = statsOrders.filter(o => o.status === 'confirmed')
  const totalRevenue      = delivered.reduce((s,o) => s+o.total,0)
  const totalDeliveryFee  = delivered.reduce((s,o) => s+o.delivery_fee,0)
  const netRevenue        = totalRevenue - totalDeliveryFee

  // ─── EXPORT ──────────────────────────────────────────────
  const exportExcel = useCallback(() => {
    const orders = selectedOrders.size > 0
      ? filteredOrders.filter(o => selectedOrders.has(o.id))
      : filteredOrders
    const rows = [
      ['رقم الطلب','الاسم','الهاتف','الولاية','المنتج','السعر','الحالة','التاريخ']
    ]
    orders.forEach(o => rows.push([
      o.order_number, o.customer_name, o.customer_phone,
      o.wilaya?.name_ar ?? '', (o.items?.[0]?.product_name ?? ''),
      String(o.total), o.status, o.created_at?.slice(0,10) ?? ''
    ]))
    const csv = '﻿' + rows.map(r => r.join(',')).join('\n')
    const a = document.createElement('a')
    a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }))
    a.download = `orders-${new Date().toISOString().slice(0,10)}.csv`
    a.click()
  }, [filteredOrders, selectedOrders])

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

  // ─── ACTION DROPDOWN ─────────────────────────────────────
  const ActionDropdown = ({ order }: { order: any }) => {
    const isOpen = actionMenu === order.id
    return (
      <div className="relative">
        <button
          onClick={e => { e.stopPropagation(); setActionMenu(isOpen ? null : order.id) }}
          disabled={updating === order.id}
          className="flex items-center gap-1 btn btn-sm text-xs"
          style={{ background: '#EBF5FF', color: 'var(--color-accent)', border: 'none', minHeight: '26px', padding: '0 8px' }}
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
                style={{ color: '#0D6EFD', fontFamily: 'var(--font-arabic)' }}
              >
                <PhoneCall size={13}/>محاولة اتصال ({order.call_attempts ?? 0})
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
    const wilayaRows = Object.entries(wilayaStats).sort(([,a],[,b]) => b.t - a.t).slice(0,15)

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
    const topWilayas  = Object.entries(wilayaCount).sort(([,a],[,b]) => b-a).slice(0,5)
    const topSources  = Object.entries(srcCount).sort(([,a],[,b]) => b-a).slice(0,5)
    const topProducts = Object.entries(prodCount).sort(([,a],[,b]) => b-a).slice(0,5)
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
                  <Line type="monotone" dataKey="income" stroke="#0D6EFD" strokeWidth={2} dot={false} name="الدخل"/>
                  <Line type="monotone" dataKey="delivery_cost" stroke="#DC3545" strokeWidth={2} dot={false} name="التوصيل"/>
                  <Line type="monotone" dataKey="net" stroke="#198754" strokeWidth={2} dot={false} name="الصافي"/>
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        {statsTab === 1 && (
          <div className="space-y-4">
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
            <div className="card overflow-hidden">
              <div className="px-4 py-3 border-b font-semibold text-sm" style={{borderColor:'var(--color-border)'}}>
                احصائيات الولايات ({statsOrders.length} طلب)
              </div>
              <div className="overflow-x-auto">
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
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="card p-4">
                <h3 className="font-semibold text-sm mb-3" style={{fontFamily:'var(--font-arabic)',color:'var(--color-text-primary)'}}>أفضل الولايات</h3>
                {topWilayas.length > 0 ? topWilayas.map(([w,c]) => <MiniBar key={w} label={w} count={c} max={topWilayas[0]?.[1]??1}/>) : <p className="text-xs text-center py-4" style={{color:'var(--color-text-muted)'}}>لا توجد بيانات</p>}
              </div>
              <div className="card p-4">
                <h3 className="font-semibold text-sm mb-3" style={{fontFamily:'var(--font-arabic)',color:'var(--color-text-primary)'}}>أفضل المصادر</h3>
                {topSources.length > 0 ? topSources.map(([s,c]) => <MiniBar key={s} label={s} count={c} max={topSources[0]?.[1]??1}/>) : <p className="text-xs text-center py-4" style={{color:'var(--color-text-muted)'}}>لا توجد بيانات</p>}
              </div>
              <div className="card p-4">
                <h3 className="font-semibold text-sm mb-3" style={{fontFamily:'var(--font-arabic)',color:'var(--color-text-primary)'}}>أفضل المنتجات</h3>
                {topProducts.length > 0 ? topProducts.map(([p,c]) => <MiniBar key={p} label={p.slice(0,16)} count={c} max={topProducts[0]?.[1]??1}/>) : <p className="text-xs text-center py-4" style={{color:'var(--color-text-muted)'}}>لا توجد بيانات</p>}
              </div>
            </div>
          </div>
        )}
      </div>
    )
  }

  // ─── RENDER ORDERS ───────────────────────────────────────
  const renderOrders = () => (
    <div className="space-y-3">
      {/* Action bar */}
      <div className="flex flex-wrap gap-2 items-center">
        {/* Bulk status */}
        {selectedOrders.size > 0 && (
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg" style={{background:'var(--color-accent-soft)'}}>
            <span className="text-xs font-medium" style={{color:'var(--color-accent)'}}>{selectedOrders.size} محدد</span>
            <button onClick={() => bulkUpdateStatus('confirmed')} disabled={bulkUpdating}
              className="text-xs px-2 py-1 rounded" style={{background:'#D1E7DD',color:'#198754'}}>تأكيد الكل</button>
            <button onClick={() => bulkUpdateStatus('cancelled')} disabled={bulkUpdating}
              className="text-xs px-2 py-1 rounded" style={{background:'#F8D7DA',color:'#DC3545'}}>إلغاء الكل</button>
            <button onClick={() => setSelectedOrders(new Set())} className="text-xs" style={{color:'var(--color-text-muted)'}}>✕ إلغاء التحديد</button>
          </div>
        )}

        <button onClick={() => { setShowTrash(false); setCurrentPage(1) }}
          className="btn btn-sm" style={{border:'1px solid var(--color-border)',background:!showTrash?'var(--color-accent)':'#fff',color:!showTrash?'#fff':'var(--color-text-secondary)'}}>
          📋 الطلبات ({localOrders.filter(o=>!trashedOrders.has(o.id)).length})
        </button>
        <button onClick={() => { setShowTrash(true); setCurrentPage(1) }}
          className="btn btn-sm gap-1" style={{border:'1px solid var(--color-border)',background:showTrash?'var(--color-accent)':'#fff',color:showTrash?'#fff':'var(--color-text-secondary)'}}>
          <Trash2 size={13}/>سلة المهملات ({trashedOrders.size})
        </button>
        <button onClick={() => { setLocalOrders(initialOrders); setTrashedOrders(new Set()); setSelectedOrders(new Set()); setCurrentPage(1) }}
          className="btn btn-sm p-2" style={{border:'1px solid var(--color-border)',background:'#fff'}}>
          <RefreshCw size={13}/>
        </button>
        <button onClick={exportExcel}
          className="btn btn-sm gap-1" style={{border:'1px solid var(--color-border)',background:'#fff',color:'var(--color-text-secondary)'}}>
          <Download size={13}/>تصدير CSV
        </button>

        {/* Date filters — FUNCTIONAL */}
        {(['today','yesterday','week','month'] as const).map(t => {
          const labels = {today:'اليوم',yesterday:'الأمس',week:'أسبوع',month:'شهر'} as const
          return (
            <button key={t} onClick={() => { setDateFilter(f => f===t ? 'all' : t); setCurrentPage(1) }}
              className="btn btn-sm" style={{
                border: '1px solid',
                borderColor: dateFilter===t ? 'var(--color-accent)' : 'var(--color-border)',
                background: dateFilter===t ? 'var(--color-accent)' : '#fff',
                color: dateFilter===t ? '#fff' : 'var(--color-text-secondary)',
                fontFamily: 'var(--font-arabic)',
              }}>
              {labels[t]}
            </button>
          )
        })}
        {dateFilter !== 'all' && (
          <button onClick={() => { setDateFilter('all'); setCurrentPage(1) }}
            className="text-xs" style={{color:'var(--color-text-muted)'}}>
            ✕ مسح الفلتر
          </button>
        )}

        <div className="flex-1"/>
        <div className="relative">
          <Search size={13} className="absolute right-3 top-1/2 -translate-y-1/2" style={{color:'var(--color-text-muted)'}}/>
          <input value={orderSearch} onChange={e=>{ setOrderSearch(e.target.value); setCurrentPage(1) }}
            placeholder="بحث بالاسم / الهاتف / الرقم..."
            className="input pr-8 text-sm h-8 w-52"/>
        </div>
      </div>

      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="data-table" style={{fontFamily:'var(--font-arabic)'}}>
            <thead>
              <tr>
                <th><input type="checkbox" checked={allSelected} onChange={toggleAll} className="w-3.5 h-3.5 accent-[#0D6EFD]"/></th>
                {['المصدر','رقم الطلبية','التاريخ','الإسم','الهاتف','الحالة','الولاية','المنتج','السعر','اتصال','إجراء'].map(h=><th key={h}>{h}</th>)}
                {showTrash && <th>استعادة</th>}
              </tr>
            </thead>
            <tbody>
              {pagedOrders.length === 0 ? (
                <tr>
                  <td colSpan={12} className="text-center py-12 text-sm" style={{color:'var(--color-text-muted)'}}>
                    {showTrash ? 'سلة المهملات فارغة' : dateFilter !== 'all' ? 'لا توجد طلبات في هذه الفترة' : 'لا توجد طلبات بعد'}
                  </td>
                </tr>
              ) : pagedOrders.map(o => (
                <tr key={o.id} className={selectedOrders.has(o.id) ? 'bg-[#EBF5FF]' : ''}>
                  <td>
                    <input type="checkbox"
                      checked={selectedOrders.has(o.id)}
                      onChange={e => {
                        setSelectedOrders(prev => {
                          const s = new Set(prev)
                          e.target.checked ? s.add(o.id) : s.delete(o.id)
                          return s
                        })
                      }}
                      className="w-3.5 h-3.5 accent-[#0D6EFD]"
                    />
                  </td>
                  <td className="text-xs" style={{color:'var(--color-text-muted)'}}>{o.source ?? 'مباشر'}</td>
                  <td className="font-mono text-xs font-medium" style={{color:'var(--color-accent)'}}>{o.order_number}</td>
                  <td className="text-xs" style={{color:'var(--color-text-muted)'}}>{new Date(o.created_at).toLocaleDateString('ar-DZ')}</td>
                  <td className="text-sm font-medium" style={{color:'var(--color-text-primary)'}}>{o.customer_name}</td>
                  <td>
                    <button
                      onClick={() => openWhatsApp(o.customer_phone, o.customer_name)}
                      className="text-xs font-mono flex items-center gap-1 hover:underline"
                      style={{color:'#25D366'}}
                    >
                      <MessageCircle size={11}/>
                      {o.customer_phone}
                    </button>
                  </td>
                  <td><StatusBadge status={o.status}/></td>
                  <td className="text-xs" style={{color:'var(--color-text-secondary)'}}>{(o.wilaya as any)?.name_ar ?? '—'}</td>
                  <td className="text-xs" style={{color:'var(--color-text-muted)'}}>{(o.items?.[0] as any)?.product_name?.slice(0,16) ?? '—'}</td>
                  <td className="font-semibold text-sm" style={{color:'var(--color-accent)',fontFamily:'var(--font-primary)'}}>{o.total?.toLocaleString('ar-DZ')} دج</td>
                  <td className="text-xs" style={{color:'var(--color-text-muted)'}}>{o.call_attempts ?? 0}</td>
                  <td>
                    <div className="flex items-center gap-1">
                      <a href={`/orders/${o.id}`} className="p-1.5 rounded hover:bg-[#F8F9FA] transition-colors inline-block">
                        <Eye size={12} style={{color:'var(--color-text-muted)'}}/>
                      </a>
                      {showTrash
                        ? <button onClick={() => restoreOrder(o.id)}
                            className="btn btn-sm text-xs gap-1" style={{background:'#D1E7DD',color:'#198754',border:'none',minHeight:'24px',padding:'0 6px'}}>
                            <RotateCcw size={11}/>استعادة
                          </button>
                        : <ActionDropdown order={o} />
                      }
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination — FUNCTIONAL */}
        <div className="flex items-center justify-between px-4 py-3 border-t" style={{borderColor:'var(--color-border)'}}>
          <div className="flex items-center gap-2">
            <select value={ordersPerPage} onChange={e=>{ setOrdersPP(+e.target.value); setCurrentPage(1) }} className="input h-7 text-xs px-2 w-16">
              {[10,20,50,100].map(n=><option key={n}>{n}</option>)}
            </select>
            <span className="text-xs" style={{color:'var(--color-text-muted)',fontFamily:'var(--font-arabic)'}}>
              عرض {Math.min((currentPage-1)*ordersPerPage+1, filteredOrders.length)}-{Math.min(currentPage*ordersPerPage, filteredOrders.length)} من {filteredOrders.length}
            </span>
          </div>
          <div className="flex items-center gap-1">
            <button onClick={() => setCurrentPage(1)} disabled={currentPage<=1}
              className="w-7 h-7 flex items-center justify-center rounded text-xs border disabled:opacity-40" style={{borderColor:'var(--color-border)'}}>«</button>
            <button onClick={() => setCurrentPage(p => Math.max(1,p-1))} disabled={currentPage<=1}
              className="w-7 h-7 flex items-center justify-center rounded text-xs border disabled:opacity-40" style={{borderColor:'var(--color-border)'}}>‹</button>
            <span className="px-3 text-xs" style={{color:'var(--color-text-secondary)'}}>
              {currentPage} / {totalPages || 1}
            </span>
            <button onClick={() => setCurrentPage(p => Math.min(totalPages,p+1))} disabled={currentPage>=totalPages}
              className="w-7 h-7 flex items-center justify-center rounded text-xs border disabled:opacity-40" style={{borderColor:'var(--color-border)'}}>›</button>
            <button onClick={() => setCurrentPage(totalPages || 1)} disabled={currentPage>=totalPages}
              className="w-7 h-7 flex items-center justify-center rounded text-xs border disabled:opacity-40" style={{borderColor:'var(--color-border)'}}>»</button>
          </div>
        </div>
      </div>
    </div>
  )

  // ─── TRACKING ────────────────────────────────────────────
  const renderTracking = () => (
    <div className="space-y-3">
      <div className="flex gap-2 mb-3">
        {['شركة التوصيل','رجل التوصيل'].map((t,i) => (
          <button key={t} className={`tab-item ${i===0?'active':''}`}>{t}</button>
        ))}
      </div>
      <div className="card overflow-hidden">
        <table className="data-table" style={{fontFamily:'var(--font-arabic)'}}>
          <thead><tr>{['الحالة','الهاتف','الاسم','المنتج','الولاية','الإجمالي','إجراء'].map(h=><th key={h}>{h}</th>)}</tr></thead>
          <tbody>
            {localOrders.filter(o => ['shipped','in_transit','out_for_delivery'].includes(o.status)).length === 0
              ? <tr><td colSpan={7} className="text-center py-12 text-sm" style={{color:'var(--color-text-muted)'}}>لا توجد طلبات في التوصيل</td></tr>
              : localOrders.filter(o => ['shipped','in_transit','out_for_delivery'].includes(o.status)).slice(0,50).map(o => (
                <tr key={o.id}>
                  <td><StatusBadge status={o.status}/></td>
                  <td><button onClick={()=>openWhatsApp(o.customer_phone,o.customer_name)} className="text-xs" style={{color:'#25D366'}}>{o.customer_phone}</button></td>
                  <td className="font-medium text-sm">{o.customer_name}</td>
                  <td className="text-xs">{o.items?.[0]?.product_name?.slice(0,16) ?? '—'}</td>
                  <td className="text-xs">{o.wilaya?.name_ar ?? '—'}</td>
                  <td className="font-semibold text-sm" style={{color:'var(--color-accent)'}}>{o.total?.toLocaleString('ar-DZ')} دج</td>
                  <td><ActionDropdown order={o}/></td>
                </tr>
              ))}
          </tbody>
        </table>
      </div>
    </div>
  )

  const renderValidation = () => (
    <div>
      <TabBar tabs={['التحقق من الارسال','التحقق من الارجاع','التحقق من الدفع']} active={0} onChange={()=>{}} />
      {COMING_SOON}
    </div>
  )

  const renderProducts = () => (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <button className="w-8 h-8 rounded-full flex items-center justify-center text-white" style={{background:'#2BBFAD'}}><Plus size={14}/></button>
        <button className="btn btn-sm" style={{border:'1px solid var(--color-border)',background:'#fff',color:'var(--color-text-secondary)',fontFamily:'var(--font-arabic)'}}>استيراد</button>
      </div>
      <div className="card overflow-hidden">
        <table className="data-table" style={{fontFamily:'var(--font-arabic)'}}>
          <thead><tr>{['الصورة','الاسم','المرجع','السعر','الإجراءات'].map(h=><th key={h}>{h}</th>)}</tr></thead>
          <tbody>
            {initialProducts.length === 0
              ? <tr><td colSpan={5} className="text-center py-12 text-sm" style={{color:'var(--color-text-muted)'}}>لا توجد منتجات — أضف منتجاتك من صفحة المنتجات</td></tr>
              : initialProducts.map((p: any) => (
                <tr key={p.id}>
                  <td><div className="w-10 h-10 rounded-lg overflow-hidden flex-shrink-0 flex items-center justify-center" style={{background:'var(--color-bg-soft)'}}>
                    {(p.images as any[])?.[0]?.url
                      ? <img src={(p.images as any[])[0].url} alt="" className="w-full h-full object-cover"/>
                      : <span className="text-sm">{(p.name_ar??p.name)?.[0]??'📦'}</span>}
                  </div></td>
                  <td className="font-medium text-sm">{p.name_ar??p.name}</td>
                  <td className="text-xs font-mono" style={{color:'var(--color-text-muted)'}}>{p.sku??'—'}</td>
                  <td className="font-semibold text-sm" style={{color:'var(--color-accent)'}}>{p.price?.toLocaleString('ar-DZ')} دج</td>
                  <td><a href={`/products/${p.id}`} className="btn btn-sm" style={{background:'#EBF5FF',color:'var(--color-accent)'}}><Edit2 size={12}/>تعديل</a></td>
                </tr>
              ))}
          </tbody>
        </table>
      </div>
    </div>
  )

  const renderDelivery = () => {
    const dTabs = ['شركة التوصيل','أسعار التوصيل المعلنة','الولاية ↔ شركة التوصيل','أسعار التوصيل الحقيقية']
    return (
      <div>
        <TabBar tabs={dTabs} active={delivSubTab} onChange={setDelivSubTab}/>
        {delivSubTab === 0 && (
          <div className="card overflow-hidden">
            <table className="data-table">
              <thead><tr>{['اسم الشركة','الاسم القصير','جماعي؟','الحالة','الإجراءات'].map(h=><th key={h}>{h}</th>)}</tr></thead>
              <tbody><tr><td colSpan={5} className="text-center py-12 text-sm" style={{color:'var(--color-text-muted)'}}>لا توجد شركات توصيل مضبوطة</td></tr></tbody>
            </table>
          </div>
        )}
        {delivSubTab > 0 && COMING_SOON}
      </div>
    )
  }

  const renderStoreIntegration = () => {
    const sTabs = ['ربط المتاجر','قوقل شيت','فيسبوك ليدس']
    return (
      <div>
        <TabBar tabs={sTabs} active={storeSubTab} onChange={setStoreSubTab}/>
        {storeSubTab === 0 && (
          <div className="card overflow-hidden">
            <table className="data-table">
              <thead><tr>{['المنصة','الاسم','الحالة','الإجراءات'].map(h=><th key={h}>{h}</th>)}</tr></thead>
              <tbody>
                <tr>
                  <td><div className="flex items-center gap-2"><span>🏪</span><span className="font-medium text-sm">{storeName}</span></div></td>
                  <td className="text-sm">{storeName}</td>
                  <td><span className="badge badge-green">متصل</span></td>
                  <td><a href="/settings" className="btn btn-sm" style={{background:'#EBF5FF',color:'var(--color-accent)'}}>إعدادات</a></td>
                </tr>
              </tbody>
            </table>
          </div>
        )}
        {storeSubTab === 1 && COMING_SOON}
        {storeSubTab === 2 && COMING_SOON}
      </div>
    )
  }

  const renderFinances = () => {
    const fTabs = ['حساب الأرباح','حسابات التأكيد و التتبع','حسابات التوصيل','تنظيم مدير الأعمال']
    return (
      <div>
        <TabBar tabs={fTabs} active={financeSubTab} onChange={setFinanceSubTab}/>
        {financeSubTab === 0 && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {(() => {
                const n = localOrders.filter(o=>!trashedOrders.has(o.id)).length
                const pct = (v:number) => n ? `${v} (${Math.round(v/n*100)}%)` : '0 (0%)'
                return [
                  {label:'جميع الطلبيات',v:String(n)},
                  {label:'مؤكدة',v:pct(localOrders.filter(o=>o.status==='confirmed').length)},
                  {label:'ملغاة',v:pct(localOrders.filter(o=>o.status==='cancelled').length)},
                  {label:'قيد التأكيد',v:pct(localOrders.filter(o=>o.status==='new').length)},
                  {label:'مسلمة',v:pct(delivered.length)},
                  {label:'مرجعة',v:pct(localOrders.filter(o=>o.status==='returned').length)},
                  {label:'إجمالي الدخل',v:`${totalRevenue.toLocaleString('ar-DZ')} دج`},
                  {label:'صافي الدخل',v:`${netRevenue.toLocaleString('ar-DZ')} دج`},
                ].map(c => (
                  <div key={c.label} className="card p-3 text-center">
                    <p className="font-bold text-base" style={{color:'var(--color-accent)',fontFamily:'var(--font-primary)'}}>{c.v}</p>
                    <p className="text-xs mt-0.5" style={{color:'var(--color-text-muted)',fontFamily:'var(--font-arabic)'}}>{c.label}</p>
                  </div>
                ))
              })()}
            </div>
            <div className="flex gap-2">
              <button onClick={exportExcel} className="btn btn-sm" style={{background:'var(--color-success)',color:'#fff',fontFamily:'var(--font-arabic)'}}>
                <Download size={13}/>تصدير CSV
              </button>
            </div>
          </div>
        )}
        {financeSubTab > 0 && COMING_SOON}
      </div>
    )
  }

  const renderTeam = () => {
    const tTabs = ['فريق التأكيد و التتبع','فريق التوصيل','عضو ↔ مسير']
    return (
      <div>
        <TabBar tabs={tTabs} active={teamSubTab} onChange={setTeamSubTab}/>
        <div className="card overflow-hidden">
          <table className="data-table">
            <thead><tr>{['الاسم','الهاتف','البريد','الحالة','الدور','تاريخ البداية','الإجراءات'].map(h=><th key={h}>{h}</th>)}</tr></thead>
            <tbody><tr><td colSpan={7} className="text-center py-12 text-sm" style={{color:'var(--color-text-muted)'}}>لا يوجد أعضاء</td></tr></tbody>
          </table>
        </div>
      </div>
    )
  }

  const renderSettings = () => {
    const sTabs = ['معلومات المستخدم','الدفع']
    return (
      <div>
        <TabBar tabs={sTabs} active={settingsTab} onChange={setSettingsTab}/>
        {settingsTab === 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="card p-5 space-y-4">
              <h3 className="font-semibold text-sm" style={{fontFamily:'var(--font-arabic)'}}>تغيير كلمة السر</h3>
              {['كلمة السر القديمة','كلمة السر الجديدة','تأكيد كلمة السر'].map(l => (
                <div key={l}><label className="block text-xs mb-1" style={{color:'var(--color-text-muted)',fontFamily:'var(--font-arabic)'}}>{l}</label>
                <input type="password" className="input text-sm h-9"/></div>
              ))}
              <a href="/settings" className="btn btn-sm" style={{background:'var(--color-success)',color:'#fff',fontFamily:'var(--font-arabic)'}}>الإعدادات ←</a>
            </div>
            <div className="card p-5 space-y-4">
              <h3 className="font-semibold text-sm" style={{fontFamily:'var(--font-arabic)'}}>معلومات الحساب</h3>
              {[{l:'إسم المتجر',v:storeName},{l:'الخطة',v:plan.toUpperCase()}].map(f => (
                <div key={f.l}><label className="block text-xs mb-1" style={{color:'var(--color-text-muted)',fontFamily:'var(--font-arabic)'}}>{f.l}</label>
                <input className="input text-sm h-9" defaultValue={f.v} dir="rtl"/></div>
              ))}
              <a href="/settings" className="btn btn-sm" style={{background:'var(--color-success)',color:'#fff',fontFamily:'var(--font-arabic)'}}>حفظ الإعدادات ←</a>
            </div>
          </div>
        )}
        {settingsTab === 1 && (
          <div className="card p-5 space-y-3">
            <h3 className="font-semibold text-sm" style={{fontFamily:'var(--font-arabic)'}}>ملخص الرصيد</h3>
            <div className="grid grid-cols-2 gap-3">
              {[
                {l:'إجمالي الإيرادات',v:`${totalRevenue.toLocaleString('ar-DZ')} دج`},
                {l:'طلبات مسلمة',v:String(delivered.length)},
                {l:'طلبات مؤكدة',v:String(confirmedArr.length)},
                {l:'الخطة',v:plan.toUpperCase()},
              ].map(({l,v}) => (
                <div key={l} className="p-3 rounded-lg text-center" style={{background:'var(--color-bg-soft)'}}>
                  <p className="font-bold text-sm" style={{color:'var(--color-accent)',fontFamily:'var(--font-primary)'}}>{v}</p>
                  <p className="text-xs mt-0.5" style={{color:'var(--color-text-muted)',fontFamily:'var(--font-arabic)'}}>{l}</p>
                </div>
              ))}
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
    ai:                () => COMING_SOON,
    qr:                () => COMING_SOON,
  }

  return (
    <div className="flex flex-col h-full" dir="rtl" onClick={() => actionMenu && setActionMenu(null)}>
      {/* Teal announcement banner */}
      <div className="flex items-center justify-center gap-3 px-4 py-2 text-white text-xs" style={{background:'#2BBFAD',fontFamily:'var(--font-arabic)'}}>
        <span>Confirmili — إدارة الطلبات الاحترافية مع تأكيد وإلغاء مباشر</span>
      </div>

      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2.5 border-b bg-white flex-wrap gap-2" style={{borderColor:'var(--color-border)'}}>
        <div className="flex items-center gap-3">
          <div className="relative">
            <button onClick={e=>{e.stopPropagation();setNotifOpen(o=>!o)}} className="relative p-1.5 rounded-md hover:bg-[#F8F9FA] transition-colors">
              <Bell size={16} style={{color:'var(--color-text-secondary)'}}/>
              {localOrders.filter(o=>o.status==='new'&&!trashedOrders.has(o.id)).length > 0 && (
                <span className="absolute top-0.5 right-0.5 w-4 h-4 rounded-full text-[9px] font-bold text-white flex items-center justify-center" style={{background:'var(--color-error)'}}>
                  {localOrders.filter(o=>o.status==='new'&&!trashedOrders.has(o.id)).length}
                </span>
              )}
            </button>
            {notifOpen && (
              <>
                <div className="fixed inset-0 z-10" onClick={()=>setNotifOpen(false)}/>
                <div className="absolute top-full mt-1 right-0 w-72 bg-white border rounded-xl shadow-lg z-20 overflow-hidden" style={{borderColor:'var(--color-border)'}}>
                  <div className="flex border-b" style={{borderColor:'var(--color-border)'}}>
                    {['طلبات جديدة','تنبيهات'].map((t,i)=>(
                      <button key={t} onClick={()=>setNotifTab(i)} className={`flex-1 py-2.5 text-xs font-medium ${notifTab===i?'text-[#0D6EFD] border-b-2 border-[#0D6EFD]':'text-[#868E96]'}`}>{t}</button>
                    ))}
                  </div>
                  <div className="p-3 space-y-2 max-h-60 overflow-y-auto">
                    {notifTab === 0
                      ? localOrders.filter(o=>o.status==='new'&&!trashedOrders.has(o.id)).slice(0,5).map(o => (
                          <div key={o.id} className="flex items-center justify-between p-2 rounded-lg hover:bg-[#F8F9FA]">
                            <div>
                              <p className="text-xs font-medium" style={{color:'var(--color-text-primary)'}}>{o.customer_name}</p>
                              <p className="text-[10px]" style={{color:'var(--color-text-muted)'}}>{o.order_number} — {o.total?.toLocaleString('ar-DZ')} دج</p>
                            </div>
                            <button onClick={()=>{updateOrderStatus(o.id,'confirmed');setNotifOpen(false)}}
                              className="text-[10px] px-2 py-1 rounded" style={{background:'#D1E7DD',color:'#198754'}}>تأكيد</button>
                          </div>
                        ))
                      : <p className="text-center text-xs py-4" style={{color:'var(--color-text-muted)'}}>لا توجد تنبيهات</p>
                    }
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
        </div>
      </div>

      {/* Sub-navigation */}
      <div className="bg-white border-b overflow-x-auto scrollbar-none" style={{borderColor:'var(--color-border)'}}>
        <div className="flex px-4 min-w-max">
          {TABS.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-1.5 text-xs font-medium px-3 py-3 border-b-2 transition-colors whitespace-nowrap ${
                activeTab === tab.id
                  ? 'border-[#0D6EFD] text-[#0D6EFD]'
                  : 'border-transparent text-[#868E96] hover:text-[#495057]'
              }`}
              style={{fontFamily:'var(--font-arabic)'}}
            >
              <tab.icon size={13}/>
              {tab.label}
              {tab.id === 'orders' && localOrders.filter(o=>o.status==='new'&&!trashedOrders.has(o.id)).length > 0 && (
                <span className="w-4 h-4 rounded-full text-[9px] font-bold text-white flex items-center justify-center" style={{background:'var(--color-error)'}}>
                  {localOrders.filter(o=>o.status==='new'&&!trashedOrders.has(o.id)).length}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4 md:p-6">
        {SECTION_RENDERERS[activeTab]?.() ?? COMING_SOON}
      </div>
    </div>
  )
}
