// ============================================================
// Bare /checkout — REPAIRED (was an orphaned mock with a fake
// 3-step wizard, hardcoded cart, and a setTimeout "success" that
// never created a real order). Nothing in the app links here
// directly; the real, fully-working checkout lives at
// /(storefront)/[storeSlug]/checkout (CheckoutForm.tsx) which
// already does real Supabase order creation, الولاية→البلدية
// cascade, validation, etc.
//
// Rather than duplicating that ~300-line implementation (which
// would violate "never recreate a feature that's already there"),
// this page now resolves the correct store from the given
// product_id (or store slug) and forwards the visitor to the
// real checkout — so a user who lands on the bare URL still
// reaches a working, real order flow instead of a fake one.
// ============================================================
export const dynamic = 'force-dynamic'

import { redirect } from 'next/navigation'
import { createPublicClient } from '@/lib/supabase/public'

interface Props {
  searchParams: {
    store?: string
    store_id?: string
    product_id?: string
    qty?: string
    variant?: string
  }
}

export default async function BareCheckoutRedirect({ searchParams }: Props) {
  const supabase = createPublicClient()

  const forwardParams = new URLSearchParams()
  if (searchParams.product_id) forwardParams.set('product_id', searchParams.product_id)
  if (searchParams.qty) forwardParams.set('qty', searchParams.qty)
  if (searchParams.variant) forwardParams.set('variant', searchParams.variant)
  const qs = forwardParams.toString()

  // 1) Store slug given directly
  if (searchParams.store) {
    redirect(`/${searchParams.store}/checkout${qs ? `?${qs}` : ''}`)
  }

  // 2) Resolve store via product_id
  if (searchParams.product_id) {
    const { data: product } = await supabase
      .from('products')
      .select('store_id')
      .eq('id', searchParams.product_id)
      .maybeSingle()

    if (product?.store_id) {
      const { data: store } = await supabase
        .from('stores')
        .select('slug')
        .eq('id', product.store_id)
        .maybeSingle()

      if (store?.slug) {
        redirect(`/${store.slug}/checkout${qs ? `?${qs}` : ''}`)
      }
    }
  }

  // 3) Resolve store via store_id directly
  if (searchParams.store_id) {
    const { data: store } = await supabase
      .from('stores')
      .select('slug')
      .eq('id', searchParams.store_id)
      .maybeSingle()

    if (store?.slug) {
      redirect(`/${store.slug}/checkout${qs ? `?${qs}` : ''}`)
    }
  }

  // 4) No context to build a checkout — send to product discovery rather
  //    than showing a fake success screen.
  redirect('/discover')
}
