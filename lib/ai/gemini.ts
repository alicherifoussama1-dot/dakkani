// ============================================================
// Shared Gemini client helpers — SERVER-SIDE ONLY
//
// SECURITY: GEMINI_API_KEY read from process.env ONLY (never NEXT_PUBLIC_).
// All Gemini calls happen inside Next.js API routes. Frontend only calls
// our own /api/ai/... routes, never the Google API directly.
// ============================================================

const GEMINI_BASE = 'https://generativelanguage.googleapis.com/v1beta/models'

// Models configurable via env vars — set GEMINI_TEXT_MODEL / GEMINI_IMAGE_MODEL in .env.local
// TEXT_MODEL:  any model supporting generateContent + responseMimeType:application/json
// IMAGE_MODEL: any model supporting responseModalities:['IMAGE']
//
// Confirmed available (as of 2026-06):
//   text:  gemini-3-pro-preview, gemini-3.1-pro-preview, gemini-3.5-flash, gemini-2.5-flash
//   image: gemini-3-pro-image, gemini-3-pro-image-preview, nano-banana-pro-preview,
//          gemini-3.1-flash-image, gemini-2.5-flash-image
//
// Note: gemini-3-pro-* and nano-banana-pro-* require billing enabled on your Google Cloud project.
// Fallback (gemini-3.5-flash / gemini-2.5-flash-image) works on the free tier.
export const TEXT_MODEL  = process.env.GEMINI_TEXT_MODEL  ?? 'gemini-2.5-flash'
export const IMAGE_MODEL = process.env.GEMINI_IMAGE_MODEL ?? 'gemini-2.5-flash-image'

// Backup text model — used automatically when TEXT_MODEL is overloaded
// ("high demand" 503) or quota-limited. gemini-3.1-flash-lite responds
// instantly on the free tier.
export const TEXT_FALLBACK_MODEL = process.env.GEMINI_TEXT_FALLBACK_MODEL ?? 'gemini-3.1-flash-lite'

function requireApiKey(): string {
  const key = process.env.GEMINI_API_KEY
  if (!key) throw new Error('GEMINI_API_KEY غير مهيأ على السيرفر')
  return key
}

// ── Rate-limit & overload-aware fetch ─────────────────────────────────────
// 429 (quota/min) → wait 65s, retry once.
// 503 / "high demand" (model overloaded) → short backoff, up to 3 attempts.
async function geminiPost(model: string, body: object, retryOn429 = true): Promise<Response> {
  const apiKey = requireApiKey()
  const url = `${GEMINI_BASE}/${model}:generateContent?key=${apiKey}`

  let res: Response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })

  // Transient overload ("The model is currently experiencing high demand")
  for (let attempt = 1; attempt <= 2 && (res.status === 503 || res.status === 500); attempt++) {
    console.warn(`Gemini ${res.status} on ${model} (overloaded) — retry ${attempt}/2 in 6s`)
    await new Promise(r => setTimeout(r, 6_000))
    res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
  }

  if (res.status === 429 && retryOn429) {
    // Rate limited — wait 65s (Gemini rate window is 60s) then retry once
    console.warn(`Gemini 429 on ${model} — waiting 65s before retry`)
    await new Promise(r => setTimeout(r, 65_000))
    return geminiPost(model, body, false) // no further retry
  }
  return res
}

// ── Structured JSON generation ────────────────────────────────────────────
// Tries TEXT_MODEL first; if it's quota-limited or overloaded, automatically
// falls back to TEXT_FALLBACK_MODEL so merchants never see a dead page.
export async function geminiGenerateJSON(opts: {
  systemPrompt: string
  userPrompt: string
  temperature?: number
  maxOutputTokens?: number
}): Promise<{ ok: true; data: any } | { ok: false; error: string }> {
  const primary = await generateJSONWithModel(TEXT_MODEL, opts)
  if (primary.ok) return primary

  // Availability problem → try the backup model before giving up
  const transient = /quota|exhausted|high demand|overloaded|503|429|not found/i.test(primary.error)
  if (transient && TEXT_FALLBACK_MODEL !== TEXT_MODEL) {
    console.warn(`Gemini ${TEXT_MODEL} unavailable (${primary.error.slice(0, 80)}) — falling back to ${TEXT_FALLBACK_MODEL}`)
    return generateJSONWithModel(TEXT_FALLBACK_MODEL, opts)
  }
  return primary
}

async function generateJSONWithModel(model: string, opts: {
  systemPrompt: string
  userPrompt: string
  temperature?: number
  maxOutputTokens?: number
}): Promise<{ ok: true; data: any } | { ok: false; error: string }> {
  try {
    const res = await geminiPost(model, {
      systemInstruction: { parts: [{ text: opts.systemPrompt }] },
      contents: [{ role: 'user', parts: [{ text: opts.userPrompt }] }],
      generationConfig: {
        temperature: opts.temperature ?? 0.8,
        topP: 0.92,
        maxOutputTokens: opts.maxOutputTokens ?? 8192,
        responseMimeType: 'application/json',
      },
    })

    if (!res.ok) {
      const err = await res.json().catch(() => ({}))
      return { ok: false, error: err?.error?.message ?? `Gemini HTTP ${res.status}` }
    }

    const data = await res.json()
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text
    if (!text) return { ok: false, error: 'Gemini لم يُعد أي نص' }

    try {
      return { ok: true, data: JSON.parse(text) }
    } catch {
      const cleaned = text.replace(/^```(?:json)?\s*/i, '').replace(/```\s*$/i, '').trim()
      try {
        return { ok: true, data: JSON.parse(cleaned) }
      } catch {
        return { ok: false, error: 'فشل تحليل مخرجات Gemini JSON' }
      }
    }
  } catch (err) {
    return { ok: false, error: (err as Error).message }
  }
}

export async function geminiGenerateJSONWithRetry(
  opts: Parameters<typeof geminiGenerateJSON>[0],
  retries = 1
): Promise<{ ok: true; data: any } | { ok: false; error: string }> {
  let last: { ok: false; error: string } | null = null
  for (let i = 0; i <= retries; i++) {
    const attempt = await geminiGenerateJSON({
      ...opts,
      temperature: i === 0 ? opts.temperature : Math.max(0.3, (opts.temperature ?? 0.8) - 0.3),
    })
    if (attempt.ok) return attempt
    last = attempt
  }
  return last ?? { ok: false, error: 'Unknown Gemini error' }
}

// ── Image enhancement (fixed styles) ─────────────────────────────────────
export async function geminiEnhanceImage(opts: {
  imageBase64: string
  mimeType: string
  instruction: string
}): Promise<{ ok: true; base64: string; mimeType: string } | { ok: false; error: string }> {
  try {
    const res = await geminiPost(IMAGE_MODEL, {
      contents: [{
        role: 'user',
        parts: [
          { text: opts.instruction },
          { inlineData: { mimeType: opts.mimeType, data: opts.imageBase64 } },
        ],
      }],
      generationConfig: { responseModalities: ['TEXT', 'IMAGE'] },
    })

    if (!res.ok) {
      const err = await res.json().catch(() => ({}))
      return { ok: false, error: err?.error?.message ?? `Gemini HTTP ${res.status}` }
    }

    const data = await res.json()
    const parts = data.candidates?.[0]?.content?.parts ?? []
    const imagePart = parts.find((p: any) => p.inlineData?.data)
    if (!imagePart) return { ok: false, error: 'Gemini لم يُعد صورة' }

    return { ok: true, base64: imagePart.inlineData.data, mimeType: imagePart.inlineData.mimeType ?? 'image/png' }
  } catch (err) {
    return { ok: false, error: (err as Error).message }
  }
}

// ── Scenario-based image enhancement (custom merchant input) ──────────────
// Accepts a free-text scenario (e.g. "استوديو راقي بإضاءة ناعمة") and generates
// 4 variations by slightly varying the instruction. Each variation keeps the
// product identical and only changes the background/scene.
export async function geminiEnhanceImageWithScenario(opts: {
  imageBase64: string
  mimeType: string
  scenario: string
  category?: string
}): Promise<{ ok: true; variations: { base64: string; mimeType: string; label: string }[] } | { ok: false; error: string }> {
  const { imageBase64, mimeType, scenario, category = '' } = opts

  const base = `Remove the background from this product photo and place the product in the following scene: "${scenario}".
Professional studio lighting, photorealistic, high-quality e-commerce image.
CRITICAL: Keep the product 100% identical — same shape, color, texture, proportions, and details. Only change the background and environment.
The product must look like it was naturally photographed in this scene.`

  const variations = [
    { label: 'الخيار الأول',    instruction: base + ' Soft, diffused natural lighting from the left.' },
    { label: 'الخيار الثاني',   instruction: base + ' Warm golden-hour lighting, slightly warmer tones.' },
    { label: 'الخيار الثالث',   instruction: base + ' Clean, bright, high-key lighting — very professional catalog look.' },
    { label: 'الخيار الرابع',   instruction: base + ' Dramatic side-lighting, deep contrast, premium brand feel.' },
  ]

  const results = await Promise.allSettled(
    variations.map(v => geminiEnhanceImage({ imageBase64, mimeType, instruction: v.instruction })
      .then(r => ({ ...r, label: v.label }))
    )
  )

  const successful = results
    .filter(r => r.status === 'fulfilled' && r.value.ok)
    .map(r => {
      const val = (r as PromiseFulfilledResult<any>).value
      return { base64: val.base64, mimeType: val.mimeType, label: val.label }
    })

  if (successful.length === 0) return { ok: false, error: 'فشل كل خيارات تحسين الصورة' }
  return { ok: true, variations: successful }
}

// Re-export from client-safe module (server-side code can import from here too)
export { SCENARIO_SUGGESTIONS, DEFAULT_SCENARIOS } from './scenario-suggestions'

// Fixed pre-defined styles (backward compat with existing enhance endpoint)
export const PHOTO_STUDIO_STYLES = [
  {
    key: 'studio_white',
    label_ar: 'استوديو أبيض احترافي',
    instruction:
      'Replace the background with a clean pure-white studio backdrop. Keep the product 100% unchanged. ' +
      'Add soft realistic studio lighting and a subtle shadow. High-quality photorealistic e-commerce photo.',
  },
  {
    key: 'soft_gradient',
    label_ar: 'خلفية متدرجة ناعمة',
    instruction:
      'Replace the background with an elegant soft pastel gradient (light beige to warm white). Keep the product unchanged. ' +
      'Add soft lighting and a subtle shadow. High-quality photorealistic image.',
  },
  {
    key: 'lifestyle',
    label_ar: 'مشهد لايف ستايل طبيعي',
    instruction:
      'Place this product in a realistic tasteful lifestyle setting appropriate for the category ' +
      '(cozy Algerian home interior, styled flat-lay, or elegant outdoor), with natural light and realistic shadows. ' +
      'Keep the product 100% unchanged. High-quality photorealistic marketing photo.',
  },
] as const

export type PhotoStudioStyleKey = typeof PHOTO_STUDIO_STYLES[number]['key']
