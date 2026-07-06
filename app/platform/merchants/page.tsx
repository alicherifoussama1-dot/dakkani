// Merchants — every store on the platform (platform staff only).
export const dynamic = 'force-dynamic'
import { redirect } from 'next/navigation'
import { requirePlatformPermission } from '@/lib/platform/rbac'
import { createServiceClient } from '@/lib/platform/service-client'

export default async function MerchantsPage() {
  try {
    await requirePlatformPermission('platform.stores.read')
  } catch {
    redirect('/dashboard')
  }

  const client = createServiceClient()
  const { data: stores } = await client
    .from('stores')
    .select('id, name, slug, is_active, created_at, owner_id')
    .order('created_at', { ascending: false })
    .limit(200)

  const storeIds = (stores ?? []).map(s => s.id)
  const orderCounts = new Map<string, number>()
  if (storeIds.length > 0) {
    const { data: orders } = await client
      .from('orders')
      .select('store_id')
      .in('store_id', storeIds)
      .gte('created_at', new Date(Date.now() - 30 * 86_400_000).toISOString())
    for (const o of orders ?? []) {
      orderCounts.set(o.store_id, (orderCounts.get(o.store_id) ?? 0) + 1)
    }
  }

  return (
    <div className="max-w-5xl">
      <h1 className="text-2xl font-bold mb-6">Merchants <span className="text-slate-500 text-base font-normal">({stores?.length ?? 0})</span></h1>
      <div className="rounded-xl border border-slate-800 bg-slate-900 overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-800 text-left text-slate-400">
              <th className="px-4 py-3 font-medium">Store</th>
              <th className="px-4 py-3 font-medium">Slug</th>
              <th className="px-4 py-3 font-medium">Status</th>
              <th className="px-4 py-3 font-medium">Orders (30d)</th>
              <th className="px-4 py-3 font-medium">Created</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/60">
            {(stores ?? []).map(store => (
              <tr key={store.id} className="hover:bg-slate-800/40">
                <td className="px-4 py-3 font-medium">{store.name}</td>
                <td className="px-4 py-3 text-slate-400">{store.slug}</td>
                <td className="px-4 py-3">
                  <span className={store.is_active ? 'text-emerald-400' : 'text-red-400'}>
                    {store.is_active ? 'active' : 'suspended'}
                  </span>
                </td>
                <td className="px-4 py-3">{orderCounts.get(store.id) ?? 0}</td>
                <td className="px-4 py-3 text-slate-400">{new Date(store.created_at).toLocaleDateString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
