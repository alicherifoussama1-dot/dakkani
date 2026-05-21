export const dynamic = 'force-dynamic'
export const metadata = { title: 'سجل الفواتير' }
import Link from 'next/link'
import { ArrowRight } from 'lucide-react'

export default function BillingHistoryPage() {
  return (
    <div className="p-4 md:p-6 max-w-4xl mx-auto" dir="rtl" style={{ fontFamily: 'var(--font-arabic)' }}>
      <div className="flex items-center gap-3 mb-5">
        <Link href="/dashboard/billing/plans" className="p-1.5 rounded-md hover:bg-[#F8F9FA] transition-colors">
          <ArrowRight size={16} style={{ color: 'var(--color-text-muted)' }} />
        </Link>
        <h1 className="page-title">سجل الفواتير</h1>
      </div>
      <div className="card overflow-hidden">
        <table className="data-table">
          <thead>
            <tr>
              {['رقم الفاتورة','التاريخ','المبلغ','الحالة','تحميل'].map(h => <th key={h}>{h}</th>)}
            </tr>
          </thead>
          <tbody>
            <tr>
              <td colSpan={5} className="text-center py-14 text-sm" style={{ color: 'var(--color-text-muted)' }}>
                لا توجد فواتير بعد
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  )
}
