// ============================================================
// Remove.bg Background Remover
// POST { imageUrl } → returns { url } with transparent background
// ============================================================
import { NextResponse } from 'next/server'
import { z } from 'zod'

const schema = z.object({
  imageUrl: z.string().url(),
})

export async function POST(req: Request) {
  try {
    const { imageUrl } = schema.parse(await req.json())
    const apiKey = process.env.REMOVEBG_API_KEY

    if (!apiKey) {
      return NextResponse.json({ url: imageUrl, skipped: true, reason: 'remove.bg not configured' })
    }

    // Fetch image as buffer
    const imgRes = await fetch(imageUrl)
    if (!imgRes.ok) throw new Error('Failed to fetch source image')

    const imgBuffer = await imgRes.arrayBuffer()
    const imgBlob   = new Blob([imgBuffer], { type: imgRes.headers.get('content-type') ?? 'image/jpeg' })

    // Call remove.bg API
    const formData = new FormData()
    formData.append('image_file', imgBlob, 'image.jpg')
    formData.append('size', 'auto')
    formData.append('format', 'png')

    const bgRes = await fetch('https://api.remove.bg/v1.0/removebg', {
      method: 'POST',
      headers: { 'X-Api-Key': apiKey },
      body: formData,
    })

    if (!bgRes.ok) {
      const err = await bgRes.json()
      return NextResponse.json({ error: err.errors?.[0]?.title ?? 'remove.bg error' }, { status: 502 })
    }

    // Upload result to Supabase Storage
    const pngBuffer = await bgRes.arrayBuffer()
    const pngBlob   = new Blob([pngBuffer], { type: 'image/png' })
    const fileName  = `products/removebg-${Date.now()}.png`

    const { createClient } = await import('@supabase/supabase-js')
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    const { data, error } = await supabase.storage
      .from(process.env.NEXT_PUBLIC_STORAGE_BUCKET ?? 'dakkani-uploads')
      .upload(fileName, pngBlob, { contentType: 'image/png', upsert: true })

    if (error) throw error

    const { data: { publicUrl } } = supabase.storage
      .from(process.env.NEXT_PUBLIC_STORAGE_BUCKET ?? 'dakkani-uploads')
      .getPublicUrl(data.path)

    return NextResponse.json({ url: publicUrl, path: data.path })
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 })
  }
}
