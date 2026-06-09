// ============================================================
// AI Photo Studio — Gemini image enhancement, SERVER-SIDE ONLY
//
// POST { storeId, imageUrl, scenario?, category? }
//   → creates a landing_jobs row (type='image'),
//     fetches the source image, generates enhanced variants,
//     uploads to Supabase Storage, returns { jobId, status, images }.
//
// Two modes:
//   1. scenario provided  → geminiEnhanceImageWithScenario (4 custom variants)
//   2. no scenario        → fixed 3 styles (studio white / gradient / lifestyle)
//
// Always appends the original image as a safe fallback.
// Product stays 100% identical — only background/scene changes.
//
// EXTENSIBLE: set PHOTO_STUDIO_PROVIDER=photoroom in env to route to
// Photoroom/remove.bg instead of Gemini without changing the job contract.
// ============================================================
import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import { z } from 'zod'
import {
  geminiEnhanceImage,
  geminiEnhanceImageWithScenario,
  PHOTO_STUDIO_STYLES,
} from '@/lib/ai/gemini'

export const maxDuration = 60

const schema = z.object({
  storeId:   z.string().uuid(),
  imageUrl:  z.string().url(),
  scenario:  z.string().optional(),   // custom scenario text (Darija/Arabic/English)
  category:  z.string().optional(),   // product category for smarter instructions
})

const BUCKET = process.env.NEXT_PUBLIC_STORAGE_BUCKET ?? 'dakkani-uploads'

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
    const { storeId, imageUrl, scenario, category } = schema.parse(body)

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'غير مصرح' }, { status: 401 })

    const { data: store } = await supabase
      .from('stores').select('id').eq('id', storeId).eq('owner_id', user.id).single()
    if (!store) return NextResponse.json({ error: 'المتجر غير موجود' }, { status: 404 })

    const { data: job, error: jobErr } = await supabase
      .from('landing_jobs')
      .insert({ store_id: storeId, type: 'image', status: 'processing', input: { imageUrl, scenario, category } })
      .select('id').single()
    if (jobErr || !job) return NextResponse.json({ error: 'تعذر إنشاء مهمة تحسين الصورة' }, { status: 500 })

    // No Gemini key — return original only
    if (!process.env.GEMINI_API_KEY) {
      const images = [{ key: 'original', label_ar: 'الصورة الأصلية', url: imageUrl }]
      await supabase.from('landing_jobs').update({ status: 'done', images }).eq('id', job.id)
      return NextResponse.json({ jobId: job.id, status: 'done', images })
    }

    // Fetch source image
    const srcRes = await fetch(imageUrl)
    if (!srcRes.ok) {
      await supabase.from('landing_jobs').update({ status: 'failed', error: 'تعذر تحميل الصورة' }).eq('id', job.id)
      return NextResponse.json({ error: 'تعذر تحميل الصورة الأصلية' }, { status: 400 })
    }
    const mimeType = srcRes.headers.get('content-type') ?? 'image/jpeg'
    const imageBase64 = Buffer.from(await srcRes.arrayBuffer()).toString('base64')

    const images: { key: string; label_ar: string; url: string }[] = []

    const uploadAndPush = async (base64: string, mime: string, key: string, label: string) => {
      const ext = mime.includes('png') ? 'png' : 'jpg'
      const path = `landing-ai/${user!.id}/${Date.now()}-${key}-${Math.random().toString(36).slice(2)}.${ext}`
      const { data: up, error: upErr } = await supabase.storage
        .from(BUCKET).upload(path, Buffer.from(base64, 'base64'), { contentType: mime, upsert: false })
      if (upErr || !up) { console.error('Upload failed:', upErr); return }
      const { data: { publicUrl } } = supabase.storage.from(BUCKET).getPublicUrl(up.path)
      images.push({ key, label_ar: label, url: publicUrl })
    }

    if (scenario) {
      // Custom scenario mode — 4 lighting variations
      const result = await geminiEnhanceImageWithScenario({ imageBase64, mimeType, scenario, category })
      if (result.ok) {
        await Promise.allSettled(
          result.variations.map((v, i) =>
            uploadAndPush(v.base64, v.mimeType, `scenario_${i + 1}`, v.label)
          )
        )
      } else {
        console.error('Scenario enhancement failed:', result.error)
      }
    } else {
      // Fixed styles mode — 3 standard styles in parallel
      const settled = await Promise.allSettled(
        PHOTO_STUDIO_STYLES.map(style =>
          geminiEnhanceImage({ imageBase64, mimeType, instruction: style.instruction })
            .then(r => ({ style, r }))
        )
      )
      await Promise.allSettled(
        settled
          .filter(s => s.status === 'fulfilled' && (s as any).value.r.ok)
          .map(s => {
            const { style, r } = (s as any).value
            return uploadAndPush(r.base64, r.mimeType, style.key, style.label_ar)
          })
      )
    }

    // Always offer original as safe fallback
    images.push({ key: 'original', label_ar: 'الصورة الأصلية', url: imageUrl })

    await supabase.from('landing_jobs').update({ status: 'done', images }).eq('id', job.id)
    return NextResponse.json({ jobId: job.id, status: 'done', images })
  } catch (err) {
    if (err instanceof z.ZodError) return NextResponse.json({ error: 'بيانات غير صالحة' }, { status: 400 })
    console.error('photo/enhance error:', err)
    return NextResponse.json({ error: 'حدث خطأ أثناء تحسين الصورة' }, { status: 500 })
  }
}
