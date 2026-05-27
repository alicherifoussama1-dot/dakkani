export const dynamic = 'force-dynamic'
import { redirect } from 'next/navigation'
import { createServerClient } from '@/lib/supabase/server'
import DashboardShell from '@/components/layout/DashboardShell'

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const supabase = createServerClient()
  const { data: { user }, error } = await supabase.auth.getUser()

  if (error || !user) redirect('/login')

  const { data: store } = await supabase
    .from('stores')
    .select('id, name, slug, plan, logo_url')
    .eq('owner_id', user.id)
    .single()

  if (!store) redirect('/onboarding')

  // Fetch new orders count for notification badge
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const { count: newOrdersToday } = await supabase
    .from('orders')
    .select('id', { count: 'exact', head: true })
    .eq('store_id', store.id)
    .eq('status', 'new')
    .gte('created_at', today.toISOString())

  return (
    <DashboardShell
      store={{ name: store.name, slug: store.slug ?? undefined, plan: store.plan ?? 'free', logo_url: store.logo_url ?? undefined }}
      user={{ name: user.email?.split('@')[0], email: user.email }}
      newOrdersCount={newOrdersToday ?? 0}
    >
      {children}
    </DashboardShell>
  )
}
