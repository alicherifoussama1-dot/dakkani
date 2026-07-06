'use client'

import { useState } from 'react'

interface Flag {
  key: string
  enabled: boolean
  description: string | null
  config: Record<string, unknown>
  updated_at: string
}

export default function FlagsClient({ flags: initial, canWrite }: { flags: Flag[]; canWrite: boolean }) {
  const [flags, setFlags] = useState(initial)
  const [busy, setBusy] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  async function toggle(flag: Flag) {
    if (!canWrite || busy) return
    setBusy(flag.key)
    setError(null)
    const next = !flag.enabled
    try {
      const res = await fetch('/api/platform/flags', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key: flag.key, enabled: next }),
      })
      if (!res.ok) throw new Error((await res.json()).error ?? `HTTP ${res.status}`)
      setFlags(fs => fs.map(f => f.key === flag.key ? { ...f, enabled: next } : f))
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to update flag')
    } finally {
      setBusy(null)
    }
  }

  return (
    <div className="space-y-3">
      {error && <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-2 text-sm text-red-400">{error}</div>}
      {flags.map(flag => (
        <div key={flag.key} className="flex items-center justify-between rounded-xl border border-slate-800 bg-slate-900 px-4 py-3">
          <div>
            <div className="font-medium text-sm">{flag.key}</div>
            <div className="text-xs text-slate-400">{flag.description ?? '—'}</div>
          </div>
          <button
            onClick={() => toggle(flag)}
            disabled={!canWrite || busy === flag.key}
            aria-label={`Toggle ${flag.key}`}
            className={`relative h-6 w-11 rounded-full transition-colors disabled:opacity-50 ${flag.enabled ? 'bg-emerald-500' : 'bg-slate-700'}`}
          >
            <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white transition-all ${flag.enabled ? 'left-[22px]' : 'left-0.5'}`} />
          </button>
        </div>
      ))}
    </div>
  )
}
