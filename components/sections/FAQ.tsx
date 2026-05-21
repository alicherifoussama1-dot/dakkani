'use client'
import { useState } from 'react'
import { Plus } from 'lucide-react'
import { useScrollAnimation } from '@/hooks/useScrollAnimation'

const FAQS = [
  {
    q: 'الخطة المجانية — ماذا تشمل بالضبط؟',
    a: 'الخطة المجانية تشمل متجر واحد بحتى 20 منتج، توصيل لكل الولايات، وصفحة متجر احترافية. يمكنك الترقية في أي وقت بدون فقدان بياناتك.',
  },
  {
    q: 'هل التوصيل متاح لكل الجزائر؟',
    a: 'نعم! نصلك لكل الـ 48 ولاية في الجزائر عبر شراكاتنا مع شركات التوصيل المعتمدة مثل Yalidine و ZR Express. تتابع حالة كل طلب من لوحة تحكمك مباشرة.',
  },
  {
    q: 'ماهي طرق الدفع المتاحة للعملاء؟',
    a: 'يمكن لعملائك الدفع عند الاستلام (COD) وهو الأكثر شيوعاً في الجزائر، أو عبر بطاقة CIB وبطاقة Edahabia (Baridimob). نضمن لك أمان كل المعاملات.',
  },
  {
    q: 'كيف يمكنني إلغاء اشتراكي؟',
    a: 'يمكنك إلغاء اشتراكك في أي وقت من إعدادات حسابك بدون رسوم إضافية. ستستمر في الاستفادة من خطتك حتى نهاية الفترة المدفوعة.',
  },
  {
    q: 'كيف يشتغل الرد التلقائي بالذكاء الاصطناعي؟',
    a: 'المساعد الذكي يرد على استفسارات عملائك بالدارجة الجزائرية تلقائياً 24/7. يتعلم من منتجاتك وسياسة متجرك ليعطي ردوداً دقيقة ومخصصة. متاح من خطة Pro فما فوق.',
  },
  {
    q: 'هل لوحة التحكم سهلة الاستخدام على الموبايل؟',
    a: 'نعم! صممنا دكاني للموبايل أولاً. يمكنك إدارة متجرك، تتبع الطلبات، وإضافة المنتجات من هاتفك في أي وقت وأي مكان.',
  },
]

export default function FAQ() {
  const [open, setOpen] = useState<number | null>(null)
  const sectionRef = useScrollAnimation()

  return (
    <section
      className="section-soft py-16 md:py-20 px-4"
      id="faq"
      dir="rtl"
    >
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="text-center mb-10">
          <h2 className="section-title">أسئلة شائعة</h2>
          <p className="section-subtitle">كل ما تحتاج تعرفه عن دكاني</p>
        </div>

        {/* Accordion */}
        <div
          ref={sectionRef as any}
          className="space-y-0"
        >
          {FAQS.map(({ q, a }, i) => (
            <div
              key={i}
              className="border-b"
              style={{ borderColor: '#EBEBEB' }}
            >
              <button
                onClick={() => setOpen(open === i ? null : i)}
                className="w-full flex items-center justify-between py-4 text-right gap-4"
                style={{ minHeight: '56px' }}
                aria-expanded={open === i}
              >
                <span
                  className="font-semibold text-sm md:text-base leading-snug"
                  style={{
                    color: open === i ? '#0D6EFD' : '#111111',
                    fontFamily: 'var(--font-tajawal)',
                    transition: 'color 200ms ease',
                  }}
                >
                  {q}
                </span>
                <span
                  className="flex-shrink-0 w-7 h-7 flex items-center justify-center rounded-full transition-all duration-200"
                  style={{
                    backgroundColor: open === i ? '#0D6EFD' : '#F3F3F3',
                    transform: open === i ? 'rotate(45deg)' : 'rotate(0deg)',
                  }}
                >
                  <Plus
                    size={14}
                    style={{ color: open === i ? '#FFFFFF' : '#999999' }}
                    strokeWidth={2.5}
                  />
                </span>
              </button>

              {/* Answer with max-height animation */}
              <div
                style={{
                  maxHeight: open === i ? '300px' : '0',
                  overflow: 'hidden',
                  transition: 'max-height 0.35s cubic-bezier(0.16,1,0.3,1)',
                }}
              >
                <p
                  className="pb-5 text-sm leading-relaxed"
                  style={{
                    color: '#444444',
                    fontFamily: 'var(--font-tajawal)',
                    lineHeight: '1.8',
                  }}
                >
                  {a}
                </p>
              </div>
            </div>
          ))}
        </div>

        {/* Contact CTA */}
        <p
          className="text-center mt-10 text-sm"
          style={{ color: '#999999', fontFamily: 'var(--font-tajawal)' }}
        >
          ما لقيتش جوابك؟{' '}
          <a
            href="https://wa.me/213000000000"
            className="font-semibold transition-colors"
            style={{ color: '#0D6EFD' }}
          >
            تواصل معنا عبر واتساب
          </a>
        </p>
      </div>
    </section>
  )
}
