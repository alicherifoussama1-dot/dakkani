// ============================================================
// Yalidine Delivery Adapter
// Base URL: https://api.yalidine.app/v1/
// Auth: X-API-ID + X-API-TOKEN headers
// IMPORTANT: Server-side only — Yalidine CORS blocks browser requests
// ============================================================
import type {
  UnifiedDelivery, DeliveryParcel, DeliveryResult,
  TrackingResult, DeliveryFeeResult,
  NormalizedStatus,
} from './types'
import { YALIDINE_STATUS_MAP } from './types'

const BASE_URL = 'https://api.yalidine.app/v1'

interface YalidineParcelPayload {
  firstname: string
  familyname: string
  contact_phone: string
  address: string
  from_wilaya_id: number
  to_wilaya_id: number
  to_commune_id: number
  product_list: string
  price: number
  do_insurance: 0 | 1
  declared_value?: number
  weight?: number
  length?: number
  width?: number
  height?: number
  freeshipping: 0 | 1
  is_stopdesk: 0 | 1
  stopdesk_id?: string
  has_exchange: 0 | 1
  order_id: string
  notes?: string
}

interface YalidineParcelResponse {
  tracking: string
  price: number
  error?: string
  message?: string
}

interface YalidineTrackResponse {
  tracking: string
  status: string
  last_update: string
  timeline: {
    date: string
    status: string
    description?: string
    commune?: string
    wilaya?: string
  }[]
}

export class YalidineDelivery implements UnifiedDelivery {
  readonly provider = 'yalidine' as const
  private readonly headers: Record<string, string>
  private readonly fromWilayaId: number

  constructor(apiId: string, apiToken: string, fromWilayaId = 16) {
    this.headers = {
      'Content-Type': 'application/json',
      'X-API-ID': apiId,
      'X-API-TOKEN': apiToken,
    }
    this.fromWilayaId = fromWilayaId
  }

  private async fetch<T>(path: string, options?: RequestInit): Promise<T> {
    const res = await fetch(`${BASE_URL}${path}`, {
      ...options,
      headers: { ...this.headers, ...options?.headers },
    })

    if (!res.ok) {
      const text = await res.text().catch(() => res.statusText)
      throw new Error(`Yalidine ${res.status}: ${text}`)
    }

    return res.json() as Promise<T>
  }

  async createParcel(parcel: DeliveryParcel): Promise<DeliveryResult> {
    const nameParts = parcel.customerName.trim().split(' ')
    const firstname = nameParts[0] ?? parcel.customerName
    const familyname = nameParts.slice(1).join(' ') || '-'

    const payload: YalidineParcelPayload = {
      firstname,
      familyname,
      contact_phone: parcel.phone,
      address: parcel.address ?? parcel.communeName,
      from_wilaya_id: this.fromWilayaId,
      to_wilaya_id: parcel.wilayaId,
      to_commune_id: parcel.communeId,
      product_list: parcel.productList,
      price: parcel.codAmount,
      do_insurance: parcel.doInsurance ? 1 : 0,
      declared_value: parcel.declaredValue,
      weight: parcel.weight,
      length: parcel.length,
      width: parcel.width,
      height: parcel.height,
      freeshipping: parcel.codAmount === 0 ? 1 : 0,
      is_stopdesk: parcel.isStopDesk ? 1 : 0,
      stopdesk_id: parcel.stopDeskId,
      has_exchange: parcel.hasExchange ? 1 : 0,
      order_id: parcel.orderNumber,
      notes: parcel.notes,
    }

    try {
      const data = await this.fetch<YalidineParcelResponse>('/parcels/', {
        method: 'POST',
        body: JSON.stringify(payload),
      })

      if (data.error || data.message?.includes('error')) {
        return { success: false, error: data.error ?? data.message }
      }

      return {
        success: true,
        trackingId: data.tracking,
        fee: data.price,
        rawResponse: data,
      }
    } catch (err) {
      return { success: false, error: (err as Error).message }
    }
  }

  async trackParcel(trackingId: string): Promise<TrackingResult> {
    try {
      const data = await this.fetch<YalidineTrackResponse>(`/parcels/${trackingId}/`)

      const normalizedStatus = YALIDINE_STATUS_MAP[data.status] as NormalizedStatus | undefined

      const events = (data.timeline ?? []).map(e => ({
        status: e.status,
        description: e.description ?? e.status,
        location: [e.commune, e.wilaya].filter(Boolean).join(', '),
        timestamp: e.date,
        isTerminal: ['Livré', 'Retour', 'Annulé'].includes(e.status),
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
      await this.fetch(`/parcels/${trackingId}/`, { method: 'DELETE' })
      return { success: true }
    } catch (err) {
      return { success: false, error: (err as Error).message }
    }
  }

  async getDeliveryFees(wilayaId?: number): Promise<DeliveryFeeResult[]> {
    try {
      const path = wilayaId ? `/wilayas/${wilayaId}/` : '/wilayas/?page_size=60'
      const data = await this.fetch<{ data?: any[]; id?: number; delivery_fee?: number; home_fee?: number; stopdesk_fee?: number }>(path)

      const items = Array.isArray(data) ? data : (data.data ?? [data])

      return items.map((w: any) => ({
        wilayaId: w.id,
        feeHome: w.home_fee ?? w.delivery_fee ?? 0,
        feeStopDesk: w.stopdesk_fee ?? (w.delivery_fee ? w.delivery_fee - 100 : 0),
        daysHome: w.delivery_time_parcel ?? '48h',
        daysStopDesk: w.delivery_time_stopdesk ?? '24h',
      }))
    } catch (err) {
      return []
    }
  }

  async getCommunes(wilayaId: number): Promise<{ id: number; name: string }[]> {
    try {
      const data = await this.fetch<{ data?: any[] }>(`/communes/?wilaya_id=${wilayaId}&page_size=600`)
      return (data.data ?? []).map((c: any) => ({ id: c.id, name: c.name }))
    } catch {
      return []
    }
  }
}
