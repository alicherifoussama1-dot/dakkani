// Isomorphic, supabase-js-compatible query builder.
//
// It only *describes* a query (a JSON-serialisable QuerySpec). Execution is
// delegated to an executor: on the server it compiles the spec to SQL and runs
// it against PostgreSQL; in the browser it POSTs the spec to /api/db. Callers
// keep the exact chaining API they used with Supabase.

export type FilterOp = 'eq' | 'neq' | 'gt' | 'gte' | 'lt' | 'lte' | 'in' | 'is' | 'like' | 'ilike' | 'contains' | 'cs' | 'cd' | 'ov'
export type Filter =
  | { col: string; op: FilterOp; val: unknown; not?: boolean }
  | { or: string; foreignTable?: string }

export interface QuerySpec {
  table: string
  action: 'select' | 'insert' | 'update' | 'upsert' | 'delete'
  columns: string | null              // select list (also the RETURNING list for writes)
  filters: Filter[]
  order: { col: string; ascending: boolean; nullsFirst?: boolean; foreignTable?: string }[]
  limit?: number
  offset?: number
  single?: 'single' | 'maybe'
  count?: 'exact' | 'planned' | 'estimated'
  head?: boolean
  values?: unknown
  onConflict?: string
  ignoreDuplicates?: boolean
}

export interface DbError { message: string; code?: string; details?: string | null; hint?: string | null }
export interface DbResult<T = any> { data: T; error: DbError | null; count: number | null; status: number; statusText: string }
export type Executor = (spec: QuerySpec) => Promise<DbResult>

export class QueryBuilder<T = any[]> implements PromiseLike<DbResult<T>> {
  private spec: QuerySpec
  constructor(table: string, private exec: Executor) {
    this.spec = { table, action: 'select', columns: '*', filters: [], order: [] }
  }

  select(columns = '*', opts: { count?: 'exact' | 'planned' | 'estimated'; head?: boolean } = {}) {
    if (this.spec.action === 'select') this.spec.columns = columns
    else this.spec.columns = columns // RETURNING list after insert/update/upsert/delete
    if (opts.count) this.spec.count = opts.count
    if (opts.head) this.spec.head = true
    return this
  }
  insert(values: unknown, opts: { count?: 'exact' } = {}) {
    Object.assign(this.spec, { action: 'insert', values, columns: null })
    if (opts.count) this.spec.count = opts.count
    return this
  }
  upsert(values: unknown, opts: { onConflict?: string; ignoreDuplicates?: boolean; count?: 'exact' } = {}) {
    Object.assign(this.spec, { action: 'upsert', values, columns: null, onConflict: opts.onConflict, ignoreDuplicates: opts.ignoreDuplicates })
    return this
  }
  update(values: unknown, opts: { count?: 'exact' } = {}) {
    Object.assign(this.spec, { action: 'update', values, columns: null })
    if (opts.count) this.spec.count = opts.count
    return this
  }
  delete(opts: { count?: 'exact' } = {}) {
    Object.assign(this.spec, { action: 'delete', columns: null })
    if (opts.count) this.spec.count = opts.count
    return this
  }

  private f(col: string, op: FilterOp, val: unknown) { this.spec.filters.push({ col, op, val }); return this }
  eq(col: string, val: unknown) { return this.f(col, 'eq', val) }
  neq(col: string, val: unknown) { return this.f(col, 'neq', val) }
  gt(col: string, val: unknown) { return this.f(col, 'gt', val) }
  gte(col: string, val: unknown) { return this.f(col, 'gte', val) }
  lt(col: string, val: unknown) { return this.f(col, 'lt', val) }
  lte(col: string, val: unknown) { return this.f(col, 'lte', val) }
  like(col: string, val: string) { return this.f(col, 'like', val) }
  ilike(col: string, val: string) { return this.f(col, 'ilike', val) }
  is(col: string, val: null | boolean) { return this.f(col, 'is', val) }
  in(col: string, vals: readonly unknown[]) { return this.f(col, 'in', [...vals]) }
  contains(col: string, val: unknown) { return this.f(col, 'cs', val) }
  containedBy(col: string, val: unknown) { return this.f(col, 'cd', val) }
  overlaps(col: string, val: unknown) { return this.f(col, 'ov', val) }
  match(obj: Record<string, unknown>) { for (const [k, v] of Object.entries(obj)) this.eq(k, v); return this }
  not(col: string, op: string, val: unknown) {
    this.spec.filters.push({ col, op: normalizeOp(op), val: op === 'in' ? parseInList(val) : val, not: true })
    return this
  }
  filter(col: string, op: string, val: unknown) {
    return this.f(col, normalizeOp(op), op === 'in' ? parseInList(val) : val)
  }
  or(expr: string, opts: { foreignTable?: string; referencedTable?: string } = {}) {
    this.spec.filters.push({ or: expr, foreignTable: opts.foreignTable ?? opts.referencedTable }); return this
  }

  order(col: string, opts: { ascending?: boolean; nullsFirst?: boolean; foreignTable?: string; referencedTable?: string } = {}) {
    this.spec.order.push({ col, ascending: opts.ascending ?? true, nullsFirst: opts.nullsFirst, foreignTable: opts.foreignTable ?? opts.referencedTable })
    return this
  }
  limit(n: number) { this.spec.limit = n; return this }
  range(from: number, to: number) { this.spec.offset = from; this.spec.limit = to - from + 1; return this }
  single() { this.spec.single = 'single'; return this as unknown as QueryBuilder<any> }
  maybeSingle() { this.spec.single = 'maybe'; return this as unknown as QueryBuilder<any> }
  abortSignal(_s?: AbortSignal) { return this }
  returns<U>() { return this as unknown as QueryBuilder<U> }
  throwOnError() { return this }

  then<R1 = DbResult<T>, R2 = never>(onfulfilled?: ((v: DbResult<T>) => R1 | PromiseLike<R1>) | null, onrejected?: ((r: any) => R2 | PromiseLike<R2>) | null): PromiseLike<R1 | R2> {
    const p = this.exec(this.spec).catch((e: any): DbResult => ({ data: null, error: { message: String(e?.message ?? e) }, count: null, status: 500, statusText: 'error' }))
    return p.then(onfulfilled as any, onrejected as any)
  }
}

function normalizeOp(op: string): FilterOp {
  const map: Record<string, FilterOp> = { eq: 'eq', neq: 'neq', gt: 'gt', gte: 'gte', lt: 'lt', lte: 'lte', in: 'in', is: 'is', like: 'like', ilike: 'ilike', cs: 'cs', cd: 'cd', ov: 'ov', contains: 'cs' }
  const o = map[op]
  if (!o) throw new Error(`Unsupported filter operator: ${op}`)
  return o
}

function parseInList(val: unknown): unknown[] {
  if (Array.isArray(val)) return val
  const s = String(val).trim().replace(/^\(/, '').replace(/\)$/, '')
  return s ? s.split(',').map(x => x.trim().replace(/^"(.*)"$/, '$1')) : []
}
