'use client'
import Link from 'next/link'
import { useScrollAnimation } from '@/hooks/useScrollAnimation'

export default function CTABanner() {
  const ref = useScrollAnimation()

  return (
    <section
      className="py-16 md:py-24 px-4 text-center"
      style={{ backgroundColor: '#0D6EFD' }}
      dir="rtl"
    >
      <div
        ref={ref as any}
        className="max-w-3xl mx-auto"
      >
        <h2
          className="font-black text-white leading-tight mb-4"
          style={{
            fontSize: 'clamp(28px, 6vw, 48px)',
            fontFamily: 'var(--font-tajawal)',
          }}
        >
          جاهز تبدأ تبيع؟
        </h2>
        <p
          className="mb-8"
          style={{
            fontSize: 'clamp(14px, 2.5vw, 16px)',
            color: 'rgba(255,255,255,0.85)',
            fontFamily: 'var(--font-tajawal)',
            lineHeight: '1.7',
          }}
        >
          انضم لأكثر من 12,000 تاجر جزائري يبيعون أونلاين مع دكاني كل يوم
        </p>

        <Link
          href="/auth/register"
          className="inline-flex items-center justify-center font-black rounded-2xl px-8 h-14 text-base transition-all"
          style={{
            backgroundColor: '#FFFFFF',
            color: '#0D6EFD',
            fontFamily: 'var(--font-tajawal)',
            boxShadow: '0 8px 32px rgba(0,0,0,0.2)',
            minWidth: '200px',
          }}
          onMouseEnter={e => {
            ;(e.currentTarget as HTMLAnchorElement).style.transform = 'scale(1.04) translateY(-2px)'
          }}
          onMouseLeave={e => {
            ;(e.currentTarget as HTMLAnchorElement).style.transform = 'scale(1) translateY(0)'
          }}
        >
          ابدأ مجاناً الآن ←
        </Link>

        <p
          className="mt-4 text-xs"
          style={{ color: 'rgba(255,255,255,0.6)', fontFamily: 'var(--font-tajawal)' }}
        >
          بدون بطاقة بنكية · الإعداد في أقل من 5 دقائق
        </p>
      </div>
    </section>
  )
}
