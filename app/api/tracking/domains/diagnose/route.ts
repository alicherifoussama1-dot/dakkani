// ============================================================
// GET /api/tracking/domains/diagnose?key=<SUPABASE_SERVICE_ROLE_KEY>
// End-to-end Cloudflare diagnosis run from the PRODUCTION runtime.
// Returns exact Cloudflare JSON as evidence for each check.
// Gated by the service-role key (never public). No secrets echoed.
// ============================================================
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

const CF = 'https://api.cloudflare.com/client/v4'

async function cfFetch(path: string, init?: RequestInit) {
  const res = await fetch(`${CF}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${process.env.CLOUDFLARE_API_TOKEN}`,
      'Content-Type': 'application/json',
      ...(init?.headers ?? {}),
    },
    cache: 'no-store',
  })
  const json = await res.json().catch(() => ({}))
  return { httpStatus: res.status, json }
}

export async function GET(req: Request) {
  const url = new URL(req.url)
  const key = url.searchParams.get('key') ?? req.headers.get('x-diag-key')
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY || key !== process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }

  const token = process.env.CLOUDFLARE_API_TOKEN
  const accountId = process.env.CLOUDFLARE_ACCOUNT_ID
  const out: any = {
    // (1)(7)(8) runtime / deployment evidence
    runtime: {
      vercelEnv: process.env.VERCEL_ENV ?? '(not on vercel)',
      deployedCommit: (process.env.VERCEL_GIT_COMMIT_SHA ?? '').slice(0, 7) || '(unknown)',
      commitMessage: process.env.VERCEL_GIT_COMMIT_MESSAGE ?? undefined,
      region: process.env.VERCEL_REGION ?? undefined,
    },
    env: {
      apiTokenSet: !!token,
      apiTokenLength: token ? token.length : 0,
      apiTokenHasWhitespace: token ? /\s/.test(token) : false,
      accountIdSet: !!accountId,
      accountIdValue: accountId ?? null, // account id is not a secret
      dnsTarget: process.env.PLATFORM_DNS_TARGET || 'cname.vercel-dns.com',
    },
  }

  if (!token) {
    out.conclusion = 'FAIL @ step 1/3 — CLOUDFLARE_API_TOKEN is not present in this runtime.'
    return NextResponse.json(out)
  }

  // (3) Token verify — exact JSON
  out.tokenVerify = await cfFetch('/user/tokens/verify')
  const tokenId = out.tokenVerify.json?.result?.id

  // (4)(5) Token permissions + resources (needs User API Tokens:Read; may fail)
  if (tokenId) {
    out.tokenDetails = await cfFetch(`/user/tokens/${tokenId}`)
  } else {
    out.tokenDetails = { skipped: 'no token id (token invalid)' }
  }

  // (2) Account check — does the account id resolve / who owns it
  if (accountId) {
    out.accountCheck = await cfFetch(`/accounts/${accountId}`)
  } else {
    out.accountCheck = { skipped: 'CLOUDFLARE_ACCOUNT_ID not set' }
  }

  // (6) Real zone-create attempt (auto-deleted) — exact code + message
  const testName = `diag-${Date.now().toString(36)}.example.com`
  const create = await cfFetch('/zones', {
    method: 'POST',
    body: JSON.stringify({ name: testName, account: { id: accountId }, type: 'full' }),
  })
  out.zoneCreateTest = { attemptedName: testName, httpStatus: create.httpStatus, json: create.json }
  const createdZoneId = create.json?.result?.id
  if (createdZoneId) {
    const del = await cfFetch(`/zones/${createdZoneId}`, { method: 'DELETE' })
    out.zoneCreateTest.cleanup = { deleted: del.json?.success === true, httpStatus: del.httpStatus }
  }

  // Conclusion
  const tokenOk = out.tokenVerify.json?.success && out.tokenVerify.json?.result?.status === 'active'
  const accountOk = out.accountCheck?.json?.success === true
  const createOk = create.json?.success === true
  out.conclusion =
    !tokenOk ? 'FAIL @ step 3 — token verify did not return active. Fix CLOUDFLARE_API_TOKEN.'
    : !accountOk ? 'FAIL @ step 2 — CLOUDFLARE_ACCOUNT_ID does not resolve for this token.'
    : !createOk ? 'FAIL @ step 6 — token is valid but zone creation was refused (see zoneCreateTest.json.errors — likely missing Zone:Edit at account scope).'
    : 'PASS — token valid, account resolves, zone creation succeeded (test zone deleted).'

  return NextResponse.json(out)
}
