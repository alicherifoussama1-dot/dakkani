// Test script — run with: node scripts/test-gemini-models.mjs
// Reads GEMINI_API_KEY from .env.local, probes candidate models, reports results.
import { readFileSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dir = dirname(fileURLToPath(import.meta.url))
const root  = join(__dir, '..')

// ── Load .env.local manually (no dotenv needed) ─────────────
function loadEnv(file) {
  try {
    return Object.fromEntries(
      readFileSync(file, 'utf8').split('\n')
        .filter(l => l && !l.startsWith('#') && l.includes('='))
        .map(l => { const i = l.indexOf('='); return [l.slice(0,i).trim(), l.slice(i+1).trim()] })
    )
  } catch { return {} }
}

const env = loadEnv(join(root, '.env.local'))
const KEY = env.GEMINI_API_KEY

if (!KEY) { console.error('❌  GEMINI_API_KEY not found in .env.local'); process.exit(1) }
console.log(`✅  API key found (${KEY.length} chars)\n`)

const BASE = 'https://generativelanguage.googleapis.com/v1beta/models'

// ── Text model candidates (ordered: best first) ──────────────
const TEXT_CANDIDATES = [
  'gemini-2.5-pro',
  'gemini-2.5-pro-preview-06-05',
  'gemini-2.5-flash',
  'gemini-2.5-flash-preview-05-20',
  'gemini-2.0-flash-exp',
  'gemini-2.0-flash',
  'gemini-1.5-pro',
]

// ── Image model candidates ────────────────────────────────────
const IMAGE_CANDIDATES = [
  'gemini-2.5-flash-preview-image-generation',
  'gemini-2.0-flash-preview-image-generation',
  'gemini-2.0-flash-exp',
  'imagen-3.0-generate-002',
]

// ── Test a text model ─────────────────────────────────────────
async function testText(model) {
  const url = `${BASE}/${model}:generateContent?key=${KEY}`
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ role: 'user', parts: [{ text: 'Reply with exactly: {"ok":true}' }] }],
        generationConfig: { responseMimeType: 'application/json', maxOutputTokens: 20 },
      }),
      signal: AbortSignal.timeout(15000),
    })
    const data = await res.json()
    if (!res.ok) {
      const msg = data?.error?.message ?? `HTTP ${res.status}`
      return { ok: false, error: msg }
    }
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text ?? ''
    return { ok: true, output: text.trim().slice(0, 60) }
  } catch (e) {
    return { ok: false, error: e.message }
  }
}

// ── Test an image model ───────────────────────────────────────
// Use a 1×1 white pixel PNG as the input image
const TINY_PNG_B64 = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg=='

async function testImage(model) {
  const url = `${BASE}/${model}:generateContent?key=${KEY}`
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{
          role: 'user',
          parts: [
            { text: 'Make this pixel white with a clean white background.' },
            { inlineData: { mimeType: 'image/png', data: TINY_PNG_B64 } },
          ],
        }],
        generationConfig: { responseModalities: ['IMAGE', 'TEXT'] },
      }),
      signal: AbortSignal.timeout(20000),
    })
    const data = await res.json()
    if (!res.ok) {
      const msg = data?.error?.message ?? `HTTP ${res.status}`
      return { ok: false, error: msg }
    }
    const parts = data.candidates?.[0]?.content?.parts ?? []
    const hasImage = parts.some(p => p.inlineData?.data)
    if (hasImage) return { ok: true, output: 'image returned ✓' }
    // Some models return text only — still "reachable"
    const text = parts.find(p => p.text)?.text ?? ''
    return { ok: false, error: `no image in response — text: "${text.slice(0,80)}"` }
  } catch (e) {
    return { ok: false, error: e.message }
  }
}

// ── Run all tests ─────────────────────────────────────────────
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
console.log('TEXT MODEL CANDIDATES')
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
let bestText = null
for (const model of TEXT_CANDIDATES) {
  process.stdout.write(`  testing ${model.padEnd(45)} ... `)
  const r = await testText(model)
  if (r.ok) {
    console.log(`✅  ${r.output}`)
    if (!bestText) bestText = model
  } else {
    console.log(`❌  ${r.error}`)
  }
}

console.log()
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
console.log('IMAGE MODEL CANDIDATES')
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
let bestImage = null
for (const model of IMAGE_CANDIDATES) {
  process.stdout.write(`  testing ${model.padEnd(45)} ... `)
  const r = await testImage(model)
  if (r.ok) {
    console.log(`✅  ${r.output}`)
    if (!bestImage) bestImage = model
  } else {
    console.log(`❌  ${r.error}`)
  }
}

console.log()
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
console.log('RECOMMENDATION')
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
if (bestText)  console.log(`  GEMINI_TEXT_MODEL=${bestText}`)
else           console.log('  ⚠️  No text model worked — check your API key')
if (bestImage) console.log(`  GEMINI_IMAGE_MODEL=${bestImage}`)
else           console.log('  ⚠️  No image model returned an image')
console.log()
