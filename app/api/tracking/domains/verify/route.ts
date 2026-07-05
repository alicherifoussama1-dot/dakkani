// ============================================================
// POST /api/tracking/domains/verify   { id }
// Cloudflare-ONLY status check + activation (JustSell model).
// Verification relies entirely on the Cloudflare Zone status —
// never on TXT. When the zone is `active` we provision the
// platform DNS, mark SSL issued/provisioning + DNS connected,
// and activate the domain.
// ============================================================
import { NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'
import { cfConfigured, cfVerifyToken, cfCreateZone, cfGetZone, cfProvisionDns, cfSslStatus, cfSetSslFull } from '@/lib/cloudflare/client'
import { vercelConfigured, vercelAttachDomainPair } from '@/lib/vercel/client'

const CF_CONFIG_ERROR = 'Cloudflare API configuration error'

export async function POST(req: Request) {
  const { id } = await req.json().catch(() => ({}))
  if (!id) return NextResponse.json({ error: 'معرّف الدومين مطلوب' }, { status: 400 })

  const supabase = createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'غير مصرّح' }, { status: 401 })

  const { data: domain } = await supabase.from('domains').select('*').eq('id', id).single()
  if (!domain) return NextResponse.json({ error: 'الدومين غير موجود' }, { status: 404 })

  const now = new Date().toISOString()

  // Cloudflare must be usable. No TXT fallback — ever.
  if (!cfConfigured() || !(await cfVerifyToken())) {
    return NextResponse.json({ status: 'error', message: CF_CONFIG_ERROR, code: 'cf_config' }, { status: 502 })
  }

  // Self-heal: a domain missing its zone (legacy row) gets one created now.
  if (!domain.cf_zone_id) {
    const zone = await cfCreateZone(domain.hostname)
    if (!zone.ok || !zone.zone.name_servers?.length) {
      await supabase.from('domains').update({ status: 'error', last_checked_at: now }).eq('id', id)
      return NextResponse.json({ status: 'error', message: zone.ok ? CF_CONFIG_ERROR : zone.error, code: 'cf_zone' }, { status: 502 })
    }
    await supabase.from('domains').update({
      provider: 'cloudflare', cf_zone_id: zone.zone.id, nameservers: zone.zone.name_servers,
      status: 'pending', ssl_status: 'provisioning', dns_status: 'pending', last_checked_at: now,
    }).eq('id', id)
    return NextResponse.json({ status: 'pending', provisioned: true, nameservers: zone.zone.name_servers, message: 'تم إنشاء النطاق في Cloudflare. ضع خادمَي الأسماء لدى مزوّد نطاقك.' })
  }

  const zone = await cfGetZone(domain.cf_zone_id)
  if (!zone) {
    await supabase.from('domains').update({ status: 'error', last_checked_at: now }).eq('id', id)
    return NextResponse.json({ status: 'error', message: CF_CONFIG_ERROR, code: 'cf_zone' }, { status: 502 })
  }

  if (zone.status === 'active') {
    await cfProvisionDns(domain.cf_zone_id, domain.hostname)
    // Origin must terminate TLS for this hostname → SSL mode Full +
    // attach the domain to the Vercel project. Without this the site 525s.
    await cfSetSslFull(domain.cf_zone_id)
    const origin = vercelConfigured()
      ? await vercelAttachDomainPair(domain.hostname)
      : { ok: false, error: 'VERCEL_API_TOKEN / VERCEL_PROJECT_ID غير مضبوطين' }
    const ssl = await cfSslStatus(domain.cf_zone_id)
    await supabase.from('domains').update({
      status: 'ssl_active', ssl_status: ssl, dns_status: 'connected',
      nameservers: zone.name_servers ?? domain.nameservers,
      activated_at: domain.activated_at ?? now, last_checked_at: now,
    }).eq('id', id)
    return NextResponse.json({
      status: 'active', ssl, originAttached: origin.ok,
      message: origin.ok
        ? 'تم تفعيل الدومين بنجاح 🎉'
        : `الدومين نشط في Cloudflare لكن ربطه بالخادم فشل (${origin.error}) — قد تظهر صفحة SSL 525 حتى يُضاف الدومين إلى مشروع Vercel.`,
    })
  }

  // Zone still pending → nameservers not propagated yet.
  await supabase.from('domains').update({
    status: 'pending', nameservers: zone.name_servers ?? domain.nameservers, last_checked_at: now,
  }).eq('id', id)
  return NextResponse.json({
    status: 'pending',
    message: 'لم تنتشر خوادم الأسماء بعد. تأكد من تغييرها لدى مزوّد نطاقك — قد يستغرق الانتشار من دقائق حتى ٤٨ ساعة.',
  })
}
