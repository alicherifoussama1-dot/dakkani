// Audit Logs — the platform-wide action trail.
export const dynamic = 'force-dynamic'
import { redirect } from 'next/navigation'
import { requirePlatformPermission } from '@/lib/platform/rbac'
import { createServiceClient } from '@/lib/platform/service-client'

const SEVERITY_STYLES: Record<string, string> = {
  info: 'text-slate-400',
  warning: 'text-amber-400',
  critical: 'text-red-400',
}

export default async function AuditLogsPage() {
  try {
    await requirePlatformPermission('platform.audit.read')
  } catch {
    redirect('/dashboard')
  }

  const client = createServiceClient()
  const { data: logs } = await client
    .from('audit_logs')
    .select('id, action, user_email, role, store_id, ip, device, browser, resource, severity, created_at')
    .order('created_at', { ascending: false })
    .limit(100)

  return (
    <div className="max-w-6xl">
      <h1 className="text-2xl font-bold mb-6">Audit Logs</h1>
      {(!logs || logs.length === 0) ? (
        <p className="text-slate-400 text-sm">No audit entries yet. Critical actions (support sessions, flag changes, order status changes…) will appear here.</p>
      ) : (
        <div className="rounded-xl border border-slate-800 bg-slate-900 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-800 text-left text-slate-400">
                <th className="px-4 py-3 font-medium">When</th>
                <th className="px-4 py-3 font-medium">Action</th>
                <th className="px-4 py-3 font-medium">User</th>
                <th className="px-4 py-3 font-medium">Role</th>
                <th className="px-4 py-3 font-medium">Resource</th>
                <th className="px-4 py-3 font-medium">IP / Device</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {logs.map(log => (
                <tr key={log.id} className="hover:bg-slate-800/40">
                  <td className="px-4 py-2 text-slate-400 whitespace-nowrap">{new Date(log.created_at).toLocaleString()}</td>
                  <td className={`px-4 py-2 font-medium ${SEVERITY_STYLES[log.severity] ?? ''}`}>{log.action}</td>
                  <td className="px-4 py-2">{log.user_email ?? '—'}</td>
                  <td className="px-4 py-2 text-slate-400">{log.role ?? '—'}</td>
                  <td className="px-4 py-2 text-slate-400">{log.resource ?? '—'}</td>
                  <td className="px-4 py-2 text-slate-400">{log.ip ?? '—'} · {log.device ?? '—'} · {log.browser ?? '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
