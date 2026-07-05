// ============================================================
// Vercel API client — attach custom domains to the platform
// project so the origin serves SSL/SNI for them (fixes 525:
// Cloudflare→origin handshake fails when the origin doesn't
// know the hostname).
//
// Requires env:
//   VERCEL_API_TOKEN    (scope: the project's team/account)
//   VERCEL_PROJECT_ID   (prj_...)
//   VERCEL_TEAM_ID      (optional, team_...)
// ============================================================
const API = 'https://api.vercel.com'

export function vercelConfigured(): boolean {
  return !!(process.env.VERCEL_API_TOKEN && process.env.VERCEL_PROJECT_ID)
}

function teamQS(): string {
  return process.env.VERCEL_TEAM_ID ? `?teamId=${process.env.VERCEL_TEAM_ID}` : ''
}

async function vc(path: string, init?: RequestInit) {
  const res = await fetch(`${API}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${process.env.VERCEL_API_TOKEN}`,
      'Content-Type': 'application/json',
      ...(init?.headers ?? {}),
    },
    cache: 'no-store',
  })
  const json = await res.json().catch(() => ({}))
  return { status: res.status, json }
}

export interface VercelDomainInfo {
  name?: string
  verified?: boolean
  verification?: { type: string; domain: string; value: string; reason?: string }[]
  error?: { code: string; message: string }
}

/** Raw attach — returns Vercel's exact JSON (verification challenges included). */
export async function vercelAttachDomainRaw(hostname: string): Promise<{ status: number; json: VercelDomainInfo }> {
  return vc(`/v10/projects/${process.env.VERCEL_PROJECT_ID}/domains${teamQS()}`, {
    method: 'POST',
    body: JSON.stringify({ name: hostname }),
  })
}

export async function vercelGetDomain(hostname: string): Promise<{ status: number; json: VercelDomainInfo }> {
  return vc(`/v9/projects/${process.env.VERCEL_PROJECT_ID}/domains/${encodeURIComponent(hostname)}${teamQS()}`)
}

export async function vercelVerifyDomain(hostname: string): Promise<{ status: number; json: VercelDomainInfo }> {
  return vc(`/v9/projects/${process.env.VERCEL_PROJECT_ID}/domains/${encodeURIComponent(hostname)}/verify${teamQS()}`, { method: 'POST' })
}

/** Idempotently add a domain to the project (409/already-in-use → ok). */
export async function vercelAttachDomain(hostname: string): Promise<{ ok: boolean; error?: string }> {
  if (!vercelConfigured()) return { ok: false, error: 'Vercel API not configured' }
  const r = await vercelAttachDomainRaw(hostname)
  if (r.status === 200 || r.status === 409) return { ok: true }
  const code = r.json?.error?.code
  if (code === 'domain_already_in_use') return { ok: true }
  return { ok: false, error: r.json?.error?.message ?? `Vercel HTTP ${r.status}` }
}

/** Attach apex + www in one call. */
export async function vercelAttachDomainPair(hostname: string): Promise<{ ok: boolean; error?: string }> {
  const apex = await vercelAttachDomain(hostname)
  if (!apex.ok) return apex
  await vercelAttachDomain(`www.${hostname}`) // best-effort
  return { ok: true }
}
