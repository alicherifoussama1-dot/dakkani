// ============================================================
// Maystro adapter — https://backend.maystro-delivery.com/api/
// Auth: Authorization: Token <token>. Credentials: { token }
// No public rates API → importRates() returns [] (manual fallback).
// ============================================================
import type {
  DeliveryAdapter, ProviderCredentials, CreateOrderData,
  OrderData, TrackingData, RateData, LabelData, CancelData, TestResult,
} from '../types'
import { normalizeStatus } from '../types'
import { httpJson } from './base'

const BASE = 'https://backend.maystro-delivery.com/api'

export class MaystroAdapter implements DeliveryAdapter {
  readonly type = 'maystro' as const
  private headers: Record<string, string>

  constructor(c: ProviderCredentials) {
    this.headers = { 'Content-Type': 'application/json', Authorization: `Token ${c.token ?? ''}` }
  }

  async testCredentials(): Promise<TestResult> {
    try {
      await httpJson(`${BASE}/stores/`, { headers: this.headers })
      return { ok: true, message: 'تم التحقق من بيانات Maystro بنجاح' }
    } catch (e) {
      return { ok: false, message: `فشل التحقق: ${(e as Error).message}` }
    }
  }

  async createShipment(o: CreateOrderData): Promise<OrderData> {
    const body = {
      external_order_id: o.orderNumber,
      customer_name: o.customerName,
      customer_phone: o.phone,
      destination_text: o.address ?? o.communeName,
      product_price: o.codAmount,
      products: [{ product_name: o.productList, quantity: 1 }],
      wilaya: parseInt(o.wilayaCode, 10),
      commune: o.communeId,
      delivery_type: o.deliveryType === 'stopdesk' ? 2 : 1,
      note_to_driver: o.notes ?? '',
    }
    try {
      const data = await httpJson<any>(`${BASE}/stores/orders/`, {
        method: 'POST', headers: this.headers, body: JSON.stringify(body),
      })
      const tracking = data?.display_id ?? data?.tracking ?? data?.id
      if (!tracking) return { success: false, error: data?.detail ?? 'تعذّر إنشاء الشحنة', raw: data }
      return { success: true, trackingNumber: String(tracking), raw: data }
    } catch (e) {
      return { success: false, error: (e as Error).message }
    }
  }

  async getTracking(tracking: string): Promise<TrackingData> {
    try {
      const data = await httpJson<any>(`${BASE}/stores/orders/?display_id=${encodeURIComponent(tracking)}`, { headers: this.headers })
      const order = data?.results?.[0] ?? data?.[0] ?? data
      const raw = order?.status ?? order?.status_display
      return { success: true, trackingNumber: tracking, rawStatus: String(raw ?? ''), status: normalizeStatus(raw) }
    } catch (e) {
      return { success: false, error: (e as Error).message }
    }
  }

  async cancelShipment(): Promise<CancelData> {
    return { success: false, error: 'إلغاء الشحنة يتم من لوحة Maystro' }
  }

  async importRates(): Promise<RateData[]> {
    // Maystro has no public per-wilaya rates API → manual price table.
    return []
  }

  async getLabel(): Promise<LabelData> {
    return { success: false, error: 'الملصق متاح من لوحة Maystro' }
  }
}
