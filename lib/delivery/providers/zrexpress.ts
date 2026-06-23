// ============================================================
// ZR Express adapter — two APIs, auto-detected from the pasted JSON:
//  • NEW "Token API" (api.zrexpress.app) when the merchant pastes
//    {secretKey, tenantId, …} — auth: Authorization: Bearer <secretKey>
//    (+ tenant headers). Endpoints discovered live:
//      GET  /api/v1/parcels            (list / auth check)
//      GET  /api/v1/parcels/fees       (delivery fees)
//      GET  /api/v1/parcels/tracking   (tracking)
//      POST /api/v1/parcels            (create shipment)
//  • CLASSIC Procolis (procolis.com/api_v1) when the merchant pastes
//    {token, key} — auth: token + key headers.
// ============================================================
import type {
  DeliveryAdapter, ProviderCredentials, CreateOrderData,
  OrderData, TrackingData, RateData, LabelData, CancelData, TestResult,
} from '../types'
import { normalizeStatus } from '../types'
import { httpJson, fetchRaw } from './base'

const PROCOLIS = 'https://procolis.com/api_v1'
const ZRX = 'https://api.zrexpress.app/api/v1'

function flatten(creds: Record<string, unknown>): Record<string, string> {
  const m: Record<string, string> = {}
  for (const k of Object.keys(creds ?? {})) {
    const v = (creds as any)[k]
    if (v == null || typeof v === 'object') continue
    m[k.toLowerCase().replace(/[_\s-]/g, '')] = String(v).trim()
  }
  return m
}

export class ZRExpressAdapter implements DeliveryAdapter {
  readonly type = 'zrexpress' as const
  private mode: 'zrx' | 'procolis'
  private secretKey: string
  private tenantId: string
  private procolisHeaders: Record<string, string>

  constructor(c: ProviderCredentials) {
    const m = flatten(c as Record<string, unknown>)
    this.secretKey = m.secretkey ?? m.token ?? m.apitoken ?? m.accesstoken ?? ''
    this.tenantId = m.tenantid ?? m.tenant ?? ''
    const classicKey = m.key ?? m.cle ?? m.secret ?? ''
    // {token, key} with no tenant → classic Procolis. Otherwise → new Token API.
    this.mode = (classicKey && !this.tenantId && !m.secretkey) ? 'procolis' : 'zrx'
    this.procolisHeaders = { 'Content-Type': 'application/json', token: m.token ?? this.secretKey, key: classicKey }
  }

  private workingHeaders?: Record<string, string>
  private lastDebug: TestResult['debug'] = {}

  // Auto-discover the auth scheme: try the common header schemes with the
  // stored secretKey until ZR's API stops returning 401/403. Memoized.
  private async auth(): Promise<Record<string, string> | null> {
    if (this.workingHeaders) return this.workingHeaders
    const tenant: Record<string, string> = {
      'X-Tenant-Id': this.tenantId, 'X-TenantId': this.tenantId, 'Tenant-Id': this.tenantId, 'X-Tenant': this.tenantId,
    }
    const base = { 'Content-Type': 'application/json', Accept: 'application/json', ...tenant }
    const variants: { name: string; h: Record<string, string> }[] = [
      { name: 'Bearer',        h: { Authorization: `Bearer ${this.secretKey}` } },
      { name: 'Authorization', h: { Authorization: this.secretKey } },
      { name: 'X-Api-Key',     h: { 'X-Api-Key': this.secretKey } },
      { name: 'Api-Key',       h: { 'Api-Key': this.secretKey } },
      { name: 'X-Secret-Key',  h: { 'X-Secret-Key': this.secretKey } },
      { name: 'secret-key',    h: { 'secret-key': this.secretKey } },
      { name: 'Bearer+noTenant', h: { Authorization: `Bearer ${this.secretKey}` }, },
    ]
    for (const v of variants) {
      const headers = v.name === 'Bearer+noTenant'
        ? { 'Content-Type': 'application/json', Accept: 'application/json', ...v.h }
        : { ...base, ...v.h }
      const url = `${ZRX}/parcels?page=1&perPage=1`
      const r = await fetchRaw(url, { headers })
      this.lastDebug = { url, method: 'GET', httpStatus: r.status, sentKeys: [`${v.name} (secretKey)`, 'tenantId'], response: r.text.slice(0, 300) }
      if (r.status !== 401 && r.status !== 403 && r.status < 500) {
        this.workingHeaders = headers
        return headers
      }
    }
    return null
  }

  async testCredentials(): Promise<TestResult> {
    if (this.mode === 'zrx') {
      const h = await this.auth()
      if (!h) return { ok: false, message: 'بيانات غير صحيحة — تحقق من secretKey و tenantId', debug: this.lastDebug }
      return { ok: true, message: 'تم التحقق من بيانات ZR Express بنجاح', debug: this.lastDebug }
    }
    // classic Procolis
    const url = `${PROCOLIS}/token`
    const r = await fetchRaw(url, { method: 'GET', headers: this.procolisHeaders })
    const statut = String(r.json?.Statut ?? r.json?.Retour ?? '')
    const debug: TestResult['debug'] = { url, method: 'GET', httpStatus: r.status, sentKeys: ['token', 'key'], response: r.text.slice(0, 400) }
    const invalid = /non|refus|erreur|détect|detect|S2|S3|S4/i.test(statut)
    if (!statut || invalid) return { ok: false, message: `بيانات غير صحيحة — تحقق من token و key (${statut || 'لا استجابة'})`, debug }
    return { ok: true, message: 'تم التحقق من بيانات ZR Express بنجاح', debug }
  }

  async createShipment(o: CreateOrderData): Promise<OrderData> {
    if (this.mode === 'zrx') {
      // Best-effort body for the new Token API; refined from real responses.
      const body = {
        recipient_name: o.customerName,
        recipient_phone: o.phone,
        recipient_phone_2: o.phone2 ?? '',
        recipient_address: o.address ?? o.communeName,
        wilaya_code: o.wilayaCode,
        commune: o.communeName,
        product: o.productList,
        amount: o.codAmount,
        delivery_type: o.deliveryType === 'stopdesk' ? 'stopdesk' : 'home',
        external_id: o.orderNumber,
        note: o.notes ?? '',
      }
      try {
        const h = await this.auth()
        if (!h) return { success: false, error: 'تعذّر المصادقة مع ZR Express' }
        const data = await httpJson<any>(`${ZRX}/parcels`, { method: 'POST', headers: h, body: JSON.stringify(body) })
        const tracking = data?.tracking ?? data?.data?.tracking ?? data?.id ?? data?.data?.id
        if (!tracking) return { success: false, error: data?.message ?? 'تعذّر إنشاء الشحنة', raw: data }
        return { success: true, trackingNumber: String(tracking), labelUrl: data?.label ?? data?.data?.label, raw: data }
      } catch (e) {
        return { success: false, error: (e as Error).message }
      }
    }
    const payload = { Colis: [{
      Tracking: o.orderNumber, TypeLivraison: o.deliveryType === 'stopdesk' ? '1' : '0',
      TypeColis: '0', Confrimee: '1', Client: o.customerName, MobileA: o.phone, MobileB: o.phone2 ?? '',
      Adresse: o.address ?? o.communeName, IDWilaya: o.wilayaCode, Commune: o.communeName,
      Total: String(o.codAmount), Note: o.notes ?? '', TProduit: o.productList, id_Externe: o.orderId, Source: '',
    }] }
    try {
      const data = await httpJson<any>(`${PROCOLIS}/add_colis`, { method: 'POST', headers: this.procolisHeaders, body: JSON.stringify(payload) })
      const colis = data?.Colis?.[0]
      if (!colis) return { success: false, error: data?.Retour ?? 'تعذّر إنشاء الشحنة', raw: data }
      return { success: true, trackingNumber: colis.Tracking ?? o.orderNumber, raw: data }
    } catch (e) {
      return { success: false, error: (e as Error).message }
    }
  }

  async getTracking(tracking: string): Promise<TrackingData> {
    if (this.mode === 'zrx') {
      try {
        const h = await this.auth()
        if (!h) return { success: false, error: 'تعذّر المصادقة مع ZR Express' }
        const data = await httpJson<any>(`${ZRX}/parcels/tracking?tracking=${encodeURIComponent(tracking)}`, { headers: h })
        const info = data?.data ?? data
        const raw = info?.status ?? info?.situation ?? info?.[0]?.status
        return { success: true, trackingNumber: tracking, rawStatus: String(raw ?? ''), status: normalizeStatus(raw) }
      } catch (e) {
        return { success: false, error: (e as Error).message }
      }
    }
    try {
      const data = await httpJson<any>(`${PROCOLIS}/lire`, { method: 'POST', headers: this.procolisHeaders, body: JSON.stringify({ Colis: [{ Tracking: tracking }] }) })
      const raw = data?.Colis?.[0]?.Situation
      return { success: true, trackingNumber: tracking, rawStatus: String(raw ?? ''), status: normalizeStatus(raw) }
    } catch (e) {
      return { success: false, error: (e as Error).message }
    }
  }

  async cancelShipment(): Promise<CancelData> {
    return { success: false, error: 'إلغاء الشحنة يتم من لوحة ZR Express' }
  }

  async importRates(): Promise<RateData[]> {
    if (this.mode === 'zrx') {
      // CONFIRMED: the new ZR "Token API" (secretKey/tenantId, api.zrexpress.app)
      // is a parcels-only API — every /parcels/<x> path resolves to
      // /parcels/{trackingNumber}, and no fees/tarification controller exists.
      // So a bulk price list cannot be imported from it. Octomatic-style auto
      // import uses the CLASSIC Procolis API (token + key), which has
      // `tarification` — that path is supported below in 'procolis' mode.
      throw new Error('واجهة ZR الجديدة (secretKey/tenantId) لا تتيح استيراد الأسعار — هي للطرود فقط. للاستيراد التلقائي: استعمل مفاتيح Procolis الكلاسيكية {"token":"...","key":"..."} من حساب ZR. أو أدخل الأسعار يدوياً في «أسعار التوصيل المعلنة» (تظهر للزبون وتُحتسب تلقائياً).')
    }
    try {
      const data = await httpJson<any>(`${PROCOLIS}/tarification`, { method: 'POST', headers: this.procolisHeaders, body: '{}' })
      const list: any[] = data?.Tarification ?? (Object.values(data ?? {}).find(v => Array.isArray(v)) as any[]) ?? []
      return list.map((w: any) => ({
        wilayaCode: String(w.IDWilaya ?? w.id ?? '').padStart(2, '0'), wilayaName: w.Wilaya,
        homePrice: Number(w.Domicile ?? w.TarifDomicile ?? 0), stopdeskPrice: Number(w.Stopdesk ?? w.Bureau ?? 0),
      })).filter(r => r.wilayaCode && r.wilayaCode !== '00')
    } catch {
      return []
    }
  }

  async getLabel(tracking: string): Promise<LabelData> {
    if (this.mode === 'zrx') return { success: true, url: `${ZRX}/parcels/${encodeURIComponent(tracking)}/label` }
    return { success: true, url: `${PROCOLIS}/bordureauTwo?Tracking=${encodeURIComponent(tracking)}` }
  }
}
