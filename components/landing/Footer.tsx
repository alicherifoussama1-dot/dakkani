'use client'

import { motion } from 'framer-motion'

const COLS = [
  {
    title: 'عن دكاني',
    links: [
      { label: 'من نحن', href: '/about' },
      { label: 'مدونة دكاني', href: '/blog' },
      { label: 'الوظائف', href: '/careers' },
      { label: 'شركاؤنا', href: '/partners' },
    ],
  },
  {
    title: 'روابط سريعة',
    links: [
      { label: 'تسجيل الدخول', href: '/auth/login' },
      { label: 'إنشاء حساب', href: '/auth/register' },
      { label: 'الأسعار', href: '#pricing' },
      { label: 'الأسئلة الشائعة', href: '#faq' },
    ],
  },
  {
    title: 'الميزات',
    links: [
      { label: 'بناء المتجر', href: '#features' },
      { label: 'Confirmili', href: '#showcase' },
      { label: 'التوصيل لـ48 ولاية', href: '#features' },
      { label: 'ردود AI بالدارجة', href: '#features' },
    ],
  },
  {
    title: 'تواصل معنا',
    links: [
      { label: '📧 support@dakkani.dz', href: 'mailto:support@dakkani.dz' },
      { label: '📱 واتساب', href: 'https://wa.me/213000000000' },
      { label: '📍 الجزائر العاصمة', href: '#' },
    ],
  },
]

const SOCIAL = [
  {
    label: 'Facebook',
    href: 'https://facebook.com',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
        <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
      </svg>
    ),
  },
  {
    label: 'Instagram',
    href: 'https://instagram.com',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
        <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z" />
      </svg>
    ),
  },
  {
    label: 'TikTok',
    href: 'https://tiktok.com',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
        <path d="M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-2.88 2.5 2.89 2.89 0 01-2.89-2.89 2.89 2.89 0 012.89-2.89c.28 0 .54.04.79.1V9.01a6.34 6.34 0 00-.79-.05 6.34 6.34 0 00-6.34 6.34 6.34 6.34 0 006.34 6.34 6.34 6.34 0 006.33-6.34V8.74a8.19 8.19 0 004.79 1.52V6.81a4.85 4.85 0 01-1.02-.12z" />
      </svg>
    ),
  },
  {
    label: 'YouTube',
    href: 'https://youtube.com',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
        <path d="M23.495 6.205a3.007 3.007 0 00-2.088-2.088c-1.87-.501-9.396-.501-9.396-.501s-7.507-.01-9.396.501A3.007 3.007 0 00.527 6.205a31.247 31.247 0 00-.522 5.805 31.247 31.247 0 00.522 5.783 3.007 3.007 0 002.088 2.088c1.868.502 9.396.502 9.396.502s7.506 0 9.396-.502a3.007 3.007 0 002.088-2.088 31.247 31.247 0 00.5-5.783 31.247 31.247 0 00-.5-5.805zM9.609 15.601V8.408l6.264 3.602z" />
      </svg>
    ),
  },
]

export default function LandingFooter() {
  return (
    <footer style={{
      background: '#0A0A0A', color: '#fff',
      padding: '64px 0 32px',
    }}>
      <div style={{ maxWidth: 1280, margin: '0 auto', padding: '0 24px' }}>
        {/* Main grid */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
          gap: 40, marginBottom: 56,
        }}>
          {/* Brand column */}
          <div>
            <div style={{
              display: 'flex', alignItems: 'center', gap: 6, marginBottom: 16,
            }}>
              <span style={{
                fontFamily: 'var(--font-tajawal)', fontWeight: 900, fontSize: 26,
                color: '#fff',
              }}>دكاني</span>
              <span style={{
                width: 8, height: 8, borderRadius: '50%',
                background: '#4F46E5', display: 'inline-block',
              }} />
            </div>
            <p style={{
              fontFamily: 'var(--font-tajawal)', fontSize: 13, color: '#64748B',
              lineHeight: 1.8, marginBottom: 20,
            }}>
              منصة التجارة الإلكترونية الجزائرية — ابنِ متجرك، بع لـ48 ولاية.
            </p>

            {/* Social icons */}
            <div style={{ display: 'flex', gap: 10 }}>
              {SOCIAL.map(s => (
                <a key={s.label} href={s.href} target="_blank" rel="noopener noreferrer"
                  style={{
                    width: 36, height: 36, borderRadius: 10,
                    background: '#1E293B', color: '#64748B',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    textDecoration: 'none', transition: 'background 0.2s, color 0.2s',
                  }}
                  onMouseEnter={e => {
                    const el = e.currentTarget as HTMLAnchorElement
                    el.style.background = '#4F46E5'
                    el.style.color = '#fff'
                  }}
                  onMouseLeave={e => {
                    const el = e.currentTarget as HTMLAnchorElement
                    el.style.background = '#1E293B'
                    el.style.color = '#64748B'
                  }}>
                  {s.icon}
                </a>
              ))}
            </div>
          </div>

          {/* Nav columns */}
          {COLS.map(col => (
            <div key={col.title}>
              <h4 style={{
                fontFamily: 'var(--font-tajawal)', fontWeight: 700, fontSize: 14,
                color: '#fff', marginBottom: 16,
              }}>{col.title}</h4>
              <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: 10 }}>
                {col.links.map(link => (
                  <li key={link.label}>
                    <a href={link.href} style={{
                      fontFamily: 'var(--font-tajawal)', fontSize: 13, color: '#64748B',
                      textDecoration: 'none', transition: 'color 0.2s',
                    }}
                      onMouseEnter={e => (e.currentTarget.style.color = '#A5B4FC')}
                      onMouseLeave={e => (e.currentTarget.style.color = '#64748B')}
                    >{link.label}</a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Newsletter */}
        <div style={{
          background: '#111827', borderRadius: 16, padding: '24px 28px',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          gap: 20, flexWrap: 'wrap', marginBottom: 40,
          border: '1px solid #1E293B',
        }}>
          <div>
            <div style={{
              fontFamily: 'var(--font-tajawal)', fontWeight: 700, fontSize: 15,
              color: '#fff', marginBottom: 4,
            }}>اشترك في نشرتنا البريدية</div>
            <div style={{ fontFamily: 'var(--font-tajawal)', fontSize: 13, color: '#64748B' }}>
              نصائح للتجار الجزائريين واستراتيجيات البيع
            </div>
          </div>
          <div style={{
            display: 'flex', gap: 8, flexWrap: 'wrap',
          }}>
            <input
              type="email"
              placeholder="بريدك الإلكتروني"
              style={{
                background: '#1E293B', border: '1px solid #334155',
                borderRadius: 10, padding: '10px 16px',
                fontFamily: 'var(--font-tajawal)', fontSize: 13,
                color: '#fff', outline: 'none', width: 220,
                direction: 'rtl',
              }}
            />
            <button style={{
              background: '#4F46E5', color: '#fff',
              border: 'none', borderRadius: 10, padding: '10px 20px',
              fontFamily: 'var(--font-tajawal)', fontWeight: 600, fontSize: 13,
              cursor: 'pointer',
            }}>اشترك</button>
          </div>
        </div>

        {/* Bottom bar */}
        <div style={{
          borderTop: '1px solid #1E293B', paddingTop: 24,
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          flexWrap: 'wrap', gap: 12,
        }}>
          <p style={{
            fontFamily: 'var(--font-tajawal)', fontSize: 12, color: '#475569',
          }}>
            © 2026 دكاني · جميع الحقوق محفوظة
          </p>
          <p style={{
            fontFamily: 'var(--font-tajawal)', fontSize: 12, color: '#475569',
          }}>
            دكاني — سوقك الرقمي الجزائري 🇩🇿
          </p>
          <div style={{ display: 'flex', gap: 16 }}>
            {['سياسة الخصوصية', 'شروط الاستخدام'].map(l => (
              <a key={l} href="#" style={{
                fontFamily: 'var(--font-tajawal)', fontSize: 12, color: '#475569',
                textDecoration: 'none',
              }}
                onMouseEnter={e => (e.currentTarget.style.color = '#A5B4FC')}
                onMouseLeave={e => (e.currentTarget.style.color = '#475569')}
              >{l}</a>
            ))}
          </div>
        </div>
      </div>
    </footer>
  )
}
