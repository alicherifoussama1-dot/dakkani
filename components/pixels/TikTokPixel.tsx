'use client'
// ============================================================
// TikTok Pixel Component
// Dynamically loads ttq using product OR store pixel ID
// Tracks: PageView, ViewContent, AddToCart, PlaceAnOrder, CompletePayment
// Uses event_id for deduplication with Events API
// ============================================================
import { useEffect, useCallback, useRef } from 'react'

declare global {
  interface Window {
    ttq?: TikTokPixelInstance
    TiktokAnalyticsObject?: string
  }
}

interface TikTokPixelInstance {
  page: () => void
  track: (event: string, params?: Record<string, unknown>, options?: { event_id?: string }) => void
  identify: (params: Record<string, string>) => void
  instance: (pixelId: string) => TikTokPixelInstance
  load: (pixelId: string, options?: Record<string, unknown>) => void
  _i?: Record<string, unknown>
  methods: string[]
  setAndDequeue: (instance: unknown) => void
  instances: Record<string, unknown>
}

export type TikTokEventName =
  | 'PageView'
  | 'ViewContent'
  | 'AddToCart'
  | 'InitiateCheckout'
  | 'PlaceAnOrder'
  | 'CompletePayment'
  | 'SubmitForm'
  | 'Search'

export interface TikTokEventParams {
  content_id?: string
  content_type?: string
  content_name?: string
  quantity?: number
  price?: number
  value?: number
  currency?: string
  order_id?: string
  description?: string
  [key: string]: unknown
}

function generateEventId(event: string, pixelId: string): string {
  const ts = Date.now()
  const rand = Math.random().toString(36).slice(2, 8)
  return `ttq-${event}-${ts}-${rand}-${pixelId.slice(-4)}`
}

interface TikTokPixelProps {
  pixelId: string
  onEventId?: (eventId: string) => void
}

export function TikTokPixel({ pixelId, onEventId }: TikTokPixelProps) {
  const loaded = useRef(false)

  useEffect(() => {
    if (loaded.current || !pixelId) return
    loaded.current = true

    // Bootstrap ttq
    if (!window.ttq) {
      const ttq = {
        methods: ['page', 'track', 'identify', 'instances', 'debug', 'on', 'off', 'once', 'ready', 'alias', 'group', 'enableCookie', 'disableCookie', 'holdConsent', 'revokeConsent', 'grantConsent'],
        setAndDequeue: function (i: unknown) { (ttq as any)._i = i },
        instances: {},
        _i: {},
        instance: function (pid: string) { return (ttq as any)._i[pid] },
        page: function () { },
        track: function () { },
        identify: function () { },
        load: function (pid: string) {
          const script = document.createElement('script')
          script.async = true
          script.src = 'https://analytics.tiktok.com/i18n/pixel/events.js?sdkid=' + pid + '&lib=ttq'
          document.head.appendChild(script)
        },
      } as unknown as TikTokPixelInstance

      ttq.methods.forEach(m => {
        ;(ttq as any)[m] = function (...args: unknown[]) {
          const instance = (ttq as any)._i?.[pixelId]
          if (instance) {
            instance[m]?.(...args)
          }
        }
      })

      window.ttq = ttq
    }

    window.ttq.load(pixelId)

    // Fire PageView
    const eventId = generateEventId('PageView', pixelId)
    window.ttq.page()
    onEventId?.(eventId)

    return () => {
      const scripts = document.querySelectorAll(
        `script[src*="analytics.tiktok.com"]`
      )
      scripts.forEach(s => s.remove())
    }
  }, [pixelId, onEventId])

  return null
}

// ── Hook for firing TikTok events ─────────────────────────
export function useTikTokPixel(pixelId: string | null | undefined) {
  const track = useCallback(
    (event: TikTokEventName, params?: TikTokEventParams): string => {
      if (!pixelId || !window.ttq) return ''
      const eventId = generateEventId(event, pixelId)
      window.ttq.track(event, params ?? {}, { event_id: eventId })
      return eventId
    },
    [pixelId]
  )

  const trackViewContent = useCallback(
    (productId: string, productName: string, value: number, currency = 'DZD') => {
      return track('ViewContent', {
        content_id: productId,
        content_name: productName,
        content_type: 'product',
        value,
        currency,
      })
    },
    [track]
  )

  const trackAddToCart = useCallback(
    (productId: string, productName: string, price: number, quantity = 1, currency = 'DZD') => {
      return track('AddToCart', {
        content_id: productId,
        content_name: productName,
        content_type: 'product',
        price,
        quantity,
        value: price * quantity,
        currency,
      })
    },
    [track]
  )

  const trackInitiateCheckout = useCallback(
    (value: number, currency = 'DZD') => {
      return track('InitiateCheckout', { value, currency })
    },
    [track]
  )

  const trackPlaceAnOrder = useCallback(
    (orderId: string, productId: string, value: number, currency = 'DZD') => {
      return track('PlaceAnOrder', {
        order_id: orderId,
        content_id: productId,
        content_type: 'product',
        value,
        currency,
      })
    },
    [track]
  )

  const trackCompletePayment = useCallback(
    (orderId: string, value: number, currency = 'DZD') => {
      return track('CompletePayment', {
        order_id: orderId,
        value,
        currency,
      })
    },
    [track]
  )

  return {
    track,
    trackViewContent,
    trackAddToCart,
    trackInitiateCheckout,
    trackPlaceAnOrder,
    trackCompletePayment,
  }
}

// ── Convenience component that auto-fires ViewContent ────
interface TikTokViewContentProps {
  pixelId: string
  productId: string
  productName: string
  value: number
  currency?: string
  serverEventCallback?: (eventId: string, event: TikTokEventName) => void
}

export function TikTokViewContent({
  pixelId,
  productId,
  productName,
  value,
  currency = 'DZD',
  serverEventCallback,
}: TikTokViewContentProps) {
  const { trackViewContent } = useTikTokPixel(pixelId)

  useEffect(() => {
    if (!pixelId) return
    const eventId = trackViewContent(productId, productName, value, currency)
    if (eventId) serverEventCallback?.(eventId, 'ViewContent')
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pixelId, productId])

  return <TikTokPixel pixelId={pixelId} />
}
