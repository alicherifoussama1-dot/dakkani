// ============================================================
// POST /api/tracking/domains/verify   { id }
// Checks a domain's status and activates it.
//
// Cloudflare zone → poll zone status; when `active` we provision
// the platform DNS records, mark SSL issued/provisioning, and set
// the domain live. No manual DNS for the merchant.
//
// TXT provider (fallback) → resolve the _dakkani TXT record.
// ============================================================
import { NextResponse } from 'next/server'
import { resolveTxt } from 'node:dns/promises'
import { createServerClient } from '@/lib/supabase/server'
import { cfConfigured, cfCreateZone, cfGetZone, cfProvisionDns, cfSslStatus } from '@/lib/cloudflare/client'

export async function POST(req: Request) {
  const { id } = await req.json().catch(() => ({}))
  if (!id) return NextResponse.json({ error: 'معرّف الدومين مطلوب' }, { status: 400 })

  const supabase = createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'غير مصرّح' }, { status: 401 })

  const { data: domain } = await supabase.from('domains').select('*').eq('id', id).single()
  if (!domain) return NextResponse.json({ error: 'الدومين غير موجود' }, { status: 404 })

  const now = new Date().toISOString()

  // ── Self-heal: Cloudflare is configured but this domain has no zone yet
  // (e.g. added before provisioning, or a failed create). Create the zone
  // now so the merchant gets real nameservers without deleting/re-adding. ──
  if (cfConfigured() && domain.provider !== 'txt' && !domain.cf_zone_id) {
    const zone = await cfCreateZone(domain.hostname)
    if (!zone.ok) {
      await supabase.from('domains').update({ status: 'error', last_checked_at: now }).eq('id', id)
      return NextResponse.json({ status: 'error', message: `تعذّر إنشاء نطاق Cloudflare: ${zone.error}` }, { status: 502 })
    }
    await supabase.from('domains').update({
      provider: 'cloudflare', cf_zone_id: zone.zone.id,
      nameservers: zone.zone.name_servers ?? [],
      status: 'pending', ssl_status: 'provisioning', dns_status: 'pending',
      last_checked_at: now,
    }).eq('id', id)
    return NextResponse.json({
      status: 'pending', provisioned: true,
      nameservers: zone.zone.name_servers ?? [],
      message: 'تم إنشاء النطاق في Cloudflare. ضع خادمَي الأسماء الظاهرين لدى مزوّد نطاقك.',
    })
  }

  // ── Cloudflare full-zone path ──
  if (domain.cf_zone_id && cfConfigured()) {
    const zone = await cfGetZone(domain.cf_zone_id)
    if (!zone) {
      await supabase.from('domains').update({ status: 'error', last_checked_at: now }).eq('id', id)
      return NextResponse.json({ status: 'error', message: 'تعذّر الوصول إلى نطاق Cloudflare' })
    }

    if (zone.status === 'active') {
      await cfProvisionDns(domain.cf_zone_id, domain.hostname)
      const ssl = await cfSslStatus(domain.cf_zone_id)
      await supabase.from('domains').update({
        status: 'ssl_active',
        ssl_status: ssl,                        // 'issued' | 'provisioning'
        dns_status: 'connected',
        nameservers: zone.name_servers ?? domain.nameservers,
        activated_at: domain.activated_at ?? now,
        last_checked_at: now,
        verification: { ...domain.verification, verifiedAt: domain.verification?.verifiedAt ?? now, checkedAt: now },
      }).eq('id', id)
      return NextResponse.json({ status: 'active', ssl, message: 'تم تفعيل الدومين بنجاح 🎉' })
    }

    // Not active yet → NS not propagated.
    await supabase.from('domains').update({
      status: 'pending',
      nameservers: zone.name_servers ?? domain.nameservers,
      last_checked_at: now,
    }).eq('id', id)
    return NextResponse.json({
      status: 'pending',
      message: 'لم تنتشر خوادم الأسماء بعد. تأكد من تغييرها لدى مزوّد نطاقك — قد يستغرق الانتشار من دقائق حتى ٤٨ ساعة.',
    })
  }

  // ── TXT fallback (advanced / when Cloudflare not configured) ──
  const token: string | undefined = domain.verification?.token
  if (!token) return NextResponse.json({ error: 'لا يوجد رمز تحقق لهذا الدومين' }, { status: 400 })

  let verified = false
  try {
    const records = await resolveTxt(`_dakkani.${domain.hostname}`)
    verified = records.some(chunks => chunks.join('').trim() === token)
  } catch { verified = false }

  const status = verified ? 'ssl_active' : 'error'
  await supabase.from('domains').update({
    status,
    dns_status: verified ? 'connected' : 'error',
    ssl_status: verified ? 'issued' : 'pending',
    activated_at: verified ? (domain.activated_at ?? now) : domain.activated_at,
    last_checked_at: now,
    verification: { ...domain.verification, checkedAt: now, verifiedAt: verified ? (domain.verification?.verifiedAt ?? now) : domain.verification?.verifiedAt },
  }).eq('id', id)

  return NextResponse.json({
    status: verified ? 'active' : 'error',
    message: verified ? 'تم التحقق من الدومين عبر TXT' : `لم يُعثر على سجل TXT الصحيح على _dakkani.${domain.hostname}.`,
  })
}
