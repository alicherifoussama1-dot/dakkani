export const dynamic = 'force-dynamic'

import { createPublicClient } from '@/lib/supabase/public'
import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import StorefrontLayout from '@/components/storefront/StorefrontLayout'
import WhatsAppFloat    from '@/components/storefront/WhatsAppFloat'
import TrackOrderClient from '@/components/storefront/TrackOrderClient'

interface Props { params: { storeSlug: string } }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { data: store } = await createPublicClient().from('stores').select('name').eq('slug', params.storeSlug).maybeSingle()
  return { title: `تتبع طلبي | ${store?.name ?? params.storeSlug}`, robots: { index: false } }
}

export default async function TrackPage({ params }: Props) {
  const supabase = createPublicClient()
  const { data: store } = await supabase.from('stores').select('*, store_settings(*)').eq('slug', params.storeSlug).eq('is_active', true).single()
  if (!store) notFound()
  const phone = (store as any).whatsapp ?? store.phone

  return (
    <StorefrontLayout store={store as any}>
      <TrackOrderClient storeSlug={store.slug} storePhone={phone ?? null} />
      {phone && <WhatsAppFloat phone={phone} storeName={store.name} />}
    </StorefrontLayout>
  )
}
