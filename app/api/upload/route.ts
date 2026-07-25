// ============================================================
// File Upload API — stores to Supabase Storage
// ============================================================
import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { createClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

const MAX_SIZE        = 5 * 1024 * 1024  // 5MB — product images (unchanged)
const MAX_SIZE_BANNER = 20 * 1024 * 1024 // 20MB — description banner (stored at full quality)
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/svg+xml']
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
  const userId = user?.id ?? 'public'

  try {
    const formData = await req.formData()
    const file     = formData.get('file') as File | null
    const folder   = (formData.get('folder') as string) ?? 'products'
    // `kind=banner` raises the limit to 20MB (description banner is stored at
    // full quality; the storefront serves an optimized WebP for display). Every
    // other upload keeps the 5MB product-image limit.
    const kind     = (formData.get('kind') as string) ?? ''
    const maxSize  = kind === 'banner' ? MAX_SIZE_BANNER : MAX_SIZE

    if (!file) {
      return NextResponse.json({ error: 'لم يتم تحديد أي ملف للرفع' }, { status: 400 })
    }
    if (file.size > maxSize) {
      const mbLimit = Math.round(maxSize / (1024 * 1024))
      return NextResponse.json({ error: `حجم الملف كبير جداً (الحد الأقصى ${mbLimit} ميغابايت)` }, { status: 400 })
    }
    if (!ALLOWED_TYPES.includes(file.type)) {
      return NextResponse.json({ error: 'نوع الملف غير مدعوم. يرجى رفع صورة بصيغة JPG أو PNG أو WebP' }, { status: 400 })
    }

    const ext      = file.name.split('.').pop() ?? 'jpg'
    const fileName = `${folder}/${userId}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`

    // Convert Web File to Node Buffer for 100% reliable Supabase Storage SDK upload in Node.js
    const fileBuffer = Buffer.from(await file.arrayBuffer())

    // Use service role admin client when available to bypass storage RLS on server-side upload
    const storageClient = process.env.SUPABASE_SERVICE_ROLE_KEY
      ? createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY)
      : supabase

    const { data, error } = await storageClient.storage
      .from(BUCKET)
      .upload(fileName, fileBuffer, { contentType: file.type, upsert: true })

    if (error) {
      console.error('[upload-api-storage-error]', error)
      return NextResponse.json({ error: error.message || 'فشل حفظ الملف في سوباباز ستورج' }, { status: 500 })
    }

    const { data: { publicUrl } } = storageClient.storage.from(BUCKET).getPublicUrl(data.path)

    return NextResponse.json({ url: publicUrl, path: data.path })
  } catch (err) {
    console.error('[upload-api-exception]', err)
    return NextResponse.json({ error: (err as Error).message || 'حدث خطأ في الخادم أثناء رفع الملف' }, { status: 500 })
  }
}

