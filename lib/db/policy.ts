// Row-level access rules for queries that arrive from the browser (/api/db).
// Replaces Supabase RLS: a signed-in merchant can only touch rows of the
// stores they own or are a member of; anonymous visitors get a tiny read-only
// allowlist needed by the public storefront.
import type { QuerySpec } from './builder'
import type { SchemaMeta } from './meta'

/** Tables anonymous storefront visitors may read, with forced conditions. */
const ANON_READ: Record<string, string[]> = {
  products: [`$ALIAS."is_active" = true`],
  communes: [],
  wilayas: [],
  coupons: [`$ALIAS."is_active" = true`],
}

/** Shared reference data: any signed-in user may read, nobody writes via /api/db. */
const GLOBAL_READ = new Set(['wilayas', 'communes', 'delivery_providers'])

export class PolicyError extends Error { status = 403 }

/** SQL returning the store ids the user may access (uses scope param $S1 = user id). */
export function userStoresSql(meta: SchemaMeta): string {
  const own = `select id from stores where owner_id = $S1::uuid`
  const members = meta.columns.get('store_members')?.has('user_id') ? ` union select store_id from store_members where user_id = $S1::uuid` : ''
  return `(${own}${members})`
}

export interface Scope { conds: string[]; params: unknown[] }

export function scopeFor(spec: QuerySpec, meta: SchemaMeta, userId: string | null): Scope {
  const t = spec.table
  const cols = meta.columns.get(t)
  if (!cols) throw new PolicyError(`Unknown table ${t}`)

  if (!userId) {
    const rule = ANON_READ[t]
    if (!rule || spec.action !== 'select') throw new PolicyError('Not authenticated')
    return { conds: rule, params: [] }
  }

  if (GLOBAL_READ.has(t)) {
    if (spec.action !== 'select') throw new PolicyError(`${t} is read-only`)
    return { conds: [], params: [] }
  }

  const stores = userStoresSql(meta)
  if (t === 'stores') return { conds: [`$ALIAS."id" IN ${stores}`], params: [userId] }
  if (cols.has('store_id')) return { conds: [`$ALIAS."store_id" IN ${stores}`], params: [userId] }

  // Child table without store_id: scope through a parent that has one.
  const fk = meta.fks.find(f => f.table === t && meta.columns.get(f.refTable)?.has('store_id'))
  if (fk) {
    return { conds: [`$ALIAS."${fk.column}" IN (select "${fk.refColumn}" from "${fk.refTable}" where store_id IN ${stores})`], params: [userId] }
  }
  const storeFk = meta.fks.find(f => f.table === t && f.refTable === 'stores')
  if (storeFk) return { conds: [`$ALIAS."${storeFk.column}" IN ${stores}`], params: [userId] }

  throw new PolicyError(`Access to ${t} is not allowed from the browser`)
}

/** Ensure inserted/upserted rows belong to the caller's stores. */
export function checkWriteRows(spec: QuerySpec, meta: SchemaMeta, userId: string, userStoreIds: string[]) {
  if (spec.action !== 'insert' && spec.action !== 'upsert') return
  const rows = (Array.isArray(spec.values) ? spec.values : [spec.values]) as Record<string, unknown>[]
  const cols = meta.columns.get(spec.table)!
  for (const r of rows) {
    if (spec.table === 'stores') {
      if (r.owner_id && r.owner_id !== userId) throw new PolicyError('Cannot create a store for another user')
      continue
    }
    if (cols.has('store_id') && r.store_id !== undefined && !userStoreIds.includes(String(r.store_id))) {
      throw new PolicyError('store_id not allowed')
    }
  }
}
