// ============================================================
// AI Photo Studio — Gemini Pro image enhancement, SERVER-SIDE ONLY
//
// POST { storeId, imageUrl } → creates a landing_jobs row (type='image'),
//   fetches the source image, asks Gemini to generate 3 enhanced variants
//   (clean studio white / soft gradient / lifestyle), uploads each to
//   Supabase Storage, and returns { jobId, status, images }.
//
// Graceful fallback: if Gemini enhancement isn't configured or fails for a
// given style, that option is simply omitted — the merchant can always keep
// the original image (handled in the frontend).
//
// NOTE: structured so a dedicated image service (Photoroom/remove.bg — see
// app/api/ai/image/remove-bg/route.ts for the existing integration) can be
// swapped in later via an env flag (e.g. PHOTO_STUDIO_PROVIDER=photoroom)
// without changing the job/polling contract.
// ============================================================
import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import { z } from 'zod'
import { geminiEnhanceImage, PHOTO_STUDIO_STYLES } from '@/lib/ai/gemini'

export const maxDuration = 60

const schema = z.object({
  storeId: z.string().uuid(),
  imageUrl: z.string().url(),
})

const BUCKET = process.env.NEXT_PUBLIC_STORAGE_BUCKET ?? 'dakkani-uploads'

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
    const { storeId, imageUrl } = schema.parse(body)

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'غير مصرح' }, { status: 401 })

    const { data: store } = await supabase.from('stores').select('id').eq('id', storeId).eq('owner_id', user.id).single()
    if (!store) return NextResponse.json({ error: 'المتجر غير موجود' }, { status: 404 })

    const { data: job, error: jobErr } = await supabase
      .from('landing_jobs')
      .insert({ store_id: storeId, type: 'image', status: 'processing', input: { imageUrl } })
      .select('id')
      .single()

    if (jobErr || !job) return NextResponse.json({ error: 'تعذر إنشاء مهمة تحسين الصورة' }, { status: 500 })

    // If Gemini isn't configured, fall back to the original image only
    if (!process.env.GEMINI_API_KEY) {
      const images = [{ key: 'original', label_ar: 'الصورة الأصلية', url: imageUrl }]
      await supabase.from('landing_jobs').update({ status: 'done', images }).eq('id', job.id)
      return NextResponse.json({ jobId: job.id, status: 'done', images })
    }

    // 1. Fetch source image and convert to base64
    const srcRes = await fetch(imageUrl)
    if (!srcRes.ok) {
      await supabase.from('landing_jobs').update({ status: 'failed', error: 'تعذر تحميل الصورة الأصلية' }).eq('id', job.id)
      return NextResponse.json({ error: 'تعذر تحميل الصورة الأصلية' }, { status: 400 })
    }
    const mimeType = srcRes.headers.get('content-type') ?? 'image/jpeg'
    const buf = Buffer.from(await srcRes.arrayBuffer())
    const imageBase64 = buf.toString('base64')

    // 2. Ask Gemini for each style variant in parallel
    const settled = await Promise.allSettled(
      PHOTO_STUDIO_STYLES.map((style) =>
        geminiEnhanceImage({ imageBase64, mimeType, instruction: style.instruction })
          .then((r) => ({ style, r }))
      )
    )

    const images: { key: string; label_ar: string; url: string }[] = []

    for (const settledResult of settled) {
      if (settledResult.status !== 'fulfilled') continue
      const { style, r } = settledResult.value
      if (!r.ok) {
        console.error(`Gemini photo enhancement failed (${style.key}):`, r.error)
        continue
      }
      try {
        const ext = r.mimeType.includes('png') ? 'png' : 'jpg'
        const fileName = `landing-ai/${user.id}/${Date.now()}-${style.key}-${Math.random().toString(36).slice(2)}.${ext}`
        const fileBuf = Buffer.from(r.base64, 'base64')

        const { data: uploaded, error: upErr } = await supabase.storage
          .from(BUCKET)
          .upload(fileName, fileBuf, { contentType: r.mimeType, upsert: false })

        if (upErr || !uploaded) { console.error('Upload failed:', upErr); continue }

        const { data: { publicUrl } } = supabase.storage.from(BUCKET).getPublicUrl(uploaded.path)
        images.push({ key: style.key, label_ar: style.label_ar, url: publicUrl })
      } catch (e) {
        console.error('Photo studio post-processing error:', e)
      }
    }

    // Always offer the original as a safe fallback choice
    images.push({ key: 'original', label_ar: 'الصورة الأصلية', url: imageUrl })

    const status = images.length > 1 ? 'done' : 'done' // even with only the original, the job "succeeded" — merchant can still proceed
    await supabase.from('landing_jobs').update({ status, images }).eq('id', job.id)

    return NextResponse.json({ jobId: job.id, status, images })
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: 'بيانات غير صالحة' }, { status: 400 })
    }
    console.error('photo/enhance error:', err)
    return NextResponse.json({ error: 'حدث خطأ أثناء تحسين الصورة' }, { status: 500 })
  }
}
