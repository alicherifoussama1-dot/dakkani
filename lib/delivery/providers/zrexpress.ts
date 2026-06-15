// ============================================================
// ZR Express adapter — dual mode:
//  • CLASSIC Procolis (https://procolis.com/api_v1) when the merchant
//    pastes {token, key} — auth via token+key headers.
//  • TOKEN mode when the merchant pastes a single secret (e.g.
//    {secretKey, tenantId, createdAt, expireInDays}) — routed through the
//    Ecotrack API (api_token = secretKey), which powers ZR's token panel.
// The right mode is chosen from the pasted JSON shape.
// ============================================================
import type {
  DeliveryAdapter, ProviderCredentials, CreateOrderData,
  OrderData, TrackingData, RateData, LabelData, CancelData, TestResult,
} from '../types'
import { normalizeStatus, resolveCreds } from '../types'
import { httpJson, fetchRaw } from './base'
import { EcotrackAdapter } from './ecotrack'

const BASE = 'https://procolis.com/api_v1'

export class ZRExpressAdapter implements DeliveryAdapter {
  readonly type = 'zrexpress' as const
  private headers: Record<string, string>
  private mode: 'procolis' | 'token'
  private token: string
  private key: string
  private ecotrack?: EcotrackAdapter

  constructor(c: ProviderCredentials) {
    const r = resolveCreds('zrexpress', c as Record<string, unknown>)
    this.token = r.token ?? ''
    this.key = r.key ?? ''
    this.headers = { 'Content-Type': 'application/json', token: this.token, key: this.key }
    // {token,key} → classic Procolis. Single secret (no key) → token mode.
    this.mode = this.key ? 'procolis' : 'token'
    if (this.mode === 'token') this.ecotrack = new EcotrackAdapter({ token: this.token }, 'zrexpress')
  }

  async testCredentials(): Promise<TestResult> {
    if (this.mode === 'token') {
      // Validate the secret via the Ecotrack-style endpoint, capturing debug.
      const url = `https://app.ecotrack.dz/api/v1/get/fees?api_token=${encodeURIComponent(this.token)}`
      const r = await fetchRaw(url, { headers: { Accept: 'application/json' } })
      const debug: TestResult['debug'] = { url: url.replace(/api_token=[^&]+/, 'api_token=••••'), method: 'GET', httpStatus: r.status, sentKeys: ['secretKey/token'], response: r.text.slice(0, 400) }
      if (r.ok) return { ok: true, message: 'تم التحقق من بيانات ZR Express (وضع الرمز) بنجاح', debug }
      return { ok: false, message: `فشل التحقق (HTTP ${r.status}): ${r.text.slice(0, 200) || 'لا استجابة'}`, debug }
    }
    // Classic Procolis token+key
    const url = `${BASE}/token`
    const r = await fetchRaw(url, { method: 'GET', headers: this.headers })
    const statut = String(r.json?.Statut ?? r.json?.Retour ?? r.json?.Token ?? r.text ?? '')
    const debug: TestResult['debug'] = { url, method: 'GET', httpStatus: r.status, sentKeys: ['token', 'key'], response: r.text.slice(0, 400) }
    const invalid = /non|refus|erreur|incorrect|détect|detect|introuv|S2|S3|S4/i.test(statut)
    if (!r.ok) return { ok: false, message: `فشل التحقق (HTTP ${r.status})`, debug }
    if (!statut || invalid) return { ok: false, message: `بيانات غير صحيحة — تحقق من token و key (${statut || 'لا استجابة'})`, debug }
    return { ok: true, message: 'تم التحقق من بيانات ZR Express بنجاح', debug }
  }

  async createShipment(o: CreateOrderData): Promise<OrderData> {
    if (this.mode === 'token') return this.ecotrack!.createShipment(o)
    const payload = { Colis: [{
      Tracking: o.orderNumber,
      TypeLivraison: o.deliveryType === 'stopdesk' ? '1' : '0',
      TypeColis: '0', Confrimee: '1',
      Client: o.customerName, MobileA: o.phone, MobileB: o.phone2 ?? '',
      Adresse: o.address ?? o.communeName, IDWilaya: o.wilayaCode, Commune: o.communeName,
      Total: String(o.codAmount), Note: o.notes ?? '', TProduit: o.productList,
      id_Externe: o.orderId, Source: '',
    }] }
    try {
      const data = await httpJson<any>(`${BASE}/add_colis`, { method: 'POST', headers: this.headers, body: JSON.stringify(payload) })
      if (data?.Retour && /non|refus|erreur|détect|detect|S2|S3/i.test(String(data.Retour))) {
        return { success: false, error: String(data.Retour), raw: data }
      }
      const colis = data?.Colis?.[0]
      if (!colis || (colis.MessageRetour && /erreur|error|non/i.test(colis.MessageRetour))) {
        return { success: false, error: colis?.MessageRetour ?? 'تعذّر إنشاء الشحنة', raw: data }
      }
      return { success: true, trackingNumber: colis.Tracking ?? o.orderNumber, raw: data }
    } catch (e) {
      return { success: false, error: (e as Error).message }
    }
  }

  async getTracking(tracking: string): Promise<TrackingData> {
    if (this.mode === 'token') return this.ecotrack!.getTracking(tracking)
    try {
      const data = await httpJson<any>(`${BASE}/lire`, { method: 'POST', headers: this.headers, body: JSON.stringify({ Colis: [{ Tracking: tracking }] }) })
      const colis = data?.Colis?.[0] ?? {}
      const raw = colis.Situation ?? colis.IDEtat
      return { success: true, trackingNumber: tracking, rawStatus: String(raw ?? ''), status: normalizeStatus(raw) }
    } catch (e) {
      return { success: false, error: (e as Error).message }
    }
  }

  async cancelShipment(tracking: string): Promise<CancelData> {
    if (this.mode === 'token') return this.ecotrack!.cancelShipment(tracking)
    return { success: false, error: 'إلغاء الشحنة غير مدعوم عبر API لدى ZR Express' }
  }

  async importRates(fromWilayaCode?: string): Promise<RateData[]> {
    if (this.mode === 'token') return this.ecotrack!.importRates()
    try {
      const data = await httpJson<any>(`${BASE}/tarification`, { method: 'POST', headers: this.headers, body: '{}' })
      const list: any[] = Array.isArray(data) ? data
        : (data?.Tarification ?? data?.Tarif ?? data?.wilayas ?? (Object.values(data ?? {}).find(v => Array.isArray(v)) as any[]) ?? [])
      return list.map((w: any) => ({
        wilayaCode: String(w.IDWilaya ?? w.id_wilaya ?? w.id ?? '').padStart(2, '0'),
        wilayaName: w.Wilaya ?? w.nom ?? w.name,
        homePrice: Number(w.Domicile ?? w.TarifDomicile ?? w.tarif ?? w.home ?? 0),
        stopdeskPrice: Number(w.Stopdesk ?? w.TarifStopDesk ?? w.Bureau ?? w.stopdesk ?? 0),
      })).filter(r => r.wilayaCode && r.wilayaCode !== '00' && (r.homePrice > 0 || r.stopdeskPrice > 0))
    } catch {
      return []
    }
  }

  async getLabel(tracking: string): Promise<LabelData> {
    if (this.mode === 'token') return this.ecotrack!.getLabel(tracking)
    return { success: true, url: `${BASE}/bordureauTwo?Tracking=${encodeURIComponent(tracking)}` }
  }
}
