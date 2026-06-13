'use client'
// ============================================================
// Meta Pixel Component
// Dynamically loads fbq using product OR store pixel ID
// Tracks: PageView, ViewContent, AddToCart, InitiateCheckout, Purchase
// Uses event_id for deduplication with CAPI (server-side)
// ============================================================
import { useEffect, useCallback, useRef } from 'react'
import Script from 'next/script'

declare global {
  interface Window {
    fbq?: (...args: unknown[]) => void
    _fbq?: unknown
  }
}

export type MetaEventName =
  | 'PageView'
  | 'ViewContent'
  | 'AddToCart'
  | 'InitiateCheckout'
  | 'Purchase'
  | 'Lead'
  | 'CompleteRegistration'

export interface MetaEventParams {
  content_ids?: string[]
  content_name?: string
  content_type?: string
  content_category?: string
  value?: number
  currency?: string
  num_items?: number
  order_id?: string
  [key: string]: unknown
}

interface MetaPixelProps {
  pixelId: string
  // Called by parent to get an event_id for deduplication
  onEventId?: (eventId: string) => void
}

// ── Generate deterministic event ID for CAPI deduplication
function generateEventId(event: string, extra = ''): string {
  const ts = Date.now()
  const rand = Math.random().toString(36).slice(2, 8)
  return `${event}-${ts}-${rand}-${extra}`.replace(/[^a-zA-Z0-9-]/g, '-')
}

export function MetaPixel({ pixelId, onEventId }: MetaPixelProps) {
  // Bootstrap fbq synchronously on render so that window.fbq exists immediately
  if (typeof window !== 'undefined' && !window.fbq) {
    const fbq = function (...args: unknown[]) {
      if ((fbq as any).callMethod) {
        ;(fbq as any).callMethod.apply(fbq, args)
      } else {
        ;(fbq as any).queue.push(args)
      }
    } as any
    if (!window._fbq) window._fbq = fbq
    fbq.push = fbq
    fbq.loaded = true
    fbq.version = '2.0'
    fbq.queue = []
    window.fbq = fbq
  }

  // Trigger init and PageView in useEffect (they get queued)
  useEffect(() => {
    if (!pixelId) return
    window.fbq?.('init', pixelId)
    const eventId = generateEventId('PageView', pixelId)
    window.fbq?.('track', 'PageView', {}, { eventID: eventId })
    onEventId?.(eventId)
  }, [pixelId, onEventId])

  return (
    <Script
      id={`meta-pixel-${pixelId}`}
      src="https://connect.facebook.net/en_US/fbevents.js"
      strategy="lazyOnload"
    />
  )
}

// ── Hook for firing Meta events ───────────────────────────
export function useMetaPixel(pixelId: string | null | undefined) {
  const track = useCallback(
    (event: MetaEventName, params?: MetaEventParams): string => {
      if (!pixelId || !window.fbq) return ''
      const eventId = generateEventId(event, pixelId)
      window.fbq?.('track', event, params ?? {}, { eventID: eventId })
      return eventId
    },
    [pixelId]
  )

  const trackViewContent = useCallback(
    (productId: string, productName: string, value: number, currency = 'DZD') => {
      return track('ViewContent', {
        content_ids: [productId],
        content_name: productName,
        content_type: 'product',
        value,
        currency,
      })
    },
    [track]
  )

  const trackAddToCart = useCallback(
    (productId: string, productName: string, value: number, currency = 'DZD') => {
      return track('AddToCart', {
        content_ids: [productId],
        content_name: productName,
        content_type: 'product',
        value,
        currency,
      })
    },
    [track]
  )

  const trackInitiateCheckout = useCallback(
    (productIds: string[], value: number, numItems: number, currency = 'DZD') => {
      return track('InitiateCheckout', {
        content_ids: productIds,
        content_type: 'product',
        value,
        currency,
        num_items: numItems,
      })
    },
    [track]
  )

  const trackPurchase = useCallback(
    (orderId: string, value: number, productIds: string[], currency = 'DZD') => {
      return track('Purchase', {
        order_id: orderId,
        content_ids: productIds,
        content_type: 'product',
        value,
        currency,
      })
    },
    [track]
  )

  return { track, trackViewContent, trackAddToCart, trackInitiateCheckout, trackPurchase }
}

// ── Convenience component that auto-fires ViewContent ────
interface MetaViewContentProps {
  pixelId: string
  productId: string
  productName: string
  value: number
  currency?: string
  // Fires server CAPI in parallel
  serverEventCallback?: (eventId: string, event: MetaEventName) => void
}

export function MetaViewContent({
  pixelId,
  productId,
  productName,
  value,
  currency = 'DZD',
  serverEventCallback,
}: MetaViewContentProps) {
  const { trackViewContent } = useMetaPixel(pixelId)

  useEffect(() => {
    if (!pixelId) return
    const eventId = trackViewContent(productId, productName, value, currency)
    if (eventId) serverEventCallback?.(eventId, 'ViewContent')
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pixelId, productId])

  return <MetaPixel pixelId={pixelId} />
}
