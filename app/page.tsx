import dynamic from 'next/dynamic'
import LandingNavbar from '@/components/landing/Navbar'
import Hero from '@/components/landing/Hero'

// Below-the-fold sections — lazy loaded for performance
const LogoBar      = dynamic(() => import('@/components/landing/LogoBar'),       { ssr: true })
const Stats        = dynamic(() => import('@/components/landing/Stats'),          { ssr: true })
const Features     = dynamic(() => import('@/components/landing/Features'),       { ssr: true })
const HowItWorks   = dynamic(() => import('@/components/landing/HowItWorks'),     { ssr: true })
const Showcase     = dynamic(() => import('@/components/landing/Showcase'),       { ssr: true })
const Testimonials = dynamic(() => import('@/components/landing/Testimonials'),   { ssr: true })
const Pricing      = dynamic(() => import('@/components/landing/Pricing'),        { ssr: true })
const FAQ          = dynamic(() => import('@/components/landing/FAQ'),            { ssr: true })
const CTABanner    = dynamic(() => import('@/components/landing/CTABanner'),      { ssr: true })
const Footer       = dynamic(() => import('@/components/landing/Footer'),         { ssr: true })

export default function HomePage() {
  return (
    <>
      <LandingNavbar />
      <main style={{ overflowX: 'hidden' }}>
        <Hero />
        <LogoBar />
        <Stats />
        <Features />
        <HowItWorks />
        <Showcase />
        <Testimonials />
        <Pricing />
        <FAQ />
        <CTABanner />
      </main>
      <Footer />
    </>
  )
}
