'use client'
// Live builder preview. Loads the store's public data, then re-renders
// instantly whenever the builder posts an updated { layout, theme } via
// postMessage. Not indexed; used only inside the /store-builder iframe.
import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import StorefrontLayout from '@/components/storefront/StorefrontLayout'
import StorefrontSections, { type StorefrontData } from '@/components/storefront/StorefrontSections'
import { normalizeLayout, type StoreSection } from '@/lib/storefront/sections'

export default function StorefrontPreview() {
  const params = useParams<{ storeSlug: string }>()
  const slug = params.storeSlug
  const [store, setStore] = useState<any>(null)
  const [data, setData] = useState<StorefrontData | null>(null)
  const [layout, setLayout] = useState<StoreSection[]>([])
  const [theme, setTheme] = useState('classic')

  // 1) Load public store data once.
  useEffect(() => {
    let alive = true
    fetch(`/api/storefront/preview-data?slug=${encodeURIComponent(slug)}`)
      .then(r => r.json())
      .then(j => {
        if (!alive || !j.store) return
        setStore(j.store); setData(j.data)
        setLayout(normalizeLayout(j.store.layout))
        setTheme(j.store.theme_key ?? 'classic')
        // Tell the builder we're ready to receive live edits.
        window.parent?.postMessage({ type: 'dakkani-preview-ready' }, '*')
      })
    return () => { alive = false }
  }, [slug])

  // 2) Live updates from the builder.
  useEffect(() => {
    const onMsg = (e: MessageEvent) => {
      const m = e.data
      if (m?.type !== 'dakkani-preview') return
      if (Array.isArray(m.layout)) setLayout(normalizeLayout(m.layout))
      if (typeof m.theme === 'string') setTheme(m.theme)
    }
    window.addEventListener('message', onMsg)
    return () => window.removeEventListener('message', onMsg)
  }, [])

  if (!store || !data) {
    return <div className="min-h-screen flex items-center justify-center text-sm text-gray-400" dir="rtl">جارٍ تحميل المعاينة…</div>
  }

  return (
    <StorefrontLayout store={{ ...store, theme_key: theme }}>
      <StorefrontSections store={store} layout={layout} data={data} />
    </StorefrontLayout>
  )
}
