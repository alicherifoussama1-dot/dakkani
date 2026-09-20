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

/**
 * The store row + its settings.
 *
 * This is the slowest query on the product page (~1s measured) and it ran from
 * scratch for every visitor. It is now served from the data cache for 30s.
 *
 * WHAT THIS CANNOT AFFECT — checked against the live database, not assumed:
 *   · Tracking. Pixel ids are resolved by getProductTracking(), which queries
 *     tracking_integrations / product_tracking / domains live on every request.
 *     The legacy fallback columns on this row are all NULL for the live store
 *     (meta_pixel_id, tiktok_pixel_id, google_tag_id, snapchat_pixel_id), so a
 *     cached copy contributes nothing to pixel resolution either way. Changing
 *     a pixel in the dashboard still takes effect on the very next request.
 *   · Price, stock and variants. They come from getProductBySlug() and
 *     warehouse_stock, both uncached.
 *   · Delivery fees. fetchStoreDeliveryOverrides() is read live and merged on
 *     top of the wilaya rows.
 *   · Orders. POST /api/orders runs its OWN stores query, so order totals,
 *     fraud scoring and stock decrement never see a cached row.
 *
 * WHAT IT DOES DELAY, by at most 30 seconds, and only on the product page:
 *   store_settings — checkout field config, payment toggles, free-delivery
 *   threshold, theme colours, whatsapp/call numbers, abandoned-cart settings —
 *   plus is_active and the store name.
 *
 * 30s and not longer: the page is viewed many times a minute, so a short
 * window already removes essentially every repeat of this query, while keeping
 * the delay short enough that a merchant editing a setting sees it almost at
 * once.
 */
const fetchStoreBySlug = unstable_cache(
  async (slug: string) => {
    const supabase = createPublicClient()
    const { data } = await supabase
      .from('stores')
      .select('*,store_settings(*)')
      .eq('slug', slug)
      .single()
    return data
  },
  ['storefront:store-by-slug'],
  { revalidate: 30, tags: ['stores'] },
)

// cache() keeps the per-request dedup that generateMetadata and the page rely
// on; unstable_cache adds the cross-request layer underneath it.
export const getStoreBySlug = cache((slug: string) => fetchStoreBySlug(slug))

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
