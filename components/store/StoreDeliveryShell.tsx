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
        <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 px-4 py-2 rounded-xl text-sm font-bold text-white shadow-lg max-w-[92vw] text-center"
          style={{ background: toast.startsWith('✓') || toast.includes('تم') ? '#0D6EFD' : '#DC3545' }}>
          {toast}
        </div>
      )}
    </div>
  )
}
