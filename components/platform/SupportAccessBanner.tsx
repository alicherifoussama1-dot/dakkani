// Merchant-visible notice that platform support has (or recently had)
// access to this store — transparency requirement of Support Mode.
import { createServerClient } from '@/lib/supabase/server'

export default async function SupportAccessBanner({ storeId }: { storeId: string }) {
  // RLS: merchants can read support_sessions rows for their own store.
  const supabase = createServerClient()
  const since = new Date(Date.now() - 7 * 86_400_000).toISOString()
  const { data: sessions } = await supabase
    .from('support_sessions')
    .select('id, reason, started_at, expires_at, ended_at')
    .eq('store_id', storeId)
    .gte('started_at', since)
    .order('started_at', { ascending: false })
    .limit(5)

  if (!sessions || sessions.length === 0) return null

  const now = Date.now()
  const active = sessions.find(s => !s.ended_at && new Date(s.expires_at).getTime() > now)

  if (active) {
    return (
      <div className="bg-amber-500/15 border-b border-amber-500/30 px-4 py-2 text-sm text-amber-700 dark:text-amber-400">
        🛟 Commerco support is currently viewing your store (read-only) — reason: {active.reason}
      </div>
    )
  }

  const latest = sessions[0]
  return (
    <div className="bg-slate-500/10 border-b border-slate-500/20 px-4 py-2 text-xs text-slate-600 dark:text-slate-400">
      Commerco support accessed your store on {new Date(latest.started_at).toLocaleString()} — reason: {latest.reason}
    </div>
  )
}
