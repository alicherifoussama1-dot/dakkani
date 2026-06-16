// ============================================================
// AI Store Generator — Gemini, SERVER-SIDE ONLY
//
// POST { name, niche, vibe?, products?: string[] }
//   → picks theme + composes a full storefront layout (sections, order,
//     Darija/Arabic copy) tailored to the niche → persists a
//     store_builder_jobs row → returns { jobId, theme_key, layout }.
//
// Key: process.env.GEMINI_API_KEY only — never reaches the client.
// ============================================================
import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import { z } from 'zod'
import { geminiGenerateJSONWithRetry } from '@/lib/ai/gemini'
import { normalizeLayout, SECTION_TYPES } from '@/lib/storefront/sections'
import { PRODUCT_THEMES } from '@/lib/product-themes'

export const maxDuration = 60

const schema = z.object({
  storeId:  z.string().uuid(),
  name:     z.string().min(1),
  niche:    z.string().min(1),
  vibe:     z.string().optional().default(''),
  products: z.array(z.string()).optional().default([]),
})

const THEME_KEYS = PRODUCT_THEMES.map(t => t.key)

const SYSTEM_PROMPT = `أنت مصمم متاجر إلكترونية جزائرية محترف. مهمتك تركيب صفحة رئيسية كاملة لمتجر دفع-عند-الاستلام (COD)، باختيار الأقسام وترتيبها واختيار ثيم مناسب وكتابة النصوص بالدارجة الجزائرية الراقية.

الأقسام المتاحة (استعمل type من هذه القائمة فقط):
- announcement: شريط ترويجي. settings.text (جمل مفصولة بـ ·)
- hero: بانر رئيسي. settings.headline, subheadline, cta_label
- featured: منتجات مميزة. settings.title
- collections: الأقسام/التصنيفات. settings.title
- product_grid: شبكة المنتجات (الكتالوج). settings.title, subtitle
- image_text: صورة+نص. settings.title, body, cta_label, cta_href
- icon_list: شارات الثقة (الدفع عند الاستلام، 58 ولاية، ضمان)
- testimonials: آراء العملاء. settings.title
- gallery: معرض صور لايف ستايل. settings.title
- newsletter: النشرة البريدية. settings.title, cta_label

الثيمات المتاحة (اختر key واحد): classic, modern, elegant, vibrant, luxury, minimal, poster.
دليل الاختيار: حجاب/أزياء راقية→elegant، إلكترونيات/عصري→modern، تجميل/عطور فاخرة→luxury، أطفال/إكسسوارات مرحة→vibrant، عام/متعدد→classic، تصميم هادئ→minimal.

قواعد:
1. ابدأ عادة بـ hero ثم announcement، وضع product_grid، واختم بـ icon_list/testimonials/newsletter.
2. اكتب النصوص بالدارجة الجزائرية المقنعة (مثال hero headline: "أناقة تليق بيك — وصلت تشكيلة الخريف 🍂").
3. رتّب 6-9 أقسام منطقية حسب الفئة. لا تكرر نفس النوع أكثر من مرتين.
4. أعد JSON صالح فقط بهذا الشكل:
{"theme_key":"<key>","layout":[{"type":"<type>","visible":true,"settings":{...}}, ...]}`

function buildUserPrompt(p: z.infer<typeof schema>) {
  return `اسم المتجر: ${p.name}
الفئة/النيتش: ${p.niche}
${p.vibe ? `الطابع المطلوب: ${p.vibe}` : ''}
${p.products.length ? `أمثلة منتجات: ${p.products.slice(0, 8).join('، ')}` : ''}

ركّب صفحة رئيسية كاملة (theme_key + layout) تناسب هذه الفئة. أعد JSON فقط.`
}

export async function POST(req: Request) {
  let parsed: z.infer<typeof schema>
  try { parsed = schema.parse(await req.json()) }
  catch { return NextResponse.json({ error: 'بيانات غير صحيحة' }, { status: 400 }) }

  const cookieStore = cookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: {
      get: (n) => cookieStore.get(n)?.value,
      set: (n, v, o: CookieOptions) => { try { cookieStore.set({ name: n, value: v, ...o }) } catch {} },
      remove: (n, o: CookieOptions) => { try { cookieStore.set({ name: n, value: '', ...o }) } catch {} },
    } }
  )

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { data: store } = await supabase.from('stores').select('id, owner_id').eq('id', parsed.storeId).single()
  if (!store || store.owner_id !== user.id) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { data: job } = await supabase.from('store_builder_jobs')
    .insert({ store_id: parsed.storeId, status: 'running', input: parsed }).select('id').single()

  const gen = await geminiGenerateJSONWithRetry({
    systemPrompt: SYSTEM_PROMPT, userPrompt: buildUserPrompt(parsed), temperature: 0.85,
  })

  if (!gen.ok) {
    if (job) await supabase.from('store_builder_jobs').update({ status: 'error', error: gen.error.slice(0, 300) }).eq('id', job.id)
    return NextResponse.json({ error: `تعذّر التوليد: ${gen.error}` }, { status: 502 })
  }

  // Validate + normalize the model output before trusting it.
  const theme_key = THEME_KEYS.includes(gen.data?.theme_key) ? gen.data.theme_key : 'classic'
  const layout = normalizeLayout(
    Array.isArray(gen.data?.layout)
      ? gen.data.layout.filter((s: any) => SECTION_TYPES.includes(s?.type))
      : null
  )

  if (job) await supabase.from('store_builder_jobs').update({ status: 'done', result: { theme_key, layout } }).eq('id', job.id)
  return NextResponse.json({ jobId: job?.id ?? null, theme_key, layout })
}
