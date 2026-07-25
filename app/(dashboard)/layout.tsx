export const dynamic = 'force-dynamic'
import { redirect } from 'next/navigation'
import { createServerClient, getActiveStore } from '@/lib/supabase/server'
import DashboardShell from '@/components/layout/DashboardShell'
import { pickStoreHostname } from '@/lib/domains/url'
import { I18nProvider } from '@/lib/i18n/react'
import { getDashboardLocale, getAllDashboardMessages } from '@/lib/i18n/dashboard'
import { DASHBOARD_LANG_COOKIE } from '@/lib/i18n/config'
import SupportAccessBanner from '@/components/platform/SupportAccessBanner'
import { Toaster } from '@/lib/ui/toast'

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const supabase = createServerClient()
  const { data: { user }, error } = await supabase.auth.getUser()

  if (error || !user) redirect('/login')

  const { activeStore: store, allStores } = await getActiveStore(supabase, user.id)

  if (!store) redirect('/onboarding')

  // Fetch new orders count for notification badge + the store's public hostname
  // (custom domain when active) in one parallel batch — no extra serial latency.
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const [{ count: newOrdersToday }, { data: domains }] = await Promise.all([
    supabase
      .from('orders')
      .select('id', { count: 'exact', head: true })
      .eq('store_id', store.id)
      .eq('status', 'new')
      .gte('created_at', today.toISOString()),
    supabase.from('domains').select('id,hostname,status,is_default').eq('store_id', store.id),
  ])
  const storeHostname = pickStoreHostname((domains ?? []) as any[])

  // Dashboard locale is independent from the store language.
  const locale = getDashboardLocale()

  return (
    <I18nProvider initialLocale={locale} catalogs={getAllDashboardMessages()} cookieName={DASHBOARD_LANG_COOKIE}>
      <DashboardShell
        store={{ id: store.id, name: store.name, slug: store.slug ?? undefined, plan: store.plan ?? 'free', logo_url: store.logo_url ?? undefined, hostname: storeHostname ?? undefined }}
        user={{ name: user.email?.split('@')[0], email: user.email }}
        newOrdersCount={newOrdersToday ?? 0}
        allStores={allStores}
      >
        <SupportAccessBanner storeId={store.id} />
        {children}
      </DashboardShell>
      <Toaster />
    </I18nProvider>
  )
}
