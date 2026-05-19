import Navbar         from '@/components/layout/Navbar'
import Footer          from '@/components/layout/Footer'
import MobileBottomNav from '@/components/layout/MobileBottomNav'
import Hero            from '@/components/sections/Hero'
import Features        from '@/components/sections/Features'
import HowItWorks      from '@/components/sections/HowItWorks'
import Categories      from '@/components/sections/Categories'
import ProductGrid     from '@/components/sections/ProductGrid'
import Testimonials    from '@/components/sections/Testimonials'
import Pricing         from '@/components/sections/Pricing'
import FAQ             from '@/components/sections/FAQ'
import CTABanner       from '@/components/sections/CTABanner'

export default function HomePage() {
  return (
    <>
      <Navbar />
      <main style={{ paddingBottom: '60px' }}>
        <Hero />
        <Features />
        <HowItWorks />
        <Categories />
        <ProductGrid />
        <Testimonials />
        <Pricing />
        <FAQ />
        <CTABanner />
      </main>
      <Footer />
      <MobileBottomNav />
    </>
  )
}
