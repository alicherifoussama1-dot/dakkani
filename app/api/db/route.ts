// Browser → database bridge. Replaces direct Supabase REST calls from client
// components. Every query is scoped by lib/db/policy (the old RLS rules).
import { NextRequest, NextResponse } from 'next/server'
import type { QuerySpec } from '@/lib/db/builder'
import { getMeta } from '@/lib/db/meta'
import { checkWriteRows, PolicyError, scopeFor } from '@/lib/db/policy'
import { query } from '@/lib/db/pool'
import { executeSpec } from '@/lib/db/server'
import { SESSION_COOKIE, verifySession } from '@/lib/db/session'

export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  let spec: QuerySpec
  try { spec = await req.json() } catch { return NextResponse.json({ data: null, error: { message: 'Invalid JSON' } }, { status: 400 }) }
  if (!spec || typeof spec.table !== 'string' || !['select', 'insert', 'update', 'upsert', 'delete'].includes(spec.action)) {
    return NextResponse.json({ data: null, error: { message: 'Invalid query' } }, { status: 400 })
  }
  const session = await verifySession(req.cookies.get(SESSION_COOKIE)?.value)
  const userId = session?.sub ?? null
  try {
    const meta = await getMeta()
    const scope = scopeFor(spec, meta, userId)
    if (userId && (spec.action === 'insert' || spec.action === 'upsert')) {
      const ids = (await query<{ id: string }>(
        `select id from stores where owner_id = $1` + (meta.columns.get('store_members')?.has('user_id') ? ` union select store_id from store_members where user_id = $1` : ''), [userId])).map(r => String(r.id))
      checkWriteRows(spec, meta, userId, ids)
    }
    // Unscoped mass update/delete from the browser is never legitimate.
    if ((spec.action === 'update' || spec.action === 'delete') && !spec.filters?.length) throw new PolicyError('Refusing unfiltered write')
    const result = await executeSpec(spec, scope.conds, scope.params)
    return NextResponse.json(result, { status: 200 })
  } catch (e: any) {
    const status = e instanceof PolicyError ? 403 : 400
    return NextResponse.json({ data: null, error: { message: e?.message ?? 'Query failed', code: status === 403 ? '42501' : 'PGRST000' }, count: null, status, statusText: 'error' }, { status: 200 })
  }
}
