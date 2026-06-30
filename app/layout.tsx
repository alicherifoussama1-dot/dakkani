import type { Metadata, Viewport } from 'next'
import { Inter, Tajawal, Montserrat, Cairo, Reem_Kufi, Amiri, El_Messiri } from 'next/font/google'
import './globals.css'
import ScrollProgress from '@/components/layout/ScrollProgress'

// ── Storefront theme display fonts (lazy: preload:false so non-storefront
// pages never download them; the browser fetches only when a theme applies
// the matching CSS var). See lib/product-themes.ts for the pairings. ──
const cairo     = Cairo({     subsets: ['arabic','latin'], weight: ['400','600','700','900'], variable: '--font-cairo',     display: 'swap', preload: false })
const reemKufi  = Reem_Kufi({ subsets: ['arabic','latin'], weight: ['400','500','600','700'], variable: '--font-reem',      display: 'swap', preload: false })
const amiri     = Amiri({     subsets: ['arabic','latin'], weight: ['400','700'],             variable: '--font-amiri',     display: 'swap', preload: false })
const elMessiri = El_Messiri({subsets: ['arabic','latin'], weight: ['400','500','600','700'], variable: '--font-messiri',   display: 'swap', preload: false })

const inter = Inter({
  subsets: ['latin'],
  weight: ['300','400','500','600','700','800'],
  variable: '--font-inter',
  display: 'swap',
})
const tajawal = Tajawal({
  subsets: ['arabic', 'latin'],
  weight: ['300','400','500','700','800','900'],
  variable: '--font-tajawal',
  display: 'swap',
})
// Confirmili design system — Montserrat
const montserrat = Montserrat({
  subsets: ['latin'],
  weight: ['400','500','600','700','800'],
  variable: '--font-montserrat',
  display: 'swap',
})

export const metadata: Metadata = {
  title: { default: 'دكاني | منصة التجارة الإلكترونية الجزائرية', template: '%s | دكاني' },
  description: 'أنشئ متجرك الإلكتروني الجزائري في دقائق.',
  manifest: '/manifest.json',
  icons: { icon: '/api/icons/192', apple: '/api/icons/152' },
}

export const viewport: Viewport = {
  themeColor: '#0D6EFD',
  width: 'device-width', initialScale: 1, maximumScale: 5,
  // Required for env(safe-area-inset-*) to resolve to real values on notched
  // devices (iPhone) — otherwise it's always 0 regardless of CSS usage.
  viewportFit: 'cover',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ar" dir="rtl" className={`${inter.variable} ${tajawal.variable} ${montserrat.variable} ${cairo.variable} ${reemKufi.variable} ${amiri.variable} ${elMessiri.variable}`} style={{ colorScheme: 'light' }}>
      <head>
        {/* Preconnect to Supabase storage for fast image loading (LCP) */}
        <link rel="preconnect" href="https://airbzyeircmhzhwenxqb.supabase.co" />
        <link rel="dns-prefetch" href="https://airbzyeircmhzhwenxqb.supabase.co" />
      </head>
      <body className="min-h-screen overflow-x-hidden" style={{ fontFamily: 'var(--font-primary)', backgroundColor: '#FFFFFF', color: '#212529' }}>
        <ScrollProgress />
        {children}
      </body>
    </html>
  )
}
