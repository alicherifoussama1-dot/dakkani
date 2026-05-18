export const dynamic = 'force-dynamic'
import { createServerClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import { formatDZD, formatDate } from '@/lib/utils/format'
import OrderStatusBar from '@/components/orders/OrderStatusBar'
import OrderActions from '@/components/orders/OrderActions'
import DeliveryTimeline from '@/components/orders/DeliveryTimeline'

export async function generateMetadata({ params }: { params: { id: string } }) {
  return { title: `طلب #${params.id.slice(0, 8)}` }
}

export default async function OrderDetailPage({ params }: { params: { id: string } }) {
  const supabase = createServerClient()
  const { data: { session } } = await supabase.auth.getSession()
  const { data: store } = await supabase
    .from('stores')
    .select('*')
    .eq('owner_id', session!.user.id)
    .single()
  if (!store) return null

  const { data: order } = await supabase
    .from('orders')
    .select(`
      *,
      wilaya:wilayas(name_ar, name_fr),
      commune:communes(name_ar),
      items:order_items(*)
    `)
    .eq('id', params.id)
    .eq('store_id', store.id)
    .single()

  if (!order) notFound()

  const STATUS_STEPS = ['new','confirmed','processing','shipped','delivered']
  const currentStep = STATUS_STEPS.indexOf(order.status)

  return (
    <div className="space-y-5 animate-fade-in max-w-5xl" dir="rtl">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-black text-gray-900">طلب {order.order_number}</h1>
          <p className="text-sm text-gray-500 mt-0.5">{formatDate(order.created_at)}</p>
        </div>
        <OrderActions order={order as any} store={store} />
      </div>

      {/* Status bar */}
      <OrderStatusBar
        currentStatus={order.status}
        steps={STATUS_STEPS}
        currentStep={currentStep}
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Left column */}
        <div className="lg:col-span-2 space-y-4">
          {/* Order items */}
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="px-5 py-3 border-b border-gray-100">
              <h2 className="font-bold text-gray-900">المنتجات</h2>
            </div>
            <table className="w-full text-sm">
              <tbody className="divide-y divide-gray-50">
                {(order.items as any[]).map((item: any) => (
                  <tr key={item.id} className="px-5 py-3">
                    <td className="px-5 py-3">
                      <p className="font-medium text-gray-900">{item.product_name}</p>
                      {item.variant_label && (
                        <p className="text-xs text-gray-400">{item.variant_label}</p>
                      )}
                    </td>
                    <td className="px-5 py-3 text-gray-500 text-center">{item.quantity}×</td>
                    <td className="px-5 py-3 text-gray-700">{formatDZD(item.unit_price)}</td>
                    <td className="px-5 py-3 font-semibold text-gray-900 text-left">
                      {formatDZD(item.total_price)}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="bg-gray-50">
                <tr>
                  <td colSpan={3} className="px-5 py-2 text-sm text-gray-500">المجموع الفرعي</td>
                  <td className="px-5 py-2 font-semibold text-left">{formatDZD(order.subtotal)}</td>
                </tr>
                <tr>
                  <td colSpan={3} className="px-5 py-2 text-sm text-gray-500">رسوم التوصيل</td>
                  <td className="px-5 py-2 font-semibold text-left">{formatDZD(order.delivery_fee)}</td>
                </tr>
                {order.discount_amount > 0 && (
                  <tr>
                    <td colSpan={3} className="px-5 py-2 text-sm text-green-600">
                      خصم {order.coupon_code && `(${order.coupon_code})`}
                    </td>
                    <td className="px-5 py-2 font-semibold text-green-600 text-left">
                      -{formatDZD(order.discount_amount)}
                    </td>
                  </tr>
                )}
                <tr className="border-t border-gray-200">
                  <td colSpan={3} className="px-5 py-3 font-bold text-gray-900">المجموع الكلي</td>
                  <td className="px-5 py-3 font-black text-dakkani-600 text-left text-lg">
                    {formatDZD(order.total)}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>

          {/* Delivery timeline */}
          <DeliveryTimeline
            timeline={(order.delivery_timeline as any[]) ?? []}
            trackingNumber={order.tracking_number}
            deliveryPartner={order.delivery_partner}
          />
        </div>

        {/* Right column */}
        <div className="space-y-4">
          {/* Customer */}
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5 space-y-3">
            <h2 className="font-bold text-gray-900">معلومات العميل</h2>
            <div className="space-y-2 text-sm">
              <p className="font-semibold text-gray-900 text-base">{order.customer_name}</p>
              <p className="text-gray-600">📞 {order.customer_phone}</p>
              {order.customer_phone2 && <p className="text-gray-500">📞 {order.customer_phone2}</p>}
              {order.customer_email && <p className="text-gray-500">✉️ {order.customer_email}</p>}
            </div>
            {order.fraud_score > 0 && (
              <div className={`flex items-center gap-2 text-xs px-3 py-2 rounded-lg font-medium ${
                order.fraud_score >= 70 ? 'bg-red-50 text-red-600' :
                order.fraud_score >= 40 ? 'bg-yellow-50 text-yellow-600' :
                'bg-green-50 text-green-600'
              }`}>
                <span>تقييم الاحتيال: {order.fraud_score}%</span>
                {order.is_blacklisted && <span className="mr-auto bg-red-500 text-white px-1.5 py-0.5 rounded text-xs">محظور</span>}
              </div>
            )}
          </div>

          {/* Delivery info */}
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5 space-y-3">
            <h2 className="font-bold text-gray-900">معلومات التوصيل</h2>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-500">نوع التوصيل</span>
                <span className={`font-medium px-2 py-0.5 rounded text-xs ${
                  order.delivery_type === 'stopdesk'
                    ? 'bg-purple-100 text-purple-700'
                    : 'bg-blue-100 text-blue-700'
                }`}>
                  {order.delivery_type === 'stopdesk' ? 'نقطة توزيع' : 'توصيل للمنزل'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">الولاية</span>
                <span className="font-medium">{(order.wilaya as any)?.name_ar}</span>
              </div>
              {(order.commune as any)?.name_ar && (
                <div className="flex justify-between">
                  <span className="text-gray-500">البلدية</span>
                  <span className="font-medium">{(order.commune as any).name_ar}</span>
                </div>
              )}
              {order.address && (
                <div>
                  <span className="text-gray-500">العنوان</span>
                  <p className="font-medium mt-0.5">{order.address}</p>
                </div>
              )}
              {order.tracking_number && (
                <div className="flex justify-between">
                  <span className="text-gray-500">رقم التتبع</span>
                  <span className="font-mono font-bold text-dakkani-600">{order.tracking_number}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-gray-500">شركة التوصيل</span>
                <span className="font-medium capitalize">{order.delivery_partner ?? 'غير محدد'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">محاولات الاتصال</span>
                <span className="font-medium">{order.call_attempts}</span>
              </div>
            </div>
          </div>

          {/* UTM & Source */}
          {(order.source || order.utm_source) && (
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5 space-y-2">
              <h2 className="font-bold text-gray-900">مصدر الطلب</h2>
              <div className="space-y-1.5 text-xs text-gray-500">
                {order.source && <p>المصدر: <span className="text-gray-700">{order.source}</span></p>}
                {order.utm_source && <p>utm_source: <span className="text-gray-700">{order.utm_source}</span></p>}
                {order.utm_medium && <p>utm_medium: <span className="text-gray-700">{order.utm_medium}</span></p>}
                {order.utm_campaign && <p>utm_campaign: <span className="text-gray-700">{order.utm_campaign}</span></p>}
              </div>
            </div>
          )}

          {/* Notes */}
          {order.notes && (
            <div className="bg-yellow-50 border border-yellow-100 rounded-xl p-4">
              <p className="text-sm font-medium text-yellow-800">ملاحظة العميل</p>
              <p className="text-sm text-yellow-700 mt-1">{order.notes}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
