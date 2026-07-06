// ============================================================
// PLATFORM ADMIN — completely separate from the merchant
// dashboard. Access requires a row in platform_users; merchants
// are redirected away. Served at /platform (admin.commerco.app
// can point here via a host rewrite later without code changes).
// ============================================================
export const dynamic = 'force-dynamic'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createServerClient } from '@/lib/supabase/server'
import { Activity, Store, ScrollText, Flag, ListTodo, LifeBuoy, ShieldCheck } from 'lucide-react'

const NAV = [
  { href: '/platform', label: 'Health', icon: Activity },
  { href: '/platform/merchants', label: 'Merchants', icon: Store },
  { href: '/platform/audit', label: 'Audit Logs', icon: ScrollText },
  { href: '/platform/flags', label: 'Feature Flags', icon: Flag },
  { href: '/platform/queue', label: 'Job Queue', icon: ListTodo },
  { href: '/platform/support', label: 'Support Mode', icon: LifeBuoy },
]

export default async function PlatformLayout({ children }: { children: React.ReactNode }) {
  const supabase = createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login?redirect=/platform')

  // RLS only lets a platform user read their own row — a merchant gets null.
  const { data: platformUser } = await supabase
    .from('platform_users')
    .select('role')
    .eq('user_id', user.id)
    .maybeSingle()
  if (!platformUser) redirect('/dashboard')

  return (
    <div className="flex h-screen bg-slate-950 text-slate-100">
      <aside className="w-60 shrink-0 border-r border-slate-800 bg-slate-900 flex flex-col">
        <div className="px-5 py-5 border-b border-slate-800 flex items-center gap-2">
          <ShieldCheck className="h-6 w-6 text-emerald-400" />
          <div>
            <div className="font-bold text-sm">Commerco Platform</div>
            <div className="text-xs text-slate-400">{platformUser.role.replace('platform_', '')} · {user.email}</div>
          </div>
        </div>
        <nav className="flex-1 p-3 space-y-1">
          {NAV.map(item => (
            <Link
              key={item.href}
              href={item.href}
              className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm text-slate-300 hover:bg-slate-800 hover:text-white transition-colors"
            >
              <item.icon className="h-4 w-4" />
              {item.label}
            </Link>
          ))}
        </nav>
        <div className="p-3 border-t border-slate-800 text-xs text-slate-500">
          Platform Admin — merchant data access is audited.
        </div>
      </aside>
      <main className="flex-1 overflow-auto p-8">{children}</main>
    </div>
  )
}
