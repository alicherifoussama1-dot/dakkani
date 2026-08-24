export const dynamic = 'force-dynamic'

import { createPublicClient } from '@/lib/supabase/public'
import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import CheckoutForm from '@/components/storefront/CheckoutForm'
import { applyStoreDeliveryPrices } from '@/lib/delivery/pricing'
import { getProductTracking } from '@/lib/tracking/service'
import { cdnImage } from '@/lib/image-url'

interface Props {
  params: { storeSlug: string }
  searchParams: { product_id?: string; qty?: string; variant?: string }
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  return { title: `إتمام الطلب | ${params.storeSlug}` }
}

export default async function CheckoutPage({ params, searchParams }: Props) {
  const supabase = createPublicClient()

  // Load store
  const { data: store } = await supabase
    .from('stores')
    .select('id, name, name_ar, slug, logo_url, meta_pixel_id, tiktok_pixel_id, store_settings(*)')
    .eq('slug', params.storeSlug)
    .eq('is_active', true)
    .single()
  if (!store) notFound()

  // Load product if provided
  let product = null
  if (searchParams.product_id) {
    // '*' keeps this tolerant of not-yet-applied migrations (029 adds
    // abandoned_count_conversion, read by CheckoutForm for the pixel gate).
    const { data } = await supabase
      .from('products')
      .select('*')
      .eq('id', searchParams.product_id)
      .eq('store_id', store.id)
      .eq('is_active', true)
      .single()
    product = data
  }

  // Resolve the product's Meta pixel through the SAME integration system the
  // product page and order API use, so /checkout targets the correct isolated
  // pixel instead of the legacy columns. Null when no product/integration →
  // CheckoutForm falls back to the legacy columns.
  let resolvedMetaPixelId: string | null = null
  if (product) {
    const bundle = await getProductTracking(supabase, product as any, params.storeSlug)
    resolvedMetaPixelId = bundle.pixelIds.meta
  }

  // Load all 58 wilayas, then override fees with the store's declared prices
  // (service-role read so the customer sees the store's imported courier fee).
  const { data: wilayasRaw } = await supabase
    .from('wilayas')
    .select('*')
    .eq('is_active', true)
    .order('id')
  const wilayas = await applyStoreDeliveryPrices(store.id, (wilayasRaw ?? []) as any[])

  const rawSettings = (store as any).store_settings
  const settings = Array.isArray(rawSettings) ? rawSettings[0] : rawSettings
  const theme = settings?.checkout_theme ?? 'default'

  let bgClass = "bg-gray-50 text-gray-900"
  let headerClass = "bg-white shadow-sm sticky top-0 z-10"
  let headerTextClass = "text-gray-900"
  let headerSecClass = "text-gray-400"
  let logoBgClass = "bg-[#0D6EFD]"

  if (theme === 'glassmorphism') {
    bgClass = "bg-slate-950 text-slate-100 min-h-screen"
    headerClass = "bg-slate-900/80 backdrop-blur-md border-b border-slate-800/80 sticky top-0 z-10"
    headerTextClass = "text-indigo-200"
    headerSecClass = "text-slate-400"
    logoBgClass = "bg-indigo-600"
  } else if (theme === 'modern') {
    bgClass = "bg-slate-50/50 text-slate-850 min-h-screen"
    headerClass = "bg-white/80 backdrop-blur-md border-b border-slate-100 sticky top-0 z-10"
    headerTextClass = "text-slate-800"
    headerSecClass = "text-slate-400"
    logoBgClass = "bg-gradient-to-r from-amber-500 to-orange-500"
  } else if (theme === 'compact') {
    bgClass = "bg-white text-gray-900 min-h-screen"
    headerClass = "bg-gray-50 border-b border-gray-150 sticky top-0 z-10"
    headerTextClass = "text-gray-800"
    headerSecClass = "text-gray-500"
    logoBgClass = "bg-blue-650"
  }

  return (
    <div className={`min-h-screen ${bgClass}`} dir="rtl">
      {/* Header */}
      <header className={headerClass}>
        <div className="max-w-4xl mx-auto px-4 py-3 flex items-center gap-3">
          {store.logo_url ? (
            <img src={cdnImage(store.logo_url, 96)} alt={store.name} className="w-9 h-9 rounded-xl object-cover" />
          ) : (
            <div className={`w-9 h-9 rounded-xl flex items-center justify-center text-white font-black ${logoBgClass}`}>
              {store.name[0]}
            </div>
          )}
          <div>
            <p className={`font-bold ${headerTextClass}`}>{store.name_ar ?? store.name}</p>
            <p className={`text-xs ${headerSecClass}`}>إتمام الطلب</p>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-6">
        <CheckoutForm
          store={store as any}
          product={product as any}
          resolvedMetaPixelId={resolvedMetaPixelId}
          wilayas={wilayas ?? []}
          initialQty={parseInt(searchParams.qty ?? '1')}
          initialVariant={searchParams.variant ?? 'default'}
        />
      </main>
    </div>
  )
}
