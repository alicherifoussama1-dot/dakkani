'use client'
import { useState, useEffect } from 'react'

export default function FlashSaleTimer({ endsAt }: { endsAt?: string }) {
  const [time, setTime] = useState({ h: 0, m: 0, s: 0 })

  useEffect(() => {
    const end = endsAt
      ? new Date(endsAt)
      : (() => { const d = new Date(); d.setHours(23, 59, 59, 0); return d })()

    const tick = () => {
      const diff = Math.max(0, end.getTime() - Date.now())
      setTime({
        h: Math.floor(diff / 3600000),
        m: Math.floor((diff % 3600000) / 60000),
        s: Math.floor((diff % 60000) / 1000),
      })
    }
    tick()
    const id = setInterval(tick, 1000)
    return () => clearInterval(id)
  }, [endsAt])

  const pad = (n: number) => String(n).padStart(2, '0')

  return (
    <div className="flex items-center gap-1 bg-red-100 text-red-600 px-3 py-1.5 rounded-xl">
      <span className="text-xs font-bold">ينتهي في:</span>
      {[pad(time.h), pad(time.m), pad(time.s)].map((v, i) => (
        <span key={i} className="flex items-center gap-0.5">
          <span className="bg-red-500 text-white rounded-lg px-1.5 py-0.5 text-xs font-black font-mono">{v}</span>
          {i < 2 && <span className="text-red-400 font-bold text-xs">:</span>}
        </span>
      ))}
    </div>
  )
}
