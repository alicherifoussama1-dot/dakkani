// Custom domain → store slug (used by the edge middleware, which cannot reach
// PostgreSQL directly). Public information only.
import { NextRequest, NextResponse } from 'next/server'
import { query } from '@/lib/db/pool'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const host = (req.nextUrl.searchParams.get('host') ?? '').toLowerCase().replace(/^www\./, '')
  if (!host) return NextResponse.json({ slug: null })
  try {
    const rows = await query<{ slug: string }>(
      `select s.slug from domains d join stores s on s.id = d.store_id
        where d.hostname = $1 and d.status = 'ssl_active' limit 1`, [host])
    return NextResponse.json({ slug: rows[0]?.slug ?? null })
  } catch {
    return NextResponse.json({ slug: null })
  }
}
