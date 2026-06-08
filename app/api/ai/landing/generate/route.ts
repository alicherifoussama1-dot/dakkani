// ============================================================
// AI Landing Copy Generator — Gemini Pro, SERVER-SIDE ONLY
//
// POST { storeId, product: {name, description, price, audience?, tone?, images?} }
//   → creates a landing_jobs row (type='text'), runs Gemini, stores the
//     structured JSON result, and returns { jobId, status, result }.
//
// The frontend NEVER calls Gemini directly — only this route, which reads
// GEMINI_API_KEY from process.env (server-only, never NEXT_PUBLIC_).
// ============================================================
import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import { z } from 'zod'
import { geminiGenerateJSONWithRetry } from '@/lib/ai/gemini'

export const maxDuration = 60

const schema = z.object({
  storeId: z.string().uuid(),
  product: z.object({
    name: z.string().min(1),
    description: z.string().optional().default(''),
    price: z.number().optional(),
    category: z.string().optional(),
    audience: z.string().optional(),
    tone: z.string().optional(),
    images: z.array(z.string()).optional().default([]),
  }),
})

// ── System prompt: Algerian-market direct-response copywriter ────────────
// Few-shot anchored, AIDA/PAS-aware, category-adaptive, authentic Darija
// (NOT Modern Standard Arabic — that reads as robotic to Algerian buyers).
const SYSTEM_PROMPT = `أنت أفضل كاتب إعلانات (copywriter) متخصص في المتاجر الإلكترونية الجزائرية ونظام الدفع عند الاستلام (COD).

جمهورك: مشترٍ جزائري عادي يتصفح من هاتفه، متشكك من الشراء أونلاين (خايف يخسر فلوسه أو يجيه منتج مغشوش). عليك أن تكسب ثقته في أول 3 ثواني وتدفعه للطلب فوراً.

قواعد الكتابة (إلزامية):
1. اكتب بالدارجة الجزائرية الأصيلة المتداولة فعلاً في المحادثات والإعلانات — ليس بالعربية الفصحى الجامدة. مثال: "هذا المنتج راهو يهبل" وليس "هذا المنتج رائع للغاية". استعمل عبارات مثل "ربي يخليه"، "ماشي كيما تتصور"، "صدقني"، "ولّى"، "بزاف"، "تستاهل"، "ما تفوتش الفرصة"، "خويا/أختي".
2. استعمل أطر الإقناع المباشر: AIDA (انتباه ← اهتمام ← رغبة ← فعل) أو PAS (مشكلة ← تضخيم الألم ← الحل) — اختر الأنسب حسب المنتج.
3. ابنِ الثقة فوراً: اذكر بطبيعية "الدفع عند الاستلام"، "تقدر تشوف المنتج وتتأكد منه قبل ما تدفع"، "التوصيل لـ58 ولاية"، "ضمان الاسترجاع" — لكن بأسلوب طبيعي وليس كقائمة جافة.
4. إلحاح حقيقي وليس مزيف: اربط الإلحاح بسبب منطقي (كمية محدودة، عرض موسمي، طلب كبير) — لا تكذب أو تبالغ بشكل يفقد المصداقية.
5. اكتشف فئة المنتج (حجاب/أزياء، إلكترونيات، تجميل، منزل، أو غير ذلك) وكيّف زاوية البيع: الأزياء→المظهر والثقة بالنفس، الإلكترونيات→الجودة والضمان والمواصفات، التجميل→النتيجة والتحول، المنزل→الراحة والعملية.
6. لا حشو ولا مبالغة فارغة. كل جملة تخدم هدف الإقناع.

أمثلة على عناوين جزائرية ممتازة (انسج على نفس الروح والمستوى، لا تنسخها):
- "آخر مرة تشري فيها حجاب وما يبانش راقي عليك… جرّبي هذا وشوفي الفرق بعينيك 😍"
- "سخانة قهوتك ما تبردش قبل ما تكمليها؟ هذا الحل اللي كانوا يستناوه آلاف الجزائريين"
- "خوذ مقاسك الصحيح من الكوش بلا ما تتنقل… التوصيل لباب دارك والدفع بعد ما تشوف"

أعد دائماً JSON صالح فقط بدون أي علامات Markdown أو نص خارج الـJSON.`

function buildUserPrompt(p: z.infer<typeof schema>['product']) {
  return `أنشئ نسخة كاملة احترافية لصفحة هبوط (landing page) لهذا المنتج:

اسم المنتج: ${p.name}
${p.description ? `الوصف: ${p.description}` : ''}
${p.price ? `السعر: ${p.price.toLocaleString('fr-DZ')} دج` : ''}
${p.category ? `الفئة: ${p.category}` : 'الفئة: اكتشفها أنت من اسم/وصف المنتج'}
${p.audience ? `الجمهور المستهدف: ${p.audience}` : 'الجمهور: مشترٍ جزائري عادي يطلب بالدفع عند الاستلام'}
${p.tone ? `أسلوب الكتابة المطلوب: ${p.tone}` : ''}

أعد JSON بالضبط بهذا الشكل (كل النصوص بالدارجة الجزائرية الأصيلة، ممتعة ومقنعة وليست آلية):
{
  "category_detected": "الفئة التي اكتشفتها (مثال: أزياء/حجاب، إلكترونيات، تجميل، منزل...)",
  "framework_used": "AIDA أو PAS — وأي واحد استعملت ولماذا باختصار",
  "hero": {
    "headline": "عنوان رئيسي قوي يجذب الانتباه فوراً (دارجة، جملة أو جملتين، يحتوي على إيموجي مناسب)",
    "subheadline": "جملة فرعية تبني الرغبة وتمهد للطلب",
    "cta_text": "نص زر الطلب (قصير وحاسم، مثال: 🛒 اطلب الآن وادفع عند الاستلام)",
    "variations": [
      { "headline": "صياغة بديلة 1 للعنوان بزاوية مختلفة", "cta_text": "نص زر بديل 1" },
      { "headline": "صياغة بديلة 2 للعنوان بزاوية مختلفة", "cta_text": "نص زر بديل 2" }
    ]
  },
  "benefits": [
    { "icon": "إيموجي مناسب", "title": "عنوان الميزة (قصير)", "text": "شرح مقنع للميزة بالدارجة (جملة إلى جملتين)" }
  ],
  "product_details": {
    "intro": "فقرة قصيرة تقدم المنتج بأسلوب قصصي مقنع",
    "specs": ["مواصفة 1", "مواصفة 2", "مواصفة 3"],
    "use_cases": ["متى/كيف يُستعمل المنتج — مثال 1", "مثال 2"]
  },
  "social_proof": [
    { "name": "اسم جزائري واقعي", "wilaya": "اسم ولاية جزائرية", "rating": 5, "quote": "تعليق عميل واقعي ومقنع بالدارجة، يذكر تجربة حقيقية" }
  ],
  "trust_badges": ["✓ الدفع عند الاستلام", "✓ التوصيل لـ58 ولاية", "✓ تقدر تشوف المنتج قبل الدفع", "✓ ضمان الاسترجاع"],
  "urgency": { "type": "stock أو time أو demand", "text": "نص إلحاح حقيقي ومقنع بالدارجة (مثال: بقات غير كمية قليلة..)" },
  "faq": [
    { "q": "سؤال شائع يطرحه المشتري الجزائري المتردد", "a": "جواب مقنع يبني الثقة بالدارجة" }
  ],
  "final_cta": { "headline": "عنوان ختامي يدفع للقرار النهائي", "cta_text": "نص زر الطلب النهائي" }
}

أعد ما بين 4 و6 عناصر في "benefits"، 2-3 عناصر في "social_proof"، 4-6 عناصر في "faq".`
}

function fallbackContent(name: string, price?: number) {
  const priceLabel = price ? `${price.toLocaleString('fr-DZ')} دج` : ''
  return {
    category_detected: 'عام',
    framework_used: 'AIDA',
    hero: {
      headline: `${name} 😍 جودة تستاهل، وثقة ما عليهاش كلام`,
      subheadline: `اطلب الآن وادفع عند الاستلام — تشوف المنتج بعينيك قبل ما تخلص`,
      cta_text: '🛒 اطلب الآن',
      variations: [
        { headline: `وصل أخيراً... ${name} اللي الكل يهدر عليه`, cta_text: '🛒 اطلبيه دروك' },
        { headline: `${name} — جربه مرة وحدة وما ترجعش لغيره`, cta_text: '✅ احجز الكمية' },
      ],
    },
    benefits: [
      { icon: '✅', title: 'جودة مضمونة', text: 'منتج مختار بعناية يستاهل ثمنه ما فيهش غش' },
      { icon: '💵', title: 'الدفع عند الاستلام', text: 'تدفع غير كي توصلك السلعة وتتأكد منها بعينيك' },
      { icon: '🚚', title: 'توصيل لكل الجزائر', text: 'يوصلك لباب دارك في كل الـ 58 ولاية' },
      { icon: '🔁', title: 'ضمان الاسترجاع', text: 'ما عجبكش؟ ترجعه بلا أي مشكل' },
    ],
    product_details: {
      intro: `${name} منتج اخترناه خصيصاً ليناسب احتياجاتك اليومية بجودة عالية وسعر يستاهل.`,
      specs: ['جودة عالية', 'تصميم عملي', 'متوفر الآن'],
      use_cases: ['الاستعمال اليومي', 'كهدية مميزة'],
    },
    social_proof: [
      { name: 'سارة', wilaya: 'الجزائر العاصمة', rating: 5, quote: 'صراحة ما كنتش نتوقع الجودة هاذي بهذا السعر، وصلتني بسرعة 👏' },
      { name: 'محمد', wilaya: 'وهران', rating: 5, quote: 'طلبت ودفعت كي وصلت، ربي يخلي صاحب المتجر، تعامل محترم' },
    ],
    trust_badges: ['✓ الدفع عند الاستلام', '✓ التوصيل لـ58 ولاية', '✓ تقدر تشوف المنتج قبل الدفع', '✓ ضمان الاسترجاع'],
    urgency: { type: 'stock', text: '⚡ الكمية محدودة — بقات شوية فقط متوفرة حالياً' },
    faq: [
      { q: 'وقتاش توصلني السلعة؟', a: 'عادة بين 24 و72 ساعة حسب ولايتك، ونعلموك بكل التفاصيل عبر الهاتف' },
      { q: 'نقدر نشوف المنتج قبل ما ندفع؟', a: 'بالطبع! تدفع فقط بعد ما توصلك السلعة وتتأكد منها بنفسك' },
      { q: 'كيفاش ندفع؟', a: 'الدفع عند الاستلام مباشرة لعون التوصيل، بسيط وآمن' },
    ],
    final_cta: { headline: `ما تأخرش... ${name} يستناك ${priceLabel}`, cta_text: '🛒 اطلب الآن وادفع عند الاستلام' },
  }
}

export async function POST(req: Request) {
  const cookieStore = cookies()
  const supabase = createServerClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
    cookies: {
      get: (n) => cookieStore.get(n)?.value,
      set: (n, v, o: CookieOptions) => { try { cookieStore.set({ name: n, value: v, ...o }) } catch {} },
      remove: (n, o: CookieOptions) => { try { cookieStore.set({ name: n, value: '', ...o }) } catch {} },
    },
  })

  try {
    const body = await req.json()
    const { storeId, product } = schema.parse(body)

    // Verify the caller owns this store
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'غير مصرح' }, { status: 401 })

    const { data: store } = await supabase.from('stores').select('id').eq('id', storeId).eq('owner_id', user.id).single()
    if (!store) return NextResponse.json({ error: 'المتجر غير موجود' }, { status: 404 })

    // 1. Create the job row
    const { data: job, error: jobErr } = await supabase
      .from('landing_jobs')
      .insert({ store_id: storeId, type: 'text', status: 'processing', input: product })
      .select('id')
      .single()

    if (jobErr || !job) {
      return NextResponse.json({ error: 'تعذر إنشاء مهمة التوليد' }, { status: 500 })
    }

    // 2. Run Gemini (with retry + graceful fallback so the merchant always gets a usable page)
    let result: any
    let usedFallback = false

    if (process.env.GEMINI_API_KEY) {
      const gen = await geminiGenerateJSONWithRetry({
        systemPrompt: SYSTEM_PROMPT,
        userPrompt: buildUserPrompt(product),
        temperature: 0.85,
        maxOutputTokens: 4096,
      })
      if (gen.ok) {
        result = gen.data
      } else {
        console.error('Gemini landing-copy generation failed:', gen.error)
        result = fallbackContent(product.name, product.price)
        usedFallback = true
      }
    } else {
      result = fallbackContent(product.name, product.price)
      usedFallback = true
    }

    // 3. Persist result
    await supabase
      .from('landing_jobs')
      .update({ status: 'done', result: { ...result, _fallback: usedFallback } })
      .eq('id', job.id)

    return NextResponse.json({ jobId: job.id, status: 'done', result: { ...result, _fallback: usedFallback } })
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: 'بيانات غير صالحة', details: err.errors }, { status: 400 })
    }
    console.error('landing/generate error:', err)
    return NextResponse.json({ error: 'حدث خطأ أثناء توليد المحتوى' }, { status: 500 })
  }
}
