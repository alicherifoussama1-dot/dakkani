export const dynamic = 'force-dynamic'
import { createServerClient, getActiveStore } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import { formatDZD, formatDate } from '@/lib/utils/format'
import Link from 'next/link'
import { ChevronRight, Phone, MapPin, Package, Truck } from 'lucide-react'
import OrderActions from '@/components/orders/OrderActions'

export async function generateMetadata({ params }: { params: { id: string } }) {
  return { title: `طلب #${params.id.slice(0, 8)}` }
}

const STATUS_MAP: Record<string, { label: string; color: string; bg: string }> = {
  new:         { label: 'جديد',          color: '#2BBFAD', bg: '#E8FAF8' },
  confirmed:   { label: 'مؤكد',          color: '#0D6EFD', bg: '#EBF5FF' },
  processing:  { label: 'قيد التجهيز',  color: '#6F42C1', bg: '#F3EEFF' },
  shipped:     { label: 'في الطريق',     color: '#FD7E14', bg: '#FFF3E0' },
  delivered:   { label: 'مُسلَّم',       color: '#28A745', bg: '#E8F5E9' },
  cancelled:   { label: 'ملغى',          color: '#DC3545', bg: '#FDECEA' },
  returned:    { label: 'مُرجَع',        color: '#6C757D', bg: '#F8F9FA' },
  failed:      { label: 'فاشل',          color: '#FFA500', bg: '#FFF3CD' },
  failed_1:    { label: 'فاشلة 01',      color: '#FFA500', bg: '#FFF3CD' },
  failed_2:    { label: 'فاشلة 02',      color: '#FF8C00', bg: '#FFE8C0' },
  failed_3:    { label: 'فاشلة 03',      color: '#DC3545', bg: '#FDECEA' },
  postponed:   { label: 'مؤجلة',         color: '#7B2FBE', bg: '#EEE5FF' },
  duplicate:   { label: 'مكررة',         color: '#212529', bg: '#F8F9FA' },
  in_transit:  { label: 'في الطريق',     color: '#FD7E14', bg: '#FFF3E0' },
}

const STATUS_STEPS = ['new','confirmed','processing','shipped','delivered']

export default async function OrderDetailPage({ params }: { params: { id: string } }) {
  const supabase = createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  const { activeStore: store } = await getActiveStore(supabase, user.id)
  if (!store) return null

  const { data: order } = await supabase
    .from('orders')
    .select(`*, wilaya:wilayas(name_ar, name_fr), commune:communes(name_ar), items:order_items(*)`)
    .eq('id', params.id)
    .eq('store_id', store.id)
    .single()

  if (!order) notFound()

  // Fetch order history
  const { data: history } = await supabase
    .from('order_history')
    .select('*')
    .eq('order_id', params.id)
    .order('created_at', { ascending: false })

  const statusInfo = STATUS_MAP[order.status] ?? { label: order.status, color: '#6C757D', bg: '#F8F9FA' }
  const currentStep = STATUS_STEPS.indexOf(order.status)

  return (
    <div className="p-4 md:p-6 max-w-5xl mx-auto" dir="rtl" style={{fontFamily:'var(--font-arabic)'}}>
      {/* Breadcrumb */}
      <div className="flex items-center gap-1.5 mb-4 text-xs" style={{color:'var(--color-text-muted)'}}>
        <Link href="/orders" style={{color:'var(--color-text-muted)'}}>الطلبات</Link>
        <ChevronRight size={11} />
        <span style={{color:'var(--color-text-primary)',fontWeight:600}}>{order.order_number}</span>
      </div>

      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3 mb-5">
        <div>
          <h1 className="page-title">طلب {order.order_number}</h1>
          <p className="text-xs mt-0.5" style={{color:'var(--color-text-muted)'}}>{formatDate(order.created_at)}</p>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs font-semibold px-3 py-1.5 rounded-full" style={{background:statusInfo.bg,color:statusInfo.color}}>
            {statusInfo.label}
          </span>
          <OrderActions order={order as any} store={store} />
        </div>
      </div>

      {/* Status stepper */}
      {!['cancelled','returned'].includes(order.status) && (
        <div className="card p-4 mb-5">
          <div className="flex items-center justify-between relative">
            <div className="absolute top-3 right-0 left-0 h-0.5" style={{background:'var(--color-border)',zIndex:0}} />
            {STATUS_STEPS.map((step, i) => {
              const done = i <= currentStep
              return (
                <div key={step} className="flex flex-col items-center gap-1.5 relative z-10">
                  <div className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold border-2 transition-colors"
                    style={{
                      background: done ? 'var(--color-accent)' : 'white',
                      borderColor: done ? 'var(--color-accent)' : 'var(--color-border)',
                      color: done ? 'white' : 'var(--color-text-muted)',
                    }}>
                    {done ? '✓' : i + 1}
                  </div>
                  <span className="text-[10px] hidden sm:block" style={{color: done ? 'var(--color-accent)' : 'var(--color-text-muted)', fontWeight: done ? 600 : 400}}>
                    {STATUS_MAP[step]?.label ?? step}
                  </span>
                </div>
              )
            })}
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Left — items + delivery */}
        <div className="lg:col-span-2 space-y-4">
          {/* Order items */}
          <div className="card overflow-hidden">
            <div className="px-4 py-3 border-b font-semibold text-sm flex items-center gap-2" style={{borderColor:'var(--color-border)',color:'var(--color-text-primary)'}}>
              <Package size={15} style={{color:'var(--color-accent)'}} />المنتجات
            </div>
            <table className="data-table">
              <tbody>
                {(order.items as any[]).map((item: any) => (
                  <tr key={item.id}>
                    <td>
                      <p className="font-medium text-sm" style={{color:'var(--color-text-primary)'}}>{item.product_name}</p>
                      {item.variant_label && <p className="text-xs" style={{color:'var(--color-text-muted)'}}>{item.variant_label}</p>}
                    </td>
                    <td className="text-sm text-center" style={{color:'var(--color-text-secondary)'}}>{item.quantity}×</td>
                    <td className="text-sm" style={{color:'var(--color-text-secondary)'}}>{formatDZD(item.unit_price)}</td>
                    <td className="font-semibold text-sm text-left" style={{color:'var(--color-text-primary)'}}>{formatDZD(item.total_price)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="border-t px-4 py-3 space-y-1.5" style={{borderColor:'var(--color-border)',background:'var(--color-bg-soft)'}}>
              <div className="flex justify-between text-sm" style={{color:'var(--color-text-secondary)'}}>
                <span>المجموع الفرعي</span>
                <span>{formatDZD(order.subtotal)}</span>
              </div>
              <div className="flex justify-between text-sm" style={{color:'var(--color-text-secondary)'}}>
                <span>رسوم التوصيل</span>
                <span>{formatDZD(order.delivery_fee)}</span>
              </div>
              {order.discount_amount > 0 && (
                <div className="flex justify-between text-sm text-green-600">
                  <span>خصم {order.coupon_code && `(${order.coupon_code})`}</span>
                  <span>-{formatDZD(order.discount_amount)}</span>
                </div>
              )}
              <div className="flex justify-between font-black text-base pt-1 border-t" style={{borderColor:'var(--color-border)',color:'var(--color-accent)'}}>
                <span>المجموع الكلي</span>
                <span>{formatDZD(order.total)}</span>
              </div>
            </div>
          </div>

          {/* Delivery info card */}
          <div className="card p-4">
            <div className="flex items-center gap-2 mb-3 font-semibold text-sm" style={{color:'var(--color-text-primary)'}}>
              <Truck size={15} style={{color:'var(--color-accent)'}} />معلومات التوصيل
            </div>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <span className="text-xs" style={{color:'var(--color-text-muted)'}}>نوع التوصيل</span>
                <p className="font-medium mt-0.5" style={{color:'var(--color-text-primary)'}}>
                  {order.delivery_type === 'stopdesk' ? 'نقطة توزيع' : 'توصيل للمنزل'}
                </p>
              </div>
              <div>
                <span className="text-xs" style={{color:'var(--color-text-muted)'}}>الولاية</span>
                <p className="font-medium mt-0.5" style={{color:'var(--color-text-primary)'}}>{(order.wilaya as any)?.name_ar}</p>
              </div>
              {(order.commune as any)?.name_ar && (
                <div>
                  <span className="text-xs" style={{color:'var(--color-text-muted)'}}>البلدية</span>
                  <p className="font-medium mt-0.5" style={{color:'var(--color-text-primary)'}}>{(order.commune as any).name_ar}</p>
                </div>
              )}
              <div>
                <span className="text-xs" style={{color:'var(--color-text-muted)'}}>شركة التوصيل</span>
                <p className="font-medium mt-0.5 capitalize" style={{color:'var(--color-text-primary)'}}>{order.delivery_partner ?? 'غير محدد'}</p>
              </div>
              {order.tracking_number && (
                <div>
                  <span className="text-xs" style={{color:'var(--color-text-muted)'}}>رقم التتبع</span>
                  <p className="font-mono font-bold mt-0.5" style={{color:'var(--color-accent)'}}>{order.tracking_number}</p>
                </div>
              )}
              <div>
                <span className="text-xs" style={{color:'var(--color-text-muted)'}}>محاولات الاتصال</span>
                <p className="font-medium mt-0.5" style={{color:'var(--color-text-primary)'}}>{order.call_attempts}</p>
              </div>
            </div>
            {order.address && (
              <div className="mt-3 flex items-start gap-2 text-sm" style={{color:'var(--color-text-secondary)'}}>
                <MapPin size={13} className="mt-0.5 flex-shrink-0" />
                <span>{order.address}</span>
              </div>
            )}
          </div>
        </div>

        {/* Right — customer + source + notes */}
        <div className="space-y-4">
          {/* Customer */}
          <div className="card p-4">
            <h2 className="font-semibold text-sm mb-3 flex items-center gap-2" style={{color:'var(--color-text-primary)'}}>
              <Phone size={13} style={{color:'var(--color-accent)'}} />معلومات العميل
            </h2>
            <div className="space-y-2">
              <p className="font-bold" style={{color:'var(--color-text-primary)'}}>{order.customer_name}</p>
              <p className="text-sm" style={{color:'var(--color-text-secondary)'}}>📞 {order.customer_phone}</p>
              {order.customer_phone2 && <p className="text-sm" style={{color:'var(--color-text-muted)'}}>📞 {order.customer_phone2}</p>}
              {order.customer_email && <p className="text-sm" style={{color:'var(--color-text-muted)'}}>✉️ {order.customer_email}</p>}
            </div>
            {order.fraud_score > 0 && (
              <div className={`mt-3 flex items-center gap-2 text-xs px-3 py-2 rounded-lg font-medium ${
                order.fraud_score >= 70 ? 'bg-red-50 text-red-600' :
                order.fraud_score >= 40 ? 'bg-yellow-50 text-yellow-600' :
                'bg-green-50 text-green-600'
              }`}>
                <span>تقييم الاحتيال: {order.fraud_score}%</span>
                {order.is_blacklisted && <span className="mr-auto bg-red-500 text-white px-1.5 py-0.5 rounded">محظور</span>}
              </div>
            )}
          </div>

          {/* UTM Source */}
          {(order.source || order.utm_source) && (
            <div className="card p-4">
              <h2 className="font-semibold text-sm mb-2" style={{color:'var(--color-text-primary)'}}>مصدر الطلب</h2>
              <div className="space-y-1.5 text-xs" style={{color:'var(--color-text-muted)'}}>
                {order.source && <p>المصدر: <span style={{color:'var(--color-text-secondary)'}}>{order.source}</span></p>}
                {order.utm_source && <p>utm_source: <span style={{color:'var(--color-text-secondary)'}}>{order.utm_source}</span></p>}
                {order.utm_medium && <p>utm_medium: <span style={{color:'var(--color-text-secondary)'}}>{order.utm_medium}</span></p>}
                {order.utm_campaign && <p>utm_campaign: <span style={{color:'var(--color-text-secondary)'}}>{order.utm_campaign}</span></p>}
              </div>
            </div>
          )}

          {/* Notes */}
          {order.notes && (
            <div className="rounded-xl p-4 border" style={{background:'#FFFBEB',borderColor:'#FEF3C7'}}>
              <p className="text-sm font-medium text-yellow-800">ملاحظة العميل</p>
              <p className="text-sm text-yellow-700 mt-1">{order.notes}</p>
            </div>
          )}

          {/* Order History Timeline */}
          {(history ?? []).length > 0 && (
            <div className="card p-4">
              <h2 className="font-semibold text-sm mb-3" style={{color:'var(--color-text-primary)'}}>
                سجل التغييرات
              </h2>
              <div className="space-y-0">
                {(history ?? []).map((h: any, i: number) => {
                  const STATUS_AR: Record<string,string> = {
                    new:'جديد', confirmed:'مؤكد', cancelled:'ملغى', delivered:'مُسلَّم',
                    processing:'يُعالج', shipped:'شُحن', returned:'مُرجَع', failed:'فاشل',
                    failed_1:'فاشلة 01', failed_2:'فاشلة 02', failed_3:'فاشلة 03',
                    postponed:'مؤجلة', duplicate:'مكررة',
                  }
                  return (
                  <div key={h.id} className="flex gap-3">
                    <div className="flex flex-col items-center">
                      <div className="w-2.5 h-2.5 rounded-full mt-1.5 flex-shrink-0" style={{background:'var(--color-accent)'}}/>
                      {i < (history ?? []).length - 1 && (
                        <div className="w-0.5 flex-1 mt-1" style={{background:'var(--color-border)'}}/>
                      )}
                    </div>
                    <div className="pb-3 min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        {h.old_status && <span className="text-xs px-1.5 py-0.5 rounded" style={{background:'#F1F3F5',color:'#495057'}}>{STATUS_AR[h.old_status] ?? h.old_status}</span>}
                        {h.old_status && <span className="text-xs" style={{color:'var(--color-text-muted)'}}>→</span>}
                        <span className="text-xs font-semibold px-1.5 py-0.5 rounded" style={{background:'var(--color-accent-soft)',color:'var(--color-accent)'}}>{STATUS_AR[h.new_status] ?? h.new_status}</span>
                        <span className="text-xs" style={{color:'var(--color-text-muted)'}}>{h.changed_by}</span>
                      </div>
                      {h.notes && <p className="text-xs mt-0.5" style={{color:'var(--color-text-muted)'}}>{h.notes}</p>}
                      <p className="text-[10px] mt-0.5" style={{color:'var(--color-text-muted)'}}>
                        {new Date(h.created_at).toLocaleString('ar-DZ',{weekday:'short',day:'numeric',month:'short',hour:'2-digit',minute:'2-digit'})}
                      </p>
                    </div>
                  </div>
                  )
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
