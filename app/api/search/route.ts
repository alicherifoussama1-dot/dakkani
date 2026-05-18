// ============================================================
// AI Smart Search — Gemini intent extraction + pgvector + ILIKE fallback
// ============================================================
import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import { z } from 'zod'

const schema = z.object({
  query:    z.string().min(1).max(200),
  storeId:  z.string().uuid(),
  limit:    z.number().int().min(1).max(50).default(12),
})

// Extract search intent from Darija/Arabic query using Gemini
async function extractIntent(query: string): Promise<{ keywords: string[]; category?: string; maxPrice?: number }> {
  const apiKey = process.env.GEMINI_API_KEY
  if (!apiKey) return { keywords: [query] }

  try {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{
            role: 'user',
            parts: [{
              text: `من هذا البحث بالدارجة الجزائرية أو العربية: "${query}"
استخرج JSON:
{
  "keywords": ["كلمة1", "كلمة2"],
  "category": "الفئة إن وجدت أو null",
  "maxPrice": رقم_السعر_الأقصى_إن_ذكر_أو_null
}
مثال: "بدي قميص رخيص باش 1000 دج" → {"keywords":["قميص"],"category":null,"maxPrice":1000}
رد JSON فقط.`,
            }],
          }],
          generationConfig: { temperature: 0.1, maxOutputTokens: 200, responseMimeType: 'application/json' },
        }),
      }
    )
    if (!res.ok) return { keywords: [query] }
    const data = await res.json()
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text ?? '{}'
    return JSON.parse(text)
  } catch {
    return { keywords: [query] }
  }
}

export async function GET(req: Request) {
  const url = new URL(req.url)
  const parsed = schema.safeParse({
    query:   url.searchParams.get('q') ?? '',
    storeId: url.searchParams.get('store_id') ?? '',
    limit:   parseInt(url.searchParams.get('limit') ?? '12'),
  })
  if (!parsed.success) return NextResponse.json({ error: 'Invalid params' }, { status: 400 })

  const { query, storeId, limit } = parsed.data
  const cookieStore = cookies()
    const supabase = createServerClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, { cookies: { get: (n) => cookieStore.get(n)?.value, set: (n,v,o) => { try { cookieStore.set({name:n,value:v,...o}) } catch {} }, remove: (n,o) => { try { cookieStore.set({name:n,value:'',...o}) } catch {} } } })

  // 1. Extract intent
  const intent = await extractIntent(query)
  const keywords = intent.keywords.length ? intent.keywords : [query]

  // 2. Build ILIKE search across all keywords
  const ilikeClauses = keywords.flatMap(kw => [
    `name.ilike.%${kw}%`,
    `name_ar.ilike.%${kw}%`,
    `description_ar.ilike.%${kw}%`,
    `tags.cs.{${kw}}`,
  ]).join(',')

  let dbQuery = supabase
    .from('products')
    .select('id, name, name_ar, slug, price, compare_price, images, is_active')
    .eq('store_id', storeId)
    .eq('is_active', true)
    .or(ilikeClauses)
    .limit(limit)

  if (intent.maxPrice) {
    dbQuery = dbQuery.lte('price', intent.maxPrice)
  }

  const { data: products, error } = await dbQuery

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({
    products: products ?? [],
    intent,
    query,
    total: products?.length ?? 0,
  })
}
