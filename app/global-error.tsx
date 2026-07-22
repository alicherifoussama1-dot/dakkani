'use client'

// Root error boundary — catches critical client render errors that escape all
// nested boundaries. Beacons a minimal report (message/stack/url, no PII) to the
// server, then shows a plain recovery screen. Adds ~1KB, no SDK.
import { useEffect } from 'react'

export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    try {
      const body = JSON.stringify({
        message: error?.message ?? 'client error',
        stack: error?.stack,
        digest: error?.digest,
        url: typeof window !== 'undefined' ? window.location.href : undefined,
      })
      // sendBeacon survives the navigation/crash; fall back to fetch keepalive.
      if (typeof navigator !== 'undefined' && navigator.sendBeacon) {
        navigator.sendBeacon('/api/monitoring/client-error', body)
      } else {
        fetch('/api/monitoring/client-error', { method: 'POST', body, keepalive: true }).catch(() => {})
      }
    } catch { /* never let reporting throw */ }
  }, [error])

  return (
    <html lang="ar" dir="rtl">
      <body style={{ fontFamily: 'system-ui, sans-serif', display: 'flex', minHeight: '100vh', alignItems: 'center', justifyContent: 'center', margin: 0, background: '#FAF8F5', color: '#1B1B1F' }}>
        <div style={{ textAlign: 'center', padding: 24, maxWidth: 360 }}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>⚠️</div>
          <h1 style={{ fontSize: 18, fontWeight: 800, margin: '0 0 8px' }}>حدث خطأ غير متوقع</h1>
          <p style={{ fontSize: 14, color: '#6B675E', margin: '0 0 20px' }}>حاول تحديث الصفحة، أو أعد المحاولة بعد لحظات.</p>
          <button onClick={() => reset()} style={{ background: '#2952E3', color: '#fff', border: 0, borderRadius: 12, padding: '12px 20px', fontWeight: 700, fontSize: 15, cursor: 'pointer' }}>
            إعادة المحاولة
          </button>
        </div>
      </body>
    </html>
  )
}
