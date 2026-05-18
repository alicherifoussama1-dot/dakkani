export const dynamic = 'force-dynamic'

import { createServerClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import CheckoutForm from '@/components/storefront/CheckoutForm'

interface Props {
  params: { storeSlug: string }
  searchParams: { product_id?: string; qty?: string; variant?: string }
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  return { title: `إتمام الطلب | ${params.storeSlug}` }
}

export default async function CheckoutPage({ params, searchParams }: Props) {
  const supabase = createServerClient()

  // Load store
  const { data: store } = await supabase
    .from('stores')
    .select('id, name, name_ar, slug, logo_url, meta_pixel_id, tiktok_pixel_id, store_settings(cash_on_delivery, baridimob, ccp, free_delivery_threshold)')
    .eq('slug', params.storeSlug)
    .eq('is_active', true)
    .single()
  if (!store) notFound()

  // Load product if provided
  let product = null
  if (searchParams.product_id) {
    const { data } = await supabase
      .from('products')
      .select('id, name, name_ar, slug, price, compare_price, images, variants, use_store_pixel, meta_pixel_id, tiktok_pixel_id')
      .eq('id', searchParams.product_id)
      .eq('store_id', store.id)
      .eq('is_active', true)
      .single()
    product = data
  }

  // Load all 58 wilayas
  const { data: wilayas } = await supabase
    .from('wilayas')
    .select('*')
    .eq('is_active', true)
    .order('id')

  return (
    <div className="min-h-screen bg-gray-50" dir="rtl">
      {/* Header */}
      <header className="bg-white shadow-sm sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 py-3 flex items-center gap-3">
          {store.logo_url ? (
            <img src={store.logo_url} alt={store.name} className="w-9 h-9 rounded-xl object-cover" />
          ) : (
            <div className="w-9 h-9 bg-dakkani-500 rounded-xl flex items-center justify-center text-white font-black">
              {store.name[0]}
            </div>
          )}
          <div>
            <p className="font-bold text-gray-900">{store.name_ar ?? store.name}</p>
            <p className="text-xs text-gray-400">إتمام الطلب</p>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-6">
        <CheckoutForm
          store={store as any}
          product={product as any}
          wilayas={wilayas ?? []}
          initialQty={parseInt(searchParams.qty ?? '1')}
          initialVariant={searchParams.variant ?? 'default'}
        />
      </main>
    </div>
  )
}
