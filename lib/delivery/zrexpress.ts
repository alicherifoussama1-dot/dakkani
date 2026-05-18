// ============================================================
// ZR Express Delivery Adapter
// Base URL: https://procolis.com/api/v1/
// Auth: token + key headers
// ============================================================
import type {
  UnifiedDelivery, DeliveryParcel, DeliveryResult,
  TrackingResult, DeliveryFeeResult, NormalizedStatus,
} from './types'
import { ZR_STATUS_MAP } from './types'

const BASE_URL = 'https://procolis.com/api/v1'

interface ZRCreatePayload {
  Colis: {
    Tracking: string
    TypeLivraison: string   // '0' = home, '1' = stopdesk
    TypeColis: string       // '0' = normal
    Confrimee: string       // '0' = unconfirmed
    Client: string
    MobileA: string
    MobileB?: string
    Adresse: string
    IDWilaya: string
    Commune: string
    Total: string
    Note?: string
    TProduit: string
    id_Externe?: string
  }[]
}

interface ZRTrackResponse {
  Tracking: string
  Situation: string
  Historique?: {
    date: string
    situation: string
    description?: string
  }[]
}

export class ZRExpressDelivery implements UnifiedDelivery {
  readonly provider = 'zrexpress' as const
  private readonly headers: Record<string, string>

  constructor(token: string, key: string) {
    this.headers = {
      'Content-Type': 'application/json',
      token,
      key,
    }
  }

  private async fetch<T>(path: string, options?: RequestInit): Promise<T> {
    const res = await fetch(`${BASE_URL}${path}`, {
      ...options,
      headers: { ...this.headers, ...options?.headers },
    })

    if (!res.ok) {
      const text = await res.text().catch(() => res.statusText)
      throw new Error(`ZR Express ${res.status}: ${text}`)
    }

    return res.json() as Promise<T>
  }

  async createParcel(parcel: DeliveryParcel): Promise<DeliveryResult> {
    const payload: ZRCreatePayload = {
      Colis: [{
        Tracking: parcel.orderNumber,
        TypeLivraison: parcel.isStopDesk ? '1' : '0',
        TypeColis: '0',
        Confrimee: '0',
        Client: parcel.customerName,
        MobileA: parcel.phone,
        MobileB: parcel.phone2,
        Adresse: parcel.address ?? parcel.communeName,
        IDWilaya: String(parcel.wilayaId).padStart(2, '0'),
        Commune: parcel.communeName,
        Total: String(parcel.codAmount),
        Note: parcel.notes,
        TProduit: parcel.productList,
        id_Externe: parcel.orderId,
      }],
    }

    try {
      const data = await this.fetch<{ Colis?: { Tracking?: string; error?: string }[] }>('/colislist', {
        method: 'POST',
        body: JSON.stringify(payload),
      })

      const colis = data.Colis?.[0]
      if (!colis || colis.error) {
        return { success: false, error: colis?.error ?? 'ZR Express: failed to create parcel' }
      }

      return {
        success: true,
        trackingId: colis.Tracking ?? parcel.orderNumber,
        rawResponse: data,
      }
    } catch (err) {
      return { success: false, error: (err as Error).message }
    }
  }

  async trackParcel(trackingId: string): Promise<TrackingResult> {
    try {
      const data = await this.fetch<ZRTrackResponse>(`/get_colis?Tracking=${trackingId}`)

      const normalizedStatus = ZR_STATUS_MAP[data.Situation] as NormalizedStatus | undefined

      const events = (data.Historique ?? []).map(h => ({
        status: h.situation,
        description: h.description ?? h.situation,
        location: undefined,
        timestamp: h.date,
        isTerminal: ['5', '6', '7'].includes(h.situation),
      }))

      return {
        success: true,
        trackingId,
        currentStatus: data.Situation,
        normalizedStatus,
        events,
      }
    } catch (err) {
      return { success: false, error: (err as Error).message }
    }
  }

  async cancelParcel(trackingId: string): Promise<{ success: boolean; error?: string }> {
    try {
      await this.fetch(`/annuler?Tracking=${trackingId}`, { method: 'POST' })
      return { success: true }
    } catch (err) {
      return { success: false, error: (err as Error).message }
    }
  }

  async getDeliveryFees(): Promise<DeliveryFeeResult[]> {
    try {
      const data = await this.fetch<{ wilayas?: any[] }>('/wilayas')
      return (data.wilayas ?? []).map((w: any) => ({
        wilayaId: parseInt(w.id ?? w.IDWilaya ?? '0'),
        feeHome: parseFloat(w.TarifDomicile ?? w.tarif ?? '0'),
        feeStopDesk: parseFloat(w.TarifBureau ?? '0'),
        daysHome: w.DelaiDomicile ?? '48h',
        daysStopDesk: w.DelaiBureau ?? '24h',
      }))
    } catch {
      return []
    }
  }
}
