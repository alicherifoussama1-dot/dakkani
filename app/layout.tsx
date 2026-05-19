import type { Metadata, Viewport } from 'next'
import { Tajawal, Inter } from 'next/font/google'
import './globals.css'
import ScrollProgress    from '@/components/layout/ScrollProgress'
import AnimationProvider from '@/components/providers/AnimationProvider'

const tajawal = Tajawal({
  subsets: ['arabic', 'latin'],
  weight: ['200', '300', '400', '500', '700', '800', '900'],
  variable: '--font-tajawal',
  display: 'swap',
  preload: true,
})

const inter = Inter({
  subsets: ['latin'],
  weight: ['300', '400', '500', '600', '700', '800', '900'],
  variable: '--font-inter',
  display: 'swap',
  preload: true,
})

export const metadata: Metadata = {
  title: {
    default:  'دكاني | سوقك الرقمي الجزائري',
    template: '%s | دكاني',
  },
  description: 'ابدأ البيع أونلاين اليوم — متجرك الإلكتروني الجزائري بكل سهولة.',
  manifest: '/manifest.json',
  keywords: ['متجر إلكتروني', 'الجزائر', 'بيع أونلاين', 'تجارة إلكترونية', 'دكاني'],
  authors:  [{ name: 'دكاني' }],
  creator:  'دكاني',
  icons: {
    icon:  '/api/icons/192',
    apple: '/api/icons/152',
  },
  openGraph: {
    type:        'website',
    locale:      'ar_DZ',
    siteName:    'دكاني',
    title:       'دكاني | سوقك الرقمي الجزائري',
    description: 'ابدأ البيع أونلاين اليوم — متجرك الإلكتروني الجزائري',
  },
}

export const viewport: Viewport = {
  themeColor:   '#E8431A',
  width:        'device-width',
  initialScale: 1,
  maximumScale: 5,
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="ar"
      dir="rtl"
      className={`${tajawal.variable} ${inter.variable}`}
      style={{ colorScheme: 'light' }}
    >
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
      </head>
      <body
        className="min-h-screen overflow-x-hidden"
        style={{
          fontFamily: 'var(--font-tajawal), Tajawal, sans-serif',
          backgroundColor: '#FFFFFF',
          color: '#111111',
        }}
      >
        {/* 3px scroll progress bar in accent #E8431A */}
        <ScrollProgress />

        {/* Detects prefers-reduced-motion, disables all animations when set */}
        <AnimationProvider>
          {children}
        </AnimationProvider>
      </body>
    </html>
  )
}
