// Platform Health — live status of every subsystem.
export const dynamic = 'force-dynamic'
import { requirePlatformPermission } from '@/lib/platform/rbac'
import { platformHealth } from '@/lib/platform/health'
import { redirect } from 'next/navigation'

const STATUS_STYLES: Record<string, string> = {
  up: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
  degraded: 'bg-amber-500/15 text-amber-400 border-amber-500/30',
  down: 'bg-red-500/15 text-red-400 border-red-500/30',
  unconfigured: 'bg-slate-500/15 text-slate-400 border-slate-500/30',
}

export default async function PlatformHealthPage() {
  try {
    await requirePlatformPermission('platform.health.read')
  } catch {
    redirect('/dashboard')
  }
  const health = await platformHealth()

  return (
    <div className="max-w-4xl">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Platform Health</h1>
        <span className={`px-3 py-1 rounded-full border text-sm font-medium ${STATUS_STYLES[health.overall]}`}>
          {health.overall.toUpperCase()}
        </span>
      </div>

      <div className="grid grid-cols-2 gap-4">
        {health.checks.map(check => (
          <div key={check.name} className="rounded-xl border border-slate-800 bg-slate-900 p-4">
            <div className="flex items-center justify-between">
              <span className="font-medium capitalize">{check.name}</span>
              <span className={`px-2 py-0.5 rounded-full border text-xs ${STATUS_STYLES[check.status]}`}>
                {check.status}
              </span>
            </div>
            <div className="mt-2 text-xs text-slate-400">
              {check.latencyMs != null && <span>{check.latencyMs}ms · </span>}
              {check.detail ?? '—'}
            </div>
          </div>
        ))}
      </div>

      {Object.keys(health.circuits).length > 0 && (
        <div className="mt-8">
          <h2 className="text-lg font-semibold mb-3">Circuit Breakers</h2>
          <div className="rounded-xl border border-slate-800 bg-slate-900 divide-y divide-slate-800">
            {Object.entries(health.circuits).map(([name, c]) => (
              <div key={name} className="flex items-center justify-between px-4 py-2 text-sm">
                <span className="capitalize">{name}</span>
                <span className={c.open ? 'text-red-400' : 'text-emerald-400'}>
                  {c.open ? `OPEN (${c.failures} failures)` : 'closed'}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      <p className="mt-6 text-xs text-slate-500">Checked at {health.at}</p>
    </div>
  )
}
