export const dynamic = 'force-dynamic'

import { createPublicClient } from '@/lib/supabase/public'
import { notFound } from 'next/navigation'
import { formatDZD, formatDate } from '@/lib/utils/format'
import { CheckCircle, Package, Clock } from 'lucide-react'
import type { Metadata } from 'next'

interface Props {
  params: { storeSlug: string }
  searchParams: { order?: string }
}

export const metadata: Metadata = { title: 'تأكيد الطلب' }

export default async function OrderConfirmationPage({ params, searchParams }: Props) {
  const supabase = createPublicClient()

  const { data: store } = await supabase
    .from('stores')
    .select('id, name, name_ar, slug, logo_url')
    .eq('slug', params.storeSlug)
    .single()
  if (!store) notFound()

  const orderId = searchParams.order
  let order: any = null

  if (orderId) {
    const { data } = await supabase
      .from('orders')
      .select('*, wilaya:wilayas(name_ar), items:order_items(*)')
      .eq('id', orderId)
      .eq('store_id', store.id)
      .single()
    order = data
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4" dir="rtl">
      <div className="w-full max-w-md space-y-5">
        {/* Header */}
        <div className="text-center">
          <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle className="w-10 h-10 text-green-500" />
          </div>
          <h1 className="text-2xl font-black text-gray-900">تم تسجيل طلبك! 🎉</h1>
          <p className="text-gray-500 mt-2">سنتصل بك قريباً لتأكيد التوصيل</p>
        </div>

        {/* Order card */}
        {order && (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="bg-[#E8431A] px-5 py-3 flex items-center justify-between">
              <span className="text-white font-bold">رقم الطلب</span>
              <span className="font-mono text-white font-black text-lg">{order.order_number}</span>
            </div>
            <div className="p-5 space-y-4">
              {/* Items */}
              <div className="space-y-2">
                {order.items?.map((item: any) => (
                  <div key={item.id} className="flex justify-between text-sm">
                    <span className="text-gray-700">{item.product_name} ×{item.quantity}</span>
                    <span className="font-semibold">{formatDZD(item.total_price)}</span>
                  </div>
                ))}
              </div>

              <div className="border-t border-gray-100 pt-3 space-y-2 text-sm">
                <div className="flex justify-between text-gray-500">
                  <span>رسوم التوصيل</span>
                  <span>{formatDZD(order.delivery_fee)}</span>
                </div>
                <div className="flex justify-between font-black text-gray-900 text-base">
                  <span>المجموع الكلي</span>
                  <span className="text-[#E8431A]">{formatDZD(order.total)}</span>
                </div>
              </div>

              {/* Details */}
              <div className="bg-gray-50 rounded-xl p-3 space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-500">الولاية</span>
                  <span className="font-medium">{order.wilaya?.name_ar}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">نوع التوصيل</span>
                  <span className="font-medium">{order.delivery_type === 'home' ? 'توصيل للمنزل' : 'نقطة توزيع'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">طريقة الدفع</span>
                  <span className="font-medium">الدفع عند الاستلام</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">تاريخ الطلب</span>
                  <span className="font-medium">{formatDate(order.created_at)}</span>
                </div>
              </div>

              {/* Status info */}
              <div className="flex items-center gap-3 bg-blue-50 border border-blue-100 rounded-xl p-3">
                <Clock className="w-5 h-5 text-blue-500 flex-shrink-0" />
                <p className="text-sm text-blue-700">
                  طلبك قيد المعالجة، سيتصل بك فريقنا خلال ساعات لتأكيد الموعد
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Back to store */}
        <a
          href={`/store/${store.slug}`}
          className="block w-full text-center bg-[#E8431A] hover:bg-[#C73615] text-white font-bold py-3.5 rounded-2xl transition"
        >
          العودة للمتجر
        </a>
        <p className="text-center text-xs text-gray-400">
          {store.name_ar ?? store.name} · جميع الحقوق محفوظة
        </p>
      </div>
    </div>
  )
}
