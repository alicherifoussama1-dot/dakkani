// ============================================================
// POST /api/tracking/domains/provision   { hostname }
// Cloudflare-ONLY provisioning (JustSell model). Creating a
// domain immediately creates a Cloudflare zone and stores the
// zone id + nameservers. No TXT-first flow, no fallback:
//   • invalid/missing token  → "Cloudflare API configuration error"
//   • zone creation fails     → NOT saved to the database
// ============================================================
import { NextResponse } from 'next/server'
import { createServerClient, getActiveStore } from '@/lib/supabase/server'
import { cfConfigured, cfVerifyToken, cfCreateZone } from '@/lib/cloudflare/client'

const CF_CONFIG_ERROR = 'Cloudflare API configuration error'

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

  // Cloudflare is REQUIRED. If it isn't configured or the token is invalid,
  // fail explicitly — never fall back to TXT.
  if (!cfConfigured() || !(await cfVerifyToken())) {
    return NextResponse.json({ error: CF_CONFIG_ERROR, code: 'cf_config' }, { status: 502 })
  }

  // Create the Cloudflare zone FIRST. If it fails, do not touch the DB.
  const zone = await cfCreateZone(host)
  if (!zone.ok || !zone.zone.name_servers?.length) {
    return NextResponse.json({ error: zone.ok ? CF_CONFIG_ERROR : zone.error, code: 'cf_zone' }, { status: 502 })
  }

  // Zone created → persist. TXT token is stored ONLY for the hidden
  // Advanced-DNS troubleshooting panel; it is never part of verification.
  const token = 'dakkani-verify-' + (globalThis.crypto?.randomUUID?.() ?? Math.random().toString(36).slice(2))
  const { error } = await supabase.from('domains').insert({
    store_id: store.id, hostname: host,
    provider: 'cloudflare', cf_zone_id: zone.zone.id,
    nameservers: zone.zone.name_servers,
    status: 'pending', ssl_status: 'provisioning', dns_status: 'pending',
    last_checked_at: new Date().toISOString(),
    verification: { method: 'txt', token, record_host: `_dakkani.${host}` },
  })
  if (error) return NextResponse.json({ error: error.message }, { status: 400 })

  return NextResponse.json({ ok: true, nameservers: zone.zone.name_servers, status: 'pending' })
}
