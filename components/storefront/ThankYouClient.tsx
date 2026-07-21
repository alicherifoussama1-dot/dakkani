'use client'

import { MessageCircle, Phone } from 'lucide-react'
import { formatDZD } from '@/lib/utils/format'
import type { Locale } from '@/lib/utils/translations'

interface ItemProp {
  product_name: string
  variant_label?: string | null
  variant_key?: string
  quantity: number
  unit_price: number
  total_price: number
}

interface ThankYouClientProps {
  orderNumber: string
  customerName: string
  items: ItemProp[]
  total: number
  deliveryType: 'home' | 'stopdesk'
  wilayaName: string
  communeName: string
  stopdeskOfficeName: string | null
  officePhone: string | null
  merchantPhone: string
  merchantWhatsapp: string
  storeName: string
  lang: Locale
}

export default function ThankYouClient({
  orderNumber,
  customerName,
  items,
  total,
  deliveryType,
  wilayaName,
  communeName,
  stopdeskOfficeName,
  officePhone,
  merchantPhone,
  merchantWhatsapp,
  storeName,
  lang,
}: ThankYouClientProps) {
  const isAr = lang === 'ar'
  const isFr = lang === 'fr'

  // Normalize WhatsApp Phone: 0xxx... -> 213xxx...
  const normalizeWaPhone = (p: string) => {
    const clean = p.replace(/\D/g, '')
    return clean.startsWith('0') ? '213' + clean.slice(1) : clean
  }

  const waNumber = normalizeWaPhone(merchantWhatsapp || merchantPhone)
  const cleanMerchantPhone = merchantPhone.replace(/\s+/g, '')

  // Build items text for WhatsApp
  const itemsText = items
    .map((item) => {
      const variantText = item.variant_label
        ? ` (${item.variant_label})`
        : item.variant_key && item.variant_key !== 'default'
        ? ` (${item.variant_key})`
        : ''
      return `${item.product_name}${variantText} × ${item.quantity}`
    })
    .join('\n📦 ')

  const deliveryLabel = deliveryType === 'stopdesk'
    ? (isAr ? 'توصيل للمكتب' : isFr ? 'Livraison Bureau' : 'Stopdesk Delivery')
    : (isAr ? 'توصيل للمنزل' : isFr ? 'Livraison à domicile' : 'Home Delivery')

  const officeText = stopdeskOfficeName
    ? `\n🏢 المكتب: ${stopdeskOfficeName}`
    : ''

  // Build Arabic Algerian-friendly message
  const waText = `السلام عليكم ✋
أريد تأكيد طلبي من متجر ${storeName}:

🛒 رقم الطلب: #${orderNumber}
📦 ${itemsText}
💰 المبلغ الإجمالي: ${formatDZD(total)}
🚚 ${deliveryLabel}: ${wilayaName} — ${communeName}${officeText}

شكراً 🙏`

  const waUrl = `https://wa.me/${waNumber}?text=${encodeURIComponent(waText)}`

  return (
    <div className="space-y-4">
      {/* Primary WhatsApp Confirmation CTA */}
      <div className="bg-emerald-50 border border-emerald-100 rounded-3xl p-5 text-center">
        <h4 className="text-base font-bold text-emerald-900 mb-1">
          {isAr ? 'خطوة مهمة جداً ⚠️' : isFr ? 'Étape Importante ⚠️' : 'Important Step ⚠️'}
        </h4>
        <p className="text-xs text-emerald-700 mb-4 leading-relaxed">
          {isAr
            ? 'يرجى تأكيد طلبك الآن عبر واتساب لتسريع معالجة الشحنة وتفادي الإلغاء.'
            : isFr
            ? 'Veuillez confirmer votre commande via WhatsApp pour accélérer le traitement.'
            : 'Please confirm your order via WhatsApp to speed up processing.'}
        </p>
        <a
          href={waUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center justify-center gap-2 w-full bg-[#25D366] hover:bg-[#20BD5C] text-white font-black py-4 px-6 rounded-2xl shadow-md transition transform hover:scale-[1.01] active:scale-[0.99] text-base"
        >
          <MessageCircle className="w-5 h-5 fill-white text-[#25D366]" />
          <span>
            {isAr
              ? 'تأكيد الطلب عبر WhatsApp'
              : isFr
              ? 'Confirmer via WhatsApp'
              : 'Confirm via WhatsApp'}
          </span>
        </a>
      </div>

      {/* Secondary Phone call confirmation */}
      <div className="text-center">
        <p className="text-xs text-gray-500 mb-2">
          {isAr ? 'أو يمكنك تأكيد طلبك عبر الهاتف' : isFr ? 'Ou vous pouvez confirmer par téléphone' : 'Or confirm by phone'}
        </p>
        <a
          href={`tel:${cleanMerchantPhone}`}
          className="flex items-center justify-center gap-2 w-full border border-gray-200 hover:bg-gray-50 text-gray-700 font-bold py-3 px-6 rounded-2xl transition text-sm"
        >
          <Phone className="w-4 h-4 text-gray-500" />
          <span>
            {isAr ? 'اتصل بنا لتأكيد الطلب' : isFr ? 'Appelez-nous pour confirmer' : 'Call us to confirm'}
          </span>
        </a>
      </div>

      {/* Stopdesk office call CTA (if phone available) */}
      {deliveryType === 'stopdesk' && officePhone && (
        <div className="border-t border-gray-100 pt-3 mt-3">
          <p className="text-xs text-gray-500 mb-2 text-start rtl:text-right">
            {isAr ? 'رقم مكتب التوصيل:' : isFr ? 'Téléphone du bureau:' : 'Office phone:'}{' '}
            <strong className="text-gray-800 font-mono">{officePhone}</strong>
          </p>
          <a
            href={`tel:${officePhone.replace(/\s+/g, '')}`}
            className="flex items-center justify-center gap-2 w-full border border-[#0D6EFD]/20 hover:bg-blue-50/50 text-[#0D6EFD] font-semibold py-2.5 px-4 rounded-xl transition text-xs"
          >
            <Phone className="w-3.5 h-3.5" />
            <span>
              {isAr ? 'الاتصال بمكتب التوصيل' : isFr ? 'Appeler le bureau' : 'Call office'}
            </span>
          </a>
        </div>
      )}
    </div>
  )
}
