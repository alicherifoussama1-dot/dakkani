export type Plan = 'free' | 'starter' | 'pro' | 'enterprise'
export type OrderStatus = 'new' | 'confirmed' | 'processing' | 'shipped' | 'delivered' | 'returned' | 'cancelled' | 'failed'
export type PaymentStatus = 'pending' | 'paid' | 'refunded' | 'failed'
export type PaymentMethod = 'cod' | 'baridimob' | 'ccp' | 'card'
export type DeliveryType = 'home' | 'stopdesk'
export type DeliveryDays = '24h' | '48h' | '72h'
export type WilayaZone = 1 | 2 | 3 | 4
export type CouponType = 'percentage' | 'fixed' | 'free_shipping'

export interface Store {
  id: string
  owner_id: string
  name: string
  name_ar?: string
  slug: string
  domain?: string
  logo_url?: string
  description?: string
  description_ar?: string
  phone?: string
  email?: string
  address?: string
  wilaya_id?: number
  commune_id?: number
  currency: string
  plan: Plan
  is_active: boolean
  meta_pixel_id?: string
  tiktok_pixel_id?: string
  google_tag_id?: string
  snapchat_pixel_id?: string
  whatsapp?: string
  created_at: string
  updated_at: string
}

export interface StoreSettings {
  id: string
  store_id: string
  primary_color: string
  secondary_color: string
  font_family: string
  rtl: boolean
  order_sms: boolean
  order_email: boolean
  low_stock_alert: boolean
  low_stock_threshold: number
  default_delivery_partner: string
  free_delivery_threshold?: number
  cash_on_delivery: boolean
  baridimob: boolean
  ccp: boolean
  fraud_auto_block_score: number
  max_call_attempts: number
  meta_title?: string
  meta_description?: string
  og_image_url?: string
}

export interface Wilaya {
  id: number
  code: string
  name_ar: string
  name_fr: string
  delivery_fee_home: number
  delivery_fee_stopdesk: number
  delivery_days_home: DeliveryDays
  delivery_days_stopdesk: DeliveryDays
  zone: WilayaZone
  is_active: boolean
}

export interface Commune {
  id: number
  wilaya_id: number
  name_ar: string
  name_fr: string
  post_code?: string
  is_active: boolean
}

export interface Category {
  id: string
  store_id: string
  parent_id?: string
  name: string
  name_ar?: string
  slug: string
  image_url?: string
  sort_order: number
  is_active: boolean
  created_at: string
}

export interface ProductImage {
  url: string
  alt?: string
  position: number
}

export interface ProductVariant {
  key: string
  label: string
  price?: number
  compare_price?: number
  sku?: string
  barcode?: string
  image_url?: string
}

export interface Product {
  id: string
  store_id: string
  category_id?: string
  name: string
  name_ar?: string
  slug: string
  description?: string
  description_ar?: string
  sku?: string
  barcode?: string
  price: number
  compare_price?: number
  cost_price?: number
  weight?: number
  images: ProductImage[]
  variants: ProductVariant[]
  attributes: Record<string, string[]>
  tags: string[]
  use_store_pixel: boolean
  meta_pixel_id?: string
  tiktok_pixel_id?: string
  snapchat_pixel_id?: string
  meta_title?: string
  meta_description?: string
  is_active: boolean
  is_featured: boolean
  is_digital: boolean
  sort_order: number
  created_at: string
  updated_at: string
  // Relations
  category?: Category
  stock?: WarehouseStock[]
}

export interface Warehouse {
  id: string
  store_id: string
  name: string
  name_ar?: string
  address?: string
  wilaya_id?: number
  commune_id?: number
  phone?: string
  is_default: boolean
  is_active: boolean
  created_at: string
}

export interface WarehouseStock {
  id: string
  warehouse_id: string
  product_id: string
  store_id: string
  variant_key: string
  quantity: number
  reserved: number
  low_stock_at: number
  updated_at: string
}

export interface DeliveryTimelineEntry {
  status: string
  description?: string
  location?: string
  timestamp: string
}

export interface Order {
  id: string
  store_id: string
  order_number: string
  customer_name: string
  customer_phone: string
  customer_phone2?: string
  customer_email?: string
  delivery_type: DeliveryType
  wilaya_id: number
  commune_id?: number
  address?: string
  stopdesk_code?: string
  delivery_fee: number
  delivery_partner?: string
  tracking_number?: string
  delivery_timeline: DeliveryTimelineEntry[]
  subtotal: number
  discount_amount: number
  coupon_id?: string
  coupon_code?: string
  total: number
  status: OrderStatus
  payment_status: PaymentStatus
  payment_method: PaymentMethod
  fraud_score: number
  is_blacklisted: boolean
  call_attempts: number
  last_call_at?: string
  confirmed_at?: string
  shipped_at?: string
  delivered_at?: string
  source?: string
  utm_source?: string
  utm_medium?: string
  utm_campaign?: string
  notes?: string
  internal_notes?: string
  created_at: string
  updated_at: string
  // Relations
  items?: OrderItem[]
  wilaya?: Wilaya
  commune?: Commune
}

export interface OrderItem {
  id: string
  order_id: string
  store_id: string
  product_id?: string
  product_name: string
  product_sku?: string
  variant_key: string
  variant_label?: string
  quantity: number
  unit_price: number
  cost_price?: number
  total_price: number
  image_url?: string
}

export interface Coupon {
  id: string
  store_id: string
  code: string
  type: CouponType
  value: number
  min_order_amount?: number
  max_uses?: number
  used_count: number
  per_user_limit?: number
  starts_at?: string
  expires_at?: string
  applies_to: Record<string, unknown>
  is_active: boolean
  created_at: string
}

export interface BlacklistedCustomer {
  id: string
  store_id: string
  phone?: string
  full_name?: string
  reason?: string
  added_by?: string
  created_at: string
}

export interface Review {
  id: string
  store_id: string
  product_id: string
  order_id?: string
  customer_name?: string
  customer_phone?: string
  rating: number
  comment?: string
  images: string[]
  is_verified: boolean
  is_approved: boolean
  reply?: string
  replied_at?: string
  created_at: string
}

export interface LandingPage {
  id: string
  store_id: string
  product_id?: string
  title: string
  title_ar?: string
  slug: string
  template: string
  sections: LandingPageSection[]
  seo_title?: string
  seo_desc?: string
  meta_pixel_id?: string
  tiktok_pixel_id?: string
  custom_css?: string
  custom_js?: string
  is_active: boolean
  views: number
  conversions: number
  created_at: string
  updated_at: string
}

export interface LandingPageSection {
  id: string
  type: 'hero' | 'features' | 'testimonials' | 'gallery' | 'cta' | 'video' | 'faq' | 'countdown'
  data: Record<string, unknown>
  order: number
}

export interface DashboardStats {
  total_orders: number
  total_revenue: number
  total_products: number
  pending_orders: number
  orders_today: number
  revenue_today: number
  top_products: { product_name: string; quantity: number; revenue: number }[]
  orders_by_status: { status: OrderStatus; count: number }[]
  revenue_by_day: { date: string; revenue: number; orders: number }[]
}
