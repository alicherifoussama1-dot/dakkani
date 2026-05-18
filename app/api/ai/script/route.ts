// ============================================================
// AI Darija Call Script Generator
// Falls back to template if Anthropic not configured
// ============================================================
import { NextResponse } from 'next/server'
import { z } from 'zod'

const schema = z.object({
  prompt:  z.string(),
  orderId: z.string().optional(),
})

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const { prompt } = schema.parse(body)

    const apiKey = process.env.ANTHROPIC_API_KEY
    if (!apiKey) {
      // Return a default Darija script
      return NextResponse.json({
        script: 'السلام عليكم! أنا نتصل من المتجر باش نأكدو الطلب معاك. واش المعلومات صحيحة؟ وأي وقت يناسبك للتوصيل؟',
        model: 'fallback',
      })
    }

    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-haiku-20240307',
        max_tokens: 300,
        messages: [{ role: 'user', content: prompt }],
        system: 'أنت موظف مركز اتصال جزائري محترف. تكتب نصوص اتصال بالدارجة الجزائرية فقط. النص يجب أن يكون طبيعياً وودياً وقصيراً.',
      }),
    })

    if (!res.ok) {
      return NextResponse.json({ script: prompt, model: 'error' }, { status: 200 })
    }

    const data = await res.json()
    const script = data.content?.[0]?.text ?? ''

    return NextResponse.json({ script, model: 'claude-haiku' })
  } catch (err) {
    return NextResponse.json({ script: '', error: (err as Error).message }, { status: 500 })
  }
}
