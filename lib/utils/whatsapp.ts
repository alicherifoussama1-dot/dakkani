import { formatDZD } from './format'

export const DEFAULT_WHATSAPP_TEMPLATE = `السلام عليكم 👋

أريد تأكيد طلبي من متجر: {store_name}

📋 رقم الطلب: {order_number}
🛍️ الطلب: {product_name} ({variant}) × {quantity}
💰 الإجمالي: {total}

👤 الاسم: {customer_name}
📞 الهاتف: {phone}
📍 {wilaya} — {commune}
🚚 التوصيل: {delivery_method}

شكراً لكم 🌷`

export interface WhatsAppMessageData {
  storeName: string
  orderNumber: string
  customerName: string
  phone: string
  items: Array<{
    product_name: string
    variant_label?: string | null
    variant_key?: string
    quantity: number
  }>
  total: number
  deliveryType: 'home' | 'stopdesk'
  wilayaName: string
  communeName: string
  address?: string | null
  stopdeskOfficeName?: string | null
  lang?: 'ar' | 'fr' | 'en'
}

export function buildWhatsAppMessage(
  template: string | null | undefined,
  data: WhatsAppMessageData
): string {
  const tpl = (template && template.trim().length > 0) ? template : DEFAULT_WHATSAPP_TEMPLATE

  const isAr = data.lang === 'ar' || !data.lang
  const isFr = data.lang === 'fr'

  // 1. Prepare values for placeholders
  const store_name = data.storeName || ''
  const rawNum = data.orderNumber || ''
  const order_number = rawNum ? (rawNum.startsWith('#') ? rawNum : `#${rawNum}`) : ''
  const customer_name = data.customerName || ''
  const phone = data.phone || ''
  const total = formatDZD(data.total || 0)
  const wilaya = data.wilayaName || ''
  const commune = data.communeName || ''

  const delivery_method = data.deliveryType === 'stopdesk'
    ? (isAr ? 'توصيل للمكتب' : isFr ? 'Livraison Bureau' : 'Stopdesk Delivery')
    : (isAr ? 'توصيل للمنزل' : isFr ? 'Livraison à domicile' : 'Home Delivery')

  const address = data.address || ''
  const stopdesk = data.stopdeskOfficeName || ''

  // Product & Variant & Quantity formatting
  let product_name = ''
  let variant = ''
  let quantity = '1'

  if (data.items && data.items.length > 0) {
    if (data.items.length === 1) {
      const item = data.items[0]
      product_name = item.product_name || ''
      const vText = item.variant_label || (item.variant_key && item.variant_key !== 'default' ? item.variant_key : '') || ''
      variant = vText
      quantity = String(item.quantity || 1)
    } else {
      product_name = data.items.map(i => i.product_name).filter(Boolean).join(', ')
      const variantsList = data.items
        .map(i => i.variant_label || (i.variant_key && i.variant_key !== 'default' ? i.variant_key : null))
        .filter(Boolean)
      variant = variantsList.join(', ')
      const totalQty = data.items.reduce((acc, i) => acc + (i.quantity || 1), 0)
      quantity = String(totalQty)
    }
  }

  // 2. Perform variable replacement
  let result = tpl
    .replace(/\{store_name\}/g, store_name)
    .replace(/\{order_number\}/g, order_number)
    .replace(/\{customer_name\}/g, customer_name)
    .replace(/\{phone\}/g, phone)
    .replace(/\{product_name\}/g, product_name)
    .replace(/\{variant\}/g, variant)
    .replace(/\{quantity\}/g, quantity)
    .replace(/\{total\}/g, total)
    .replace(/\{wilaya\}/g, wilaya)
    .replace(/\{commune\}/g, commune)
    .replace(/\{delivery_method\}/g, delivery_method)
    .replace(/\{address\}/g, address)
    .replace(/\{stopdesk\}/g, stopdesk)

  // 3. Remove any unrecognized/unbound placeholders e.g. {unknown_var}
  result = result.replace(/\{[a-zA-Z0-9_]+\}/g, '')

  // 4. Clean up empty parentheses e.g. " ()", "( )", "()" resulting from empty variant
  result = result.replace(/\(\s*\)/g, '')

  // 5. Clean up any lines left with empty colons e.g. "🏠 العنوان:" or "🏢 المكتب:" when value is missing
  const cleanedLines = result.split('\n').filter(line => {
    const trimmed = line.trim()
    if (/^[^\w\s\d]+[\s\S]*:\s*$/.test(trimmed) || /^[^:]+:\s*$/.test(trimmed)) {
      return false
    }
    return true
  })

  // 6. Clean up duplicate empty lines
  return cleanedLines.join('\n').replace(/\n{3,}/g, '\n\n').trim()
}

export interface ThankYouResolvedConfig {
  waNumber: string
  callNumber: string
  whatsappTemplate: string
  waEnabled: boolean
  callEnabled: boolean
}

export function resolveThankYouConfig(params: {
  store: {
    phone?: string | null
    whatsapp?: string | null
    store_settings?: any
  }
  products: Array<{
    id?: string
    thankyou_whatsapp?: string | null
    thankyou_phone?: string | null
    thankyou_whatsapp_template?: string | null
    thankyou_wa_enabled?: boolean | null
    thankyou_call_enabled?: boolean | null
  }>
}): ThankYouResolvedConfig {
  const settings = Array.isArray(params.store.store_settings)
    ? (params.store.store_settings[0] ?? {})
    : (params.store.store_settings ?? {})

  // Store Fallbacks
  const storeDefaultWaNumber =
    (settings.whatsapp_number && settings.whatsapp_number.trim()) ||
    (params.store.whatsapp && params.store.whatsapp.trim()) ||
    (params.store.phone && params.store.phone.trim()) ||
    ''

  const storeDefaultCallNumber =
    (settings.call_number && settings.call_number.trim()) ||
    (params.store.phone && params.store.phone.trim()) ||
    ''

  const storeDefaultWaTemplate =
    (settings.whatsapp_template && settings.whatsapp_template.trim()) ||
    DEFAULT_WHATSAPP_TEMPLATE

  const storeDefaultWaEnabled = settings.thankyou_wa_enabled ?? true
  const storeDefaultCallEnabled = settings.thankyou_call_enabled ?? true

  const prods = (params.products ?? []).filter(Boolean)

  if (prods.length === 0) {
    return {
      waNumber: storeDefaultWaNumber,
      callNumber: storeDefaultCallNumber,
      whatsappTemplate: storeDefaultWaTemplate,
      waEnabled: storeDefaultWaEnabled,
      callEnabled: storeDefaultCallEnabled,
    }
  }

  if (prods.length === 1) {
    const p = prods[0]
    const waNumber = (p.thankyou_whatsapp && p.thankyou_whatsapp.trim()) || storeDefaultWaNumber
    const callNumber = (p.thankyou_phone && p.thankyou_phone.trim()) || storeDefaultCallNumber
    const whatsappTemplate = (p.thankyou_whatsapp_template && p.thankyou_whatsapp_template.trim()) || storeDefaultWaTemplate
    const waEnabled = p.thankyou_wa_enabled ?? storeDefaultWaEnabled
    const callEnabled = p.thankyou_call_enabled ?? storeDefaultCallEnabled

    return { waNumber, callNumber, whatsappTemplate, waEnabled, callEnabled }
  }

  // Multi-product logic:
  // 1. WhatsApp Number
  const pWaNumbers = prods.map(p => p.thankyou_whatsapp && p.thankyou_whatsapp.trim()).filter(Boolean)
  const allSameWaNumber = pWaNumbers.length === prods.length && pWaNumbers.every(n => n === pWaNumbers[0])
  const waNumber = allSameWaNumber ? pWaNumbers[0]! : storeDefaultWaNumber

  // 2. Call Number
  const pCallNumbers = prods.map(p => p.thankyou_phone && p.thankyou_phone.trim()).filter(Boolean)
  const allSameCallNumber = pCallNumbers.length === prods.length && pCallNumbers.every(n => n === pCallNumbers[0])
  const callNumber = allSameCallNumber ? pCallNumbers[0]! : storeDefaultCallNumber

  // 3. WhatsApp Template
  const pTemplates = prods.map(p => p.thankyou_whatsapp_template && p.thankyou_whatsapp_template.trim()).filter(Boolean)
  const allSameTemplate = pTemplates.length === prods.length && pTemplates.every(t => t === pTemplates[0])
  const whatsappTemplate = allSameTemplate ? pTemplates[0]! : storeDefaultWaTemplate

  // 4. Buttons Enabled
  const waEnabled = prods.some(p => p.thankyou_wa_enabled === true) || (storeDefaultWaEnabled && !prods.every(p => p.thankyou_wa_enabled === false))
  const callEnabled = prods.some(p => p.thankyou_call_enabled === true) || (storeDefaultCallEnabled && !prods.every(p => p.thankyou_call_enabled === false))

  return { waNumber, callNumber, whatsappTemplate, waEnabled, callEnabled }
}
