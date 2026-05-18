// ============================================================
// SMS Notification via Twilio
// Sends Arabic/Darija order confirmation SMS
// ============================================================
import { NextResponse } from 'next/server'
import { z } from 'zod'

const schema = z.object({
  phone:        z.string(),
  orderNumber:  z.string(),
  customerName: z.string(),
  total:        z.number(),
  storeName:    z.string(),
  type: z.enum(['order_confirmed', 'order_shipped', 'order_delivered']).default('order_confirmed'),
  trackingNumber: z.string().optional(),
})

// ── Short SMS messages (max 160 chars for single SMS) ────
const SMS_MESSAGES: Record<string, (d: z.infer<typeof schema>) => string> = {
  order_confirmed: (d) =>
    `${d.storeName}: طلبك ${d.orderNumber} وصلنا! المبلغ ${d.total.toLocaleString()} دج. غادي نتصلو بيك قريب لتأكيد التوصيل.`,
  order_shipped: (d) =>
    `${d.storeName}: طلبك ${d.orderNumber} خرج للتوصيل!${d.trackingNumber ? ` رقم التتبع: ${d.trackingNumber}` : ''} يوصلك قريب.`,
  order_delivered: (d) =>
    `${d.storeName}: وصلك طلبك ${d.orderNumber} بخير! شكراً على ثقتك.`,
}

// ── Normalize phone ───────────────────────────────────────
function toE164(phone: string): string {
  const cleaned = phone.replace(/\D/g, '')
  if (cleaned.startsWith('213')) return '+' + cleaned
  if (cleaned.startsWith('0'))   return '+213' + cleaned.slice(1)
  return '+213' + cleaned
}

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const data = schema.parse(body)

    const accountSid = process.env.TWILIO_ACCOUNT_SID
    const authToken  = process.env.TWILIO_AUTH_TOKEN
    const fromNumber = process.env.TWILIO_PHONE_NUMBER

    if (!accountSid || !authToken || !fromNumber) {
      return NextResponse.json({ ok: true, skipped: true, reason: 'Twilio not configured' })
    }

    const toPhone = toE164(data.phone)
    const message = SMS_MESSAGES[data.type]?.(data) ?? SMS_MESSAGES.order_confirmed(data)

    const twilioUrl = `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`

    const formBody = new URLSearchParams({
      To:   toPhone,
      From: fromNumber,
      Body: message,
    })

    const res = await fetch(twilioUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        Authorization: `Basic ${Buffer.from(`${accountSid}:${authToken}`).toString('base64')}`,
      },
      body: formBody.toString(),
    })

    const result = await res.json()

    if (!res.ok || result.status === 'failed') {
      console.error('Twilio SMS error:', result)
      return NextResponse.json({ ok: false, error: result.message }, { status: 502 })
    }

    return NextResponse.json({ ok: true, sid: result.sid })
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid payload' }, { status: 400 })
    }
    console.error('SMS error:', err)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
