// ============================================================
// POST /api/tracking/domains/verify   { id }
// Verifies domain ownership via a TXT record, then marks the
// domain 'verified'. SSL is assumed handled by the hosting
// provider once DNS points correctly (status can advance to
// 'ssl_active' by a later provider webhook).
// ============================================================
import { NextResponse } from 'next/server'
import { resolveTxt } from 'node:dns/promises'
import { createServerClient } from '@/lib/supabase/server'

export async function POST(req: Request) {
  const { id } = await req.json().catch(() => ({}))
  if (!id) return NextResponse.json({ error: 'معرّف الدومين مطلوب' }, { status: 400 })

  const supabase = createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'غير مصرّح' }, { status: 401 })

  // RLS (owner policy) guarantees the merchant can only read their own domain.
  const { data: domain } = await supabase.from('domains').select('*').eq('id', id).single()
  if (!domain) return NextResponse.json({ error: 'الدومين غير موجود' }, { status: 404 })

  const token: string | undefined = domain.verification?.token
  if (!token) return NextResponse.json({ error: 'لا يوجد رمز تحقق لهذا الدومين' }, { status: 400 })

  const recordHost = `_dakkani.${domain.hostname}`
  let verified = false
  try {
    const records = await resolveTxt(recordHost)
    verified = records.some(chunks => chunks.join('').trim() === token)
  } catch {
    verified = false
  }

  const status = verified ? 'verified' : 'error'
  await supabase.from('domains').update({
    status,
    verification: { ...domain.verification, checkedAt: new Date().toISOString() },
    updated_at: new Date().toISOString(),
  }).eq('id', id)

  return NextResponse.json({
    status,
    verified,
    message: verified
      ? 'تم التحقق من الدومين بنجاح'
      : `لم يتم العثور على سجل TXT الصحيح على ${recordHost}. تأكد من إضافته وانتظر انتشار DNS.`,
  })
}
