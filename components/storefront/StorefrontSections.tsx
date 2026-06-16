// Server renderer: turns a store's `layout` JSON into ordered sections,
// reusing the existing storefront components. Hidden sections and
// empty data-driven sections are skipped. Unknown types are ignored.
import type { StoreSection } from '@/lib/storefront/sections'
import HeroSection from './HeroSection'
import MarqueeBar from './MarqueeBar'
import FlashSaleSection from './FlashSaleSection'
import CategoriesBento from './CategoriesBento'
import ProductsGrid from './ProductsGrid'
import TrustSection from './TrustSection'
import ReviewsSection from './ReviewsSection'
import ImageTextBlock from './sections/ImageTextBlock'
import GalleryBlock from './sections/GalleryBlock'
import NewsletterBlock from './sections/NewsletterBlock'
import { RevealSection } from '@/components/ui/animations'

export interface StorefrontData {
  featured: any[]
  categories: any[]
  products: any[]
  reviews: any[]
}

export default function StorefrontSections({
  store, layout, data,
}: { store: any; layout: StoreSection[]; data: StorefrontData }) {
  const visible = layout.filter(s => s.visible)
  return (
    <>
      {visible.map((section, i) => {
        const s = section.settings ?? {}
        let el: React.ReactNode = null
        switch (section.type) {
          case 'announcement': el = <MarqueeBar text={s.text} />; break
          case 'hero':         el = <HeroSection store={store} settings={s} />; break
          case 'featured':     el = data.featured.length > 0 ? <FlashSaleSection products={data.featured} storeSlug={store.slug} /> : null; break
          case 'collections':  el = data.categories.length > 0 ? <CategoriesBento categories={data.categories} storeSlug={store.slug} /> : null; break
          case 'product_grid': el = <ProductsGrid products={data.products} storeSlug={store.slug} title={s.title ?? 'منتجاتنا'} subtitle={s.subtitle ?? ''} dark={!!s.dark} />; break
          case 'image_text':   el = <ImageTextBlock {...s} />; break
          case 'icon_list':    el = <TrustSection />; break
          case 'testimonials': el = data.reviews.length > 0 ? <ReviewsSection reviews={data.reviews} /> : null; break
          case 'gallery':      el = <GalleryBlock title={s.title} images={s.images} />; break
          case 'newsletter':   el = <NewsletterBlock storeId={store.id} title={s.title} placeholder={s.placeholder} cta_label={s.cta_label} />; break
        }
        if (!el) return null
        // Hero + announcement are above the fold → render immediately.
        // Everything below reveals on scroll with a subtle per-section stagger.
        if (section.type === 'hero' || section.type === 'announcement') {
          return <div key={section.id}>{el}</div>
        }
        return <RevealSection key={section.id} index={i}>{el}</RevealSection>
      })}
    </>
  )
}
