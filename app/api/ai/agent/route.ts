// ============================================================
// AI Agent API — Gemini with function-calling + store context
// ============================================================
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import { z } from 'zod'

const schema = z.object({
  message:  z.string().min(1),
  storeId:  z.string().uuid(),
  context:  z.object({
    storeName:       z.string(),
    todayOrders:     z.number(),
    todayRevenue:    z.number(),
    activeProducts:  z.number(),
    pendingOrders:   z.number(),
  }),
  history: z.array(z.object({ role: z.string(), content: z.string() })).default([]),
})

// ── Function declarations for Gemini ──────────────────────
const FUNCTIONS = [
  {
    name: 'get_store_stats',
    description: 'Get sales stats, revenue, order counts for the store',
    parameters: { type: 'object', properties: { period: { type: 'string', enum: ['today', 'week', 'month'] } }, required: ['period'] },
  },
  {
    name: 'create_coupon',
    description: 'Create a discount coupon for the store',
    parameters: {
      type: 'object',
      properties: {
        code:    { type: 'string' },
        type:    { type: 'string', enum: ['percentage', 'fixed', 'free_shipping'] },
        value:   { type: 'number' },
        expires_hours: { type: 'number' },
      },
      required: ['code', 'type', 'value'],
    },
  },
  {
    name: 'get_pending_orders',
    description: 'Get list of pending/new orders awaiting confirmation',
    parameters: { type: 'object', properties: { limit: { type: 'number' } }, required: [] },
  },
  {
    name: 'get_top_products',
    description: 'Get best-selling products by revenue or quantity',
    parameters: { type: 'object', properties: { by: { type: 'string', enum: ['revenue', 'quantity'] }, limit: { type: 'number' } }, required: ['by'] },
  },
  {
    name: 'get_fraud_report',
    description: 'Get summary of suspicious/high-fraud orders',
    parameters: { type: 'object', properties: { minScore: { type: 'number' } }, required: [] },
  },
]

// ── Execute function calls ────────────────────────────────
async function executeFunction(
  name: string,
  args: Record<string, unknown>,
  storeId: string,
  supabase: ReturnType<typeof createRouteHandlerClient>
): Promise<{ result: string; label: string }> {
  switch (name) {
    case 'get_store_stats': {
      const period = args.period as string
      const daysBack = period === 'week' ? 7 : period === 'month' ? 30 : 0
      const from = new Date()
      from.setDate(from.getDate() - daysBack)
      from.setHours(0, 0, 0, 0)

      const { data: orders } = await supabase
        .from('orders')
        .select('total, status')
        .eq('store_id', storeId)
        .gte('created_at', from.toISOString())

      const total       = (orders ?? []).length
      const delivered   = (orders ?? []).filter(o => o.status === 'delivered')
      const revenue     = delivered.reduce((s, o) => s + o.total, 0)
      const cancelled   = (orders ?? []).filter(o => o.status === 'cancelled').length

      return {
        result: `${total} طلب، إيرادات: ${revenue.toLocaleString('fr-DZ')} دج، ${cancelled} ملغى`,
        label: `إحصائيات ${period}`,
      }
    }

    case 'create_coupon': {
      const code   = String(args.code).toUpperCase()
      const expires = args.expires_hours
        ? new Date(Date.now() + Number(args.expires_hours) * 3600000).toISOString()
        : null

      const { error } = await supabase.from('coupons').insert({
        store_id:   storeId,
        code,
        type:       args.type,
        value:      args.value,
        expires_at: expires,
        is_active:  true,
      })

      return {
        result: error ? `خطأ: ${error.message}` : `✅ كوبون ${code} تم إنشاؤه`,
        label:  'إنشاء كوبون',
      }
    }

    case 'get_pending_orders': {
      const { data, count } = await supabase
        .from('orders')
        .select('order_number, customer_name, total, wilaya:wilayas(name_ar)', { count: 'exact' })
        .eq('store_id', storeId)
        .eq('status', 'new')
        .order('created_at')
        .limit(Number(args.limit ?? 5))

      const list = (data ?? []).map(o => `${o.order_number}: ${o.customer_name}`).join('، ')
      return {
        result: `${count} طلب معلق${list ? ': ' + list : ''}`,
        label:  'الطلبات المعلقة',
      }
    }

    case 'get_top_products': {
      const by    = args.by as string
      const limit = Number(args.limit ?? 5)
      const { data } = await supabase
        .from('order_items')
        .select('product_name, quantity, total_price')
        .eq('store_id' as any, storeId)
        .limit(200)

      const map: Record<string, { qty: number; rev: number }> = {}
      ;(data ?? []).forEach(i => {
        if (!map[i.product_name]) map[i.product_name] = { qty: 0, rev: 0 }
        map[i.product_name].qty += i.quantity
        map[i.product_name].rev += i.total_price
      })
      const sorted = Object.entries(map)
        .sort((a, b) => (by === 'revenue' ? b[1].rev - a[1].rev : b[1].qty - a[1].qty))
        .slice(0, limit)
        .map(([n, v]) => `${n}: ${by === 'revenue' ? v.rev.toLocaleString() + ' دج' : v.qty + ' وحدة'}`)
        .join('، ')

      return { result: sorted || 'لا بيانات', label: 'أكثر المنتجات مبيعاً' }
    }

    case 'get_fraud_report': {
      const minScore = Number(args.minScore ?? 70)
      const { data, count } = await supabase
        .from('orders')
        .select('order_number, fraud_score, customer_phone, status', { count: 'exact' })
        .eq('store_id', storeId)
        .gte('fraud_score', minScore)
        .order('fraud_score', { ascending: false })
        .limit(5)

      const list = (data ?? []).map(o => `${o.order_number} (${o.fraud_score}%)`).join('، ')
      return {
        result: `${count} طلب مشبوه${list ? ': ' + list : ''}`,
        label:  'تقرير الاحتيال',
      }
    }

    default:
      return { result: 'دالة غير معرّفة', label: name }
  }
}

export async function POST(req: Request) {
  const supabase = createRouteHandlerClient({ cookies })

  try {
    const body = await req.json()
    const { message, storeId, context, history } = schema.parse(body)

    const apiKey = process.env.GEMINI_API_KEY
    if (!apiKey) {
      return NextResponse.json({
        message: `فهمت سؤالك: "${message}"\n\nلاستخدام مساعد AI، يرجى إضافة GEMINI_API_KEY في ملف .env.local`,
        actions: [],
      })
    }

    const systemPrompt = `أنت مساعد AI ذكي لإدارة متجر "${context.storeName}" على منصة دكاني الجزائرية.
لديك صلاحية الوصول لبيانات المتجر واتخاذ إجراءات حقيقية.
السياق الحالي:
- طلبات اليوم: ${context.todayOrders}
- إيرادات اليوم: ${context.todayRevenue.toLocaleString()} دج
- طلبات معلقة: ${context.pendingOrders}
- منتجات نشطة: ${context.activeProducts}

تواصل بالعربية الفصيحة أو الدارجة الجزائرية حسب رسالة المستخدم.
إذا طُلب منك إجراء مثل إنشاء كوبون أو الحصول على إحصائيات، استخدم الدوال المتاحة.`

    const geminiHistory = history.map(m => ({
      role: m.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: m.content }],
    }))

    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          systemInstruction: { parts: [{ text: systemPrompt }] },
          contents: [
            ...geminiHistory,
            { role: 'user', parts: [{ text: message }] },
          ],
          tools: [{ functionDeclarations: FUNCTIONS }],
          generationConfig: { temperature: 0.5, maxOutputTokens: 800 },
        }),
      }
    )

    if (!res.ok) {
      const err = await res.json()
      return NextResponse.json({ message: `خطأ Gemini: ${err.error?.message ?? 'غير معروف'}`, actions: [] })
    }

    const geminiData = await res.json()
    const candidate  = geminiData.candidates?.[0]
    const parts      = candidate?.content?.parts ?? []

    const actions: { label: string; result: string; status: string }[] = []
    let textResponse = ''

    // Process function calls
    for (const part of parts) {
      if (part.functionCall) {
        const { name, args } = part.functionCall
        const { result, label } = await executeFunction(name, args, storeId, supabase as any)
        actions.push({ label, result, status: 'done' })
      }
      if (part.text) {
        textResponse += part.text
      }
    }

    // If function was called but no text, ask Gemini to summarize
    if (actions.length > 0 && !textResponse.trim()) {
      const summaryRes = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent?key=${apiKey}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{
              role: 'user',
              parts: [{
                text: `بناءً على هذه النتائج: ${actions.map(a => `${a.label}: ${a.result}`).join('. ')}
اكتب رداً مختصراً ومفيداً بالعربية للمستخدم الذي سأل: "${message}"`,
              }],
            }],
            generationConfig: { temperature: 0.4, maxOutputTokens: 400 },
          }),
        }
      )
      if (summaryRes.ok) {
        const sd = await summaryRes.json()
        textResponse = sd.candidates?.[0]?.content?.parts?.[0]?.text ?? ''
      }
    }

    return NextResponse.json({
      message: textResponse.trim() || 'تم تنفيذ العملية بنجاح.',
      actions,
    })
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid input' }, { status: 400 })
    }
    console.error('AI Agent error:', err)
    return NextResponse.json({ message: 'حدث خطأ في معالجة طلبك.', actions: [] })
  }
}
