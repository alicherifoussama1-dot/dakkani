import { createServerClient } from '@/lib/supabase/server'
import { formatDZD, formatDateShort } from '@/lib/utils/format'
import BlacklistButton from '@/components/dashboard/BlacklistButton'

export const dynamic = 'force-dynamic'
export const metadata = { title: 'العملاء' }

export default async function CustomersPage() {
  const supabase = createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  const { data: store } = await supabase.from('stores').select('id').eq('owner_id', user!.id).single()
  if (!store) return null

  // Aggregate customers from orders
  const { data: orders } = await supabase
    .from('orders')
    .select('customer_name, customer_phone, total, status, created_at, fraud_score, is_blacklisted')
    .eq('store_id', store.id)
    .order('created_at', { ascending: false })

  // Group by phone
  const customerMap: Record<string, {
    name: string; phone: string; orders: number;
    totalSpent: number; lastOrder: string; maxFraud: number; blacklisted: boolean
  }> = {}

  orders?.forEach(o => {
    const k = o.customer_phone
    if (!customerMap[k]) {
      customerMap[k] = { name: o.customer_name, phone: k, orders: 0, totalSpent: 0, lastOrder: o.created_at, maxFraud: 0, blacklisted: o.is_blacklisted }
    }
    customerMap[k].orders++
    if (o.status === 'delivered') customerMap[k].totalSpent += o.total
    if (o.fraud_score > customerMap[k].maxFraud) customerMap[k].maxFraud = o.fraud_score
    if (o.created_at > customerMap[k].lastOrder) customerMap[k].lastOrder = o.created_at
  })

  const customers = Object.values(customerMap).sort((a, b) => b.totalSpent - a.totalSpent)

  return (
    <div className="space-y-4 animate-fade-in">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">العملاء</h1>
        <span className="text-sm text-gray-500">{customers.length} عميل</span>
      </div>
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-100">
            <tr>
              {['العميل', 'الهاتف', 'الطلبات', 'إجمالي الإنفاق', 'تقييم الاحتيال', 'آخر طلب', 'إجراء'].map(h => (
                <th key={h} className="px-4 py-3 text-right text-xs font-semibold text-gray-500">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {customers.map(c => (
              <tr key={c.phone} className={`hover:bg-gray-50 transition ${c.blacklisted ? 'bg-red-50' : ''}`}>
                <td className="px-4 py-3 font-medium text-gray-900">
                  {c.name}
                  {c.blacklisted && <span className="ml-2 text-xs bg-red-100 text-red-600 px-1.5 py-0.5 rounded">محظور</span>}
                </td>
                <td className="px-4 py-3 text-gray-600 font-mono">{c.phone}</td>
                <td className="px-4 py-3 text-gray-900 font-semibold">{c.orders}</td>
                <td className="px-4 py-3 font-semibold text-gray-900">{formatDZD(c.totalSpent)}</td>
                <td className="px-4 py-3">
                  <span className={`font-bold ${c.maxFraud >= 70 ? 'text-red-600' : c.maxFraud >= 40 ? 'text-yellow-600' : 'text-green-600'}`}>
                    {c.maxFraud}%
                  </span>
                </td>
                <td className="px-4 py-3 text-gray-500 text-xs">{formatDateShort(c.lastOrder)}</td>
                <td className="px-4 py-3">
                  <BlacklistButton
                    storeId={store.id}
                    phone={c.phone}
                    name={c.name}
                    isBlacklisted={c.blacklisted}
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
