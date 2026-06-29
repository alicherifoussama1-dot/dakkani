'use client'
// Standalone wrapper for the store delivery page — owns the toast so the
// module is self-contained (no Confirmili dependency).
import { useState, useCallback } from 'react'
import StoreDelivery from './StoreDelivery'

export default function StoreDeliveryShell({ storeId }: { storeId: string }) {
  const [toast, setToast] = useState('')
  const flash = useCallback((m: string) => { setToast(m); setTimeout(() => setToast(''), 2500) }, [])

  return (
    <div dir="rtl" style={{ fontFamily: 'var(--font-arabic)' }}>
      <StoreDelivery storeId={storeId} setToast={flash} />
      {toast && (
        <div className="fixed bottom-6 left-6 z-50 px-4.5 py-3 rounded-xl text-[11px] font-bold text-white shadow-xl max-w-[90vw] flex items-center gap-2.5 border border-gray-800 bg-gray-900 animate-slide-in select-none">
          <span className={`w-2 h-2 rounded-full ${toast.startsWith('✓') || toast.includes('تم') ? 'bg-green-400' : 'bg-red-400'} shrink-0 animate-pulse`} />
          <span>{toast}</span>
        </div>
      )}
    </div>
  )
}
