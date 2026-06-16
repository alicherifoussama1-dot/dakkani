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

export interface StorefrontData {
  featured: any[]
  categories: any[]
  products: any[]
  reviews: any[]
}

export default function StorefrontSections({
  store, layout, data,
}: { store: any; layout: StoreSection[]; data: StorefrontData }) {
  return (
    <>
      {layout.filter(s => s.visible).map(section => {
        const s = section.settings ?? {}
        switch (section.type) {
          case 'announcement':
            return <MarqueeBar key={section.id} text={s.text} />
          case 'hero':
            return <HeroSection key={section.id} store={store} />
          case 'featured':
            return data.featured.length > 0
              ? <FlashSaleSection key={section.id} products={data.featured} storeSlug={store.slug} />
              : null
          case 'collections':
            return data.categories.length > 0
              ? <CategoriesBento key={section.id} categories={data.categories} storeSlug={store.slug} />
              : null
          case 'product_grid':
            return (
              <ProductsGrid key={section.id} products={data.products} storeSlug={store.slug}
                title={s.title ?? 'منتجاتنا'} subtitle={s.subtitle ?? ''} dark={!!s.dark} />
            )
          case 'image_text':
            return <ImageTextBlock key={section.id} {...s} />
          case 'icon_list':
            return <TrustSection key={section.id} />
          case 'testimonials':
            return data.reviews.length > 0
              ? <ReviewsSection key={section.id} reviews={data.reviews} />
              : null
          case 'gallery':
            return <GalleryBlock key={section.id} title={s.title} images={s.images} />
          case 'newsletter':
            return <NewsletterBlock key={section.id} storeId={store.id} title={s.title} placeholder={s.placeholder} cta_label={s.cta_label} />
          default:
            return null
        }
      })}
    </>
  )
}
