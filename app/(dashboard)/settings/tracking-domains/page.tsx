export const dynamic = 'force-dynamic'
export const metadata = { title: 'التتبع والدومينات' }

import { createServerClient, getActiveStore } from '@/lib/supabase/server'
import TrackingDomainsClient from '@/components/dashboard/TrackingDomainsClient'

export default async function TrackingDomainsPage() {
  const supabase = createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  const { activeStore: store } = await getActiveStore(supabase, user.id)
  if (!store) return null

  // Graceful if migration 025 not applied yet → empty lists + a banner.
  const [integrationsRes, domainsRes] = await Promise.all([
    supabase.from('tracking_integrations').select('*').eq('store_id', store.id).order('created_at', { ascending: true }),
    supabase.from('domains').select('*').eq('store_id', store.id).order('created_at', { ascending: true }),
  ])

  // PGRST205 = table not found → migration 025 hasn't been applied.
  const schemaReady = !(
    (integrationsRes.error && /find the table|does not exist|PGRST205/i.test(integrationsRes.error.message)) ||
    (domainsRes.error && /find the table|does not exist|PGRST205/i.test(domainsRes.error.message))
  )

  return (
    <TrackingDomainsClient
      storeId={store.id}
      storeSlug={store.slug}
      schemaReady={schemaReady}
      integrations={integrationsRes.data ?? []}
      domains={domainsRes.data ?? []}
    />
  )
}
