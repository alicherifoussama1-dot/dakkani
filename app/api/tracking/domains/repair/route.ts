// ============================================================
// GET /api/tracking/domains/repair?key=<SERVICE_ROLE_KEY>&host=<hostname>
// Self-contained fixer for "SSL handshake failed (525)".
// For the given domain it:
//   1. attaches apex + www to the Vercel project (exact JSON kept)
//   2. if Vercel returns a TXT verification challenge, creates the
//      record in the Cloudflare zone and calls Vercel verify
//   3. forces Cloudflare SSL mode = Full
//   4. reports final verified state for apex + www
// Gated by the service-role key. Returns evidence, no secrets.
// ============================================================
import { NextResponse } from 'next/server'
import { createPublicClient } from '@/lib/supabase/public'
import { cfConfigured, cfSetSslFull } from '@/lib/cloudflare/client'
import { vercelConfigured } from '@/lib/vercel/client'
import { ensureOriginDomain } from '@/lib/domains/attach'

export const dynamic = 'force-dynamic'

export async function GET(req: Request) {
  const url = new URL(req.url)
  const key = url.searchParams.get('key')
  const host = (url.searchParams.get('host') ?? '').toLowerCase().trim()
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY || key !== process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }
  if (!host) return NextResponse.json({ error: 'host required' }, { status: 400 })

  const out: any = {
    config: { cloudflare: cfConfigured(), vercel: vercelConfigured(), projectIdSet: !!process.env.VERCEL_PROJECT_ID, teamIdSet: !!process.env.VERCEL_TEAM_ID },
  }
  if (!out.config.vercel) {
    out.conclusion = 'FAIL — VERCEL_API_TOKEN / VERCEL_PROJECT_ID not present in this runtime.'
    return NextResponse.json(out)
  }

  const supabase = createPublicClient()
  const { data: domain } = await supabase.from('domains').select('*').eq('hostname', host).single()
  if (!domain?.cf_zone_id) {
    out.conclusion = `FAIL — domain ${host} not found or has no Cloudflare zone.`
    return NextResponse.json(out)
  }

  out.sslMode = { setFull: await cfSetSslFull(domain.cf_zone_id) }
  out.apex = await ensureOriginDomain(domain.cf_zone_id, host)
  out.www = await ensureOriginDomain(domain.cf_zone_id, `www.${host}`)

  const ok = out.apex.ok && out.apex.verified === true
  out.conclusion = ok
    ? 'PASS — domain attached to Vercel and verified. SSL should serve within ~1–2 minutes.'
    : 'ATTENTION — see apex.evidence JSON for the exact Vercel error.'
  return NextResponse.json(out)
}
