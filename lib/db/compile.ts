// Compiles a QuerySpec (PostgREST semantics) into parameterised SQL.
//
// Supported subset (everything the app uses):
//   select lists with aliases, casts and nested embeds
//     `*, items:order_items(*, products(name)), stores!inner(owner_id)`
//   filters eq/neq/gt/gte/lt/lte/in/is/like/ilike/cs/cd/ov, not(), or()
//   order / limit / range, single / maybeSingle, count (+ head)
//   insert / update / upsert (onConflict, ignoreDuplicates) / delete + RETURNING
import type { Filter, FilterOp, QuerySpec } from './builder'
import { findRelation, type SchemaMeta } from './meta'

// ── identifiers ──────────────────────────────────────────────
const IDENT = /^[A-Za-z_][A-Za-z0-9_]*$/
export function qi(name: string): string {
  if (!IDENT.test(name)) throw new Error(`Invalid identifier: ${name}`)
  return `"${name}"`
}

class Params {
  values: unknown[] = []
  add(v: unknown): string { this.values.push(v); return `$${this.values.length}` }
}

// ── select-list parsing ──────────────────────────────────────
type SelItem =
  | { kind: 'star' }
  | { kind: 'col'; name: string; alias?: string; cast?: string; json?: string[] }
  | { kind: 'embed'; table: string; alias?: string; hint?: string; inner: boolean; items: SelItem[] }

function splitTop(s: string, sep = ','): string[] {
  const out: string[] = []; let depth = 0; let cur = ''
  for (const ch of s) {
    if (ch === '(') depth++
    if (ch === ')') depth--
    if (ch === sep && depth === 0) { out.push(cur); cur = '' } else cur += ch
  }
  if (cur.trim()) out.push(cur)
  return out.map(x => x.trim()).filter(Boolean)
}

export function parseSelect(sel: string | null | undefined): SelItem[] {
  const s = (sel ?? '*').replace(/\s+/g, ' ').trim() || '*'
  return splitTop(s).map(parseItem)
}

function parseItem(raw: string): SelItem {
  const part = raw.trim()
  if (part === '*') return { kind: 'star' }
  const paren = part.indexOf('(')
  if (paren > 0 && part.endsWith(')')) {
    let head = part.slice(0, paren).trim()
    const inner = part.slice(paren + 1, -1)
    let alias: string | undefined
    if (head.includes(':')) { [alias, head] = head.split(':').map(x => x.trim()) as [string, string] }
    let hint: string | undefined; let isInner = false
    const bangs = head.split('!')
    const table = bangs[0].trim()
    for (const b of bangs.slice(1)) {
      if (b === 'inner') isInner = true
      else if (b === 'left') { /* default */ }
      else hint = b // fk column name (PostgREST disambiguation hint)
    }
    return { kind: 'embed', table, alias, hint, inner: isInner, items: parseSelect(inner) }
  }
  let name = part; let alias: string | undefined; let cast: string | undefined
  const colon = name.indexOf(':')
  if (colon > 0 && name[colon + 1] !== ':') { alias = name.slice(0, colon).trim(); name = name.slice(colon + 1).trim() }
  const castIdx = name.indexOf('::')
  if (castIdx > 0) { cast = name.slice(castIdx + 2).trim(); name = name.slice(0, castIdx).trim() }
  // json path  data->>key / data->key
  const jm = name.match(/^([A-Za-z_][A-Za-z0-9_]*)((?:->>?[A-Za-z0-9_]+)+)$/)
  if (jm) {
    const path = jm[2].split(/(?=->)/).map(p => p)
    return { kind: 'col', name: jm[1], alias: alias ?? path[path.length - 1].replace(/^->>?/, ''), cast, json: path }
  }
  return { kind: 'col', name, alias, cast }
}

// ── value encoding ───────────────────────────────────────────
function isJsonType(t?: string) { return t === 'json' || t === 'jsonb' }
function isArrayType(t?: string) { return !!t && t.startsWith('_') }

function encodeValue(meta: SchemaMeta, table: string, col: string, v: unknown): unknown {
  if (v === undefined || v === null) return null
  const t = meta.types.get(table)?.get(col)
  if (isJsonType(t)) return JSON.stringify(v)
  if (typeof v === 'object' && !Array.isArray(v) && !(v instanceof Date)) return JSON.stringify(v)
  return v
}

function literal(raw: string): unknown {
  // PostgREST string values arrive unquoted; strip optional double quotes.
  const m = raw.match(/^"(.*)"$/)
  return m ? m[1] : raw
}

// ── filters ──────────────────────────────────────────────────
const OPS: Record<string, string> = { eq: '=', neq: '<>', gt: '>', gte: '>=', lt: '<', lte: '<=', like: 'LIKE', ilike: 'ILIKE', cs: '@>', cd: '<@', ov: '&&' }

function colRef(alias: string, col: string, meta: SchemaMeta, table: string): string {
  const jm = col.match(/^([A-Za-z_][A-Za-z0-9_]*)((?:->>?[A-Za-z0-9_]+)+)$/)
  if (jm) {
    const segs = jm[2].match(/->>?[A-Za-z0-9_]+/g)!
    return `${alias}.${qi(jm[1])}` + segs.map(s => {
      const arrow = s.startsWith('->>') ? '->>' : '->'
      const key = s.replace(/^->>?/, '')
      return `${arrow}'${key.replace(/'/g, "''")}'`
    }).join('')
  }
  void meta; void table
  return `${alias}.${qi(col)}`
}

function filterSql(f: Filter, alias: string, table: string, meta: SchemaMeta, p: Params): string {
  if ('or' in f) return `(${orExpr(f.or, alias, table, meta, p)})`
  const ref = colRef(alias, f.col, meta, table)
  const t = meta.types.get(table)?.get(f.col.split('->')[0])
  let sql: string
  if (f.op === 'is') {
    const v = f.val === null || f.val === 'null' ? 'NULL' : (f.val === true || f.val === 'true') ? 'TRUE' : (f.val === false || f.val === 'false') ? 'FALSE' : 'UNKNOWN'
    sql = `${ref} IS ${v}`
  } else if (f.op === 'in') {
    const arr = (f.val as unknown[]) ?? []
    if (!arr.length) sql = 'FALSE'
    else sql = `${ref} IN (${arr.map(v => p.add(v)).join(', ')})`
  } else if (f.op === 'cs' || f.op === 'cd' || f.op === 'ov') {
    const v = isJsonType(t) ? JSON.stringify(f.val) : f.val
    const cast = isJsonType(t) ? '::jsonb' : ''
    sql = `${ref} ${OPS[f.op]} ${p.add(v)}${cast}`
  } else {
    sql = `${ref} ${OPS[f.op]} ${p.add(f.val)}`
  }
  return f.not ? `NOT (${sql})` : sql
}

/** PostgREST logic tree:  a.eq.1,b.is.null,and(c.gt.2,d.lt.3),not.e.eq.x */
function orExpr(expr: string, alias: string, table: string, meta: SchemaMeta, p: Params, joiner = 'OR'): string {
  const parts = splitTop(expr)
  return parts.map(part => {
    const lm = part.match(/^(not\.)?(and|or)\((.*)\)$/)
    if (lm) {
      const inner = orExpr(lm[3], alias, table, meta, p, lm[2] === 'and' ? 'AND' : 'OR')
      return lm[1] ? `NOT (${inner})` : `(${inner})`
    }
    let neg = false; let rest = part
    // col.op.value  |  col.not.op.value
    const firstDot = rest.indexOf('.')
    const col = rest.slice(0, firstDot); rest = rest.slice(firstDot + 1)
    if (rest.startsWith('not.')) { neg = true; rest = rest.slice(4) }
    const dot = rest.indexOf('.')
    const op = rest.slice(0, dot) as FilterOp; const raw = rest.slice(dot + 1)
    let val: unknown = literal(raw)
    if (op === 'in') val = raw.replace(/^\(/, '').replace(/\)$/, '').split(',').map(x => literal(x.trim()))
    if (op === 'like' || op === 'ilike') val = String(val).replace(/\*/g, '%')
    return filterSql({ col, op, val, not: neg }, alias, table, meta, p)
  }).join(` ${joiner} `)
}

// ── select compilation (with embeds) ─────────────────────────
let aliasSeq = 0
const nextAlias = () => `t${++aliasSeq}`

/** JSON object expression for one row of `table` aliased `a`. */
function rowJson(items: SelItem[], table: string, a: string, meta: SchemaMeta, p: Params): string {
  const hasStar = items.some(i => i.kind === 'star')
  const pairs: string[] = []
  for (const it of items) {
    if (it.kind === 'col') {
      let e = colRef(a, it.json ? it.name + it.json.join('') : it.name, meta, table)
      if (it.cast) e = `(${e})::${castType(it.cast)}`
      pairs.push(`'${(it.alias ?? it.name).replace(/'/g, "''")}', ${e}`)
    } else if (it.kind === 'embed') {
      pairs.push(`'${(it.alias ?? it.table).replace(/'/g, "''")}', ${embedSql(it, table, a, meta, p)}`)
    }
  }
  const obj = pairs.length ? `jsonb_build_object(${pairs.join(', ')})` : `'{}'::jsonb`
  return hasStar ? `(to_jsonb(${a}.*) || ${obj})` : obj
}

function castType(t: string): string {
  if (!/^[a-z0-9_ \[\]]+$/i.test(t)) throw new Error(`Invalid cast: ${t}`)
  return t
}

function embedSql(e: Extract<SelItem, { kind: 'embed' }>, parent: string, pa: string, meta: SchemaMeta, p: Params): string {
  const rel = findRelation(meta, parent, e.table, e.hint)
  const ca = nextAlias()
  const json = rowJson(e.items, e.table, ca, meta, p)
  if (rel.kind === 'one') {
    return `(SELECT ${json} FROM ${qi(e.table)} ${ca} WHERE ${ca}.${qi(rel.childColumn)} = ${pa}.${qi(rel.parentColumn)} LIMIT 1)`
  }
  return `(SELECT coalesce(jsonb_agg(${json}), '[]'::jsonb) FROM ${qi(e.table)} ${ca} WHERE ${ca}.${qi(rel.childColumn)} = ${pa}.${qi(rel.parentColumn)})`
}

function innerJoins(items: SelItem[], table: string, a: string, meta: SchemaMeta): string[] {
  const out: string[] = []
  for (const it of items) {
    if (it.kind !== 'embed' || !it.inner) continue
    const rel = findRelation(meta, table, it.table, it.hint)
    const ca = nextAlias()
    const cond = rel.kind === 'one'
      ? `${ca}.${qi(rel.childColumn)} = ${a}.${qi(rel.parentColumn)}`
      : `${ca}.${qi(rel.childColumn)} = ${a}.${qi(rel.parentColumn)}`
    out.push(`EXISTS (SELECT 1 FROM ${qi(it.table)} ${ca} WHERE ${cond})`)
  }
  return out
}

/** Top-level projection: plain columns stay real columns; embeds become json columns. */
function projection(items: SelItem[], table: string, a: string, meta: SchemaMeta, p: Params): string {
  const out: string[] = []
  for (const it of items) {
    if (it.kind === 'star') out.push(`${a}.*`)
    else if (it.kind === 'col') {
      let e = colRef(a, it.json ? it.name + it.json.join('') : it.name, meta, table)
      if (it.cast) e = `(${e})::${castType(it.cast)}`
      out.push(`${e} AS ${qi(it.alias ?? it.name)}`)
    } else out.push(`${embedSql(it, table, a, meta, p)} AS ${qi(it.alias ?? it.table)}`)
  }
  return out.length ? out.join(', ') : `${a}.*`
}

function whereSql(spec: QuerySpec, a: string, meta: SchemaMeta, p: Params, extra: string[] = []): string {
  const conds = spec.filters.map(f => filterSql(f, a, spec.table, meta, p)).concat(extra)
  return conds.length ? ` WHERE ${conds.join(' AND ')}` : ''
}

function orderSql(spec: QuerySpec, a: string): string {
  const parts = spec.order.filter(o => !o.foreignTable).map(o =>
    `${a}.${qi(o.col)} ${o.ascending ? 'ASC' : 'DESC'}${o.nullsFirst === undefined ? (o.ascending ? ' NULLS LAST' : ' NULLS FIRST') : o.nullsFirst ? ' NULLS FIRST' : ' NULLS LAST'}`)
  return parts.length ? ` ORDER BY ${parts.join(', ')}` : ''
}

export interface Compiled { sql: string; params: unknown[]; countSql?: string; countParams?: unknown[]; returns: boolean }

export function compile(spec: QuerySpec, meta: SchemaMeta, scope: string[] = []): Compiled {
  if (!meta.columns.has(spec.table)) throw new Error(`relation "${spec.table}" does not exist`)
  const T = qi(spec.table)
  const items = parseSelect(spec.columns)
  const p = new Params()

  if (spec.action === 'select') {
    const a = 'p0'
    const extra = innerJoins(items, spec.table, a, meta).concat(scope.map(s => s.replace(/\$ALIAS/g, a)))
    const proj = projection(items, spec.table, a, meta, p)
    let sql = `SELECT ${proj} FROM ${T} ${a}${whereSql(spec, a, meta, p, extra)}${orderSql(spec, a)}`
    if (spec.limit !== undefined) sql += ` LIMIT ${Math.max(0, Math.floor(spec.limit))}`
    if (spec.offset !== undefined) sql += ` OFFSET ${Math.max(0, Math.floor(spec.offset))}`
    const out: Compiled = { sql, params: p.values, returns: true }
    if (spec.count) {
      const cp = new Params()
      const cextra = innerJoins(items, spec.table, a, meta).concat(scope.map(s => s.replace(/\$ALIAS/g, a)))
      out.countSql = `SELECT count(*)::int AS n FROM ${T} ${a}${whereSql(spec, a, meta, cp, cextra)}`
      out.countParams = cp.values
    }
    return out
  }

  const returning = spec.columns !== null
  const retProj = (alias: string) => projection(items, spec.table, alias, meta, p)

  if (spec.action === 'insert' || spec.action === 'upsert') {
    const rows = (Array.isArray(spec.values) ? spec.values : [spec.values]) as Record<string, unknown>[]
    if (!rows.length) return { sql: 'SELECT 1 WHERE FALSE', params: [], returns: returning }
    const cols = Array.from(new Set(rows.flatMap(r => Object.keys(r))))
    const valuesSql = rows.map(r => `(${cols.map(c => (c in r) ? p.add(encodeValue(meta, spec.table, c, r[c])) : 'DEFAULT').join(', ')})`).join(', ')
    let sql = `INSERT INTO ${T} (${cols.map(qi).join(', ')}) VALUES ${valuesSql}`
    if (spec.action === 'upsert') {
      const target = (spec.onConflict ?? (meta.pkeys.get(spec.table) ?? ['id']).join(',')).split(',').map(s => qi(s.trim()))
      if (spec.ignoreDuplicates) sql += ` ON CONFLICT (${target.join(', ')}) DO NOTHING`
      else {
        const upd = cols.filter(c => !target.includes(qi(c)))
        sql += upd.length
          ? ` ON CONFLICT (${target.join(', ')}) DO UPDATE SET ${upd.map(c => `${qi(c)} = EXCLUDED.${qi(c)}`).join(', ')}`
          : ` ON CONFLICT (${target.join(', ')}) DO NOTHING`
      }
    }
    sql += ' RETURNING *'
    if (returning) sql = `WITH w AS (${sql}) SELECT ${retProj('w')} FROM w`
    return { sql, params: p.values, returns: returning }
  }

  if (spec.action === 'update') {
    const vals = (spec.values ?? {}) as Record<string, unknown>
    const sets = Object.keys(vals).map(c => `${qi(c)} = ${p.add(encodeValue(meta, spec.table, c, vals[c]))}`)
    if (!sets.length) throw new Error('update() called without values')
    const a = 'p0'
    let sql = `UPDATE ${T} ${a} SET ${sets.join(', ')}${whereSql(spec, a, meta, p, scope.map(s => s.replace(/\$ALIAS/g, a)))} RETURNING ${a}.*`
    if (returning) sql = `WITH w AS (${sql}) SELECT ${retProj('w')} FROM w`
    return { sql, params: p.values, returns: returning }
  }

  // delete
  const a = 'p0'
  let sql = `DELETE FROM ${T} ${a}${whereSql(spec, a, meta, p, scope.map(s => s.replace(/\$ALIAS/g, a)))} RETURNING ${a}.*`
  if (returning) sql = `WITH w AS (${sql}) SELECT ${retProj('w')} FROM w`
  return { sql, params: p.values, returns: returning }
}
