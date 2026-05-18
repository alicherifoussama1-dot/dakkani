// ============================================================
// Chargily Pay — Algerian Payment Gateway
// CIB + Edahabia cards
// Docs: https://dev.chargily.com/
// ============================================================

const CHARGILY_API_URL = 'https://pay.chargily.net/api/v2'

export type ChargilyMode = 'CIB' | 'EDAHABIA'

export interface ChargilyCheckoutRequest {
  amount: number        // in DZD (integer)
  currency: 'dzd'
  payment_method: ChargilyMode
  success_url: string
  failure_url: string
  webhook_endpoint?: string
  name?: string
  email?: string
  phone?: string
  locale?: 'ar' | 'fr' | 'en'
  metadata?: Record<string, string>
}

export interface ChargilyCheckoutResponse {
  id: string
  checkout_url: string
  status: 'pending' | 'paid' | 'failed' | 'cancelled'
  amount: number
  currency: string
  created_at: number
}

export interface ChargilyWebhookPayload {
  id: string
  status: 'paid' | 'failed'
  amount: number
  metadata?: Record<string, string>
  payment_method: string
  created_at: number
}

export class ChargilyClient {
  private readonly headers: Record<string, string>

  constructor(secretKey: string) {
    this.headers = {
      'Content-Type': 'application/json',
      Authorization:  `Bearer ${secretKey}`,
    }
  }

  async createCheckout(data: ChargilyCheckoutRequest): Promise<ChargilyCheckoutResponse> {
    const res = await fetch(`${CHARGILY_API_URL}/checkouts`, {
      method: 'POST',
      headers: this.headers,
      body: JSON.stringify(data),
    })

    if (!res.ok) {
      const err = await res.json().catch(() => ({ message: res.statusText }))
      throw new Error(`Chargily error ${res.status}: ${err.message ?? JSON.stringify(err)}`)
    }

    return res.json()
  }

  async getCheckout(checkoutId: string): Promise<ChargilyCheckoutResponse> {
    const res = await fetch(`${CHARGILY_API_URL}/checkouts/${checkoutId}`, {
      headers: this.headers,
    })

    if (!res.ok) throw new Error(`Chargily get checkout error: ${res.status}`)
    return res.json()
  }

  verifyWebhookSignature(payload: string, signature: string, secret: string): boolean {
    // Chargily uses HMAC-SHA256 signature
    const crypto = require('crypto')
    const expected = crypto
      .createHmac('sha256', secret)
      .update(payload)
      .digest('hex')
    return expected === signature
  }
}

// ── Factory ───────────────────────────────────────────────
export function getChargilyClient(): ChargilyClient | null {
  const key = process.env.CHARGILY_SECRET_KEY
  if (!key) return null
  return new ChargilyClient(key)
}
