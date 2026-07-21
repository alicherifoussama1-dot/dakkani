export const dynamic = 'force-dynamic'

import { createPublicClient } from '@/lib/supabase/public'
import { notFound } from 'next/navigation'
import { formatDZD } from '@/lib/utils/format'
import { CheckCircle, User, Phone, MapPin, DollarSign } from 'lucide-react'
import type { Metadata } from 'next'
import ConfirmationActions from './ConfirmationActions'

interface Props {
  params: { storeSlug: string }
  searchParams: { order?: string }
}

export const metadata: Metadata = { title: 'تأكيد الطلب' }

export default async function OrderConfirmationPage({ params, searchParams }: Props) {
  const supabase = createPublicClient()

  const { data: store } = await supabase
    .from('stores')
    .select('id, name, name_ar, slug, logo_url, phone, store_settings(*)')
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

  const storePhone = (store as any).whatsapp ?? store.phone

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4" dir="rtl">
      <div className="w-full max-w-md space-y-5">
        {/* Header */}
        <div className="text-center">
          <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle className="w-10 h-10 text-green-500" />
          </div>
          <h1 className="text-2xl font-black text-gray-900">قد تم طلبك بنجاح! 🎉</h1>
          <p className="text-gray-500 mt-2">يرجى تأكيد طلبك أدناه لتسريع عملية الشحن والتوصيل</p>
        </div>

        {/* Customer Information Card */}
        {order && (
          <div className="bg-white rounded-3xl border border-gray-100 shadow-sm p-6 space-y-4">
            <h2 className="text-base font-black text-gray-900 border-b border-gray-100 pb-2">معلومات المشتري</h2>
            
            <div className="space-y-4">
              <div className="flex items-start gap-3">
                <User className="w-5 h-5 text-gray-400 mt-0.5" />
                <div>
                  <p className="text-xs text-gray-400">الاسم الكامل</p>
                  <p className="font-semibold text-gray-900 text-sm mt-0.5">{order.customer_name}</p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <Phone className="w-5 h-5 text-gray-400 mt-0.5" />
                <div>
                  <p className="text-xs text-gray-400">رقم الهاتف</p>
                  <p className="font-semibold text-gray-900 text-sm mt-0.5" dir="ltr">{order.customer_phone}</p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <MapPin className="w-5 h-5 text-gray-400 mt-0.5" />
                <div>
                  <p className="text-xs text-gray-400">عنوان التوصيل</p>
                  <p className="font-semibold text-gray-900 text-sm mt-0.5">
                    {order.address} {order.wilaya?.name_ar ? ` - ${order.wilaya.name_ar}` : ''}
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <DollarSign className="w-5 h-5 text-[#0D6EFD] mt-0.5" />
                <div>
                  <p className="text-xs text-gray-400">السعر الكلي</p>
                  <p className="font-black text-xl text-[#0D6EFD] mt-0.5">{formatDZD(order.total)}</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Action Buttons */}
        {storePhone && order && (
          <ConfirmationActions
            storePhone={storePhone}
            orderNumber={order.order_number}
            storeName={store.name_ar ?? store.name}
            customerName={order.customer_name}
            customerPhone={order.customer_phone}
            totalAmount={formatDZD(order.total)}
          />
        )}

        {/* Back to store */}
        <a
          href={`/store/${store.slug}`}
          className="block w-full text-center bg-gray-900 hover:bg-gray-800 text-white font-bold py-3.5 rounded-2xl transition"
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
