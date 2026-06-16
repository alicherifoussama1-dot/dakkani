// ============================================================
// Storefront section registry — the single source of truth for the
// store builder. Client-safe (no server imports). Mirrors the
// product-page section model (see lib/product-themes.ts) but at the
// STORE level: the home/catalog is an ordered array of sections.
// ============================================================

export type StorefrontSectionType =
  | 'announcement'   // promo bar (marquee)
  | 'hero'           // banner: image + headline + CTA
  | 'featured'       // featured products (flash-sale style)
  | 'collections'    // category / collection list
  | 'product_grid'   // the catalog grid
  | 'image_text'     // image + text block
  | 'icon_list'      // trust badges (COD / 58 wilayas / warranty)
  | 'testimonials'   // reviews
  | 'gallery'        // lifestyle image gallery
  | 'newsletter'     // email capture

export interface StoreSection {
  id: string                       // stable unique id (for dnd keys)
  type: StorefrontSectionType
  visible: boolean
  settings: Record<string, any>    // per-section content/style
}

export interface SectionMeta {
  type: StorefrontSectionType
  label: string                    // Arabic display name
  description: string
  icon: string                     // lucide icon name
  /** sections that read live store data (products/categories/reviews) */
  dataDriven: boolean
  defaults: Record<string, any>
}

export const SECTION_META: Record<StorefrontSectionType, SectionMeta> = {
  announcement: {
    type: 'announcement', label: 'شريط إعلاني', description: 'نص ترويجي متحرك أعلى المتجر',
    icon: 'Megaphone', dataDriven: false,
    defaults: { text: 'توصيل لكل ولايات الجزائر · الدفع عند الاستلام · ضمان الاسترجاع' },
  },
  hero: {
    type: 'hero', label: 'البانر الرئيسي', description: 'صورة كبيرة + عنوان + زر',
    icon: 'Image', dataDriven: false,
    defaults: { headline: '', subheadline: '', cta_label: 'تسوّق الآن', image_url: '' },
  },
  featured: {
    type: 'featured', label: 'منتجات مميزة', description: 'المنتجات المميزة بأسلوب العروض',
    icon: 'Star', dataDriven: true,
    defaults: { title: 'عروض مميزة', limit: 8 },
  },
  collections: {
    type: 'collections', label: 'الأقسام', description: 'شبكة التصنيفات / المجموعات',
    icon: 'LayoutGrid', dataDriven: true,
    defaults: { title: 'تصفّح الأقسام' },
  },
  product_grid: {
    type: 'product_grid', label: 'شبكة المنتجات', description: 'الكتالوج — شبكة المنتجات',
    icon: 'ShoppingBag', dataDriven: true,
    defaults: { title: 'الأكثر مبيعاً', subtitle: 'منتجات مختارة بعناية لك', source: 'newest', limit: 12 },
  },
  image_text: {
    type: 'image_text', label: 'صورة + نص', description: 'بلوك صورة بجانب نص',
    icon: 'Columns2', dataDriven: false,
    defaults: { title: 'لماذا نحن؟', body: '', image_url: '', reverse: false, cta_label: '', cta_href: '' },
  },
  icon_list: {
    type: 'icon_list', label: 'شارات الثقة', description: 'الدفع عند الاستلام · توصيل 58 ولاية · ضمان',
    icon: 'ShieldCheck', dataDriven: false,
    defaults: {},
  },
  testimonials: {
    type: 'testimonials', label: 'آراء العملاء', description: 'تقييمات العملاء',
    icon: 'MessageSquareQuote', dataDriven: true,
    defaults: { title: 'ماذا قال عملاؤنا' },
  },
  gallery: {
    type: 'gallery', label: 'معرض الصور', description: 'صور لايف ستايل',
    icon: 'GalleryHorizontal', dataDriven: false,
    defaults: { title: '', images: [] },
  },
  newsletter: {
    type: 'newsletter', label: 'النشرة البريدية', description: 'جمع البريد الإلكتروني',
    icon: 'Mail', dataDriven: false,
    defaults: { title: 'اشترك ليصلك كل جديد', placeholder: 'بريدك الإلكتروني', cta_label: 'اشتراك' },
  },
}

export const SECTION_TYPES = Object.keys(SECTION_META) as StorefrontSectionType[]

let _uid = 0
export function makeSectionId(type: string): string {
  _uid += 1
  return `${type}-${Date.now().toString(36)}-${_uid}`
}

/** A fresh section of a given type with its default settings. */
export function newSection(type: StorefrontSectionType): StoreSection {
  return { id: makeSectionId(type), type, visible: true, settings: { ...SECTION_META[type].defaults } }
}

/** Default storefront layout — matches the current hardcoded home page so
 *  existing stores look identical until the merchant customizes. */
export function defaultStoreLayout(): StoreSection[] {
  return (
    ['hero', 'announcement', 'featured', 'collections', 'product_grid', 'icon_list', 'testimonials'] as StorefrontSectionType[]
  ).map(newSection)
}

/** Coerce an untrusted value (from DB/AI) into a valid section array.
 *  Drops unknown types, fills missing fields, guarantees ids. */
export function normalizeLayout(raw: unknown): StoreSection[] {
  if (!Array.isArray(raw) || raw.length === 0) return defaultStoreLayout()
  const out: StoreSection[] = []
  for (const item of raw) {
    const type = (item as any)?.type as StorefrontSectionType
    if (!type || !(type in SECTION_META)) continue
    out.push({
      id: typeof (item as any).id === 'string' ? (item as any).id : makeSectionId(type),
      type,
      visible: (item as any).visible !== false,
      settings: { ...SECTION_META[type].defaults, ...((item as any).settings ?? {}) },
    })
  }
  return out.length ? out : defaultStoreLayout()
}
