// ============================================================
// SERVICE-ROLE CLIENT — the ONLY sanctioned way to bypass RLS
// for platform operations (queue, audit, events, admin).
//
// Rules:
//  • Never import this from client components.
//  • Tenant-scoped reads/writes must still filter by store_id —
//    use scoped() to make that impossible to forget.
//  • Storefront public reads keep using lib/supabase/public.ts.
// ============================================================
import { createClient, type SupabaseClient } from '@/lib/db/compat/supabase-js'

export function createServiceClient(): SupabaseClient {
  // Direct PostgreSQL access (service-role semantics).
  return createClient()
}

/**
 * Tenant-scoped accessor over the service client. Guarantees every query is
 * filtered by store_id even though RLS is bypassed.
 *
 *   const db = scoped(createServiceClient(), storeId)
 *   await db.from('orders').select('*')   // → automatically .eq('store_id', storeId)
 */
export function scoped(client: SupabaseClient, storeId: string) {
  if (!storeId) throw new Error('scoped(): storeId is required')
  return {
    from(table: string) {
      const builder = client.from(table)
      return {
        select: (columns = '*') => builder.select(columns).eq('store_id', storeId),
        update: (values: Record<string, unknown>) => builder.update(values).eq('store_id', storeId),
        delete: () => builder.delete().eq('store_id', storeId),
        insert: (values: Record<string, unknown> | Record<string, unknown>[]) => {
          const rows = Array.isArray(values) ? values : [values]
          return builder.insert(rows.map(r => ({ ...r, store_id: storeId })))
        },
      }
    },
    storeId,
    raw: client,
  }
}
