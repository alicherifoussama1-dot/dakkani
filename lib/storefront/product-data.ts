import 'server-only'
import { cache } from 'react'
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
