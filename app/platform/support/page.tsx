// Support Mode — time-boxed, audited, merchant-visible access
// to a merchant account for troubleshooting.
export const dynamic = 'force-dynamic'
import { redirect } from 'next/navigation'
import { requirePlatformPermission } from '@/lib/platform/rbac'
import { createServiceClient } from '@/lib/platform/service-client'
import SupportClient from './support-client'

export default async function SupportPage() {
  try {
    await requirePlatformPermission('platform.support.start')
  } catch {
    redirect('/dashboard')
  }

  const client = createServiceClient()
  const [{ data: sessions }, { data: stores }] = await Promise.all([
    client.from('support_sessions')
      .select('id, store_id, reason, started_at, expires_at, ended_at, stores(name, slug)')
      .order('started_at', { ascending: false })
      .limit(30),
    client.from('stores').select('id, name, slug').order('name').limit(500),
  ])

  return (
    <div className="max-w-3xl">
      <h1 className="text-2xl font-bold mb-2">Support Mode</h1>
      <p className="text-sm text-slate-400 mb-6">
        Starting a session grants <strong>read-only</strong> access to the merchant&apos;s data for 2 hours.
        Every session is audit-logged and visible to the merchant in their dashboard.
      </p>
      <SupportClient sessions={(sessions ?? []) as any[]} stores={stores ?? []} />
    </div>
  )
}
