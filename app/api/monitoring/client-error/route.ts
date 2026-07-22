// Receives critical client-side errors (from app/global-error.tsx) and forwards
// them to the server-side reporter. Tiny + best-effort; never trusts the client
// for anything beyond a message/stack/url string, and stores no customer PII.
import { NextResponse } from 'next/server'
import { reportError } from '@/lib/monitoring/report'

export const dynamic = 'force-dynamic'

export async function POST(req: Request) {
  try {
    const b = await req.json().catch(() => ({}))
    const message = typeof b?.message === 'string' ? b.message.slice(0, 500) : 'client error'
    const err = new Error(message)
    err.stack = typeof b?.stack === 'string' ? b.stack.slice(0, 2000) : undefined
    reportError(err, {
      route: 'client',
      tags: { kind: 'client_error', digest: typeof b?.digest === 'string' ? b.digest.slice(0, 64) : undefined },
      extra: { url: typeof b?.url === 'string' ? b.url.slice(0, 300) : undefined },
    })
  } catch { /* swallow */ }
  return NextResponse.json({ ok: true })
}
