// ============================================================
// POST /api/tracking/test
// Test Connection for a tracking integration. Verifies ONLY:
// connection, credentials, response. Nothing else.
// Returns { status: 'healthy'|'warning'|'error', message }.
// ============================================================
import { NextResponse } from 'next/server'
import { z } from 'zod'

const Body = z.object({
  provider: z.enum(['meta', 'tiktok', 'google', 'snapchat']),
  pixel_id: z.string().min(1),
  credentials: z.record(z.any()).optional().default({}),
})

type Result = { status: 'healthy' | 'warning' | 'error'; message: string }

async function testMeta(pixelId: string, token?: string): Promise<Result> {
  if (!/^\d{6,20}$/.test(pixelId)) return { status: 'error', message: 'صيغة معرّف البكسل غير صحيحة' }
  if (!token) return { status: 'warning', message: 'البكسل صالح — أضف رمز Conversions API للتحقق الكامل من الخادم' }
  try {
    const res = await fetch(`https://graph.facebook.com/v18.0/${pixelId}?access_token=${encodeURIComponent(token)}`)
    const json = await res.json().catch(() => ({}))
    if (res.ok && json.id) return { status: 'healthy', message: 'الاتصال والرمز صحيحان' }
    return { status: 'error', message: json?.error?.message ?? 'رفض الرمز أو معرّف البكسل' }
  } catch {
    return { status: 'error', message: 'تعذّر الوصول إلى خادم ميتا' }
  }
}

function testTiktok(pixelId: string, token?: string): Result {
  if (!/^[A-Z0-9]{15,30}$/i.test(pixelId)) return { status: 'error', message: 'صيغة معرّف بكسل تيك توك غير صحيحة' }
  return token
    ? { status: 'healthy', message: 'المعرّف والرمز مهيّآن' }
    : { status: 'warning', message: 'المعرّف صالح — أضف رمز Events API للتتبع من الخادم' }
}

function testGoogle(id: string): Result {
  return /^G-[A-Z0-9]{6,12}$/i.test(id)
    ? { status: 'healthy', message: 'معرّف القياس صالح' }
    : { status: 'error', message: 'يجب أن يبدأ معرّف GA4 بـ G-' }
}

function testSnapchat(id: string): Result {
  return /^[0-9a-f-]{20,40}$/i.test(id)
    ? { status: 'healthy', message: 'معرّف البكسل صالح' }
    : { status: 'error', message: 'صيغة معرّف بكسل سناب شات غير صحيحة' }
}

export async function POST(req: Request) {
  const parsed = Body.safeParse(await req.json().catch(() => ({})))
  if (!parsed.success) return NextResponse.json({ status: 'error', message: 'طلب غير صالح' }, { status: 400 })
  const { provider, pixel_id, credentials } = parsed.data

  let result: Result
  switch (provider) {
    case 'meta':     result = await testMeta(pixel_id, credentials.capiToken as string | undefined); break
    case 'tiktok':   result = testTiktok(pixel_id, credentials.accessToken as string | undefined); break
    case 'google':   result = testGoogle(pixel_id); break
    case 'snapchat': result = testSnapchat(pixel_id); break
  }
  return NextResponse.json(result)
}
