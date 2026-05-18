// ============================================================
// WhatsApp Business API Notification
// Sends order confirmation in Algerian Darija
// ============================================================
import { NextResponse } from 'next/server'
import { z } from 'zod'

const schema = z.object({
  phone:        z.string(),
  orderNumber:  z.string(),
  customerName: z.string(),
  total:        z.number(),
  storeName:    z.string(),
  type: z.enum(['order_confirmed', 'order_shipped', 'order_delivered', 'recall']).default('order_confirmed'),
  trackingNumber: z.string().optional(),
  deliveryDays:   z.string().optional(),
})

// ── Darija message templates ──────────────────────────────
const MESSAGES: Record<string, (d: z.infer<typeof schema>) => string> = {
  order_confirmed: (d) =>
    `السلام عليكم ${d.customerName} 🛍️\n\nتوصلنا بطلبك من ${d.storeName}!\n\n📦 رقم الطلب: *${d.orderNumber}*\n💵 المبلغ: *${d.total.toLocaleString('fr-DZ')} دج*\n\nغادي نتصلو بيك قريب باش نأكدو الطلب.\n\nشكراً على ثقتك فينا! 🙏`,
  order_shipped: (d) =>
    `${d.customerName}، طلبك *${d.orderNumber}* تعداه للتوصيل! 🚚\n\n${d.trackingNumber ? `رقم التتبع: *${d.trackingNumber}*\n` : ''}${d.deliveryDays ? `وصلك في: *${d.deliveryDays}*\n` : ''}\nتوصيلة على خير! 📦`,
  order_delivered: (d) =>
    `مبروك ${d.customerName}! 🎉\n\nوصلك طلبك من ${d.storeName} بخير!\n\nنتمنو تكون راضي على الخدمة، وإلا عندك أي مشكل اتصل بنا مباشرة.\n\nشكراً وعود تشري معنا! ❤️`,
  recall: (d) =>
    `${d.customerName}، حاولنا نتصلو بيك على طلبك *${d.orderNumber}*.\n\nاتصل بنا وقت يناسبك باش نكملو التوصيل. 📞`,
}

// ── Normalize Algerian phone to WhatsApp format ───────────
function toWhatsAppPhone(phone: string): string {
  const cleaned = phone.replace(/\D/g, '')
  if (cleaned.startsWith('213')) return '+' + cleaned
  if (cleaned.startsWith('0'))   return '+213' + cleaned.slice(1)
  return '+213' + cleaned
}

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const data = schema.parse(body)

    const waPhone    = toWhatsAppPhone(data.phone)
    const apiUrl     = process.env.WHATSAPP_API_URL
    const apiToken   = process.env.WHATSAPP_API_TOKEN
    const phoneNumId = process.env.WHATSAPP_PHONE_NUMBER_ID

    if (!apiToken || !phoneNumId) {
      // Not configured — silently succeed (dev mode)
      return NextResponse.json({ ok: true, skipped: true, reason: 'WhatsApp not configured' })
    }

    const message = MESSAGES[data.type]?.(data) ?? MESSAGES.order_confirmed(data)

    // ── WhatsApp Cloud API (Meta) ──────────────────────────
    const whatsappApiUrl = `https://graph.facebook.com/v18.0/${phoneNumId}/messages`

    const res = await fetch(whatsappApiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiToken}`,
      },
      body: JSON.stringify({
        messaging_product: 'whatsapp',
        recipient_type: 'individual',
        to: waPhone,
        type: 'text',
        text: { preview_url: false, body: message },
      }),
    })

    const result = await res.json()

    if (!res.ok) {
      console.error('WhatsApp API error:', result)
      return NextResponse.json({ ok: false, error: result }, { status: 502 })
    }

    return NextResponse.json({ ok: true, messageId: result.messages?.[0]?.id })
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid payload' }, { status: 400 })
    }
    console.error('WhatsApp notification error:', err)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
