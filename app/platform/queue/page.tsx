// Job Queue — async work monitor (pending / failed / dead jobs).
export const dynamic = 'force-dynamic'
import { redirect } from 'next/navigation'
import { requirePlatformPermission } from '@/lib/platform/rbac'
import { createServiceClient } from '@/lib/platform/service-client'
import { queueStats } from '@/lib/platform/queue'

export default async function QueuePage() {
  try {
    await requirePlatformPermission('platform.queue.read')
  } catch {
    redirect('/dashboard')
  }

  const stats = await queueStats()
  const client = createServiceClient()
  const { data: jobs } = await client
    .from('job_queue')
    .select('id, type, status, attempts, max_attempts, last_error, run_at, created_at, store_id')
    .in('status', ['pending', 'processing', 'failed', 'dead'])
    .order('created_at', { ascending: false })
    .limit(50)

  return (
    <div className="max-w-5xl">
      <h1 className="text-2xl font-bold mb-6">Job Queue</h1>

      <div className="grid grid-cols-4 gap-4 mb-8">
        {(['pending', 'processing', 'failed', 'dead'] as const).map(status => (
          <div key={status} className="rounded-xl border border-slate-800 bg-slate-900 p-4">
            <div className="text-xs uppercase text-slate-400">{status}</div>
            <div className={`text-2xl font-bold ${status === 'dead' && stats[status] > 0 ? 'text-red-400' : ''}`}>
              {stats[status] ?? 0}
            </div>
          </div>
        ))}
      </div>

      {(!jobs || jobs.length === 0) ? (
        <p className="text-slate-400 text-sm">Queue is empty — all jobs completed.</p>
      ) : (
        <div className="rounded-xl border border-slate-800 bg-slate-900 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-800 text-left text-slate-400">
                <th className="px-4 py-3 font-medium">Type</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium">Attempts</th>
                <th className="px-4 py-3 font-medium">Next Run</th>
                <th className="px-4 py-3 font-medium">Last Error</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {jobs.map(job => (
                <tr key={job.id} className="hover:bg-slate-800/40">
                  <td className="px-4 py-2 font-medium">{job.type}</td>
                  <td className={`px-4 py-2 ${job.status === 'dead' ? 'text-red-400' : job.status === 'failed' ? 'text-amber-400' : 'text-slate-300'}`}>{job.status}</td>
                  <td className="px-4 py-2">{job.attempts}/{job.max_attempts}</td>
                  <td className="px-4 py-2 text-slate-400 whitespace-nowrap">{new Date(job.run_at).toLocaleString()}</td>
                  <td className="px-4 py-2 text-slate-400 max-w-xs truncate" title={job.last_error ?? ''}>{job.last_error ?? '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
