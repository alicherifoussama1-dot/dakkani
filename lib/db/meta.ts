// Schema introspection used by the query compiler to resolve PostgREST-style
// embeds (`order_items(*)`, `wilaya:wilayas(name_ar)`, `stores!inner(slug)`).
// Loaded once per process from information_schema and cached.
import { query } from './pool'

export interface ForeignKey { table: string; column: string; refTable: string; refColumn: string }
export interface SchemaMeta {
  columns: Map<string, Set<string>>
  /** table -> column -> udt_name (e.g. 'jsonb', '_text', 'uuid', 'numeric') */
  types: Map<string, Map<string, string>>
  /** table -> primary key columns */
  pkeys: Map<string, string[]>
  fks: ForeignKey[]
}

const g = globalThis as unknown as { __commercoMeta?: Promise<SchemaMeta> }

export function getMeta(): Promise<SchemaMeta> {
  if (!g.__commercoMeta) {
    g.__commercoMeta = load().catch(e => { g.__commercoMeta = undefined; throw e })
  }
  return g.__commercoMeta
}

async function load(): Promise<SchemaMeta> {
  const cols = await query<{ table_name: string; column_name: string; udt_name: string }>(
    `select table_name, column_name, udt_name from information_schema.columns where table_schema = 'public'`)
  const columns = new Map<string, Set<string>>()
  const types = new Map<string, Map<string, string>>()
  for (const c of cols) {
    if (!columns.has(c.table_name)) { columns.set(c.table_name, new Set()); types.set(c.table_name, new Map()) }
    columns.get(c.table_name)!.add(c.column_name)
    types.get(c.table_name)!.set(c.column_name, c.udt_name)
  }
  const pk = await query<{ table_name: string; column_name: string }>(`
    select kcu.table_name, kcu.column_name
      from information_schema.table_constraints tc
      join information_schema.key_column_usage kcu
        on tc.constraint_name = kcu.constraint_name and tc.table_schema = kcu.table_schema
     where tc.constraint_type = 'PRIMARY KEY' and tc.table_schema = 'public'
     order by kcu.ordinal_position`)
  const pkeys = new Map<string, string[]>()
  for (const r of pk) {
    if (!pkeys.has(r.table_name)) pkeys.set(r.table_name, [])
    pkeys.get(r.table_name)!.push(r.column_name)
  }
  const fks = await query<ForeignKey>(`
    select kcu.table_name as "table", kcu.column_name as "column",
           ccu.table_name as "refTable", ccu.column_name as "refColumn"
      from information_schema.table_constraints tc
      join information_schema.key_column_usage kcu
        on tc.constraint_name = kcu.constraint_name and tc.table_schema = kcu.table_schema
      join information_schema.constraint_column_usage ccu
        on tc.constraint_name = ccu.constraint_name and tc.table_schema = ccu.table_schema
     where tc.constraint_type = 'FOREIGN KEY' and tc.table_schema = 'public'`)
  return { columns, types, pkeys, fks }
}

/** Relationship between a parent row and an embedded table. */
export type Relation =
  | { kind: 'many'; childColumn: string; parentColumn: string } // embedded rows point at parent → array
  | { kind: 'one'; parentColumn: string; childColumn: string }  // parent points at embedded → object

export function findRelation(meta: SchemaMeta, parent: string, embedded: string, hint?: string): Relation {
  if (hint) {
    // Hint may be a column ("owner_id") or a constraint name ("orders_store_id_fkey").
    const col = hint.replace(/_fkey$/, '')
    for (const h of [hint, col, col.replace(new RegExp(`^${parent}_`), ''), col.replace(new RegExp(`^${embedded}_`), '')]) {
      try { return findRelationExact(meta, parent, embedded, h) } catch { /* try next */ }
    }
  }
  return findRelationExact(meta, parent, embedded)
}

function findRelationExact(meta: SchemaMeta, parent: string, embedded: string, hint?: string): Relation {
  // parent.col -> embedded.id  (many-to-one, object)
  const toOne = meta.fks.filter(f => f.table === parent && f.refTable === embedded && (!hint || f.column === hint))
  // embedded.col -> parent.id  (one-to-many, array)
  const toMany = meta.fks.filter(f => f.table === embedded && f.refTable === parent && (!hint || f.column === hint))
  if (toOne.length) return { kind: 'one', parentColumn: toOne[0].column, childColumn: toOne[0].refColumn }
  if (toMany.length) return { kind: 'many', childColumn: toMany[0].column, parentColumn: toMany[0].refColumn }
  throw new Error(`No relationship between ${parent} and ${embedded}`)
}
