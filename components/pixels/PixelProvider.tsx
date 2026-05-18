'use client'
// ============================================================
// PixelProvider — Wires browser pixels to server CAPI/Events API
// Usage: wrap product pages with <PixelProvider product={p} store={s} />
// ============================================================
import { useCallback } from 'react'
import { MetaPixel, useMetaPixel, type MetaEventName } from './MetaPixel'
import { TikTokPixel, useTikTokPixel, type TikTokEventName } from './TikTokPixel'

interface PixelIds {
  metaPixelId?: string | null
  tiktokPixelId?: string | null
}

interface UserContext {
  phone?: string
  email?: string
  firstName?: string
  lastName?: string
}

interface PixelProviderProps extends PixelIds {
  productId?: string
  productName?: string
  value?: number
  currency?: string
  eventSourceUrl?: string
  user?: UserContext
  children?: React.ReactNode
}

// ── Send server-side CAPI event ───────────────────────────
async function sendMetaCAPI(
  pixelId: string,
  eventName: MetaEventName,
  eventId: string,
  params: {
    value?: number
    currency?: string
    contentIds?: string[]
    contentName?: string
    orderId?: string
  },
  user?: UserContext
): Promise<void> {
  try {
    await fetch('/api/meta-events', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        pixelId,
        eventName,
        eventId,
        eventSourceUrl: window.location.href,
        userData: {
          phone: user?.phone,
          email: user?.email,
          firstName: user?.firstName,
          lastName: user?.lastName,
          ip: undefined, // set server-side
          userAgent: navigator.userAgent,
          fbc: document.cookie.match(/_fbc=([^;]+)/)?.[1],
          fbp: document.cookie.match(/_fbp=([^;]+)/)?.[1],
        },
        customData: {
          value: params.value,
          currency: params.currency ?? 'DZD',
          contentIds: params.contentIds,
          contentName: params.contentName,
          contentType: 'product',
          orderId: params.orderId,
        },
      }),
    })
  } catch {
    // Non-critical
  }
}

// ── Send TikTok Events API ────────────────────────────────
async function sendTikTokEvent(
  pixelId: string,
  eventName: TikTokEventName,
  eventId: string,
  params: {
    value?: number
    currency?: string
    contentId?: string
    contentName?: string
    orderId?: string
  },
  user?: UserContext
): Promise<void> {
  try {
    await fetch('/api/tiktok-events', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        pixelId,
        eventName,
        eventId,
        eventSourceUrl: window.location.href,
        userData: {
          phone: user?.phone,
          email: user?.email,
          userAgent: navigator.userAgent,
          ttclid: new URLSearchParams(window.location.search).get('ttclid') ?? undefined,
        },
        properties: {
          value: params.value,
          currency: params.currency ?? 'DZD',
          contentId: params.contentId,
          contentName: params.contentName,
          orderId: params.orderId,
        },
      }),
    })
  } catch {
    // Non-critical
  }
}

// ── Main hook ─────────────────────────────────────────────
export function usePixels({ metaPixelId, tiktokPixelId }: PixelIds) {
  const meta = useMetaPixel(metaPixelId)
  const tiktok = useTikTokPixel(tiktokPixelId)

  const trackViewContent = useCallback(
    (productId: string, productName: string, value: number, user?: UserContext) => {
      if (metaPixelId) {
        const eid = meta.trackViewContent(productId, productName, value)
        if (eid) sendMetaCAPI(metaPixelId, 'ViewContent', eid, { value, contentIds: [productId], contentName: productName }, user)
      }
      if (tiktokPixelId) {
        const eid = tiktok.trackViewContent(productId, productName, value)
        if (eid) sendTikTokEvent(tiktokPixelId, 'ViewContent', eid, { value, contentId: productId, contentName: productName }, user)
      }
    },
    [metaPixelId, tiktokPixelId, meta, tiktok]
  )

  const trackAddToCart = useCallback(
    (productId: string, productName: string, value: number, quantity = 1, user?: UserContext) => {
      if (metaPixelId) {
        const eid = meta.trackAddToCart(productId, productName, value)
        if (eid) sendMetaCAPI(metaPixelId, 'AddToCart', eid, { value, contentIds: [productId], contentName: productName }, user)
      }
      if (tiktokPixelId) {
        const eid = tiktok.trackAddToCart(productId, productName, value, quantity)
        if (eid) sendTikTokEvent(tiktokPixelId, 'AddToCart', eid, { value, contentId: productId, contentName: productName }, user)
      }
    },
    [metaPixelId, tiktokPixelId, meta, tiktok]
  )

  const trackInitiateCheckout = useCallback(
    (productIds: string[], value: number, numItems: number, user?: UserContext) => {
      if (metaPixelId) {
        const eid = meta.trackInitiateCheckout(productIds, value, numItems)
        if (eid) sendMetaCAPI(metaPixelId, 'InitiateCheckout', eid, { value, contentIds: productIds }, user)
      }
      if (tiktokPixelId) {
        const eid = tiktok.trackInitiateCheckout(value)
        if (eid) sendTikTokEvent(tiktokPixelId, 'InitiateCheckout', eid, { value }, user)
      }
    },
    [metaPixelId, tiktokPixelId, meta, tiktok]
  )

  const trackPurchase = useCallback(
    (orderId: string, productId: string, value: number, user?: UserContext) => {
      if (metaPixelId) {
        const eid = meta.trackPurchase(orderId, value, [productId])
        if (eid) sendMetaCAPI(metaPixelId, 'Purchase', eid, { value, contentIds: [productId], orderId }, user)
      }
      if (tiktokPixelId) {
        const eid = tiktok.trackCompletePayment(orderId, value)
        if (eid) sendTikTokEvent(tiktokPixelId, 'CompletePayment', eid, { value, orderId }, user)
      }
    },
    [metaPixelId, tiktokPixelId, meta, tiktok]
  )

  return { trackViewContent, trackAddToCart, trackInitiateCheckout, trackPurchase }
}

// ── Provider component ────────────────────────────────────
export function PixelProvider({
  metaPixelId,
  tiktokPixelId,
  children,
}: PixelProviderProps) {
  return (
    <>
      {metaPixelId && <MetaPixel pixelId={metaPixelId} />}
      {tiktokPixelId && <TikTokPixel pixelId={tiktokPixelId} />}
      {children}
    </>
  )
}
