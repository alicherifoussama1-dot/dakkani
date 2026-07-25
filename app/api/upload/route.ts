// ============================================================
// File Upload API — stores to Supabase Storage
// ============================================================
import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

const MAX_SIZE        = 5 * 1024 * 1024  // 5MB — product images (unchanged)
const MAX_SIZE_BANNER = 20 * 1024 * 1024 // 20MB — description banner (stored at full quality)
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif']
const BUCKET       = process.env.NEXT_PUBLIC_STORAGE_BUCKET ?? 'dakkani-uploads'

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

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const formData = await req.formData()
    const file     = formData.get('file') as File | null
    const folder   = (formData.get('folder') as string) ?? 'products'
    // `kind=banner` raises the limit to 20MB (description banner is stored at
    // full quality; the storefront serves an optimized WebP for display). Every
    // other upload keeps the 5MB product-image limit.
    const kind     = (formData.get('kind') as string) ?? ''
    const maxSize  = kind === 'banner' ? MAX_SIZE_BANNER : MAX_SIZE

    if (!file)                          return NextResponse.json({ error: 'No file provided' }, { status: 400 })
    if (file.size > maxSize)            return NextResponse.json({ error: `File too large (max ${maxSize / (1024 * 1024)}MB)` }, { status: 400 })
    if (!ALLOWED_TYPES.includes(file.type)) return NextResponse.json({ error: 'Invalid file type' }, { status: 400 })

    const ext      = file.name.split('.').pop() ?? 'jpg'
    const fileName = `${folder}/${user.id}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`

    const { data, error } = await supabase.storage
      .from(BUCKET)
      .upload(fileName, file, { contentType: file.type, upsert: false })

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    const { data: { publicUrl } } = supabase.storage.from(BUCKET).getPublicUrl(data.path)

    return NextResponse.json({ url: publicUrl, path: data.path })
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 })
  }
}
