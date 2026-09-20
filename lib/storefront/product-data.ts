import 'server-only'
import { cache } from 'react'
import { unstable_cache } from 'next/cache'
import { createPublicClient } from '@/lib/supabase/public'

// ── Request-scoped dedup for the product page ───────────────────────────────
// `generateMetadata` and the page component both need the store + product row.
// Previously each fetched them separately => 4 DB round-trips per view (2 dupes).
// React `cache()` memoizes per-request by argument, so calling these from both
// places executes each query exactly ONCE. No data is cached across requests,
// so price / stock / variants / offers stay fully fresh (nothing is stale).
//
// The selects are supersets ('*') so the page keeps EVERY field it already
// used (variants, section config, pixels, theme, offers). Nothing removed.

export const getStoreBySlug = cache(async (slug: string) => {
  const supabase = createPublicClient()
  const { data } = await supabase
    .from('stores')
    .select('*,store_settings(*)')
    .eq('slug', slug)
    .single()
  return data
})

/**
 * The platform wilaya table: 58 reference rows — names, zones and the FALLBACK
 * delivery fees.
 *
 * This is the one query on the product page that is neither product data nor
 * store data: no price, no stock, no variants. It is edited by the platform,
 * not by merchants, and it was the slowest query in the parallel batch. Serving
 * it from the data cache removes that cost from every page view.
 *
 * What stays live: the store's own courier prices, which are fetched fresh on
 * every request by fetchStoreDeliveryOverrides() and merged ON TOP of these
 * rows. So a merchant changing their delivery prices is still reflected
 * immediately; only the platform's fallback table is cached.
 */
export const getActiveWilayas = unstable_cache(
  async () => {
    const supabase = createPublicClient()
    const { data } = await supabase.from('wilayas').select('*').eq('is_active', true).order('id')
    return data ?? []
  },
  ['storefront:wilayas:active'],
  // 300s, not an hour: the query is shared by every visitor, so even a short
  // window removes virtually all of it, while capping how long a platform-level
  // fee edit could stay invisible. Store overrides are never cached.
  { revalidate: 300, tags: ['wilayas'] },
)

export const getProductBySlug = cache(async (storeId: string, slug: string) => {
  const supabase = createPublicClient()
  const { data } = await supabase
    .from('products')
    .select('*')
    .eq('store_id', storeId)
    .eq('slug', slug)
    .single()
  return data
})
