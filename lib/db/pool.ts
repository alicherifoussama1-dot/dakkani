// Server-only PostgreSQL pool (replaces the Supabase REST transport).
//
// Type parsers mirror what PostgREST returned so existing callers keep
// working unchanged: numerics/bigints as JS numbers, timestamps/dates as the
// raw ISO-ish strings Postgres emits (never Date objects).
import { Pool, types } from 'pg'

types.setTypeParser(1700, v => (v === null ? null : parseFloat(v))) // numeric
types.setTypeParser(20, v => (v === null ? null : parseInt(v, 10)))  // int8
types.setTypeParser(1114, v => v) // timestamp
types.setTypeParser(1184, v => v) // timestamptz
types.setTypeParser(1082, v => v) // date

const g = globalThis as unknown as { __commercoPool?: Pool }

export function getPool(): Pool {
  if (!g.__commercoPool) {
    const connectionString = process.env.DATABASE_URL
    if (!connectionString) throw new Error('DATABASE_URL is not set')
    // Shared hosting caps processes/connections — keep the pool small.
    g.__commercoPool = new Pool({ connectionString, max: Number(process.env.DB_POOL_MAX ?? 8), idleTimeoutMillis: 30_000 })
  }
  return g.__commercoPool
}

export async function query<T = any>(text: string, params: unknown[] = []): Promise<T[]> {
  const res = await getPool().query(text, params as any[])
  return res.rows as T[]
}
