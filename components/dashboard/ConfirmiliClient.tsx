'use client'
import { useState } from 'react'
import {
  Bell, ChevronDown, X, WholeWord, Phone, TrendingUp, Package,
  Truck, Link2, Calculator, Users, Settings, Video, Bot, QrCode,
  BarChart2, Map, CheckSquare, Warehouse, ArrowUpDown, DollarSign,
  Filter, Plus, Search, RefreshCw, Trash2, Edit2, Eye, Download,
  SlidersHorizontal, Calendar, AlignLeft, ChevronRight, ChevronLeft,
  AlertTriangle, Info, Wifi, WifiOff,
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

// Algerian wilayas sample
const WILAYAS58 = [
  'أدرار','الشلف','الأغواط','أم البواقي','باتنة','بجاية','بسكرة','بشار',
  'البليدة','البويرة','تمنراست','تبسة','تلمسان','تيارت','تيزي وزو','الجزائر',
  'الجلفة','جيجل','سطيف','سعيدة','سكيكدة','سيدي بلعباس','عنابة','قالمة',
  'قسنطينة','المدية','مستغانم','المسيلة','معسكر','ورقلة','وهران','البيض',
  'إليزي','برج بوعريريج','بومرداس','الطارف','تندوف','تيسمسيلت','الوادي',
  'خنشلة','سوق أهراس','تيبازة','ميلة','عين الدفلى','النعامة','عين تموشنت',
  'غرداية','غليزان','تيميمون','برج باجي مختار','أولاد جلال','بني عباس',
  'عين صالح','عين قزام','تقرت','جانت','المغير','المنيعة',
]

const STATS_TABS = ['احصائيات المداخيل','احصائيات التأكيد','إحصائيات التوصيل','أفضل 5 مؤشرات']
const CONFIRM_STATUSES_STATIC = [
  { key:'confirmed', label:'المؤكدة',  color:'#198754' },
  { key:'cancelled', label:'الملغاة',  color:'#DC3545' },
  { key:'failed',    label:'الفاشلة',  color:'#FFC107' },
  { key:'pending',   label:'المعلقة',  color:'#0DCAF0' },
  { key:'postponed', label:'مؤجلة',    color:'#7B2FBE' },
  { key:'duplicate', label:'مكررة',    color:'#212529' },
]
const PIE_COLORS = ['#198754','#DC3545','#FFC107','#0D6EFD']
const CHART_DEMO = Array.from({length:8},(_,i) => ({
  date: `${i+1}/5`,
  income:0, delivery_cost:0, net:0,
  confirmed:0, failed:0, pending:0, cancelled:0,
}))
const DELIVERY_DEMO = WILAYAS58.slice(0,10).map(w => ({
  wilaya: w, delivered:0, returned:0, rate:0,
}))
const COMING_SOON = (
  <div className="flex flex-col items-center justify-center py-24" style={{ color: 'var(--color-text-muted)' }}>
    <span className="text-5xl mb-4">🤖</span>
    <p className="text-lg font-semibold" style={{ color: 'var(--color-text-secondary)' }}>COMING SOON...</p>
    <p className="text-sm mt-1">Cooking our product</p>
  </div>
)

const TUTORIALS = [
  {n:'01',title:'مقدمة'},{n:'02',title:'الإحصائيات'},{n:'03',title:'إعدادات الحساب'},
  {n:'04',title:'ربط المتجر'},{n:'05',title:'إضافة منتج'},{n:'06',title:'فريق العمل'},
  {n:'07',title:'قنوات البيع'},{n:'08',title:'جدول الطلبات ج1'},{n:'09',title:'جدول الطلبات ج2'},
  {n:'10',title:'جدول الطلبات ج3'},{n:'11',title:'جدول التتبع'},{n:'12',title:'المخزون'},
  {n:'13',title:'فريق العمل'},{n:'14',title:'الحسابات'},{n:'15',title:'تخصيص شركات بالولايات'},
  {n:'16',title:'رجل التوصيل'},{n:'17',title:'تحديث الرمز'},{n:'18',title:'ربط ZR Express'},
  {n:'19',title:'تقرير الإرسال'},
]

interface Props {
  storeId?: string
  storeName?: string
  plan?: string
  initialOrders?: any[]
  initialProducts?: any[]
}

export default function ConfirmiliClient({ storeId='', storeName='متجري', plan='free', initialOrders=[], initialProducts=[] }: Props) {
  const [activeTab,    setActiveTab]    = useState('statistics')
  const [statsTab,     setStatsTab]     = useState(0)
  const [notifOpen,    setNotifOpen]    = useState(false)
  const [notifTab,     setNotifTab]     = useState(0)
  const [billingOpen,  setBillingOpen]  = useState(false)
  const [ordersPerPage,setOrdersPP]     = useState(50)
  const [delivSubTab,  setDelivSubTab]  = useState(0)
  const [teamSubTab,   setTeamSubTab]   = useState(0)
  const [financeSubTab,setFinanceSubTab]= useState(0)
  const [storeSubTab,  setStoreSubTab]  = useState(0)
  const [settingsTab,  setSettingsTab]  = useState(0)
  const [tutSearch,    setTutSearch]    = useState('')
  const [orderSearch,  setOrderSearch]  = useState('')

  // Computed real stats from initialOrders
  const delivered  = initialOrders.filter(o => o.status === 'delivered')
  const cancelled  = initialOrders.filter(o => o.status === 'cancelled')
  const confirmed  = initialOrders.filter(o => o.status === 'confirmed')

  // Wilaya stats
  const wilayaStats = initialOrders.reduce((acc: Record<string, {delivered:number;returned:number;total:number}>, o) => {
    const name = (o.wilaya as any)?.name_ar ?? 'غير محدد'
    if (!acc[name]) acc[name] = {delivered:0,returned:0,total:0}
    acc[name].total++
    if (o.status === 'delivered') acc[name].delivered++
    if (o.status === 'returned') acc[name].returned++
    return acc
  }, {})
  const wilayaRows = Object.entries(wilayaStats)
    .sort(([,a],[,b]) => b.total - a.total)
    .slice(0, 20)
  const totalRevenue      = delivered.reduce((s,o) => s+o.total,0)
  const totalDeliveryFee  = delivered.reduce((s,o) => s+o.delivery_fee,0)
  const netRevenue        = totalRevenue - totalDeliveryFee
  const confirmedPct      = initialOrders.length ? Math.round((confirmed.length+delivered.length)/initialOrders.length*100) : 0
  const cancelPct         = initialOrders.length ? Math.round(cancelled.length/initialOrders.length*100) : 0
  const filteredOrders    = orderSearch ? initialOrders.filter(o =>
    o.customer_name?.toLowerCase().includes(orderSearch.toLowerCase()) ||
    o.customer_phone?.includes(orderSearch) ||
    o.order_number?.toLowerCase().includes(orderSearch.toLowerCase())
  ) : initialOrders

  const TabBar = ({ tabs, active, onChange }: { tabs: string[]; active: number; onChange: (i: number) => void }) => (
    <div className="tab-bar mb-4">
      {tabs.map((t, i) => (
        <button key={t} onClick={() => onChange(i)} className={`tab-item ${active === i ? 'active' : ''}`}>
          {t}
        </button>
      ))}
    </div>
  )

  const renderStatistics = () => {
    const tabs = ['احصائيات المداخيل','احصائيات التأكيد','إحصائيات التوصيل','أفضل 5 مؤشرات']

    // Compute real revenue by day
    const revenueByDay: Record<string, {income:number;delivery_cost:number;net:number;confirmed:number;failed:number;pending:number;cancelled:number}> = {}
    initialOrders.forEach(o => {
      const d = o.created_at?.slice(5,10) ?? 'unknown'
      if (!revenueByDay[d]) revenueByDay[d] = {income:0,delivery_cost:0,net:0,confirmed:0,failed:0,pending:0,cancelled:0}
      if (o.status === 'delivered') {
        revenueByDay[d].income += o.total ?? 0
        revenueByDay[d].delivery_cost += o.delivery_fee ?? 0
        revenueByDay[d].net += (o.total ?? 0) - (o.delivery_fee ?? 0)
      }
      if (o.status === 'confirmed'||o.status === 'delivered') revenueByDay[d].confirmed++
      if (o.status === 'cancelled') revenueByDay[d].cancelled++
      if (o.status === 'new') revenueByDay[d].pending++
    })
    const chartData = Object.entries(revenueByDay).sort(([a],[b]) => a.localeCompare(b))
      .map(([date, vals]) => ({date, ...vals}))

    return (
      <div>
        {/* Global filters */}
        <div className="flex flex-wrap gap-2 mb-4">
          {['كل وقت','اليوم','الأمس','أسبوع','شهر'].map(f => (
            <button key={f} className="btn btn-sm" style={{ border:'1px solid var(--color-border)', background:'#fff', color:'var(--color-text-secondary)' }}>{f}</button>
          ))}
          <button className="btn btn-sm" style={{ border:'1px solid var(--color-border)', background:'#fff', color:'var(--color-text-secondary)' }}><Calendar size={13}/></button>
          <button className="btn btn-sm" style={{ border:'1px solid var(--color-border)', background:'#fff', color:'var(--color-text-secondary)' }}>إعادة الضبط</button>
          <select className="input text-sm h-8 w-36"><option>كل المنتجات</option></select>
          <select className="input text-sm h-8 w-40"><option>شركة التوصيل</option></select>
          <select className="input text-sm h-8 w-32"><option>المصدر</option></select>
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
                <LineChart data={chartData.length > 0 ? chartData : CHART_DEMO}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#F1F3F5"/>
                  <XAxis dataKey="date" tick={{fontSize:10,fill:'#868E96'}}/>
                  <YAxis tick={{fontSize:10,fill:'#868E96'}}/>
                  <Tooltip/>
                  <Legend/>
                  <Line type="monotone" dataKey="income" stroke="#0D6EFD" strokeWidth={2} dot={false} name="إجمالي الدخل"/>
                  <Line type="monotone" dataKey="delivery_cost" stroke="#DC3545" strokeWidth={2} dot={false} name="مصاريف التوصيل"/>
                  <Line type="monotone" dataKey="net" stroke="#198754" strokeWidth={2} dot={false} name="صافي الدخل"/>
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        {statsTab === 1 && (
          <div className="space-y-4">
            <div className="flex flex-wrap gap-2 mb-2">
              <select className="input text-sm h-8 w-36"><option>عامل</option></select>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {CONFIRM_STATUSES_STATIC.map(s => {
                const count = initialOrders.filter(o => o.status === s.key).length
                return (
                <div key={s.key} className="card p-4 flex items-center justify-between">
                  <div>
                    <p className="font-bold text-xl" style={{ color: s.color, fontFamily: 'var(--font-primary)' }}>{count}</p>
                    <p className="text-xs mt-0.5" style={{ color: 'var(--color-text-muted)', fontFamily: 'var(--font-arabic)' }}>{s.label}</p>
                  </div>
                  <button className="flex items-center gap-1 text-xs" style={{ color: 'var(--color-text-muted)' }}>
                    <Trash2 size={12}/>({count})
                  </button>
                </div>
              )
              })}
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="card p-4">
                <h3 className="font-semibold text-sm mb-3" style={{ fontFamily: 'var(--font-arabic)' }}>تطور التأكيدات</h3>
                <ResponsiveContainer width="100%" height={180}>
                  <LineChart data={chartData.length > 0 ? chartData : CHART_DEMO}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#F1F3F5"/>
                    <XAxis dataKey="date" tick={{fontSize:10,fill:'#868E96'}}/>
                    <YAxis tick={{fontSize:10,fill:'#868E96'}}/>
                    <Tooltip/>
                    <Line type="monotone" dataKey="confirmed" stroke="#198754" strokeWidth={2} dot={false}/>
                    <Line type="monotone" dataKey="failed"    stroke="#FFC107" strokeWidth={2} dot={false}/>
                    <Line type="monotone" dataKey="pending"   stroke="#0D6EFD" strokeWidth={2} dot={false}/>
                    <Line type="monotone" dataKey="cancelled" stroke="#DC3545" strokeWidth={2} dot={false}/>
                  </LineChart>
                </ResponsiveContainer>
              </div>
              <div className="card p-4">
                <h3 className="font-semibold text-sm mb-3" style={{ fontFamily: 'var(--font-arabic)' }}>توزيع الحالات</h3>
                <ResponsiveContainer width="100%" height={180}>
                  <PieChart>
                    <Pie data={[{name:'مؤكدة',value:1},{name:'فاشلة',value:1},{name:'معلقة',value:1},{name:'ملغاة',value:1}]}
                      cx="50%" cy="50%" outerRadius={70} dataKey="value">
                      {PIE_COLORS.map((c,i) => <Cell key={i} fill={c}/>)}
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
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="card p-4">
                <h3 className="font-semibold text-sm mb-3" style={{ fontFamily: 'var(--font-arabic)' }}>نسب التوصيل والإرجاع</h3>
                <ResponsiveContainer width="100%" height={200}>
                  <LineChart data={chartData.length > 0 ? chartData : CHART_DEMO}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#F1F3F5"/>
                    <XAxis dataKey="date" tick={{fontSize:10}}/>
                    <YAxis tick={{fontSize:10}}/>
                    <Tooltip/>
                    <Line type="monotone" dataKey="confirmed" stroke="#198754" strokeWidth={2} dot={false} name="نسبة التوصيل"/>
                    <Line type="monotone" dataKey="cancelled" stroke="#DC3545" strokeWidth={2} dot={false} name="نسبة الإرجاع"/>
                  </LineChart>
                </ResponsiveContainer>
              </div>
              <div className="card p-4">
                <h3 className="font-semibold text-sm mb-3" style={{ fontFamily: 'var(--font-arabic)' }}>المسلمة / المرجعة</h3>
                <ResponsiveContainer width="100%" height={200}>
                  <RadarChart data={[{subject:'مسلمة',A:0,B:0},{subject:'مرجعة',A:0,B:0}]}>
                    <PolarGrid/>
                    <PolarAngleAxis dataKey="subject" tick={{fontSize:11}}/>
                    <PolarRadiusAxis/>
                    <Radar name="مسلمة" dataKey="A" stroke="#198754" fill="#198754" fillOpacity={0.3}/>
                    <Radar name="مرجعة" dataKey="B" stroke="#DC3545" fill="#DC3545" fillOpacity={0.3}/>
                  </RadarChart>
                </ResponsiveContainer>
              </div>
            </div>
            <div className="card overflow-hidden">
              <div className="px-4 py-3 border-b font-semibold text-sm" style={{ borderColor: 'var(--color-border)', fontFamily: 'var(--font-arabic)' }}>
                احصائيات الولايات
              </div>
              <div className="overflow-x-auto">
                <table className="data-table">
                  <thead>
                    <tr>
                      {['الولاية','المسلمة ↕','المرجعة ↕','نسبة التوصيل %'].map(h => <th key={h}>{h}</th>)}
                    </tr>
                  </thead>
                  <tbody>
                    {wilayaRows.length === 0 ? (
                      <tr><td colSpan={4} className="text-center py-8 text-sm" style={{color:'var(--color-text-muted)'}}>لا توجد بيانات توصيل بعد</td></tr>
                    ) : wilayaRows.map(([name, stats]) => {
                      const rate = stats.total > 0 ? Math.round(stats.delivered / stats.total * 100) : 0
                      return (
                      <tr key={name}>
                        <td className="font-medium">{name}</td>
                        <td className="text-sm" style={{color:'#198754',fontFamily:'var(--font-primary)'}}>{stats.delivered}</td>
                        <td className="text-sm" style={{color:'#DC3545',fontFamily:'var(--font-primary)'}}>{stats.returned}</td>
                        <td>
                          <div className="flex items-center gap-2">
                            <div className="flex-1 h-1.5 rounded-full" style={{background:'#F1F3F5'}}>
                              <div className="h-1.5 rounded-full" style={{width:`${rate}%`,background:'#198754'}}/>
                            </div>
                            <span className="text-xs" style={{fontFamily:'var(--font-primary)'}}>{rate}%</span>
                          </div>
                        </td>
                      </tr>
                    )})}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {statsTab === 3 && (() => {
          // Top wilayas by order count
          const wilayaCount = initialOrders.reduce((acc: Record<string,number>, o) => {
            const n = (o.wilaya as any)?.name_ar ?? 'غير محدد'
            acc[n] = (acc[n] ?? 0) + 1; return acc
          }, {})
          const topWilayas = Object.entries(wilayaCount).sort(([,a],[,b]) => b-a).slice(0,5)
          // Top sources
          const srcCount = initialOrders.reduce((acc: Record<string,number>, o) => {
            const s = o.utm_source ?? o.source ?? 'مباشر'
            acc[s] = (acc[s] ?? 0) + 1; return acc
          }, {})
          const topSources = Object.entries(srcCount).sort(([,a],[,b]) => b-a).slice(0,5)
          // Top products
          const prodCount: Record<string,number> = {}
          initialOrders.forEach(o => {
            (o.items as any[] ?? []).forEach((i: any) => {
              prodCount[i.product_name] = (prodCount[i.product_name] ?? 0) + (i.quantity ?? 1)
            })
          })
          const topProducts = Object.entries(prodCount).sort(([,a],[,b]) => b-a).slice(0,5)

          const Bar = ({label,count,max}:{label:string,count:number,max:number}) => (
            <div className="flex items-center gap-2">
              <span className="text-xs truncate w-24 flex-shrink-0" style={{color:'var(--color-text-secondary)'}}>{label}</span>
              <div className="flex-1 h-2 rounded-full" style={{background:'#F1F3F5'}}>
                <div className="h-2 rounded-full" style={{width:`${max?count/max*100:0}%`,background:'var(--color-accent)'}}/>
              </div>
              <span className="text-xs w-6 text-left" style={{color:'var(--color-text-muted)',fontFamily:'var(--font-primary)'}}>{count}</span>
            </div>
          )
          const maxW = topWilayas[0]?.[1] ?? 1
          const maxS = topSources[0]?.[1] ?? 1
          const maxP = topProducts[0]?.[1] ?? 1

          return (
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="card p-4">
                <h3 className="font-semibold text-sm mb-3" style={{fontFamily:'var(--font-arabic)',color:'var(--color-text-primary)'}}>أفضل الولايات</h3>
                {topWilayas.length ? topWilayas.map(([w,c]) => <Bar key={w} label={w} count={c} max={maxW}/>) : <p className="text-xs text-center py-4" style={{color:'var(--color-text-muted)'}}>لا توجد بيانات</p>}
              </div>
              <div className="card p-4">
                <h3 className="font-semibold text-sm mb-3" style={{fontFamily:'var(--font-arabic)',color:'var(--color-text-primary)'}}>أفضل المصادر</h3>
                {topSources.length ? topSources.map(([s,c]) => <Bar key={s} label={s} count={c} max={maxS}/>) : <p className="text-xs text-center py-4" style={{color:'var(--color-text-muted)'}}>لا توجد بيانات</p>}
              </div>
              <div className="card p-4">
                <h3 className="font-semibold text-sm mb-3" style={{fontFamily:'var(--font-arabic)',color:'var(--color-text-primary)'}}>أفضل المنتجات</h3>
                {topProducts.length ? topProducts.map(([p,c]) => <Bar key={p} label={p.slice(0,18)} count={c} max={maxP}/>) : <p className="text-xs text-center py-4" style={{color:'var(--color-text-muted)'}}>لا توجد بيانات</p>}
              </div>
            </div>
          </div>
          )
        })()}
      </div>
    )
  }

  const renderOrders = () => (
    <div className="space-y-3">
      {/* Action bar */}
      <div className="flex flex-wrap gap-2 items-center">
        <button className="btn btn-sm gap-1" style={{border:'1px solid var(--color-border)',background:'#fff',color:'var(--color-text-secondary)'}}>
          <AlignLeft size={13}/>تقرير الإرسال
        </button>
        <button className="btn btn-sm gap-1" style={{border:'1px solid var(--color-border)',background:'#fff',color:'var(--color-text-secondary)'}}>
          <Trash2 size={13}/>سلة المهملات (0)
        </button>
        <button className="btn btn-sm p-2" style={{border:'1px solid var(--color-border)',background:'#fff'}}><RefreshCw size={13}/></button>
        <button className="btn btn-sm gap-1" style={{border:'1px solid var(--color-border)',background:'#fff',color:'var(--color-text-secondary)'}}>
          <SlidersHorizontal size={13}/>إعدادات الأعمدة
        </button>
        {['شهر','أسبوع','الأمس','اليوم'].map(t => (
          <button key={t} className="btn btn-sm" style={{border:'1px solid var(--color-border)',background:'#fff',color:'var(--color-text-secondary)',fontFamily:'var(--font-arabic)'}}>
            {t}
          </button>
        ))}
        <div className="flex-1"/>
        <div className="relative">
          <Search size={13} className="absolute right-3 top-1/2 -translate-y-1/2" style={{color:'var(--color-text-muted)'}}/>
          <input value={orderSearch} onChange={e=>setOrderSearch(e.target.value)} placeholder="بحث..." className="input pr-8 text-sm h-8 w-48"/>
        </div>
      </div>

      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="data-table" style={{fontFamily:'var(--font-arabic)'}}>
            <thead>
              <tr>
                <th><input type="checkbox" className="w-3.5 h-3.5 accent-[#0D6EFD]"/></th>
                {['المصدر','رقم الطلبية','التاريخ','الإسم','الهاتف','الحالة','الولاية','المنتج','السعر الكلي','إجراءات'].map(h=><th key={h}>{h}</th>)}
              </tr>
            </thead>
            <tbody>
              {filteredOrders.length === 0 ? (
                <tr><td colSpan={11} className="text-center py-12 text-sm" style={{color:'var(--color-text-muted)'}}>لا توجد طلبات بعد</td></tr>
              ) : filteredOrders.slice(0, ordersPerPage).map(o => (
                <tr key={o.id}>
                  <td><input type="checkbox" className="w-3.5 h-3.5 accent-[#0D6EFD]"/></td>
                  <td className="text-xs" style={{color:'var(--color-text-muted)'}}>{o.source ?? 'direct'}</td>
                  <td className="font-mono text-xs font-medium" style={{color:'var(--color-accent)'}}>{o.order_number}</td>
                  <td className="text-xs" style={{color:'var(--color-text-muted)'}}>{new Date(o.created_at).toLocaleDateString('ar-DZ')}</td>
                  <td className="text-sm font-medium" style={{color:'var(--color-text-primary)'}}>{o.customer_name}</td>
                  <td className="text-xs font-mono" style={{color:'var(--color-text-secondary)'}}>{o.customer_phone}</td>
                  <td><StatusBadge status={o.status}/></td>
                  <td className="text-xs" style={{color:'var(--color-text-secondary)'}}>{(o.wilaya as any)?.name_ar ?? '—'}</td>
                  <td className="text-xs" style={{color:'var(--color-text-muted)'}}>{(o.items?.[0] as any)?.product_name?.slice(0,20) ?? '—'}</td>
                  <td className="font-semibold text-sm" style={{color:'var(--color-accent)',fontFamily:'var(--font-primary)'}}>{o.total?.toLocaleString('ar-DZ')} دج</td>
                  <td>
                    <a href={`/orders/${o.id}`} className="p-1.5 rounded hover:bg-[#EBF5FF] transition-colors inline-block">
                      <Eye size={12} style={{color:'var(--color-accent)'}}/>
                    </a>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="flex items-center justify-between px-4 py-3 border-t" style={{borderColor:'var(--color-border)'}}>
          <div className="flex items-center gap-2">
            <select value={ordersPerPage} onChange={e=>setOrdersPP(+e.target.value)} className="input h-7 text-xs px-2 w-16">
              {[10,20,50,100].map(n=><option key={n}>{n}</option>)}
            </select>
            <span className="text-xs" style={{color:'var(--color-text-muted)',fontFamily:'var(--font-arabic)'}}>عرض {Math.min(ordersPerPage,filteredOrders.length)} من {filteredOrders.length}</span>
          </div>
          <div className="flex gap-1">
            {['«','‹','›','»'].map(b=><button key={b} className="w-7 h-7 flex items-center justify-center rounded text-xs border disabled:opacity-40" style={{borderColor:'var(--color-border)'}}>{b}</button>)}
          </div>
        </div>
      </div>
    </div>
  )

  const renderTracking = () => (
    <div className="space-y-3">
      <div className="flex gap-2 mb-3">
        {['شركة التوصيل','رجل التوصيل'].map((t,i) => (
          <button key={t} className={`tab-item ${i===0?'active':''}`}>{t}</button>
        ))}
      </div>
      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="data-table" style={{fontFamily:'var(--font-arabic)'}}>
            <thead><tr>{['رجل التوصيل','الحالة','الهاتف','الاسم','تحقق','ملاحظات','الولاية','المدينة','المنتج','الإجمالي','التأكيد'].map(h=><th key={h}>{h}</th>)}</tr></thead>
            <tbody><tr><td colSpan={11} className="text-center py-12 text-sm" style={{color:'var(--color-text-muted)'}}>لا توجد طلبات للتتبع</td></tr></tbody>
          </table>
        </div>
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
        <button className="btn btn-sm" style={{border:'1px solid var(--color-border)',background:'#fff',color:'var(--color-error)',fontFamily:'var(--font-arabic)'}}>حذف متعدد (0)</button>
        <div className="relative flex-1 max-w-xs">
          <Search size={13} className="absolute right-3 top-1/2 -translate-y-1/2" style={{color:'var(--color-text-muted)'}}/>
          <input placeholder="بحث..." className="input pr-8 text-sm h-8"/>
        </div>
      </div>
      <div className="card overflow-hidden">
        <table className="data-table" style={{fontFamily:'var(--font-arabic)'}}>
          <thead><tr>{['الصورة','الاسم','المرجع','السعر','الإجراءات'].map(h=><th key={h}>{h}</th>)}</tr></thead>
          <tbody>
            {initialProducts.length === 0 ? (
              <tr><td colSpan={5} className="text-center py-12 text-sm" style={{color:'var(--color-text-muted)'}}>لا توجد منتجات — أضف منتجاتك من صفحة المنتجات</td></tr>
            ) : initialProducts.map((p: any) => (
              <tr key={p.id}>
                <td>
                  <div className="w-10 h-10 rounded-lg overflow-hidden flex-shrink-0 flex items-center justify-center" style={{background:'var(--color-bg-soft)'}}>
                    {(p.images as any[])?.[0]?.url
                      ? <img src={(p.images as any[])[0].url} alt="" className="w-full h-full object-cover"/>
                      : <span className="text-sm">{(p.name_ar??p.name)?.[0]??'📦'}</span>
                    }
                  </div>
                </td>
                <td className="font-medium text-sm" style={{color:'var(--color-text-primary)'}}>{p.name_ar??p.name}</td>
                <td className="text-xs font-mono" style={{color:'var(--color-text-muted)'}}>{p.sku??'—'}</td>
                <td className="font-semibold text-sm" style={{color:'var(--color-accent)',fontFamily:'var(--font-primary)'}}>{p.price?.toLocaleString('ar-DZ')} دج</td>
                <td>
                  <a href={`/products/${p.id}`} className="btn btn-sm" style={{background:'#EBF5FF',color:'var(--color-accent)'}}>
                    <Edit2 size={12}/>تعديل
                  </a>
                </td>
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
            <table className="data-table" style={{fontFamily:'var(--font-arabic)'}}>
              <thead><tr>{['اسم الشركة','الاسم القصير','جماعي؟','الحالة','الإجراءات'].map(h=><th key={h}>{h}</th>)}</tr></thead>
              <tbody><tr><td colSpan={5} className="text-center py-12 text-sm" style={{color:'var(--color-text-muted)'}}>لا توجد شركات توصيل</td></tr></tbody>
            </table>
          </div>
        )}
        {delivSubTab === 1 && (
          <div className="space-y-3">
            <div className="p-3 rounded-lg border flex items-start gap-2" style={{borderColor:'var(--color-error)',background:'var(--color-error-soft)'}}>
              <AlertTriangle size={14} style={{color:'var(--color-error)',flexShrink:0,marginTop:1}}/>
              <p className="text-xs" style={{color:'var(--color-error)',fontFamily:'var(--font-arabic)'}}>
                أسعار التوصيل المعلنة هي الأسعار التي تُعلنها لزبائنك. قد تختلف عن الأسعار الحقيقية.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <select className="input text-sm h-8 w-44"><option>اختر قائمة أسعار</option></select>
              <select className="input text-sm h-8 w-44"><option>قائمة المنتجات</option></select>
              <button className="btn btn-primary btn-sm" style={{fontFamily:'var(--font-arabic)'}}>+ اضافة قائمة أسعار</button>
            </div>
            <div className="card overflow-hidden">
              <div className="flex border-b px-4" style={{borderColor:'var(--color-border)'}}>
                {['الولاية','مكتب','المنزل'].map((t,i)=>(
                  <button key={t} className={`tab-item ${i===0?'active':''}`}>{t}</button>
                ))}
              </div>
              <table className="data-table" style={{fontFamily:'var(--font-arabic)'}}>
                <thead><tr>{['الولاية','سعر المنزل','سعر المكتب','مراجعة'].map(h=><th key={h}>{h}</th>)}</tr></thead>
                <tbody>
                  {WILAYAS58.map(w=>(
                    <tr key={w}>
                      <td className="font-medium">{w}</td>
                      <td><input type="number" placeholder="0" className="input h-7 text-xs px-2 w-20"/></td>
                      <td><input type="number" placeholder="0" className="input h-7 text-xs px-2 w-20"/></td>
                      <td><button className="btn btn-sm btn-ghost text-xs" style={{fontFamily:'var(--font-arabic)'}}>راجع</button></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
        {delivSubTab === 2 && (
          <div className="space-y-3">
            <div className="p-3 rounded-lg border flex items-start gap-2" style={{borderColor:'var(--color-accent)',background:'var(--color-accent-soft)'}}>
              <Info size={14} style={{color:'var(--color-accent)',flexShrink:0,marginTop:1}}/>
              <p className="text-xs" style={{color:'var(--color-accent)',fontFamily:'var(--font-arabic)'}}>يمكنك تعيين شركات توصيل معينة لكل ولاية.</p>
            </div>
            <button className="btn btn-primary btn-sm" style={{fontFamily:'var(--font-arabic)'}}>تخصيص شركات معينة في ولايات محددة</button>
          </div>
        )}
        {delivSubTab === 3 && (
          <div className="space-y-3">
            <div className="p-3 rounded-lg border flex items-start gap-2" style={{borderColor:'var(--color-border)',background:'var(--color-bg-soft)'}}>
              <Info size={14} style={{color:'var(--color-text-muted)',flexShrink:0,marginTop:1}}/>
              <p className="text-xs" style={{color:'var(--color-text-secondary)',fontFamily:'var(--font-arabic)'}}>أسعار التوصيل الحقيقية هي ما تدفعه فعلياً لشركة التوصيل.</p>
            </div>
            <select className="input text-sm h-8 w-44"><option>شركة التوصيل</option></select>
          </div>
        )}
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
            <table className="data-table" style={{fontFamily:'var(--font-arabic)'}}>
              <thead><tr>{['المنصة','الاسم','الحالة','الإجراءات'].map(h=><th key={h}>{h}</th>)}</tr></thead>
              <tbody><tr><td colSpan={4} className="text-center py-12 text-sm" style={{color:'var(--color-text-muted)'}}>لا توجد متاجر مربوطة</td></tr></tbody>
            </table>
          </div>
        )}
        {storeSubTab === 1 && (
          <div className="space-y-3">
            <div className="flex gap-2">
              <button className="btn btn-sm" style={{border:'1px solid var(--color-border)',background:'#fff',fontFamily:'var(--font-arabic)'}}>+ حساب Google</button>
              <button className="btn btn-sm" style={{border:'1px solid var(--color-border)',background:'#fff',fontFamily:'var(--font-arabic)'}}>+ شيت</button>
            </div>
            <div className="card overflow-hidden">
              <table className="data-table"><thead><tr><th>اسم الشيت</th><th>الحساب</th><th>الحالة</th></tr></thead>
              <tbody><tr><td colSpan={3} className="text-center py-10 text-sm" style={{color:'var(--color-text-muted)'}}>لا توجد شيتات</td></tr></tbody></table>
            </div>
          </div>
        )}
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
            <div className="flex flex-wrap gap-2 items-center">
              {['منتج حقيقي','منتج تجريبي'].map((t,i) => (
                <button key={t} className="btn btn-sm" style={{border:'1px solid var(--color-border)',background:i===0?'var(--color-accent)':'#fff',color:i===0?'#fff':'var(--color-text-secondary)',fontFamily:'var(--font-arabic)'}}>
                  {t}
                </button>
              ))}
              <select className="input text-sm h-8 w-36"><option>المنتج</option></select>
              <select className="input text-sm h-8 w-40"><option>شركة التوصيل</option></select>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {(() => {
                const n = initialOrders.length
                const pct = (v:number) => n ? `${v} (${Math.round(v/n*100)}%)` : '0 (0%)'
                return [
                  {label:'جميع الطلبيات',v:String(n)},
                  {label:'مؤكدة',v:pct(confirmed.length)},
                  {label:'ملغاة',v:pct(cancelled.length)},
                  {label:'قيد التأكيد',v:pct(initialOrders.filter(o=>o.status==='new').length)},
                  {label:'مؤكدة مرسلة',v:pct(initialOrders.filter(o=>['shipped','in_transit'].includes(o.status)).length)},
                  {label:'مسلمة',v:pct(delivered.length)},
                  {label:'مرجعة',v:pct(initialOrders.filter(o=>o.status==='returned').length)},
                  {label:'قيد التوصيل',v:pct(initialOrders.filter(o=>o.status==='processing').length)},
                ]
              })().map(c => (
                <div key={c.label} className="card p-3 text-center">
                  <p className="font-bold text-base" style={{color:'var(--color-accent)',fontFamily:'var(--font-primary)'}}>{c.v}</p>
                  <p className="text-xs mt-0.5" style={{color:'var(--color-text-muted)',fontFamily:'var(--font-arabic)'}}>{c.label}</p>
                </div>
              ))}
            </div>
            <div className="flex gap-2">
              <button className="btn btn-sm" style={{background:'var(--color-success)',color:'#fff',fontFamily:'var(--font-arabic)'}}>تحضير الاكسال</button>
              <button className="btn btn-sm" style={{border:'1px solid var(--color-border)',background:'#fff',fontFamily:'var(--font-arabic)'}}>السجل</button>
            </div>
            <p className="text-xs" style={{color:'var(--color-text-muted)',fontFamily:'var(--font-arabic)'}}>كل الحسابات بالدينار الجزائري (دج)</p>
            <div className="card p-4 space-y-4">
              <h3 className="font-semibold text-sm" style={{fontFamily:'var(--font-arabic)'}}>أدخل تكاليفك</h3>
              {[
                {label:'سعر التأكيد',key:'confirm_cost'},
                {label:'سعر التغليف',key:'pack_cost'},
                {label:'سعر التتبع',key:'track_cost'},
              ].map(f => (
                <div key={f.key} className="flex items-center gap-3">
                  <label className="text-sm w-32 flex-shrink-0" style={{fontFamily:'var(--font-arabic)',color:'var(--color-text-secondary)'}}>{f.label}</label>
                  <input type="number" placeholder="0" className="input text-sm h-8 w-24"/>
                  <label className="flex items-center gap-1.5 text-xs cursor-pointer" style={{color:'var(--color-text-muted)',fontFamily:'var(--font-arabic)'}}>
                    <input type="checkbox" className="w-3.5 h-3.5 accent-[#0D6EFD]"/>لكل طلب مؤكد
                  </label>
                  <label className="flex items-center gap-1.5 text-xs cursor-pointer" style={{color:'var(--color-text-muted)',fontFamily:'var(--font-arabic)'}}>
                    <input type="checkbox" className="w-3.5 h-3.5 accent-[#0D6EFD]"/>لكل طلب تم توصيله
                  </label>
                </div>
              ))}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-sm" style={{fontFamily:'var(--font-arabic)',color:'var(--color-text-secondary)'}}>تكلفة أخرى</label>
                  <button className="btn btn-sm gap-1" style={{border:'1px solid var(--color-border)',background:'#fff',color:'var(--color-text-secondary)',fontFamily:'var(--font-arabic)'}}>
                    <Plus size={12}/>إضافة
                  </button>
                </div>
              </div>
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
        {teamSubTab < 2 && (
          <div className="card overflow-hidden">
            <table className="data-table" style={{fontFamily:'var(--font-arabic)'}}>
              <thead><tr>{['الاسم','الهاتف','البريد','الحالة','الدور','تاريخ البداية','الإجراءات'].map(h=><th key={h}>{h}</th>)}</tr></thead>
              <tbody><tr><td colSpan={7} className="text-center py-12 text-sm" style={{color:'var(--color-text-muted)'}}>لا يوجد أعضاء</td></tr></tbody>
            </table>
          </div>
        )}
        {teamSubTab === 2 && (
          <div className="text-center py-12 text-sm" style={{color:'var(--color-text-muted)',fontFamily:'var(--font-arabic)'}}>لا توجد علاقات مدير-عضو</div>
        )}
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
                <div key={l}>
                  <label className="block text-xs mb-1" style={{color:'var(--color-text-muted)',fontFamily:'var(--font-arabic)'}}>{l}</label>
                  <input type="password" className="input text-sm h-9"/>
                </div>
              ))}
              <button className="btn btn-sm" style={{background:'var(--color-success)',color:'#fff',fontFamily:'var(--font-arabic)'}}>حفظ</button>
            </div>
            <div className="card p-5 space-y-4">
              <h3 className="font-semibold text-sm" style={{fontFamily:'var(--font-arabic)'}}>معلومات الحساب</h3>
              <div className="flex items-center gap-3">
                <div className="w-14 h-14 rounded-full border-2 border-dashed flex items-center justify-center cursor-pointer" style={{borderColor:'var(--color-border)'}}>
                  <Plus size={16} style={{color:'var(--color-text-muted)'}}/>
                </div>
                <p className="text-xs" style={{color:'var(--color-text-muted)',fontFamily:'var(--font-arabic)'}}>انقر لتغيير الصورة</p>
              </div>
              {[
                {l:'الإسم',v:''},
                {l:'اللقب',v:''},
                {l:'البريد الإلكتروني',v:'',dir:'ltr'},
                {l:'إسم المتجر',v:storeName},
              ].map(f => (
                <div key={f.l}>
                  <label className="block text-xs mb-1" style={{color:'var(--color-text-muted)',fontFamily:'var(--font-arabic)'}}>{f.l}</label>
                  <input className="input text-sm h-9" defaultValue={f.v} dir={(f as any).dir ?? 'rtl'}/>
                </div>
              ))}
              <button className="btn btn-sm" style={{background:'var(--color-success)',color:'#fff',fontFamily:'var(--font-arabic)'}}>حفظ</button>
            </div>
          </div>
        )}
        {settingsTab === 1 && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="card p-5 space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold text-sm" style={{fontFamily:'var(--font-arabic)'}}>سجل المدفوعات</h3>
                <label className="flex items-center gap-2 text-xs cursor-pointer" style={{fontFamily:'var(--font-arabic)'}}>
                  <input type="checkbox" className="w-3.5 h-3.5 accent-[#0D6EFD]"/>تجديد تلقاني
                </label>
              </div>
              <table className="data-table">
                <thead><tr><th>id</th><th>التاريخ</th><th>المبلغ (DA)</th><th>الإجراءات</th></tr></thead>
                <tbody><tr><td colSpan={4} className="text-center py-8 text-sm" style={{color:'var(--color-text-muted)'}}>لا توجد مدفوعات</td></tr></tbody>
              </table>
            </div>
            <div className="card p-5 space-y-3">
              <h3 className="font-semibold text-sm" style={{fontFamily:'var(--font-arabic)'}}>ملخص الرصيد</h3>
              <div className="grid grid-cols-2 gap-3">
                {[
                  {l:'إجمالي الإيرادات',v:`${totalRevenue.toLocaleString('ar-DZ')} دج`},
                  {l:'طلبات مسلمة',v:String(delivered.length)},
                  {l:'طلبات مؤكدة',v:String(confirmed.length)},
                  {l:'الخطة',v:plan.toUpperCase()},
                ].map(({l,v}) => (
                  <div key={l} className="p-3 rounded-lg text-center" style={{background:'var(--color-bg-soft)'}}>
                    <p className="font-bold text-sm" style={{color:'var(--color-accent)',fontFamily:'var(--font-primary)'}}>{v}</p>
                    <p className="text-xs mt-0.5" style={{color:'var(--color-text-muted)',fontFamily:'var(--font-arabic)'}}>{l}</p>
                  </div>
                ))}
              </div>
              <button className="btn btn-sm w-full" style={{background:'var(--color-success)',color:'#fff',fontFamily:'var(--font-arabic)'}}>إضافة رصيد</button>
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

  const renderQR = () => (
    <div className="flex flex-col items-center justify-center py-12 gap-4">
      <div className="w-56 h-56 border-2 border-dashed rounded-2xl flex items-center justify-center" style={{borderColor:'var(--color-border)'}}>
        <div className="text-center">
          <QrCode size={48} style={{color:'var(--color-text-muted)'}} className="mx-auto mb-2"/>
          <p className="text-xs" style={{color:'var(--color-text-muted)',fontFamily:'var(--font-arabic)'}}>كاميرا المسح</p>
        </div>
      </div>
      <div className="card p-3 text-center w-64">
        <p className="text-sm" style={{fontFamily:'var(--font-arabic)',color:'var(--color-text-secondary)'}}>النتيجة: لا توجد نتيجة بعد!</p>
      </div>
    </div>
  )

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
    qr:                renderQR,
  }

  return (
    <div className="flex flex-col h-full" dir="rtl">
      {/* Teal announcement banner */}
      <div className="flex items-center justify-center gap-3 px-4 py-2 text-white text-xs" style={{background:'#2BBFAD',fontFamily:'var(--font-arabic)'}}>
        <span>تم إضافة ميزة جديدة: تقرير الإرسال لمتابعة عمليات الإرسال بسهولة</span>
        <a href="#" className="underline font-semibold">رابط الفيديو</a>
      </div>

      {/* Confirmili page header */}
      <div className="flex items-center justify-between px-4 py-2.5 border-b bg-white flex-wrap gap-2" style={{borderColor:'var(--color-border)'}}>
        <div className="flex items-center gap-3">
          {/* Notifications */}
          <div className="relative">
            <button onClick={()=>setNotifOpen(o=>!o)} className="relative p-1.5 rounded-md hover:bg-[#F8F9FA] transition-colors">
              <Bell size={16} style={{color:'var(--color-text-secondary)'}}/>
              <span className="absolute top-0.5 right-0.5 w-4 h-4 rounded-full text-[9px] font-bold text-white flex items-center justify-center" style={{background:'var(--color-error)'}}>0</span>
            </button>
            {notifOpen && (
              <>
                <div className="fixed inset-0 z-10" onClick={()=>setNotifOpen(false)}/>
                <div className="absolute top-full mt-1 right-0 w-72 bg-white border rounded-xl shadow-lg z-20 overflow-hidden animate-scale-in" style={{borderColor:'var(--color-border)'}}>
                  <div className="flex border-b" style={{borderColor:'var(--color-border)'}}>
                    {['طلبات','تنبيه المخزون','اخفي'].map((t,i) => (
                      <button key={t} onClick={()=>setNotifTab(i)} className={`flex-1 py-2.5 text-xs font-medium transition-colors ${notifTab===i?'text-[#0D6EFD] border-b-2 border-[#0D6EFD]':'text-[#868E96]'}`}
                        style={{fontFamily:'var(--font-arabic)'}}>{t}</button>
                    ))}
                  </div>
                  <div className="p-3 text-center py-8 text-xs" style={{color:'var(--color-text-muted)',fontFamily:'var(--font-arabic)'}}>لا توجد إشعارات</div>
                </div>
              </>
            )}
          </div>
          <span className="badge badge-blue text-xs" style={{fontFamily:'var(--font-arabic)'}}>{plan === 'pro' ? 'Pro' : plan === 'elite' ? 'Elite' : 'Free'}</span>
        </div>
        <div className="flex items-center gap-3">
          <div className="text-xs" style={{color:'var(--color-text-muted)',fontFamily:'var(--font-arabic)'}}>الطلبات: <strong style={{color:'var(--color-accent)'}}>{initialOrders.length}</strong></div>
          <div className="text-xs" style={{color:'var(--color-text-muted)',fontFamily:'var(--font-arabic)'}}>المؤكدة: <strong style={{color:'#198754'}}>{confirmed.length}</strong></div>
          <a href="https://wa.me" target="_blank" rel="noopener noreferrer" className="p-1.5 rounded-md hover:bg-[#F8F9FA]">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="#25D366"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884"/></svg>
          </a>
        </div>
      </div>

      {/* Sub-navigation */}
      <div className="bg-white border-b overflow-x-auto scrollbar-none" style={{borderColor:'var(--color-border)'}}>
        <div className="flex px-4 min-w-max">
          {TABS.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-1.5 px-3 py-3 text-xs font-medium whitespace-nowrap transition-colors border-b-2 -mb-px ${
                activeTab === tab.id
                  ? 'text-[#0D6EFD] border-[#0D6EFD]'
                  : 'text-[#868E96] border-transparent hover:text-[#212529]'
              }`}
              style={{ fontFamily: 'var(--font-arabic)' }}
            >
              <tab.icon size={13} />
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto p-4 md:p-5" style={{ backgroundColor: 'var(--color-bg-soft)' }}>
        {SECTION_RENDERERS[activeTab]?.()}
      </div>
    </div>
  )
}
