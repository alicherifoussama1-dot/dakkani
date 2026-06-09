// ============================================================
// AI Product Description Generator — Gemini 2.0 Flash
// Generates persuasive Algerian market copy
// ============================================================
import { NextResponse } from 'next/server'
import { z } from 'zod'

const schema = z.object({
  name:     z.string().min(1),
  category: z.string().optional(),
  features: z.array(z.string()).default([]),
  keywords: z.array(z.string()).default([]),
})

const SYSTEM_PROMPT = `أنت خبير تسويق رقمي متخصص في السوق الجزائري.
تكتب نصوصاً إعلانية مقنعة للتسوق الإلكتروني بالعربية والفرنسية.
أسلوبك: ودي، مقنع، يخاطب العاطفة والمصلحة.
تستخدم دائماً عبارات السوق الجزائري مثل:
"ما تفوتيش الفرصة"، "جودة ما فيها كلام"، "الدفع عند الاستلام"،
"التوصيل لجميع الولايات"، "فتح قبل الدفع"، "ضمان الاسترجاع".
الرد يكون JSON فقط بدون أي نص خارجه.`

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const { name, category, features, keywords } = schema.parse(body)

    const apiKey = process.env.GEMINI_API_KEY
    if (!apiKey) {
      // Fallback template
      return NextResponse.json(generateFallback(name, category))
    }

    const prompt = `اكتب نصوص تسويقية احترافية للمنتج التالي:
المنتج: ${name}
${category ? `الفئة: ${category}` : ''}
${features.length ? `المميزات: ${features.join('، ')}` : ''}
${keywords.length ? `الكلمات المفتاحية: ${keywords.join('، ')}` : ''}

أنتج JSON بالتنسيق التالي بالضبط:
{
  "title_ar": "عنوان جذاب بالعربية (أقصاه 60 حرف)",
  "title_fr": "Titre accrocheur en français (max 60 chars)",
  "description_ar": "وصف مقنع بالعربية (150-200 كلمة) يذكر الدفع عند الاستلام والتوصيل لكل الولايات والجودة المضمونة، يستخدم عبارات دارجة",
  "description_fr": "Description persuasive en français (150-200 mots) mentionnant paiement à la livraison, livraison partout en Algérie",
  "features": ["ميزة 1", "ميزة 2", "ميزة 3", "ميزة 4", "ميزة 5"],
  "seo_title": "عنوان SEO يحتوي على الكلمة المفتاحية (أقصاه 60 حرف)",
  "seo_description": "وصف SEO مقنع (أقصاه 155 حرف) يتضمن الكلمة المفتاحية وعبارة CTA"
}`

    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${process.env.GEMINI_TEXT_MODEL ?? 'gemini-3.5-flash'}:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          systemInstruction: { parts: [{ text: SYSTEM_PROMPT }] },
          contents: [{ role: 'user', parts: [{ text: prompt }] }],
          generationConfig: {
            temperature: 0.7,
            topP: 0.9,
            maxOutputTokens: 1024,
            responseMimeType: 'application/json',
          },
        }),
      }
    )

    if (!res.ok) {
      const err = await res.json()
      console.error('Gemini error:', err)
      return NextResponse.json(generateFallback(name, category))
    }

    const data = await res.json()
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text ?? '{}'

    try {
      const parsed = JSON.parse(text)
      return NextResponse.json(parsed)
    } catch {
      return NextResponse.json(generateFallback(name, category))
    }
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid input' }, { status: 400 })
    }
    return NextResponse.json(generateFallback('المنتج', ''))
  }
}

function generateFallback(name: string, category?: string) {
  return {
    title_ar: `${name} — جودة لا مثيل لها`,
    title_fr: `${name} — Qualité incomparable`,
    description_ar: `اكتشف ${name} بجودة استثنائية تناسب السوق الجزائري. ما تفوتيش هذه الفرصة!\n\n✅ جودة ما فيها كلام\n✅ الدفع عند الاستلام\n✅ التوصيل لجميع الولايات\n✅ فتح قبل الدفع\n✅ ضمان الاسترجاع\n\nاطلب الآن وسيصلك في أقرب وقت ممكن!`,
    description_fr: `Découvrez ${name} d'une qualité exceptionnelle adaptée au marché algérien.\n\n✅ Qualité garantie\n✅ Paiement à la livraison\n✅ Livraison partout en Algérie\n✅ Ouverture avant paiement\n\nCommandez maintenant !`,
    features: [
      'جودة عالية مضمونة',
      'الدفع عند الاستلام في كل الولايات',
      'فتح الطرد قبل الدفع',
      'توصيل سريع خلال 24-72 ساعة',
      'ضمان الاسترجاع والتبديل',
    ],
    seo_title: `${name} — شراء أونلاين بالجزائر | الدفع عند الاستلام`,
    seo_description: `اشتري ${name} بأفضل سعر في الجزائر مع الدفع عند الاستلام والتوصيل لكل الولايات. جودة مضمونة!`,
  }
}
