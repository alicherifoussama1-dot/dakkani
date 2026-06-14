// ============================================================
// ZR Express (Procolis) adapter — https://procolis.com/api_v1/
// Auth: token + key headers. Credentials: { token, key }
// ============================================================
import type {
  DeliveryAdapter, ProviderCredentials, CreateOrderData,
  OrderData, TrackingData, RateData, LabelData, CancelData, TestResult,
} from '../types'
import { normalizeStatus } from '../types'
import { httpJson } from './base'

const BASE = 'https://procolis.com/api_v1'

export class ZRExpressAdapter implements DeliveryAdapter {
  readonly type = 'zrexpress' as const
  private headers: Record<string, string>

  constructor(c: ProviderCredentials) {
    this.headers = { 'Content-Type': 'application/json', token: c.token ?? '', key: c.key ?? '' }
  }

  async testCredentials(): Promise<TestResult> {
    try {
      // Procolis /token is GET and ALWAYS returns HTTP 200 — validity is in
      // the "Statut" field (e.g. "Accepté" vs "Clé non détectée S2").
      const data = await httpJson<any>(`${BASE}/token`, { method: 'GET', headers: this.headers })
      const statut = String(data?.Statut ?? data?.Retour ?? data?.Token ?? '')
      const invalid = /non|refus|erreur|incorrect|détect|detect|introuv|S2|S3|S4/i.test(statut)
      if (!statut || invalid) {
        return { ok: false, message: `بيانات غير صحيحة — تحقق من token و key (${statut || 'لا استجابة'})` }
      }
      return { ok: true, message: 'تم التحقق من بيانات ZR Express بنجاح' }
    } catch (e) {
      return { ok: false, message: `فشل التحقق: ${(e as Error).message}` }
    }
  }

  async createShipment(o: CreateOrderData): Promise<OrderData> {
    const payload = { Colis: [{
      Tracking: o.orderNumber,
      TypeLivraison: o.deliveryType === 'stopdesk' ? '1' : '0',
      TypeColis: '0',
      Confrimee: '1',
      Client: o.customerName,
      MobileA: o.phone,
      MobileB: o.phone2 ?? '',
      Adresse: o.address ?? o.communeName,
      IDWilaya: o.wilayaCode,
      Commune: o.communeName,
      Total: String(o.codAmount),
      Note: o.notes ?? '',
      TProduit: o.productList,
      id_Externe: o.orderId,
      Source: '',
    }] }
    try {
      const data = await httpJson<any>(`${BASE}/add_colis`, {
        method: 'POST', headers: this.headers, body: JSON.stringify(payload),
      })
      // Auth/global error comes back as a top-level { Retour: "Clé non..." }.
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
    try {
      const data = await httpJson<any>(`${BASE}/lire`, {
        method: 'POST', headers: this.headers,
        body: JSON.stringify({ Colis: [{ Tracking: tracking }] }),
      })
      const colis = data?.Colis?.[0] ?? {}
      const raw = colis.Situation ?? colis.IDEtat
      return { success: true, trackingNumber: tracking, rawStatus: String(raw ?? ''), status: normalizeStatus(raw) }
    } catch (e) {
      return { success: false, error: (e as Error).message }
    }
  }

  async cancelShipment(): Promise<CancelData> {
    // Procolis has no public cancel endpoint; merchant cancels in their panel.
    return { success: false, error: 'إلغاء الشحنة غير مدعوم عبر API لدى ZR Express' }
  }

  // Procolis /tarification (POST) → per-wilaya home/stopdesk pricing.
  // On bad creds it returns { Retour: "Clé non détectée S2" } → no array.
  async importRates(): Promise<RateData[]> {
    try {
      const data = await httpJson<any>(`${BASE}/tarification`, {
        method: 'POST', headers: this.headers, body: '{}',
      })
      // Find the tariff array wherever Procolis nests it.
      const list: any[] = Array.isArray(data) ? data
        : (data?.Tarification ?? data?.Tarif ?? data?.wilayas
           ?? (Object.values(data ?? {}).find(v => Array.isArray(v)) as any[]) ?? [])
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
    // Procolis exposes a printable label URL.
    return { success: true, url: `${BASE}/bordureauTwo?Tracking=${encodeURIComponent(tracking)}` }
  }
}
