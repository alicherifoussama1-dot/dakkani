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
    .select('id, name, slug, plan')
    .eq('owner_id', user.id)
    .single()

  if (!store) redirect('/onboarding')

  return (
    <DashboardShell
      store={{ name: store.name, slug: store.slug ?? undefined, plan: store.plan ?? 'free' }}
      user={{ name: user.email?.split('@')[0], email: user.email }}
    >
      {children}
    </DashboardShell>
  )
}
