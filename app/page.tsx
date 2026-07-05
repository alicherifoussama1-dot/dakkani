import dynamic from 'next/dynamic'
import LandingNavbar   from '@/components/landing/Navbar'
import Hero            from '@/components/landing/Hero'
import { I18nProvider } from '@/lib/i18n/react'
import { getSiteLocale, getAllSiteMessages } from '@/lib/i18n/site'
import { SITE_LANG_COOKIE } from '@/lib/i18n/config'

// Below-the-fold — lazy loaded, SSR for SEO
const AnnouncementBar = dynamic(() => import('@/components/landing/AnnouncementBar'), { ssr: false })
const LogoBar         = dynamic(() => import('@/components/landing/LogoBar'),          { ssr: true  })
const Stats           = dynamic(() => import('@/components/landing/Stats'),             { ssr: true  })
const SocialProof     = dynamic(() => import('@/components/landing/SocialProof'),       { ssr: true  })
const Features        = dynamic(() => import('@/components/landing/Features'),          { ssr: true  })
const HowItWorks      = dynamic(() => import('@/components/landing/HowItWorks'),        { ssr: true  })
const Showcase        = dynamic(() => import('@/components/landing/Showcase'),          { ssr: true  })
const Testimonials    = dynamic(() => import('@/components/landing/Testimonials'),      { ssr: true  })
const Pricing         = dynamic(() => import('@/components/landing/Pricing'),           { ssr: true  })
const FAQ             = dynamic(() => import('@/components/landing/FAQ'),               { ssr: true  })
const CTABanner       = dynamic(() => import('@/components/landing/CTABanner'),         { ssr: true  })
const Footer          = dynamic(() => import('@/components/landing/Footer'),            { ssr: true  })
const FloatingCTA     = dynamic(() => import('@/components/landing/FloatingCTA'),       { ssr: false })

export default function HomePage() {
  const locale = getSiteLocale()
  return (
    <I18nProvider initialLocale={locale} catalogs={getAllSiteMessages()} cookieName={SITE_LANG_COOKIE}>
      <AnnouncementBar />
      <LandingNavbar />
      <main style={{ overflowX: 'hidden' }}>
        <Hero />
        <LogoBar />
        <Stats />
        <SocialProof />
        <Features />
        <HowItWorks />
        <Showcase />
        <Testimonials />
        <Pricing />
        <FAQ />
        <CTABanner />
      </main>
      <Footer />
      <FloatingCTA />
    </I18nProvider>
  )
}
