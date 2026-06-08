// ============================================================
// Shared Gemini client helpers — SERVER-SIDE ONLY
//
// CRITICAL SECURITY RULE: GEMINI_API_KEY must never be exposed to the
// client. It is read here from process.env (never NEXT_PUBLIC_*) and every
// call to generativelanguage.googleapis.com happens from Next.js API routes
// (app/api/ai/**). The frontend only ever calls our own /api/ai/... routes.
//
// This mirrors the existing safe pattern already used in
// app/api/ai/generate-description/route.ts and app/api/ai/agent/route.ts —
// reused/centralized here rather than duplicated for the new Landing Studio.
// ============================================================

const GEMINI_BASE = 'https://generativelanguage.googleapis.com/v1beta/models'

// Text/JSON generation model (matches the model already used elsewhere in the app)
const TEXT_MODEL = 'gemini-2.0-flash-exp'
// Image generation/editing model — supports multimodal output (text + inline image data)
const IMAGE_MODEL = 'gemini-2.0-flash-preview-image-generation'

function requireApiKey(): string {
  const key = process.env.GEMINI_API_KEY
  if (!key) throw new Error('GEMINI_API_KEY is not configured on the server')
  return key
}

// ── Structured JSON generation (landing copy, etc.) ──────────────────────
export async function geminiGenerateJSON(opts: {
  systemPrompt: string
  userPrompt: string
  temperature?: number
  maxOutputTokens?: number
}): Promise<{ ok: true; data: any } | { ok: false; error: string }> {
  try {
    const apiKey = requireApiKey()
    const res = await fetch(`${GEMINI_BASE}/${TEXT_MODEL}:generateContent?key=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: opts.systemPrompt }] },
        contents: [{ role: 'user', parts: [{ text: opts.userPrompt }] }],
        generationConfig: {
          temperature: opts.temperature ?? 0.8,
          topP: 0.92,
          maxOutputTokens: opts.maxOutputTokens ?? 4096,
          responseMimeType: 'application/json',
        },
      }),
    })

    if (!res.ok) {
      const err = await res.json().catch(() => ({}))
      return { ok: false, error: err?.error?.message ?? `Gemini HTTP ${res.status}` }
    }

    const data = await res.json()
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text
    if (!text) return { ok: false, error: 'Gemini returned no text' }

    try {
      return { ok: true, data: JSON.parse(text) }
    } catch {
      // Some responses wrap JSON in fences despite responseMimeType — strip & retry
      const cleaned = text.replace(/^```(?:json)?\s*/i, '').replace(/```\s*$/i, '').trim()
      try {
        return { ok: true, data: JSON.parse(cleaned) }
      } catch {
        return { ok: false, error: 'Failed to parse Gemini JSON output' }
      }
    }
  } catch (err) {
    return { ok: false, error: (err as Error).message }
  }
}

// Retry wrapper — generation can be flaky; one retry with a slightly lower
// temperature noticeably improves JSON-validity rates in practice.
export async function geminiGenerateJSONWithRetry(
  opts: Parameters<typeof geminiGenerateJSON>[0],
  retries = 1
): Promise<{ ok: true; data: any } | { ok: false; error: string }> {
  let last: { ok: false; error: string } | null = null
  for (let i = 0; i <= retries; i++) {
    const attempt = await geminiGenerateJSON({
      ...opts,
      temperature: i === 0 ? opts.temperature : Math.max(0.4, (opts.temperature ?? 0.8) - 0.25),
    })
    if (attempt.ok) return attempt
    last = attempt
  }
  return last ?? { ok: false, error: 'Unknown Gemini error' }
}

// ── Image generation / enhancement ───────────────────────────────────────
// Sends the source image (as base64) plus a style instruction to Gemini's
// image-capable model, and returns one base64 PNG/JPEG result (inlineData).
export async function geminiEnhanceImage(opts: {
  imageBase64: string
  mimeType: string
  instruction: string
}): Promise<{ ok: true; base64: string; mimeType: string } | { ok: false; error: string }> {
  try {
    const apiKey = requireApiKey()
    const res = await fetch(`${GEMINI_BASE}/${IMAGE_MODEL}:generateContent?key=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{
          role: 'user',
          parts: [
            { text: opts.instruction },
            { inlineData: { mimeType: opts.mimeType, data: opts.imageBase64 } },
          ],
        }],
        generationConfig: {
          responseModalities: ['TEXT', 'IMAGE'],
        },
      }),
    })

    if (!res.ok) {
      const err = await res.json().catch(() => ({}))
      return { ok: false, error: err?.error?.message ?? `Gemini HTTP ${res.status}` }
    }

    const data = await res.json()
    const parts = data.candidates?.[0]?.content?.parts ?? []
    const imagePart = parts.find((p: any) => p.inlineData?.data)

    if (!imagePart) return { ok: false, error: 'Gemini did not return an image' }

    return {
      ok: true,
      base64: imagePart.inlineData.data,
      mimeType: imagePart.inlineData.mimeType ?? 'image/png',
    }
  } catch (err) {
    return { ok: false, error: (err as Error).message }
  }
}

// Pre-defined enhancement styles — shown to merchants as choices, mirroring
// the "give several options" UX pattern used elsewhere (theme picker, etc.)
export const PHOTO_STUDIO_STYLES = [
  {
    key: 'studio_white',
    label_ar: 'استوديو أبيض احترافي',
    instruction:
      'Replace the background of this product photo with a clean, professional pure-white studio backdrop. ' +
      'Keep the product itself completely unchanged (same shape, color, details, proportions). ' +
      'Add soft, realistic studio lighting and a subtle natural shadow beneath the product so it looks like ' +
      'a professional e-commerce catalog photo. Output a high-quality photorealistic image.',
  },
  {
    key: 'soft_gradient',
    label_ar: 'خلفية متدرجة ناعمة',
    instruction:
      'Replace the background of this product photo with an elegant soft pastel gradient (light beige to warm white), ' +
      'suitable for a premium e-commerce brand. Keep the product completely unchanged. ' +
      'Add soft realistic lighting and a subtle shadow. Output a high-quality photorealistic image.',
  },
  {
    key: 'lifestyle',
    label_ar: 'مشهد طبيعي (Lifestyle)',
    instruction:
      'Place this exact product into a realistic, tasteful lifestyle setting appropriate for the product category ' +
      '(e.g. a cozy home interior, a styled flat-lay, or an outdoor setting), with natural light and realistic shadows. ' +
      'Keep the product itself completely unchanged — do not alter its shape, color or details. ' +
      'Output a high-quality photorealistic image that looks like a professional marketing photo.',
  },
] as const

export type PhotoStudioStyleKey = typeof PHOTO_STUDIO_STYLES[number]['key']
