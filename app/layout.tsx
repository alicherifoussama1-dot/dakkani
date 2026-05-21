import type { Metadata, Viewport } from 'next'
import { Inter, Tajawal } from 'next/font/google'
import './globals.css'
import ScrollProgress from '@/components/layout/ScrollProgress'

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

export const metadata: Metadata = {
  title: { default: 'دكاني | منصة التجارة الإلكترونية الجزائرية', template: '%s | دكاني' },
  description: 'أنشئ متجرك الإلكتروني الجزائري في دقائق.',
  manifest: '/manifest.json',
  icons: { icon: '/api/icons/192', apple: '/api/icons/152' },
}

export const viewport: Viewport = {
  themeColor: '#0D6EFD',
  width: 'device-width', initialScale: 1, maximumScale: 5,
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ar" dir="rtl" className={`${inter.variable} ${tajawal.variable}`} style={{ colorScheme: 'light' }}>
      <body className="min-h-screen overflow-x-hidden" style={{ fontFamily: 'var(--font-primary)', backgroundColor: '#FFFFFF', color: '#212529' }}>
        <ScrollProgress />
        {children}
      </body>
    </html>
  )
}
