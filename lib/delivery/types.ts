// ============================================================
// DAKKANI — Unified Delivery Types
// ============================================================

export type DeliveryProvider = 'yalidine' | 'zrexpress' | 'maystro'
export type DeliveryType = 'home' | 'stopdesk'

export interface DeliveryParcel {
  orderId: string
  orderNumber: string
  customerName: string
  phone: string
  phone2?: string
  address?: string
  communeId: number
  communeName: string
  wilayaId: number
  wilayaName: string
  productList: string
  codAmount: number
  isStopDesk: boolean
  stopDeskId?: string
  weight?: number
  length?: number
  width?: number
  height?: number
  hasExchange?: boolean
  declaredValue?: number
  doInsurance?: boolean
  notes?: string
  // Store info for label
  storeName: string
  storePhone?: string
}

export interface DeliveryResult {
  success: boolean
  trackingId?: string
  trackingUrl?: string
  estimatedDays?: number
  fee?: number
  error?: string
  rawResponse?: unknown
}

export interface TrackingEvent {
  status: string
  description: string
  location?: string
  timestamp: string
  isTerminal: boolean
}

export interface TrackingResult {
  success: boolean
  trackingId?: string
  currentStatus?: string
  normalizedStatus?: NormalizedStatus
  events?: TrackingEvent[]
  estimatedDelivery?: string
  error?: string
}

export type NormalizedStatus =
  | 'pending'
  | 'picked_up'
  | 'in_transit'
  | 'out_for_delivery'
  | 'with_driver'
  | 'delivered'
  | 'returned'
  | 'cancelled'
  | 'exception'

export interface DeliveryFeeResult {
  wilayaId: number
  feeHome: number
  feeStopDesk: number
  daysHome: string
  daysStopDesk: string
}

export interface UnifiedDelivery {
  provider: DeliveryProvider
  createParcel(parcel: DeliveryParcel): Promise<DeliveryResult>
  trackParcel(trackingId: string): Promise<TrackingResult>
  cancelParcel(trackingId: string): Promise<{ success: boolean; error?: string }>
  getDeliveryFees(wilayaId?: number): Promise<DeliveryFeeResult[]>
}

export interface DeliveryConfig {
  yalidine?: { apiId: string; apiToken: string; centerId?: string }
  zrexpress?: { token: string; key: string }
  maystro?: { token: string; storeId?: string }
}

// Normalized status mapping helpers
export const YALIDINE_STATUS_MAP: Record<string, NormalizedStatus> = {
  'En attente': 'pending',
  'Ramassé': 'picked_up',
  'En transit': 'in_transit',
  'Sorti en livraison': 'out_for_delivery',
  'Avec le livreur': 'with_driver',
  'Livré': 'delivered',
  'Retour en cours': 'returned',
  'Retour': 'returned',
  'Annulé': 'cancelled',
  'Tentative échouée': 'exception',
}

export const ZR_STATUS_MAP: Record<string, NormalizedStatus> = {
  '1': 'pending',
  '2': 'picked_up',
  '3': 'in_transit',
  '4': 'out_for_delivery',
  '5': 'delivered',
  '6': 'returned',
  '7': 'cancelled',
  '8': 'exception',
}

export const MAYSTRO_STATUS_MAP: Record<string, NormalizedStatus> = {
  'pending': 'pending',
  'collected': 'picked_up',
  'in_hub': 'in_transit',
  'out_for_delivery': 'out_for_delivery',
  'delivered': 'delivered',
  'returned': 'returned',
  'cancelled': 'cancelled',
  'failed_delivery': 'exception',
}

export const NORMALIZED_TO_ORDER_STATUS: Record<NormalizedStatus, string> = {
  pending: 'processing',
  picked_up: 'processing',
  in_transit: 'shipped',
  out_for_delivery: 'shipped',
  with_driver: 'shipped',
  delivered: 'delivered',
  returned: 'returned',
  cancelled: 'cancelled',
  exception: 'shipped',
}

// WhatsApp message templates
export const WHATSAPP_TEMPLATES: Record<NormalizedStatus, string | null> = {
  pending: null,
  picked_up: 'تم استلام طلبك رقم {order_number} وهو في طريقه إليك 📦',
  in_transit: 'طلبك رقم {order_number} في الطريق إليك 🚚',
  out_for_delivery: 'طلبك رقم {order_number} خرج للتوصيل اليوم، كن جاهزاً! 🎯',
  with_driver: 'السائق في طريقه إليك بطلبك رقم {order_number} 🛵',
  delivered: 'تم تسليم طلبك رقم {order_number} بنجاح ✅ شكراً لتسوقك معنا!',
  returned: 'تعذر تسليم طلبك رقم {order_number}، سيتم الاتصال بك قريباً 📞',
  cancelled: null,
  exception: 'هناك مشكلة في تسليم طلبك رقم {order_number}، سيتصل بك فريقنا 📞',
}
