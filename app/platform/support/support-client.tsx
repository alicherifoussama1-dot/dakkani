'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

interface Session {
  id: string
  store_id: string
  reason: string
  started_at: string
  expires_at: string
  ended_at: string | null
  stores?: { name: string; slug: string } | null
}

interface StoreOption { id: string; name: string; slug: string }

export default function SupportClient({ sessions, stores }: { sessions: Session[]; stores: StoreOption[] }) {
  const router = useRouter()
  const [storeId, setStoreId] = useState('')
  const [reason, setReason] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function startSession(e: React.FormEvent) {
    e.preventDefault()
    if (!storeId || reason.trim().length < 5) {
      setError('Select a store and provide a reason (min 5 characters).')
      return
    }
    setBusy(true)
    setError(null)
    try {
      const res = await fetch('/api/platform/support', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ store_id: storeId, reason: reason.trim() }),
      })
      if (!res.ok) throw new Error((await res.json()).error ?? `HTTP ${res.status}`)
      setStoreId(''); setReason('')
      router.refresh()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to start session')
    } finally {
      setBusy(false)
    }
  }

  async function endSession(id: string) {
    setBusy(true)
    try {
      await fetch('/api/platform/support', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ session_id: id }),
      })
      router.refresh()
    } finally {
      setBusy(false)
    }
  }

  const isActive = (s: Session) => !s.ended_at && new Date(s.expires_at) > new Date()

  return (
    <div className="space-y-8">
      <form onSubmit={startSession} className="rounded-xl border border-slate-800 bg-slate-900 p-5 space-y-4">
        <h2 className="font-semibold">Start a support session</h2>
        {error && <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-400">{error}</div>}
        <select
          value={storeId}
          onChange={e => setStoreId(e.target.value)}
          className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm"
        >
          <option value="">Select merchant store…</option>
          {stores.map(s => <option key={s.id} value={s.id}>{s.name} ({s.slug})</option>)}
        </select>
        <input
          value={reason}
          onChange={e => setReason(e.target.value)}
          placeholder="Reason (shown to the merchant, e.g. ticket #123: checkout issue)"
          className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm"
        />
        <button
          type="submit"
          disabled={busy}
          className="rounded-lg bg-emerald-600 hover:bg-emerald-500 px-4 py-2 text-sm font-medium disabled:opacity-50"
        >
          Start session (2h, read-only, audited)
        </button>
      </form>

      <div>
        <h2 className="font-semibold mb-3">Recent sessions</h2>
        {sessions.length === 0 ? (
          <p className="text-sm text-slate-400">No support sessions yet.</p>
        ) : (
          <div className="rounded-xl border border-slate-800 bg-slate-900 divide-y divide-slate-800">
            {sessions.map(s => (
              <div key={s.id} className="flex items-center justify-between px-4 py-3 text-sm">
                <div>
                  <div className="font-medium">{s.stores?.name ?? s.store_id}</div>
                  <div className="text-xs text-slate-400">{s.reason} · started {new Date(s.started_at).toLocaleString()}</div>
                </div>
                {isActive(s) ? (
                  <button
                    onClick={() => endSession(s.id)}
                    disabled={busy}
                    className="rounded-lg border border-red-500/40 text-red-400 px-3 py-1 text-xs hover:bg-red-500/10 disabled:opacity-50"
                  >
                    End now
                  </button>
                ) : (
                  <span className="text-xs text-slate-500">{s.ended_at ? 'ended' : 'expired'}</span>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
