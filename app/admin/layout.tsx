export const dynamic = 'force-dynamic'
import { redirect } from 'next/navigation'
import { createServerClient } from '@/lib/supabase/server'
import AdminSidebar from '@/components/admin/AdminSidebar'

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const supabase = createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: store } = await supabase
    .from('stores')
    .select('id, name, slug, logo_url, plan')
    .eq('owner_id', user.id)
    .single()
  if (!store) redirect('/dashboard')

  return (
    <div className="flex h-screen bg-gray-950 overflow-hidden" dir="rtl">
      <AdminSidebar store={store as any} />
      <div className="flex-1 flex flex-col overflow-hidden">
        <main className="flex-1 overflow-auto bg-gray-950 text-gray-100">
          {children}
        </main>
      </div>
    </div>
  )
}
