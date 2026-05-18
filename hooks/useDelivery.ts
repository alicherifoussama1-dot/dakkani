'use client'
import { useState } from 'react'

interface CreateParcelResult {
  ok: boolean
  trackingId?: string
  provider?: string
  error?: string
}

export function useDelivery() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const createParcel = async (
    orderId: string,
    provider?: 'yalidine' | 'zrexpress' | 'maystro'
  ): Promise<CreateParcelResult> => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/delivery/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ order_id: orderId, provider }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error ?? 'Failed to create parcel')
        return { ok: false, error: data.error }
      }
      return { ok: true, trackingId: data.trackingId, provider: data.provider }
    } catch (err) {
      const msg = (err as Error).message
      setError(msg)
      return { ok: false, error: msg }
    } finally {
      setLoading(false)
    }
  }

  return { createParcel, loading, error }
}
