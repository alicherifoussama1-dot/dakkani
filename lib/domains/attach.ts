// ============================================================
// ensureOriginDomain — attach a hostname to the Vercel project
// and complete Vercel's TXT verification challenge through the
// domain's Cloudflare zone. Used by the domain verify route and
// the gated repair endpoint. Fixes Cloudflare error 525.
// ============================================================
import { cfUpsertDns } from '@/lib/cloudflare/client'
import { vercelConfigured, vercelAttachDomainRaw, vercelGetDomain, vercelVerifyDomain } from '@/lib/vercel/client'

export interface EnsureResult {
  hostname: string
  ok: boolean
  verified: boolean | null
  error?: string
  evidence?: any
}

export async function ensureOriginDomain(zoneId: string, hostname: string): Promise<EnsureResult> {
  if (!vercelConfigured()) return { hostname, ok: false, verified: null, error: 'VERCEL_API_TOKEN / VERCEL_PROJECT_ID غير مضبوطين' }

  const evidence: any = {}
  const attach = await vercelAttachDomainRaw(hostname)
  evidence.attach = attach
  const attachedOrExists =
    attach.status === 200 || attach.status === 409 || attach.json?.error?.code === 'domain_already_in_use'
  if (!attachedOrExists) {
    return { hostname, ok: false, verified: null, error: attach.json?.error?.message ?? `Vercel HTTP ${attach.status}`, evidence }
  }

  let info = await vercelGetDomain(hostname)
  evidence.state = info

  // Complete TXT verification challenges via the Cloudflare zone.
  const challenges = info.json?.verification ?? attach.json?.verification ?? []
  if (info.json?.verified === false && challenges.length) {
    for (const ch of challenges) {
      if (ch.type === 'TXT') await cfUpsertDns(zoneId, { type: 'TXT', name: ch.domain, content: ch.value })
    }
    await new Promise(r => setTimeout(r, 3000))
    evidence.verify = await vercelVerifyDomain(hostname)
    info = await vercelGetDomain(hostname)
  }

  return { hostname, ok: true, verified: info.json?.verified ?? null, evidence }
}

/** Apex + www. */
export async function ensureOriginDomainPair(zoneId: string, hostname: string) {
  const apex = await ensureOriginDomain(zoneId, hostname)
  const www = await ensureOriginDomain(zoneId, `www.${hostname}`)
  return { apex, www, ok: apex.ok && apex.verified !== false }
}
