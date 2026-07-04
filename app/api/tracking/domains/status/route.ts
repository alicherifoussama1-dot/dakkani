// ============================================================
// GET /api/tracking/domains/status
// Safe diagnostic — returns ONLY booleans (no secrets) so the
// platform's Cloudflare configuration can be verified remotely.
// ============================================================
import { NextResponse } from 'next/server'
import { cfConfigured, cfVerifyToken } from '@/lib/cloudflare/client'

export const dynamic = 'force-dynamic'

export async function GET() {
  const configured = cfConfigured()
  const tokenValid = configured ? await cfVerifyToken() : false
  return NextResponse.json({
    cloudflareConfigured: configured,
    apiTokenSet: !!process.env.CLOUDFLARE_API_TOKEN,
    accountIdSet: !!process.env.CLOUDFLARE_ACCOUNT_ID,
    tokenValid,
    dnsTarget: process.env.PLATFORM_DNS_TARGET || 'cname.vercel-dns.com',
  })
}
