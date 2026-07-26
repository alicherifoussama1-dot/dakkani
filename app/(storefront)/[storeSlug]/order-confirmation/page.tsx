export const dynamic = 'force-dynamic'

import { createPublicClient } from '@/lib/supabase/public'
import { notFound } from 'next/navigation'
import { formatDZD } from '@/lib/utils/format'
import { CheckCircle, Package, PackageOpen, Clock, MapPin, XCircle, AlertCircle, ShoppingBag } from 'lucide-react'
import type { Metadata } from 'next'
import { cookies } from 'next/headers'
import StorefrontLayout from '@/components/storefront/StorefrontLayout'
import ThankYouClient from '@/components/storefront/ThankYouClient'
import { resolveThankYouConfig } from '@/lib/utils/whatsapp'
import { ZR_OFFICES } from '@/lib/delivery/zr-offices'

interface Props {
  params: { storeSlug: string }
  searchParams: { order?: string }
}

export const metadata: Metadata = { title: 'تأكيد الطلب' }

const LOCAL_TRANSLATIONS = {
  ar: {
    success_title: 'تم تسجيل طلبك بنجاح',
    success_desc: 'شكرًا لثقتك بنا، تم استلام طلبك بنجاح.',
    order_num: 'رقم الطلب',
    status_pending: 'بانتظار تأكيد الطلب',
    status_confirmed: 'تم تأكيد طلبك',
    status_processing: 'طلبك قيد التحضير',
    status_shipped: 'تم شحن طلبك',
    status_delivered: 'تم توصيل طلبك بنجاح',
    status_cancelled: 'تم إلغاء هذا الطلب ❌',
    status_returned: 'تم إرجاع هذا الطلب',
    status_failed: 'فشل تسجيل هذا الطلب',
    summary_title: 'ملخص الطلب',
    delivery_fee: 'رسوم التوصيل',
    discount: 'الخصم',
    total: 'المجموع الكلي',
    free_delivery: 'التوصيل مجاني ✅',
    saved: 'وفرت {amount} دج',
    delivery_title: 'معلومات التوصيل',
    delivery_home: 'التوصيل إلى المنزل',
    delivery_stopdesk: 'التوصيل إلى مكتب',
    wilaya: 'الولاية',
    commune: 'البلدية',
    address: 'العنوان',
    office: 'المكتب',
    delivery_partner: 'شركة التوصيل',
    step_received: 'مستلم',
    step_confirmed: 'مؤكد',
    step_prepared: 'محضر',
    step_shipped: 'مشحون',
    step_delivered: 'مسلّم',
    back_to_store: 'العودة إلى المتجر',
    open_before_pay_title: 'يمكنك فتح ومعاينة طلبك قبل الدفع',
    open_before_pay_desc: 'افحص المنتج عند الاستلام، وادفع فقط إذا أعجبك.',
    order_not_found: 'الطلب غير موجود أو انتهت صلاحية الجلسة',
    order_not_found_desc: 'لم يتم العثور على تفاصيل الطلب، أو قد تكون انتهت صلاحية جلسة الوصول (صلاحيتها ساعة واحدة).',
  },
  fr: {
    success_title: 'Commande enregistrée avec succès',
    success_desc: 'Merci pour votre confiance, votre commande a été reçue.',
    order_num: 'Numéro de commande',
    status_pending: 'En attente de confirmation',
    status_confirmed: 'Commande confirmée',
    status_processing: 'Commande en cours de préparation',
    status_shipped: 'Commande expédiée',
    status_delivered: 'Commande livrée',
    status_cancelled: 'Commande annulée ❌',
    status_returned: 'Commande retournée',
    status_failed: 'Échec de la commande',
    summary_title: 'Résumé de la commande',
    delivery_fee: 'Frais de livraison',
    discount: 'Remise',
    total: 'Total',
    free_delivery: 'Livraison gratuite ✅',
    saved: 'Économisé {amount} DA',
    delivery_title: 'Informations de livraison',
    delivery_home: 'Livraison à domicile',
    delivery_stopdesk: 'Livraison au bureau',
    wilaya: 'Wilaya',
    commune: 'Commune',
    address: 'Adresse',
    office: 'Bureau',
    delivery_partner: 'Partenaire de livraison',
    step_received: 'Reçu',
    step_confirmed: 'Confirmé',
    step_prepared: 'Préparé',
    step_shipped: 'Expédié',
    step_delivered: 'Livré',
    back_to_store: 'Retour à la boutique',
    open_before_pay_title: 'Ouvrez et vérifiez votre commande avant de payer',
    open_before_pay_desc: 'Inspectez le produit à la livraison, payez seulement s\'il vous convient.',
    order_not_found: 'Commande introuvable ou session expirée',
    order_not_found_desc: 'La commande n\'a pas pu être trouvée, ou la session d\'accès (valide 1 heure) a expiré.',
  },
  en: {
    success_title: 'Order Registered Successfully',
    success_desc: 'Thank you for your trust, your order has been received.',
    order_num: 'Order Number',
    status_pending: 'Awaiting confirmation',
    status_confirmed: 'Order confirmed',
    status_processing: 'Order in preparation',
    status_shipped: 'Order shipped',
    status_delivered: 'Order delivered',
    status_cancelled: 'Order cancelled ❌',
    status_returned: 'Order returned',
    status_failed: 'Order failed',
    summary_title: 'Order Summary',
    delivery_fee: 'Delivery Fee',
    discount: 'Discount',
    total: 'Total Amount',
    free_delivery: 'Free delivery ✅',
    saved: 'Saved {amount} DA',
    delivery_title: 'Delivery Information',
    delivery_home: 'Home Delivery',
    delivery_stopdesk: 'Office Delivery',
    wilaya: 'Wilaya',
    commune: 'Commune',
    address: 'Address',
    office: 'Office',
    delivery_partner: 'Delivery Partner',
    step_received: 'Received',
    step_confirmed: 'Confirmed',
    step_prepared: 'Prepared',
    step_shipped: 'Shipped',
    step_delivered: 'Delivered',
    back_to_store: 'Back to Store',
    open_before_pay_title: 'You can open and inspect your order before paying',
    open_before_pay_desc: 'Check the product on delivery, pay only if you are satisfied.',
    order_not_found: 'Order not found or session expired',
    order_not_found_desc: 'The order details could not be found, or the 1-hour access session has expired.',
  },
}

function getStatusStep(status: string): number {
  switch (status) {
    case 'new':
    case 'duplicate':
      return 1
    case 'confirmed':
      return 2
    case 'processing':
      return 3
    case 'shipped':
    case 'in_transit':
    case 'out_for_delivery':
    case 'with_driver':
    case 'at_stopdesk':
      return 4
    case 'delivered':
      return 5
    default:
      return 1
  }
}

export default async function OrderConfirmationPage({ params, searchParams }: Props) {
  const supabase = createPublicClient()

  // 1. Fetch Store
  const { data: store } = await supabase
    .from('stores')
    .select('*, store_settings(*)')
    .eq('slug', params.storeSlug)
    .eq('is_active', true)
    .single()

  if (!store) notFound()

  // 2. Resolve Language
  const cookieStore = cookies()
  const langCookie = cookieStore.get(`dakkani_store_lang_${store.id}`)?.value
  const lang = (langCookie === 'ar' || langCookie === 'fr' || langCookie === 'en'
    ? langCookie
    : (store.store_settings?.default_language ?? 'ar')) as keyof typeof LOCAL_TRANSLATIONS

  const t = LOCAL_TRANSLATIONS[lang]
  const isRtl = lang === 'ar'
  const isFr = lang === 'fr'

  // 3. Access gate — the order id in the URL is an unguessable UUID (the
  // customer's own confirmation link), so possessing it is the proof of access,
  // exactly like a Shopify/most-carriers order-status link. The ty_order cookie
  // is only a best-effort hint and must NOT be *required*: it is routinely lost
  // across the platform redirect/rewrite, custom domains, in-app webviews and
  // Safari ITP, which previously showed a false "order not found" immediately
  // after a perfectly valid order.
  const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
  const orderId = searchParams.order

  let order: any = null

  if (orderId && UUID_RE.test(orderId)) {
    const { data } = await supabase
      .from('orders')
      .select('*, wilaya:wilayas(*), items:order_items(*), provider:delivery_providers(display_name, provider_type)')
      .eq('id', orderId)
      .eq('store_id', store.id)
      .maybeSingle()
    order = data
  }

  // Render generic not-found if order doesn't exist or cookie verification fails
  if (!order) {
    return (
      <StorefrontLayout store={store as any}>
        <div className="min-h-[70vh] flex items-center justify-center p-4 pt-24 pb-12" dir={isRtl ? 'rtl' : 'ltr'}>
          <div className="w-full max-w-md text-center bg-white p-8 rounded-3xl border border-gray-150 shadow-sm space-y-4">
            <div className="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center mx-auto">
              <AlertCircle className="w-8 h-8 text-red-500" />
            </div>
            <h1 className="text-xl font-bold text-gray-800">{t.order_not_found}</h1>
            <p className="text-sm text-gray-500 leading-relaxed">
              {t.order_not_found_desc}
            </p>
            <a
              href={`/store/${store.slug}`}
              className="block w-full bg-[#0D6EFD] hover:bg-[#0B5ED7] text-white font-bold py-3.5 rounded-2xl transition text-sm"
            >
              {t.back_to_store}
            </a>
          </div>
        </div>
      </StorefrontLayout>
    )
  }

  // 3b. Resolve Product-Specific vs Store-Default Thank You Page Settings
  const productIds = (order.items ?? []).map((i: any) => i.product_id).filter(Boolean)
  let orderedProducts: any[] = []
  if (productIds.length > 0) {
    const { data: prods } = await supabase
      .from('products')
      .select('id, thankyou_whatsapp, thankyou_phone, thankyou_whatsapp_template, thankyou_wa_enabled, thankyou_call_enabled')
      .in('id', productIds)
    orderedProducts = prods ?? []
  }

  const resolvedThankYou = resolveThankYouConfig({
    store: store as any,
    products: orderedProducts,
  })

  // 4. Resolve Stopdesk Office Phone and Address (ZR Express lookup or best-effort)
  let officePhone: string | null = null
  let officeAddress: string | null = null

  if (order.delivery_type === 'stopdesk') {
    // Lookup Stopdesk Address from DB
    if (order.stopdesk_office_name) {
      const { data: officeObj } = await supabase
        .from('store_delivery_offices')
        .select('address')
        .eq('store_id', store.id)
        .eq('name', order.stopdesk_office_name)
        .limit(1)
        .maybeSingle()
      if (officeObj?.address) {
        officeAddress = officeObj.address
      }
    }

    // Lookup Stopdesk Phone (bundled ZR Express data matching)
    if (order.stopdesk_office_name) {
      const parts = order.stopdesk_office_name.split('|').map((s: string) => s.trim())
      const officeNameOnly = parts[1] ?? parts[0]
      const foundOffice = ZR_OFFICES.find(
        (o) =>
          o.name.toLowerCase() === officeNameOnly.toLowerCase() ||
          `${o.commune} | ${o.name}`.toLowerCase() === order.stopdesk_office_name.toLowerCase()
      )
      if (foundOffice?.phone) {
        officePhone = foundOffice.phone
      }
    }
  }

  // Stepper Calculation
  const isCancelled = ['cancelled', 'returned', 'failed'].includes(order.status)
  const currentStep = getStatusStep(order.status)

  // Status message subtitle
  const statusMessage =
    order.status === 'cancelled'
      ? t.status_cancelled
      : order.status === 'returned'
      ? t.status_returned
      : order.status === 'failed'
      ? t.status_failed
      : order.status === 'confirmed'
      ? t.status_confirmed
      : order.status === 'processing'
      ? t.status_processing
      : order.status === 'shipped'
      ? t.status_shipped
      : order.status === 'delivered'
      ? t.status_delivered
      : t.status_pending

  return (
    <StorefrontLayout store={store as any}>
      <div className="max-w-xl mx-auto px-4 pt-24 pb-12 space-y-4" dir={isRtl ? 'rtl' : 'ltr'}>
        
        {/* 1. SUCCESS HEADER */}
        <div className="bg-white border border-gray-100 rounded-3xl p-6 text-center shadow-sm space-y-3">
          <div className="w-16 h-16 bg-emerald-50 rounded-full flex items-center justify-center mx-auto">
            {isCancelled ? (
              <XCircle className="w-9 h-9 text-red-500" />
            ) : (
              <CheckCircle className="w-9 h-9 text-emerald-500" />
            )}
          </div>
          <div>
            <h1 className="text-xl font-black text-gray-900">
              {isCancelled ? statusMessage : t.success_title}
            </h1>
            <p className="text-xs text-gray-500 mt-1 leading-relaxed">
              {isCancelled ? '' : t.success_desc}
            </p>
          </div>
          
          <div className="bg-gray-50 rounded-2xl py-3 px-4 flex items-center justify-between text-sm">
            <span className="text-gray-500 font-bold">{t.order_num}</span>
            <span className="font-mono font-black text-gray-800 text-base">#{order.order_number}</span>
          </div>

          {!isCancelled && (
            <div className="inline-flex items-center gap-1.5 bg-blue-50 text-[#0D6EFD] text-xs font-semibold px-3 py-1.5 rounded-full">
              <Clock className="w-3.5 h-3.5" />
              <span>{statusMessage}</span>
            </div>
          )}
        </div>

        {/* 1b. OPEN-BEFORE-PAY REASSURANCE */}
        {!isCancelled && (
          <div className="bg-emerald-50 border border-emerald-100 rounded-3xl p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center flex-shrink-0">
              <PackageOpen className="w-5 h-5 text-emerald-600" />
            </div>
            <div className="text-start min-w-0">
              <p className="text-sm font-bold text-emerald-900">{t.open_before_pay_title}</p>
              <p className="text-xs text-emerald-700 leading-relaxed">{t.open_before_pay_desc}</p>
            </div>
          </div>
        )}

        {/* 2. WHATSAPP & PHONE ACTION CONTROLS */}
        {!isCancelled && (
          <div className="bg-white border border-gray-100 rounded-3xl p-6 shadow-sm">
            <ThankYouClient
              orderNumber={order.order_number}
              customerName={order.customer_name}
              customerPhone={order.customer_phone ?? ''}
              customerAddress={order.address}
              items={order.items ?? []}
              total={order.total}
              deliveryType={order.delivery_type}
              wilayaName={order.wilaya?.name_ar ?? ''}
              communeName={order.baladia ?? ''}
              stopdeskOfficeName={order.stopdesk_office_name}
              officePhone={officePhone}
              merchantPhone={store.phone || ''}
              merchantWhatsapp={store.whatsapp || ''}
              storeName={store.name_ar ?? store.name}
              resolvedWaNumber={resolvedThankYou.waNumber}
              resolvedCallNumber={resolvedThankYou.callNumber}
              whatsappTemplate={resolvedThankYou.whatsappTemplate}
              waEnabled={resolvedThankYou.waEnabled}
              callEnabled={resolvedThankYou.callEnabled}
              lang={lang as any}
            />
          </div>
        )}

        {/* 3. ORDER SUMMARY */}
        <div className="bg-white border border-gray-100 rounded-3xl p-6 shadow-sm space-y-4">
          <div className="flex items-center gap-2 border-b border-gray-50 pb-3">
            <ShoppingBag className="w-5 h-5 text-gray-400" />
            <h3 className="text-sm font-bold text-gray-800">{t.summary_title}</h3>
          </div>

          {/* Product Items List */}
          <div className="space-y-3.5">
            {order.items?.map((item: any) => (
              <div key={item.id} className="flex gap-3 text-sm">
                {item.image_url ? (
                  <img
                    src={item.image_url}
                    alt=""
                    className="w-12 h-12 rounded-xl object-cover border border-gray-100 flex-shrink-0"
                  />
                ) : (
                  <div className="w-12 h-12 rounded-xl bg-gray-50 flex items-center justify-center border border-gray-100 flex-shrink-0">
                    <Package className="w-5 h-5 text-gray-300" />
                  </div>
                )}
                <div className="min-w-0 flex-1 space-y-0.5 text-start">
                  <h4 className="font-semibold text-gray-900 truncate">{item.product_name}</h4>
                  {item.variant_label && (
                    <p className="text-xs text-gray-500">{item.variant_label}</p>
                  )}
                  <p className="text-xs text-gray-400 font-medium">
                    {formatDZD(item.unit_price)} × {item.quantity}
                  </p>
                </div>
                <div className="text-start font-bold text-gray-900 self-center">
                  {formatDZD(item.total_price)}
                </div>
              </div>
            ))}
          </div>

          {/* Prices calculation breakdown */}
          <div className="border-t border-gray-50 pt-3 space-y-2 text-xs">
            <div className="flex justify-between text-gray-500">
              <span>{t.delivery_fee}</span>
              <span>{order.delivery_fee === 0 ? t.free_delivery : formatDZD(order.delivery_fee)}</span>
            </div>

            {order.discount_amount > 0 && (
              <div className="flex justify-between text-emerald-600 font-medium">
                <span>
                  {t.discount} {order.coupon_code ? `(${order.coupon_code})` : ''}
                </span>
                <span>-{formatDZD(order.discount_amount)}</span>
              </div>
            )}

            <div className="flex justify-between font-black text-gray-900 text-sm pt-1 border-t border-dashed border-gray-100">
              <span>{t.total}</span>
              <span className="text-[#0D6EFD] text-base">{formatDZD(order.total)}</span>
            </div>
          </div>

          {/* Savings Highlight */}
          {order.discount_amount > 0 && (
            <div className="bg-emerald-50 text-emerald-800 text-xs font-bold py-2 px-3 rounded-xl text-center">
              {t.saved.replace('{amount}', String(order.discount_amount))}
            </div>
          )}
        </div>

        {/* 4. DELIVERY DETAILS */}
        <div className="bg-white border border-gray-100 rounded-3xl p-6 shadow-sm space-y-4">
          <div className="flex items-center gap-2 border-b border-gray-50 pb-3">
            <MapPin className="w-5 h-5 text-gray-400" />
            <h3 className="text-sm font-bold text-gray-800">{t.delivery_title}</h3>
          </div>

          <div className="space-y-2 text-xs">
            <div className="flex justify-between">
              <span className="text-gray-500">{t.delivery_title}</span>
              <span className="font-semibold text-gray-900">
                {order.delivery_type === 'stopdesk' ? t.delivery_stopdesk : t.delivery_home}
              </span>
            </div>

            <div className="flex justify-between">
              <span className="text-gray-500">{t.wilaya}</span>
              <span className="font-bold text-gray-900">
                {order.wilaya?.name_ar ?? String(order.wilaya_id)}
              </span>
            </div>

            <div className="flex justify-between">
              <span className="text-gray-500">{t.commune}</span>
              <span className="font-semibold text-gray-900">
                {order.delivery_type === 'stopdesk'
                  ? order.stopdesk_commune_ar ?? order.baladia ?? ''
                  : order.baladia ?? ''}
              </span>
            </div>

            {order.delivery_type === 'home' && order.address && (
              <div className="flex justify-between items-start gap-4">
                <span className="text-gray-500 flex-shrink-0">{t.address}</span>
                <span className="font-semibold text-gray-900 text-end break-all">
                  {order.address}
                </span>
              </div>
            )}

            {order.delivery_type === 'stopdesk' && (
              <>
                <div className="flex justify-between">
                  <span className="text-gray-500">{t.office}</span>
                  <span className="font-bold text-gray-900 text-end">
                    {order.stopdesk_office_name ?? ''}
                  </span>
                </div>

                {officeAddress && (
                  <div className="flex justify-between items-start gap-4">
                    <span className="text-gray-500 flex-shrink-0">{t.address}</span>
                    <span className="font-semibold text-gray-900 text-end break-words">
                      {officeAddress}
                    </span>
                  </div>
                )}

                {order.provider?.display_name && (
                  <div className="flex justify-between">
                    <span className="text-gray-500">{t.delivery_partner}</span>
                    <span className="font-semibold text-gray-900">
                      {order.provider.display_name}
                    </span>
                  </div>
                )}
              </>
            )}
          </div>
        </div>

        {/* 5. ORDER STATUS STEPPER (Secondary component) */}
        {!isCancelled && (
          <div className="bg-white border border-gray-100 rounded-3xl p-6 shadow-sm space-y-4">
            <div className="flex justify-between items-center">
              <h4 className="text-xs font-bold text-gray-600">
                {isRtl ? 'حالة معالجة الطلب' : isFr ? 'Statut de traitement' : 'Order Status'}
              </h4>
            </div>

            {/* Stepper graphical line */}
            <div className="relative pt-2 pb-6">
              <div className="absolute top-[21px] left-3 right-3 h-[3px] bg-gray-100 -z-0">
                <div
                  className="h-full bg-emerald-500 transition-all duration-500"
                  style={{ width: `${Math.min(100, Math.max(0, (currentStep - 1) * 25))}%` }}
                />
              </div>

              <div className="relative flex justify-between z-10">
                {([
                  [1, t.step_received],
                  [2, t.step_confirmed],
                  [3, t.step_prepared],
                  [4, t.step_shipped],
                  [5, t.step_delivered],
                ] as const).map(([stepNum, stepLabel]) => {
                  const isDone = currentStep >= stepNum
                  return (
                    <div key={stepNum} className="flex flex-col items-center">
                      <div
                        className={`w-7 h-7 rounded-full flex items-center justify-center border-2 text-xs font-bold transition-colors duration-300 ${
                          isDone
                            ? 'bg-emerald-500 border-emerald-500 text-white'
                            : 'bg-white border-gray-200 text-gray-400'
                        }`}
                      >
                        {stepNum}
                      </div>
                      <span
                        className={`absolute mt-8 text-[10px] font-bold transition-colors duration-300 ${
                          isDone ? 'text-emerald-600' : 'text-gray-400'
                        }`}
                      >
                        {stepLabel}
                      </span>
                    </div>
                  )
                })}
              </div>
            </div>
          </div>
        )}

        {/* 6. BOTTOM NAVIGATION AND RETURN */}
        <div className="text-center pt-2 space-y-4">
          <p className="text-xs text-gray-400">
            {isRtl ? 'شكرًا لاختيارك متجرنا ❤️' : 'Merci d\'avoir choisi notre boutique ❤️'}
          </p>
          <a
            href={`/store/${store.slug}`}
            className="block w-full bg-[#0D6EFD] hover:bg-[#0B5ED7] text-white font-bold py-4 rounded-2xl shadow-sm hover:shadow transition text-sm"
          >
            {t.back_to_store}
          </a>
          <p className="text-[10px] text-gray-400">
            {store.name_ar ?? store.name} · {isRtl ? 'جميع الحقوق محفوظة' : 'Tous droits réservés'}
          </p>
        </div>

      </div>
    </StorefrontLayout>
  )
}
