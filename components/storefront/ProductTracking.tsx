'use client'
// ============================================================
// ProductTracking — per-product ISOLATED pixel loader.
//
// Receives ONLY the pixel IDs resolved for THIS product
// (lib/tracking/resolve.ts). It can physically load nothing
// else, so pixels never mix between products.
//
// Fires the fixed event set — no custom events, no editor:
//   ViewContent       on mount (product page open)
//   InitiateCheckout  on window 'dakkani:ic'      (Order Now)
//   Purchase          on window 'dakkani:purchase'(order created)
//
// The order form dispatches those window events, so it needs
// zero knowledge of pixels — keeping checkout/business logic
// completely untouched.
// ============================================================
import { useEffect } from 'react'
import Script from 'next/script'
import { MetaPixel } from '@/components/pixels/MetaPixel'
import { TikTokPixel } from '@/components/pixels/TikTokPixel'

declare global {
  interface Window {
    gtag?: (...args: unknown[]) => void
    dataLayer?: unknown[]
    snaptr?: (...args: unknown[]) => void
  }
}

export interface ProductPixelIds {
  meta: string | null
  tiktok: string | null
  google: string | null
  snapchat: string | null
}

interface Props {
  pixelIds: ProductPixelIds
  product: { id: string; name: string; price: number }
  currency?: string
}

export default function ProductTracking({ pixelIds, product, currency = 'DZD' }: Props) {
  const { meta, tiktok, google, snapchat } = pixelIds
  const anyEnabled = !!(meta || tiktok || google || snapchat)

  useEffect(() => {
    if (!anyEnabled) return

    const fireViewContent = () => {
      if (meta) window.fbq?.('track', 'ViewContent', { content_ids: [product.id], content_name: product.name, content_type: 'product', value: product.price, currency })
      if (tiktok) window.ttq?.track('ViewContent', { content_id: product.id, content_name: product.name, content_type: 'product', value: product.price, currency })
      if (google) window.gtag?.('event', 'view_item', { currency, value: product.price, items: [{ item_id: product.id, item_name: product.name }] })
      if (snapchat) window.snaptr?.('track', 'VIEW_CONTENT', { item_ids: [product.id], price: product.price, currency })
    }

    const onInitiateCheckout = () => {
      if (meta) window.fbq?.('track', 'InitiateCheckout', { content_ids: [product.id], content_type: 'product', value: product.price, currency, num_items: 1 })
      if (tiktok) window.ttq?.track('InitiateCheckout', { content_id: product.id, value: product.price, currency })
      if (google) window.gtag?.('event', 'begin_checkout', { currency, value: product.price, items: [{ item_id: product.id, item_name: product.name }] })
      if (snapchat) window.snaptr?.('track', 'START_CHECKOUT', { item_ids: [product.id], price: product.price, currency })
    }

    const onPurchase = (e: Event) => {
      const detail = (e as CustomEvent).detail ?? {}
      const orderId: string = detail.orderId ?? ''
      const value: number = typeof detail.value === 'number' ? detail.value : product.price
      if (meta) window.fbq?.('track', 'Purchase', { content_ids: [product.id], content_type: 'product', value, currency, order_id: orderId })
      if (tiktok) window.ttq?.track('CompletePayment', { content_id: product.id, value, currency, order_id: orderId })
      if (google) window.gtag?.('event', 'purchase', { transaction_id: orderId, currency, value, items: [{ item_id: product.id, item_name: product.name }] })
      if (snapchat) window.snaptr?.('track', 'PURCHASE', { item_ids: [product.id], price: value, currency, transaction_id: orderId })
    }

    // ViewContent slightly deferred so SDK bootstrap (lazyOnload) has run.
    const t = setTimeout(fireViewContent, 800)
    window.addEventListener('dakkani:ic', onInitiateCheckout)
    window.addEventListener('dakkani:purchase', onPurchase)
    return () => {
      clearTimeout(t)
      window.removeEventListener('dakkani:ic', onInitiateCheckout)
      window.removeEventListener('dakkani:purchase', onPurchase)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [meta, tiktok, google, snapchat, product.id])

  if (!anyEnabled) return null

  return (
    <>
      {/* Meta + TikTok reuse the hardened bootstrap components (init + PageView). */}
      {meta && <MetaPixel pixelId={meta} />}
      {tiktok && <TikTokPixel pixelId={tiktok} />}

      {/* Google Analytics (GA4) */}
      {google && (
        <>
          <Script id={`ga4-src-${google}`} src={`https://www.googletagmanager.com/gtag/js?id=${google}`} strategy="lazyOnload" />
          <Script id={`ga4-init-${google}`} strategy="lazyOnload">{`
            window.dataLayer = window.dataLayer || [];
            function gtag(){dataLayer.push(arguments);}
            window.gtag = window.gtag || gtag;
            gtag('js', new Date());
            gtag('config', '${google}');
          `}</Script>
        </>
      )}

      {/* Snapchat Pixel */}
      {snapchat && (
        <Script id={`snap-init-${snapchat}`} strategy="lazyOnload">{`
          (function(e,t,n){if(e.snaptr)return;var a=e.snaptr=function(){a.handleRequest?a.handleRequest.apply(a,arguments):a.queue.push(arguments)};
          a.queue=[];var s='script';var r=t.createElement(s);r.async=!0;r.src=n;var u=t.getElementsByTagName(s)[0];u.parentNode.insertBefore(r,u)})(window,document,'https://sc-static.net/scevent.min.js');
          snaptr('init', '${snapchat}');
          snaptr('track', 'PAGE_VIEW');
        `}</Script>
      )}
    </>
  )
}
