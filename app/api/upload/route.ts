// ============================================================
// File Upload API — stores files on the hosting disk (lib/db storage).
//   Mode A (JSON)      → returns a short-lived signed PUT URL (/api/upload/put)
//   Mode B (multipart) → stores the file directly
// ============================================================
import { NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'
import { storageBucket } from '@/lib/db/server'
import { signUploadPath } from '@/lib/db/upload-sign'

const MAX_SIZE        = 5 * 1024 * 1024  // 5MB — product images
const MAX_SIZE_BANNER = 20 * 1024 * 1024 // 20MB — description banner (stored at full quality)
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/svg+xml']
const BUCKET       = process.env.NEXT_PUBLIC_STORAGE_BUCKET ?? 'dakkani-uploads'

export async function POST(req: Request) {
  const supabase = createServerClient(req.headers.get('authorization'))
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'يرجى تسجيل الدخول' }, { status: 401 })
  const userId = user.id
  const storage = storageBucket(BUCKET)

  const contentTypeHeader = req.headers.get('content-type') ?? ''

  // ── Mode A: JSON payload requesting a signed direct upload URL ──
  if (contentTypeHeader.includes('application/json')) {
    try {
      const body = await req.json()
      const { fileName: origName, fileType, fileSize, folder = 'products', kind = '' } = body
      const maxSize = kind === 'banner' ? MAX_SIZE_BANNER : MAX_SIZE

      if (!origName || !fileType) {
        return NextResponse.json({ error: 'لم يتم تحديد معلومات الملف' }, { status: 400 })
      }
      if (fileSize && fileSize > maxSize) {
        const mbLimit = Math.round(maxSize / (1024 * 1024))
        return NextResponse.json({ error: `حجم الملف كبير جداً (الحد الأقصى ${mbLimit} ميغابايت)` }, { status: 400 })
      }
      if (!ALLOWED_TYPES.includes(fileType)) {
        return NextResponse.json({ error: 'نوع الملف غير مدعوم. يرجى رفع صورة بصيغة JPG أو PNG أو WebP' }, { status: 400 })
      }

      const ext = String(origName).split('.').pop()?.replace(/[^a-z0-9]/gi, '') || 'jpg'
      const filePath = `${String(folder).replace(/[^a-z0-9_-]/gi, '')}/${userId}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`
      const { sig, exp } = signUploadPath(`${BUCKET}/${filePath}`, maxSize)
      const signedUrl = `/api/upload/put?bucket=${encodeURIComponent(BUCKET)}&path=${encodeURIComponent(filePath)}&exp=${exp}&max=${maxSize}&sig=${sig}`
      const { data: { publicUrl } } = storage.getPublicUrl(filePath)

      return NextResponse.json({ signedUrl, publicUrl, path: filePath, token: sig })
    } catch (err) {
      console.error('[presigned-url-exception]', err)
      return NextResponse.json({ error: (err as Error).message || 'خطأ في خادم رفع الملفات' }, { status: 500 })
    }
  }

  // ── Mode B: Multipart Form Data upload ──
  try {
    const formData = await req.formData()
    const file     = formData.get('file') as File | null
    const folder   = String(formData.get('folder') ?? 'products').replace(/[^a-z0-9_-]/gi, '') || 'products'
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

    const ext      = file.name.split('.').pop()?.replace(/[^a-z0-9]/gi, '') || 'jpg'
    const fileName = `${folder}/${userId}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`

    const { data, error } = await storage.upload(fileName, Buffer.from(await file.arrayBuffer()), { contentType: file.type, upsert: true })
    if (error || !data) {
      console.error('[upload-api-storage-error]', error)
      return NextResponse.json({ error: error?.message || 'فشل حفظ الملف' }, { status: 500 })
    }

    const { data: { publicUrl } } = storage.getPublicUrl(data.path)
    return NextResponse.json({ url: publicUrl, path: data.path })
  } catch (err) {
    console.error('[upload-api-exception]', err)
    return NextResponse.json({ error: (err as Error).message || 'حدث خطأ في الخادم أثناء رفع الملف' }, { status: 500 })
  }
}
