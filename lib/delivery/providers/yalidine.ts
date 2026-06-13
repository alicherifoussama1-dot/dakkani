// ============================================================
// Yalidine adapter — https://api.yalidine.app/v1/
// Auth: X-API-ID + X-API-TOKEN headers. Server-side only (CORS).
// Credentials: { apiId, apiToken }
// ============================================================
import type {
  DeliveryAdapter, ProviderCredentials, CreateOrderData,
  OrderData, TrackingData, RateData, LabelData, CancelData, TestResult,
} from '../types'
import { normalizeStatus } from '../types'
import { httpJson, pool, WILAYA_CODES } from './base'

const BASE = 'https://api.yalidine.app/v1'

export class YalidineAdapter implements DeliveryAdapter {
  readonly type = 'yalidine' as const
  private headers: Record<string, string>
  private fromWilaya: number

  constructor(c: ProviderCredentials) {
    this.headers = {
      'Content-Type': 'application/json',
      'X-API-ID': c.apiId ?? '',
      'X-API-TOKEN': c.apiToken ?? '',
    }
    this.fromWilaya = parseInt(c.fromWilayaCode ?? '16', 10)
  }

  async testCredentials(): Promise<TestResult> {
    try {
      await httpJson(`${BASE}/wilayas/?page_size=1`, { headers: this.headers })
      return { ok: true, message: 'تم التحقق من بيانات Yalidine بنجاح' }
    } catch (e) {
      return { ok: false, message: `فشل التحقق: ${(e as Error).message}` }
    }
  }

  async createShipment(o: CreateOrderData): Promise<OrderData> {
    const parts = o.customerName.trim().split(/\s+/)
    const payload = [{
      order_id: o.orderNumber,
      firstname: parts[0] ?? o.customerName,
      familyname: parts.slice(1).join(' ') || '-',
      contact_phone: o.phone,
      address: o.address ?? o.communeName,
      from_wilaya_name: undefined,
      to_wilaya_id: parseInt(o.wilayaCode, 10),
      to_commune_id: o.communeId,
      to_commune_name: o.communeName,
      product_list: o.productList,
      price: o.codAmount,
      do_insurance: false,
      declared_value: o.codAmount,
      freeshipping: o.codAmount === 0,
      is_stopdesk: o.deliveryType === 'stopdesk',
      stopdesk_id: o.stopdeskId ? parseInt(o.stopdeskId, 10) : undefined,
      has_exchange: false,
      from_wilaya_id: this.fromWilaya,
    }]
    try {
      const data = await httpJson<Record<string, any>>(`${BASE}/parcels/`, {
        method: 'POST', headers: this.headers, body: JSON.stringify(payload),
      })
      const entry = data[o.orderNumber] ?? Object.values(data)[0]
      if (!entry || entry.success === false) {
        return { success: false, error: entry?.message ?? 'تعذّر إنشاء الشحنة', raw: data }
      }
      return { success: true, trackingNumber: entry.tracking, labelUrl: entry.label, raw: data }
    } catch (e) {
      return { success: false, error: (e as Error).message }
    }
  }

  async getTracking(tracking: string): Promise<TrackingData> {
    try {
      const data = await httpJson<any>(`${BASE}/histories/${tracking}/`, { headers: this.headers })
      const events = (data.data ?? []).map((h: any) => ({
        status: h.status, description: h.reason ?? h.status,
        location: [h.commune_name, h.wilaya_name].filter(Boolean).join(', '),
        at: h.date_status ?? h.date,
      }))
      const last = events[0]?.status ?? data.last_status
      return { success: true, trackingNumber: tracking, rawStatus: last, status: normalizeStatus(last), events }
    } catch (e) {
      return { success: false, error: (e as Error).message }
    }
  }

  async cancelShipment(tracking: string): Promise<CancelData> {
    try {
      await httpJson(`${BASE}/parcels/${tracking}/`, { method: 'DELETE', headers: this.headers })
      return { success: true }
    } catch (e) {
      return { success: false, error: (e as Error).message }
    }
  }

  // Yalidine fees are per from→to wilaya. Loop all 58 destinations and take
  // the representative express_home/express_desk from the first commune.
  async importRates(fromWilayaCode?: string): Promise<RateData[]> {
    const from = parseInt(fromWilayaCode ?? String(this.fromWilaya), 10)
    const results = await pool(WILAYA_CODES, 8, async (code): Promise<RateData | null> => {
      const to = parseInt(code, 10)
      try {
        const d = await httpJson<any>(`${BASE}/fees/?from_wilaya_id=${from}&to_wilaya_id=${to}`, { headers: this.headers })
        const communes = d.per_commune ? Object.values(d.per_commune) as any[] : []
        const first = communes[0] ?? {}
        const home = Number(first.express_home ?? d.express_home ?? 0)
        const desk = Number(first.express_desk ?? d.express_desk ?? 0)
        return { wilayaCode: code, wilayaName: d.to_wilaya_name, homePrice: home, stopdeskPrice: desk }
      } catch { return null }
    })
    return results.filter((r): r is RateData => !!r && (r.homePrice > 0 || r.stopdeskPrice > 0))
  }

  async getLabel(tracking: string): Promise<LabelData> {
    try {
      const d = await httpJson<any>(`${BASE}/parcels/${tracking}/`, { headers: this.headers })
      const url = d.label ?? d.data?.label
      return url ? { success: true, url } : { success: false, error: 'لا يوجد ملصق متاح' }
    } catch (e) {
      return { success: false, error: (e as Error).message }
    }
  }
}
