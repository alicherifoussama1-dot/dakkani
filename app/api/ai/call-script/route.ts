// ============================================================
// Darija WhatsApp / Call Script Generator
// ============================================================
import { NextResponse } from 'next/server'
import { z } from 'zod'

const schema = z.object({
  type: z.enum(['confirmation', 'recall', 'delivery', 'upsell', 'review']),
  customerName:  z.string(),
  orderNumber:   z.string(),
  storeName:     z.string(),
  products:      z.string().optional(),
  total:         z.number().optional(),
  wilaya:        z.string().optional(),
  deliveryDays:  z.string().optional(),
  trackingNum:   z.string().optional(),
  callAttempt:   z.number().default(1),
})

const TEMPLATES: Record<string, (d: z.infer<typeof schema>) => string> = {
  confirmation: (d) =>
    `السلام عليكم ${d.customerName}، تكلمت معاك؟
كنتصل من ${d.storeName} على طلب رقم ${d.orderNumber}.
${d.products ? `عندك طلب: ${d.products}.` : ''}
${d.total ? `المبلغ: ${d.total.toLocaleString()} دج — الدفع عند الاستلام.` : ''}
${d.wilaya ? `الولاية: ${d.wilaya}.` : ''}
واش كل شيء مزيان؟ ومتى يناسبك التوصيل؟`,

  recall: (d) =>
    `السلام عليكم ${d.customerName}.
هذه المرة ${d.callAttempt > 1 ? 'الثانية' : ''} نتصل بيك من ${d.storeName}.
عندك طلب رقم ${d.orderNumber} باش يتوصل ليك.
كيفاش نديرو باش نوصلوك؟`,

  delivery: (d) =>
    `السلام عليكم ${d.customerName}!
طلبك رقم ${d.orderNumber} من ${d.storeName} خرج للتوصيل 🚚
${d.trackingNum ? `رقم التتبع: ${d.trackingNum}` : ''}
${d.deliveryDays ? `يوصلك ${d.deliveryDays} إن شاء الله` : ''}
كن جاهز وشكراً على ثقتك!`,

  upsell: (d) =>
    `السلام عليكم ${d.customerName}!
شكراً على طلبك من ${d.storeName}.
عندنا عروض جديدة تناسبك — واش تحب نشوف معاك؟`,

  review: (d) =>
    `السلام عليكم ${d.customerName}.
وصلك طلبك من ${d.storeName} بخير إن شاء الله.
نتمنو تكون راضي وياسر يسعدنا تعطينا رأيك.
5 نجوم تعني الكثير لينا 🌟`,
}

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const data = schema.parse(body)

    const apiKey = process.env.GEMINI_API_KEY
    const templateScript = TEMPLATES[data.type]?.(data) ?? TEMPLATES.confirmation(data)

    if (!apiKey) {
      return NextResponse.json({ script: templateScript, source: 'template' })
    }

    // Enhance with Gemini
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${process.env.GEMINI_TEXT_MODEL ?? 'gemini-3.5-flash'}:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          systemInstruction: {
            parts: [{
              text: `أنت موظف تسويق في متجر إلكتروني جزائري.
تكتب نصوص اتصال ورسائل واتساب بالدارجة الجزائرية.
الأسلوب: ودي، مختصر، مقنع. لا تستخدم كلمات إنجليزية.
الرد: النص فقط بدون تعليق.`,
            }],
          },
          contents: [{
            role: 'user',
            parts: [{
              text: `حسّن هذا النص للتواصل مع عميل جزائري بشكل طبيعي وودي:
${templateScript}`,
            }],
          }],
          generationConfig: { temperature: 0.6, maxOutputTokens: 300 },
        }),
      }
    )

    if (!res.ok) return NextResponse.json({ script: templateScript, source: 'template' })

    const geminiData = await res.json()
    const enhanced = geminiData.candidates?.[0]?.content?.parts?.[0]?.text ?? templateScript

    return NextResponse.json({ script: enhanced.trim(), source: 'gemini' })
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid input' }, { status: 400 })
    }
    return NextResponse.json({ script: '', error: (err as Error).message }, { status: 500 })
  }
}
