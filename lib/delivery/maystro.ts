// ============================================================
// Maystro Delivery Adapter
// Base URL: https://api.maystro-delivery.com/
// Auth: Bearer token
// ============================================================
import type {
  UnifiedDelivery, DeliveryParcel, DeliveryResult,
  TrackingResult, DeliveryFeeResult, NormalizedStatus,
} from './types'
import { MAYSTRO_STATUS_MAP } from './types'

const BASE_URL = 'https://api.maystro-delivery.com'

interface MaystroCreatePayload {
  store_id?: string
  recipient_name: string
  recipient_phone: string
  recipient_phone2?: string
  recipient_address: string
  destination_wilaya: number
  destination_commune: number
  parcel_content: string
  cod_amount: number
  is_stopdesk: boolean
  stopdesk_id?: string
  weight?: number
  order_reference: string
  special_instruction?: string
}

interface MaystroParcelResponse {
  id: string
  tracking_code: string
  estimated_delivery_days?: number
  delivery_price?: number
  error?: string
}

interface MaystroTrackResponse {
  tracking_code: string
  status: string
  history: {
    status: string
    description?: string
    location?: string
    created_at: string
  }[]
}

export class MaystroDelivery implements UnifiedDelivery {
  readonly provider = 'maystro' as const
  private readonly headers: Record<string, string>
  private readonly storeId?: string

  constructor(token: string, storeId?: string) {
    this.headers = {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    }
    this.storeId = storeId
  }

  private async fetch<T>(path: string, options?: RequestInit): Promise<T> {
    const res = await fetch(`${BASE_URL}${path}`, {
      ...options,
      headers: { ...this.headers, ...options?.headers },
    })

    if (!res.ok) {
      const text = await res.text().catch(() => res.statusText)
      throw new Error(`Maystro ${res.status}: ${text}`)
    }

    return res.json() as Promise<T>
  }

  async createParcel(parcel: DeliveryParcel): Promise<DeliveryResult> {
    const payload: MaystroCreatePayload = {
      store_id: this.storeId,
      recipient_name: parcel.customerName,
      recipient_phone: parcel.phone,
      recipient_phone2: parcel.phone2,
      recipient_address: parcel.address ?? parcel.communeName,
      destination_wilaya: parcel.wilayaId,
      destination_commune: parcel.communeId,
      parcel_content: parcel.productList,
      cod_amount: parcel.codAmount,
      is_stopdesk: parcel.isStopDesk,
      stopdesk_id: parcel.stopDeskId,
      weight: parcel.weight,
      order_reference: parcel.orderNumber,
      special_instruction: parcel.notes,
    }

    try {
      const data = await this.fetch<MaystroParcelResponse>('/api/v1/parcels/', {
        method: 'POST',
        body: JSON.stringify(payload),
      })

      if (data.error) {
        return { success: false, error: data.error }
      }

      return {
        success: true,
        trackingId: data.tracking_code ?? data.id,
        estimatedDays: data.estimated_delivery_days,
        fee: data.delivery_price,
        rawResponse: data,
      }
    } catch (err) {
      return { success: false, error: (err as Error).message }
    }
  }

  async trackParcel(trackingId: string): Promise<TrackingResult> {
    try {
      const data = await this.fetch<MaystroTrackResponse>(`/api/v1/parcels/${trackingId}/tracking/`)

      const normalizedStatus = MAYSTRO_STATUS_MAP[data.status] as NormalizedStatus | undefined

      const events = (data.history ?? []).map(h => ({
        status: h.status,
        description: h.description ?? h.status,
        location: h.location,
        timestamp: h.created_at,
        isTerminal: ['delivered', 'returned', 'cancelled'].includes(h.status),
      }))

      return {
        success: true,
        trackingId,
        currentStatus: data.status,
        normalizedStatus,
        events,
      }
    } catch (err) {
      return { success: false, error: (err as Error).message }
    }
  }

  async cancelParcel(trackingId: string): Promise<{ success: boolean; error?: string }> {
    try {
      await this.fetch(`/api/v1/parcels/${trackingId}/cancel/`, { method: 'POST' })
      return { success: true }
    } catch (err) {
      return { success: false, error: (err as Error).message }
    }
  }

  async getDeliveryFees(wilayaId?: number): Promise<DeliveryFeeResult[]> {
    try {
      const path = wilayaId
        ? `/api/v1/delivery-zones/?wilaya=${wilayaId}`
        : '/api/v1/delivery-zones/'
      const data = await this.fetch<{ results?: any[] }>(path)

      return (data.results ?? []).map((z: any) => ({
        wilayaId: z.wilaya_id ?? z.wilaya,
        feeHome: parseFloat(z.home_price ?? z.price ?? '0'),
        feeStopDesk: parseFloat(z.stopdesk_price ?? '0'),
        daysHome: z.home_delivery_days ? `${z.home_delivery_days}h` : '48h',
        daysStopDesk: z.stopdesk_delivery_days ? `${z.stopdesk_delivery_days}h` : '24h',
      }))
    } catch {
      return []
    }
  }
}
