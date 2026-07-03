// ============================================================
// POST /api/tracking/domains/provision   { hostname }
// Cloudflare full-zone provisioning. Creates a zone for the
// domain and returns its assigned nameservers. Falls back to a
// TXT-verification record only when Cloudflare isn't configured.
// ============================================================
import { NextResponse } from 'next/server'
import { createServerClient, getActiveStore } from '@/lib/supabase/server'
import { cfConfigured, cfCreateZone } from '@/lib/cloudflare/client'

function normalizeHost(input: string): string {
  return input.trim().toLowerCase().replace(/^https?:\/\//, '').replace(/\/.*$/, '').replace(/^www\./, '')
}

export async function POST(req: Request) {
  const { hostname } = await req.json().catch(() => ({}))
  const host = normalizeHost(hostname ?? '')
  if (!host || !/^[a-z0-9.-]+\.[a-z]{2,}$/.test(host)) {
    return NextResponse.json({ error: 'أدخل دوميناً صحيحاً مثل example.com' }, { status: 400 })
  }

  const supabase = createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'غير مصرّح' }, { status: 401 })
  const { activeStore: store } = await getActiveStore(supabase, user.id)
  if (!store) return NextResponse.json({ error: 'لا يوجد متجر نشط' }, { status: 400 })

  // TXT token is always stored as an advanced fallback.
  const token = 'dakkani-verify-' + (globalThis.crypto?.randomUUID?.() ?? Math.random().toString(36).slice(2))
  const verification = { method: 'txt', token, record_host: `_dakkani.${host}` }

  // ── Cloudflare path ──
  if (cfConfigured()) {
    const zone = await cfCreateZone(host)
    if (!zone.ok) return NextResponse.json({ error: zone.error }, { status: 502 })

    const { error } = await supabase.from('domains').insert({
      store_id: store.id, hostname: host,
      provider: 'cloudflare', cf_zone_id: zone.zone.id,
      nameservers: zone.zone.name_servers ?? [],
      status: 'pending', ssl_status: 'provisioning', dns_status: 'pending',
      last_checked_at: new Date().toISOString(),
      verification,
    })
    if (error) return NextResponse.json({ error: error.message }, { status: 400 })
    return NextResponse.json({ ok: true, configured: true, nameservers: zone.zone.name_servers ?? [] })
  }

  // ── Fallback: no Cloudflare configured → TXT verification ──
  const { error } = await supabase.from('domains').insert({
    store_id: store.id, hostname: host,
    provider: 'txt', status: 'pending', ssl_status: 'pending', dns_status: 'pending',
    verification,
  })
  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json({
    ok: true, configured: false,
    message: 'Cloudflare غير مُهيّأ على المنصّة — تم إنشاء تحقق TXT كبديل. أضف CLOUDFLARE_API_TOKEN و CLOUDFLARE_ACCOUNT_ID لتفعيل التزويد التلقائي.',
  })
}
