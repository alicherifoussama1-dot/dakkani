// ============================================================
// Cloudflare API client — full-zone provisioning (Cloudflare for
// SaaS style, nameserver-swap model like JustSell/Shopify).
//
// Flow: create a zone per custom domain → Cloudflare returns two
// assigned nameservers → merchant points their registrar NS at
// them → we poll until the zone is `active` → Universal SSL issues
// automatically → we create the DNS records pointing at the
// platform → domain goes live.
//
// Requires env:
//   CLOUDFLARE_API_TOKEN     (Zone:Edit, DNS:Edit)
//   CLOUDFLARE_ACCOUNT_ID
//   PLATFORM_DNS_TARGET      (optional; CNAME target, default Vercel)
// ============================================================
const CF_API = 'https://api.cloudflare.com/client/v4'

export function cfConfigured(): boolean {
  return !!(process.env.CLOUDFLARE_API_TOKEN && process.env.CLOUDFLARE_ACCOUNT_ID)
}

export function platformDnsTarget(): string {
  return process.env.PLATFORM_DNS_TARGET || 'cname.vercel-dns.com'
}

interface CfResult<T> { success: boolean; result: T; errors?: { message: string }[] }

async function cf<T>(path: string, init?: RequestInit): Promise<CfResult<T>> {
  const res = await fetch(`${CF_API}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${process.env.CLOUDFLARE_API_TOKEN}`,
      'Content-Type': 'application/json',
      ...(init?.headers ?? {}),
    },
    cache: 'no-store',
  })
  const json = (await res.json().catch(() => ({}))) as CfResult<T>
  return json
}

export interface CfZone {
  id: string
  name: string
  status: string            // 'pending' | 'active' | 'initializing' | 'moved' | ...
  name_servers?: string[]
}

// Create (or return existing) zone for a domain.
export async function cfCreateZone(name: string): Promise<{ ok: true; zone: CfZone } | { ok: false; error: string }> {
  const r = await cf<CfZone>('/zones', {
    method: 'POST',
    body: JSON.stringify({ name, account: { id: process.env.CLOUDFLARE_ACCOUNT_ID }, type: 'full' }),
  })
  if (r.success && r.result?.id) return { ok: true, zone: r.result }
  // Zone may already exist under this account → look it up.
  const msg = r.errors?.[0]?.message ?? 'فشل إنشاء نطاق Cloudflare'
  if (/already exists/i.test(msg)) {
    const found = await cfFindZone(name)
    if (found) return { ok: true, zone: found }
  }
  return { ok: false, error: msg }
}

export async function cfFindZone(name: string): Promise<CfZone | null> {
  const r = await cf<CfZone[]>(`/zones?name=${encodeURIComponent(name)}`)
  return r.success && r.result?.[0] ? r.result[0] : null
}

export async function cfGetZone(zoneId: string): Promise<CfZone | null> {
  const r = await cf<CfZone>(`/zones/${zoneId}`)
  return r.success ? r.result : null
}

// Idempotently create a DNS record (skips if an equivalent one exists).
export async function cfUpsertDns(
  zoneId: string,
  record: { type: 'A' | 'CNAME'; name: string; content: string; proxied?: boolean },
): Promise<boolean> {
  const existing = await cf<{ id: string }[]>(`/zones/${zoneId}/dns_records?type=${record.type}&name=${encodeURIComponent(record.name)}`)
  if (existing.success && existing.result?.length) return true
  const r = await cf<{ id: string }>(`/zones/${zoneId}/dns_records`, {
    method: 'POST',
    body: JSON.stringify({ proxied: true, ttl: 1, ...record }),
  })
  return r.success
}

// Provision the platform-pointing DNS records for an active zone.
export async function cfProvisionDns(zoneId: string, hostname: string): Promise<boolean> {
  const target = platformDnsTarget()
  // Apex via CNAME flattening (Cloudflare supports CNAME at root) + www.
  const a = await cfUpsertDns(zoneId, { type: 'CNAME', name: hostname, content: target, proxied: true })
  const b = await cfUpsertDns(zoneId, { type: 'CNAME', name: `www.${hostname}`, content: target, proxied: true })
  return a && b
}

// Universal SSL status for the zone.
export async function cfSslStatus(zoneId: string): Promise<'issued' | 'provisioning' | 'error'> {
  const r = await cf<{ status: string }[]>(`/zones/${zoneId}/ssl/verification`)
  if (!r.success || !Array.isArray(r.result)) return 'provisioning'
  const anyActive = r.result.some(v => v.status === 'active')
  return anyActive ? 'issued' : 'provisioning'
}
