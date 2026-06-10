import { getActiveStore } from '@/lib/supabase/server';
// ============================================================
// AI Landing Copy Generator — Gemini Pro, SERVER-SIDE ONLY
//
// POST { storeId, product: { name, description?, price?, category?,
//         audience?, tone?, images? } }
//   → creates landing_jobs row, runs Gemini, returns { jobId, status, result }
//
// Model: process.env.GEMINI_TEXT_MODEL (default gemini-3.5-flash)
// Key:   process.env.GEMINI_API_KEY — never touches the client bundle.
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
    name:        z.string().min(1),
    description: z.string().optional().default(''),
    price:       z.number().optional(),
    category:    z.string().optional(),
    audience:    z.string().optional(),
    tone:        z.string().optional(),
    images:      z.array(z.string()).optional().default([]),
  }),
})

// ── System prompt: world-class Algerian COD copywriter ───────────────────
const SYSTEM_PROMPT = `أنت أفضل كاتب إعلانات (copywriter) متخصص في المتاجر الإلكترونية الجزائرية ونظام الدفع عند الاستلام (COD).

جمهورك: مشترٍ جزائري عادي يتصفح من هاتفه، متشكك من الشراء أونلاين (خايف يخسر فلوسه أو يجيه منتج مغشوش). عليك أن تكسب ثقته في أول 3 ثواني وتدفعه للطلب فوراً.

قواعد الكتابة (إلزامية):
1. اكتب بالدارجة الجزائرية الأصيلة — ليس بالعربية الفصحى الجامدة. استعمل: "راهو يهبل"، "صدقني"، "ولّى"، "بزاف"، "تستاهل"، "ما تفوتش"، "خويا/أختي"، "ربي يخليه"، "ما كنتش نتوقع".
2. إطار AIDA أو PAS — اختر الأنسب. AIDA: انتباه←اهتمام←رغبة←فعل. PAS: مشكلة←تضخيم←حل.
3. ابنِ الثقة: "الدفع عند الاستلام"، "تشوف المنتج قبل ما تدفع"، "توصيل لـ58 ولاية"، "ضمان الاسترجاع" — بشكل طبيعي في النص.
4. إلحاح منطقي وحقيقي فقط (كمية محدودة / طلب كبير / عرض موسمي) — لا مبالغة تفقد المصداقية.
5. تكيّف مع الفئة: أزياء/حجاب→المظهر والثقة، إلكترونيات→الجودة والمواصفات، تجميل→التحول والنتيجة، منزل→الراحة والعملية.
6. أسلوب قصصي: ابدأ بمشكلة أو لحظة يتعرف عليها الجمهور، ثم قدم المنتج كحل.

أمثلة ممتازة (انسج على نفس الروح لا تنسخ):
- "آخر مرة تشري فيها حجاب وما يبانش راقي عليك… جرّبي هذا وشوفي الفرق بعينيك 😍"
- "سخانة قهوتك ما تبردش قبل ما تكمليها؟ هذا الحل اللي كانوا يستناوه آلاف الجزائريين"
- "خوذ مقاسك الصحيح من الكوش بلا ما تتنقل… التوصيل لباب دارك والدفع بعد ما تشوف"
- "كي تلبسيه، الكل يسألك وين شريتيه… وأنتِ تبتسمي بلا ما تجاوبي 😏"
- "عندك هاتف يستاهل حماية حقيقية؟ هذا الكفر درّب عليه ألف اختبار — وسعره يدهشك"

أعد دائماً JSON صالح فقط بدون أي علامات Markdown أو نص خارج الـJSON.`

function buildUserPrompt(p: z.infer<typeof schema>['product']) {
  return `أنشئ نسخة احترافية كاملة لصفحة هبوط لهذا المنتج:

اسم المنتج: ${p.name}
${p.description ? `الوصف التفصيلي: ${p.description}` : ''}
${p.price ? `السعر: ${p.price.toLocaleString('fr-DZ')} دج` : ''}
${p.category ? `الفئة: ${p.category}` : 'الفئة: اكتشفها من الاسم والوصف'}
${p.audience ? `الجمهور المستهدف: ${p.audience}` : 'الجمهور: مشترٍ جزائري COD عادي'}
${p.tone ? `أسلوب الكتابة: ${p.tone}` : ''}

أعد JSON بالضبط بهذا الهيكل (جميع النصوص بالدارجة الجزائرية الأصيلة):

{
  "category_detected": "الفئة المكتشفة",
  "framework_used": "AIDA أو PAS + سبب الاختيار بجملة",
  "hero": {
    "headline": "عنوان رئيسي قوي يجذب الانتباه فوراً — دارجة — إيموجي مناسب",
    "subheadline": "جملة فرعية تبني الرغبة وتمهد للطلب",
    "cta_text": "نص زر الطلب (قصير وحاسم مثل: 🛒 اطلب الآن)",
    "badge_text": "شارة صغيرة للعروض مثل: خصم 30% اليوم فقط أو الأكثر مبيعاً",
    "variations": [
      { "headline": "صياغة بديلة 1 بزاوية مختلفة", "cta_text": "نص زر بديل 1" },
      { "headline": "صياغة بديلة 2 تركز على المشكلة", "cta_text": "نص زر بديل 2" }
    ]
  },
  "product_story": {
    "hook": "جملة افتتاحية تصف مشكلة أو لحظة يتعرف عليها الجمهور",
    "body": "2-3 جمل قصيرة تقدم المنتج كحل بأسلوب قصصي طبيعي",
    "payoff": "جملة ختامية تصف النتيجة/الفائدة المحسوسة"
  },
  "benefits": [
    { "icon": "إيموجي", "title": "عنوان الميزة", "text": "شرح مقنع بالدارجة (جملة-جملتين)" }
  ],
  "product_details": {
    "intro": "فقرة قصيرة تقدم المنتج",
    "specs": ["مواصفة 1", "مواصفة 2", "مواصفة 3"],
    "use_cases": ["متى/كيف يُستعمل — مثال 1", "مثال 2", "مثال 3"]
  },
  "how_to_order": [
    { "step": 1, "icon": "📝", "title": "املأ الطلب", "text": "حط اسمك ورقم هاتفك وولايتك — ما تاخذش دقيقتين" },
    { "step": 2, "icon": "📞", "title": "تأكيد الطلب", "text": "نتصلوا بك خلال 24 ساعة نأكدوا معك الطلب" },
    { "step": 3, "icon": "🚚", "title": "التوصيل لبابك", "text": "يوصلك خلال 24-72 ساعة وتدفع كي تشوف المنتج" }
  ],
  "social_proof": [
    { "name": "اسم جزائري واقعي", "wilaya": "ولاية جزائرية", "rating": 5, "quote": "تعليق واقعي مقنع بالدارجة يذكر تجربة حقيقية" }
  ],
  "trust_badges": ["✓ الدفع عند الاستلام", "✓ التوصيل لـ58 ولاية", "✓ تشوف المنتج قبل الدفع", "✓ ضمان الاسترجاع خلال 7 أيام"],
  "urgency": { "type": "stock أو time أو demand", "text": "نص إلحاح حقيقي بالدارجة" },
  "guarantee": "نص ضمان مطوّل يبني الثقة (3-4 جمل بالدارجة)",
  "faq": [
    { "q": "سؤال شائع من مشترٍ متردد", "a": "جواب مقنع يبني الثقة بالدارجة" }
  ],
  "final_cta": { "headline": "عنوان ختامي يدفع للقرار النهائي", "cta_text": "نص زر الطلب الأخير" }
}

المطلوب: 4-6 عناصر في benefits، 3 عناصر في social_proof، 4-6 عناصر في faq، 3 خطوات في how_to_order.`
}

function fallbackContent(name: string, price?: number) {
  const priceLabel = price ? `${price.toLocaleString('fr-DZ')} دج` : ''
  return {
    category_detected: 'عام',
    framework_used: 'AIDA',
    hero: {
      headline: `${name} 😍 الجودة اللي كنت تبحث عليها — بسعر ما تتوقعوش`,
      subheadline: 'اطلب الآن وادفع كي وصلك المنتج — تشوف بعينيك قبل ما تخلص',
      cta_text: '🛒 اطلب الآن',
      badge_text: 'الأكثر طلباً',
      variations: [
        { headline: `وصل أخيراً... ${name} اللي الكل يهدر عليه`, cta_text: '🛒 اطلبه دروك' },
        { headline: `${name} — جربه مرة وحدة وما ترجعش لغيره`, cta_text: '✅ احجز الكمية' },
      ],
    },
    product_story: {
      hook: 'كنت دايماً تبحث على منتج يستاهل ثمنه فعلاً؟',
      body: `${name} مصنوع خصيصاً للي يبحثوا على الجودة الحقيقية. كل التفاصيل مدروسة ومختارة بعناية.`,
      payoff: 'النتيجة: منتج تفتخر بيه وتنصح بيه خوك وصاحبك.',
    },
    benefits: [
      { icon: '✅', title: 'جودة مضمونة', text: 'منتج مختار بعناية يستاهل ثمنه — ما فيهش غش' },
      { icon: '💵', title: 'الدفع عند الاستلام', text: 'تدفع غير كي توصلك السلعة وتتأكد منها بعينيك' },
      { icon: '🚚', title: 'توصيل سريع لكل الجزائر', text: 'يوصلك لباب دارك في كل الـ58 ولاية' },
      { icon: '🔁', title: 'ضمان الاسترجاع', text: 'ما عجبكش؟ ترجعه بلا أي مشكل خلال 7 أيام' },
    ],
    product_details: {
      intro: `${name} منتج اخترناه خصيصاً ليناسب احتياجاتك بجودة عالية وسعر يستاهل.`,
      specs: ['جودة عالية', 'تصميم عملي ومريح', 'متوفر الآن بكميات محدودة'],
      use_cases: ['للاستعمال اليومي', 'هدية مميزة لأهلك أو صاحبك', 'استثمار يدوم'],
    },
    how_to_order: [
      { step: 1, icon: '📝', title: 'املأ الطلب', text: 'حط اسمك ورقمك وولايتك — ما تاخذش دقيقتين' },
      { step: 2, icon: '📞', title: 'تأكيد الطلب', text: 'نتصلوا بك خلال 24 ساعة نأكدوا معك الطلب' },
      { step: 3, icon: '🚚', title: 'التوصيل لبابك', text: 'يوصلك 24-72 ساعة وتدفع كي تشوف المنتج بعينيك' },
    ],
    social_proof: [
      { name: 'سارة بن علي', wilaya: 'الجزائر العاصمة', rating: 5, quote: 'صراحة ما كنتش نتوقع الجودة هاذي بهذا السعر، وصلتني بسرعة وتعامل محترم 👏' },
      { name: 'محمد خالدي', wilaya: 'وهران', rating: 5, quote: 'طلبت ودفعت كي وصلت، ربي يخلي صاحب المتجر، تعامل صادق وجودة ممتازة' },
      { name: 'فاطمة زهراء', wilaya: 'قسنطينة', rating: 5, quote: 'أنصح بيه بعيون مغمضة! وصل في اليوم الثاني وكان فوق التوقعات 🌟' },
    ],
    trust_badges: ['✓ الدفع عند الاستلام', '✓ التوصيل لـ58 ولاية', '✓ تشوف قبل الدفع', '✓ ضمان الاسترجاع'],
    urgency: { type: 'stock', text: '⚡ الكمية محدودة — بقات غير شوية في المخزن' },
    guarantee: 'نضمنوا 100٪ رضاك على المنتج. إذا ما كنتش راضٍ أو المنتج ما جاءش كما وصفناه، نرجعوا ليك فلوسك كاملة بلا أي أسئلة. ثقتك في متجرنا أهم من أي بيع.',
    faq: [
      { q: 'وقتاش توصلني السلعة؟', a: 'عادة بين 24 و72 ساعة حسب ولايتك — ونعلمك بكل التفاصيل على الهاتف' },
      { q: 'نقدر نشوف المنتج قبل ما ندفع؟', a: 'بالطبع! تدفع غير بعد ما توصلك السلعة وتتأكد منها بنفسك بعينيك' },
      { q: 'كيفاش ندفع؟', a: 'الدفع عند الاستلام مباشرة لعون التوصيل — بسيط وآمن 100٪' },
      { q: 'واش فيه ضمان إذا ما عجبنيش؟', a: 'عندنا ضمان الاسترجاع خلال 7 أيام من تاريخ الاستلام بلا أي شرط' },
    ],
    final_cta: {
      headline: `ما تأخرش — ${name} يستناك ${priceLabel}`,
      cta_text: '🛒 اطلب الآن وادفع عند الاستلام',
    },
  }
}

export async function POST(req: Request) {
  const cookieStore = cookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get: (n) => cookieStore.get(n)?.value,
        set: (n, v, o: CookieOptions) => { try { cookieStore.set({ name: n, value: v, ...o }) } catch {} },
        remove: (n, o: CookieOptions) => { try { cookieStore.set({ name: n, value: '', ...o }) } catch {} },
      },
    }
  )

  try {
    const body = await req.json()
    const { storeId, product } = schema.parse(body)

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'غير مصرح' }, { status: 401 })

    const { data: store } = await supabase.from('stores').select('id').eq('id', storeId).eq('owner_id', user.id).single()
    if (!store) return NextResponse.json({ error: 'المتجر غير موجود' }, { status: 404 })

    const { data: job, error: jobErr } = await supabase
      .from('landing_jobs')
      .insert({ store_id: storeId, type: 'text', status: 'processing', input: product })
      .select('id').single()
    if (jobErr || !job) return NextResponse.json({ error: 'تعذر إنشاء مهمة التوليد' }, { status: 500 })

    let result: any
    let usedFallback = false

    if (process.env.GEMINI_API_KEY) {
      const gen = await geminiGenerateJSONWithRetry({
        systemPrompt: SYSTEM_PROMPT,
        userPrompt: buildUserPrompt(product),
        temperature: 0.85,
        maxOutputTokens: 8192,
      })
      if (gen.ok) {
        result = gen.data
      } else {
        console.error('Gemini landing generation failed:', gen.error)
        result = fallbackContent(product.name, product.price)
        usedFallback = true
      }
    } else {
      result = fallbackContent(product.name, product.price)
      usedFallback = true
    }

    const finalResult = { ...result, _fallback: usedFallback }
    await supabase.from('landing_jobs').update({ status: 'done', result: finalResult }).eq('id', job.id)
    return NextResponse.json({ jobId: job.id, status: 'done', result: finalResult })
  } catch (err) {
    if (err instanceof z.ZodError) return NextResponse.json({ error: 'بيانات غير صالحة', details: err.errors }, { status: 400 })
    console.error('landing/generate error:', err)
    return NextResponse.json({ error: 'حدث خطأ أثناء توليد المحتوى' }, { status: 500 })
  }
}
