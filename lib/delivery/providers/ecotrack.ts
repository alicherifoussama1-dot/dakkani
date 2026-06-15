// ============================================================
// Ecotrack adapter (aggregator: DHD, Conexlog, Noest, …)
// Base: https://app.ecotrack.dz/api/v1/  · Auth: api_token in body
// Credentials: { token }. Noest reuses this adapter (same backend).
// ============================================================
import type {
  DeliveryAdapter, ProviderType, ProviderCredentials, CreateOrderData,
  OrderData, TrackingData, RateData, LabelData, CancelData, TestResult,
} from '../types'
import { normalizeStatus, resolveCreds } from '../types'
import { httpJson, fetchRaw } from './base'

const BASE = 'https://app.ecotrack.dz/api/v1'
const JSON_HEADERS = { 'Content-Type': 'application/json', Accept: 'application/json' }

export class EcotrackAdapter implements DeliveryAdapter {
  readonly type: ProviderType
  private token: string

  constructor(c: ProviderCredentials, type: ProviderType = 'ecotrack') {
    this.token = resolveCreds(type, c as Record<string, unknown>).token ?? ''
    this.type = type
  }

  async testCredentials(): Promise<TestResult> {
    const url = `${BASE}/get/fees?api_token=${encodeURIComponent(this.token)}`
    const r = await fetchRaw(url, { headers: JSON_HEADERS })
    const label = this.type === 'noest' ? 'Noest' : 'Ecotrack'
    const debug: TestResult['debug'] = {
      url: url.replace(/api_token=[^&]+/, 'api_token=••••'), method: 'GET',
      httpStatus: r.status, sentKeys: ['token'], response: r.text.slice(0, 400),
    }
    if (r.ok) return { ok: true, message: `تم التحقق من بيانات ${label} بنجاح`, debug }
    return { ok: false, message: `فشل التحقق (HTTP ${r.status}): ${r.text.slice(0, 200) || 'لا استجابة'}`, debug }
  }

  async createShipment(o: CreateOrderData): Promise<OrderData> {
    const body = {
      api_token: this.token,
      reference: o.orderNumber,
      nom_client: o.customerName,
      telephone: o.phone,
      telephone_2: o.phone2 ?? '',
      adresse: o.address ?? o.communeName,
      code_wilaya: parseInt(o.wilayaCode, 10),
      commune: o.communeName,
      montant: o.codAmount,
      produit: o.productList,
      remarque: o.notes ?? '',
      type: o.deliveryType === 'stopdesk' ? 2 : 1,
      stop_desk: o.deliveryType === 'stopdesk' ? 1 : 0,
      stock: 0, quantite: 1, poids: o.weight ?? 1,
    }
    try {
      const data = await httpJson<any>(`${BASE}/create/order`, {
        method: 'POST', headers: JSON_HEADERS, body: JSON.stringify(body),
      })
      const tracking = data?.tracking ?? data?.data?.tracking
      if (!tracking) return { success: false, error: data?.message ?? 'تعذّر إنشاء الشحنة', raw: data }
      return { success: true, trackingNumber: tracking, raw: data }
    } catch (e) {
      return { success: false, error: (e as Error).message }
    }
  }

  async getTracking(tracking: string): Promise<TrackingData> {
    try {
      const data = await httpJson<any>(`${BASE}/get/trackings/info`, {
        method: 'POST', headers: JSON_HEADERS,
        body: JSON.stringify({ api_token: this.token, trackings: [tracking] }),
      })
      const info = data?.[tracking] ?? data?.data?.[tracking] ?? {}
      const activity = info.activity ?? info.Ops ?? []
      const last = activity[0]?.event ?? info.status ?? info.last_status
      const events = (activity as any[]).map(a => ({
        status: a.event ?? a.status, description: a.event ?? '', location: a.commune ?? a.center, at: a.date ?? a.created_at,
      }))
      return { success: true, trackingNumber: tracking, rawStatus: String(last ?? ''), status: normalizeStatus(last), events }
    } catch (e) {
      return { success: false, error: (e as Error).message }
    }
  }

  async cancelShipment(tracking: string): Promise<CancelData> {
    try {
      await httpJson(`${BASE}/delete/order`, {
        method: 'POST', headers: JSON_HEADERS,
        body: JSON.stringify({ api_token: this.token, tracking }),
      })
      return { success: true }
    } catch (e) {
      return { success: false, error: (e as Error).message }
    }
  }

  async importRates(): Promise<RateData[]> {
    try {
      const data = await httpJson<any>(`${BASE}/get/fees?api_token=${encodeURIComponent(this.token)}`, { headers: JSON_HEADERS })
      const rows: any[] = Array.isArray(data) ? data : (data?.data ?? data?.fees ?? Object.values(data ?? {}))
      return rows.flatMap((w: any) => {
        const code = String(w.wilaya_id ?? w.code_wilaya ?? w.wilaya ?? '').padStart(2, '0')
        if (!code || code === '00') return []
        return [{
          wilayaCode: code, wilayaName: w.wilaya_name ?? w.nom,
          homePrice: Number(w.tarif ?? w.delivery_home ?? w.home ?? 0),
          stopdeskPrice: Number(w.tarif_stopdesk ?? w.delivery_stopdesk ?? w.stop_desk ?? w.stopdesk ?? 0),
        }]
      })
    } catch {
      return []
    }
  }

  async getLabel(tracking: string): Promise<LabelData> {
    return { success: true, url: `${BASE}/get/order/label?api_token=${encodeURIComponent(this.token)}&tracking=${encodeURIComponent(tracking)}` }
  }
}
