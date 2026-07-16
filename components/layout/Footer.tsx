'use client'
import Link from 'next/link'
import { Facebook, Instagram } from 'lucide-react'

const COLS = [
  {
    title: 'عن Commerco',
    links: [
      { label: 'من نحن',         href: '#about' },
      { label: 'كيف يشتغل',      href: '#how' },
      { label: 'أسعارنا',        href: '#pricing' },
      { label: 'التجار الشركاء', href: '#partners' },
    ],
  },
  {
    title: 'روابط سريعة',
    links: [
      { label: 'ابدأ مجاناً',     href: '/register' },
      { label: 'تسجيل الدخول',   href: '/login' },
      { label: 'لوحة التحكم',    href: '/dashboard' },
      { label: 'المنتجات',       href: '/products' },
    ],
  },
  {
    title: 'الفئات',
    links: [
      { label: 'ملابس وأزياء',   href: '/products?category=clothing' },
      { label: 'إلكترونيات',    href: '/products?category=electronics' },
      { label: 'المنزل والديكور', href: '/products?category=home' },
      { label: 'جمال وعناية',   href: '/products?category=beauty' },
    ],
  },
  {
    title: 'تواصل معنا',
    links: [
      { label: 'مركز المساعدة', href: '#help' },
      { label: 'واتساب',        href: 'https://wa.me/213000000000' },
      { label: 'البريد الإلكتروني', href: 'mailto:hello@commerco.dz' },
      { label: 'الشروط والخصوصية', href: '#terms' },
    ],
  },
]

const SOCIALS = [
  { Icon: Facebook,  href: 'https://facebook.com/commerco',  label: 'فيسبوك' },
  { Icon: Instagram, href: 'https://instagram.com/commerco', label: 'انستغرام' },
  {
    // TikTok via SVG path (not in lucide)
    Icon: ({ size = 20 }: { size?: number }) => (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
        <path d="M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-2.88 2.5 2.89 2.89 0 01-2.89-2.89 2.89 2.89 0 012.89-2.89c.28 0 .54.04.79.1V9.01a6.32 6.32 0 00-.79-.05 6.34 6.34 0 00-6.34 6.34 6.34 6.34 0 006.34 6.34 6.34 6.34 0 006.33-6.34V9.31a8.16 8.16 0 004.77 1.52V7.39a4.85 4.85 0 01-1-.7z" />
      </svg>
    ),
    href: 'https://tiktok.com/@commerco',
    label: 'تيك توك',
  },
]

export default function Footer() {
  return (
    <footer
      style={{ backgroundColor: '#111111', color: '#FFFFFF' }}
      dir="rtl"
      className="mt-0"
    >
      <div className="max-w-6xl mx-auto px-4 pt-14 pb-8">
        {/* Top: tagline + social */}
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6 mb-12 pb-10 border-b border-white/10">
          <div>
            <div className="font-black text-2xl mb-1" style={{ fontFamily: 'var(--font-tajawal)' }}>
              Commerco
              <span style={{ color: '#0D6EFD' }}>.</span>
            </div>
            <p style={{ color: '#0D6EFD', fontFamily: 'var(--font-tajawal)' }} className="text-sm font-medium">
              سوقك الرقمي الجزائري
            </p>
            <p style={{ color: '#999999' }} className="text-sm mt-1">
              ابدأ البيع أونلاين في أقل من 5 دقائق
            </p>
          </div>

          {/* Social icons */}
          <div className="flex items-center gap-3">
            {SOCIALS.map(({ Icon, href, label }) => (
              <a
                key={label}
                href={href}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={label}
                className="touch-target w-10 h-10 flex items-center justify-center rounded-xl transition-all"
                style={{
                  backgroundColor: 'rgba(255,255,255,0.08)',
                  color: '#FFFFFF',
                }}
                onMouseEnter={e => {
                  ;(e.currentTarget as HTMLAnchorElement).style.backgroundColor = '#0D6EFD'
                }}
                onMouseLeave={e => {
                  ;(e.currentTarget as HTMLAnchorElement).style.backgroundColor = 'rgba(255,255,255,0.08)'
                }}
              >
                <Icon size={18} />
              </a>
            ))}
          </div>
        </div>

        {/* Link columns: 2 cols mobile → 4 cols desktop */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-12">
          {COLS.map(col => (
            <div key={col.title}>
              <h3
                className="font-bold text-sm mb-4"
                style={{ color: '#FFFFFF', fontFamily: 'var(--font-tajawal)' }}
              >
                {col.title}
              </h3>
              <ul className="space-y-2.5">
                {col.links.map(link => (
                  <li key={link.label}>
                    <Link
                      href={link.href}
                      className="text-sm transition-colors hover:text-white"
                      style={{ color: '#999999', fontFamily: 'var(--font-tajawal)' }}
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Bottom bar */}
        <div
          className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-6 border-t border-white/10 text-xs"
          style={{ color: '#666666', fontFamily: 'var(--font-tajawal)' }}
        >
          <p>© {new Date().getFullYear()} Commerco — جميع الحقوق محفوظة</p>
          <div className="flex items-center gap-4">
            <Link href="#privacy" className="hover:text-white transition-colors">سياسة الخصوصية</Link>
            <Link href="#terms"   className="hover:text-white transition-colors">شروط الاستخدام</Link>
          </div>
        </div>
      </div>
    </footer>
  )
}
