export const dynamic = 'force-dynamic'
import { redirect } from 'next/navigation'
import { createServerClient } from '@/lib/supabase/server'
import Sidebar from '@/components/layout/Sidebar'
import Header from '@/components/layout/Header'

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const supabase = createServerClient()
  const { data: { session } } = await supabase.auth.getSession()

  if (!session) redirect('/login')

  const { data: store } = await supabase
    .from('stores')
    .select('*, store_settings(*)')
    .eq('owner_id', session.user.id)
    .single()

  if (!store) redirect('/onboarding')

  return (
    <div className="flex h-screen bg-[#FAFAF8] overflow-hidden" dir="rtl">
      <Sidebar store={store} />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header store={store} user={session.user} />
        <main className="flex-1 overflow-auto p-6 page-enter">
          {children}
        </main>
      </div>
    </div>
  )
}
