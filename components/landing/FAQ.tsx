'use client'

import { useState, useRef } from 'react'
import { motion, useInView, AnimatePresence, useReducedMotion } from 'framer-motion'

const FAQS = [
  {
    q: 'هل أحتاج خبرة تقنية لإنشاء متجر على دكاني؟',
    a: 'لا، إطلاقاً. دكاني صُمم خصيصاً للتاجر الجزائري العادي. يمكنك إنشاء متجرك وإضافة منتجاتك وبدء البيع في أقل من ساعة، بدون أي معرفة برمجية أو تقنية.',
  },
  {
    q: 'كيف يصل الزبائن لمتجري في كل الولايات؟',
    a: 'متجرك على دكاني يدعم التوصيل لكل الـ48 ولاية الجزائرية من خلال شركاء الشحن المعتمدين. العميل يختار ولايته عند الطلب وتصلك الطلبية مباشرة في لوحة التحكم.',
  },
  {
    q: 'ما هي طرق الدفع المتاحة للزبائن؟',
    a: 'الدفع عند الاستلام (COD) هو الطريقة الرئيسية والمفضلة للجزائريين. نعمل على إضافة الدفع الإلكتروني قريباً عند توفره في السوق الجزائري.',
  },
  {
    q: 'ما هو Confirmili وهل أحتاجه؟',
    a: 'Confirmili هي لوحة تحكم متخصصة لتأكيد الطلبات وإدارة التوصيل، مشابهة لـ Octomatic. تساعدك على متابعة كل الطلبات، تأكيدها، تتبع حالتها، وإرسال التقارير لشركات الشحن. متاحة في خطة Pro.',
  },
  {
    q: 'هل يمكنني ربط متجري بمنصات أخرى مثل YouCan أو Shopify؟',
    a: 'نعم، في خطة Pro و Business يمكنك ربط متجرك بمنصات أخرى عبر تكاملات Confirmili، بما فيها YouCan وWooCommerce وGoogle Sheets لمزامنة الطلبات والمخزون.',
  },
  {
    q: 'ماذا يحدث إذا تجاوزت حد الطلبات في خطتي؟',
    a: 'ستتلقى إشعاراً عند الوصول إلى 80% من حدك الشهري. لن تُوقَف خدمتك تلقائياً — ستحصل على فترة سماح قصيرة ريثما ترقي خطتك. ترقية الخطة تتم بنقرة واحدة من لوحة التحكم.',
  },
]

export default function FAQ() {
  const [open, setOpen] = useState<number | null>(0)
  const ref = useRef(null)
  const inView = useInView(ref, { once: true, margin: '-80px' })
  const prefersReduced = useReducedMotion()

  return (
    <section id="faq" ref={ref} style={{
      background: '#FFFFFF', padding: '100px 0',
    }}>
      <div style={{ maxWidth: 800, margin: '0 auto', padding: '0 24px' }}>
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.5 }}
          style={{ textAlign: 'center', marginBottom: 56 }}>
          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: 8,
            background: '#EEF2FF', borderRadius: 100, padding: '6px 16px', marginBottom: 16,
          }}>
            <span style={{ fontFamily: 'var(--font-tajawal)', fontSize: 13, fontWeight: 600, color: '#4F46E5' }}>
              ✦ الأسئلة الشائعة
            </span>
          </div>
          <h2 style={{
            fontFamily: 'var(--font-tajawal)', fontWeight: 900,
            fontSize: 'clamp(28px,4vw,40px)', color: '#0F172A',
            lineHeight: 1.3, margin: 0,
          }}>أسئلة يسألها التجار كثيراً</h2>
        </motion.div>

        {/* FAQ items */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {FAQS.map((faq, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 20 }}
              animate={inView ? { opacity: 1, y: 0 } : {}}
              transition={{ delay: i * 0.08, duration: 0.5 }}
              style={{
                background: open === i ? '#EEF2FF' : '#F8FAFC',
                borderRadius: 16, overflow: 'hidden',
                border: open === i ? '1.5px solid rgba(79,70,229,0.2)' : '1.5px solid #E2E8F0',
                transition: 'background 0.2s, border-color 0.2s',
              }}>
              <button
                onClick={() => setOpen(open === i ? null : i)}
                style={{
                  width: '100%', padding: '20px 24px',
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  background: 'none', border: 'none', cursor: 'pointer',
                  textAlign: 'right',
                }}>
                <motion.div
                  animate={{ rotate: open === i ? 45 : 0 }}
                  transition={{ duration: 0.2 }}
                  style={{
                    width: 28, height: 28, borderRadius: '50%',
                    background: open === i ? '#4F46E5' : '#E2E8F0',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    flexShrink: 0,
                    transition: 'background 0.2s',
                  }}>
                  <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                    <path d="M7 1v12M1 7h12" stroke={open === i ? '#fff' : '#475569'}
                      strokeWidth={2} strokeLinecap="round" />
                  </svg>
                </motion.div>
                <span style={{
                  fontFamily: 'var(--font-tajawal)', fontWeight: 700, fontSize: 15,
                  color: open === i ? '#4F46E5' : '#0F172A',
                  transition: 'color 0.2s',
                  flex: 1, textAlign: 'right', paddingRight: 0, paddingLeft: 16,
                }}>{faq.q}</span>
              </button>

              <AnimatePresence>
                {open === i && (
                  <motion.div
                    initial={prefersReduced ? {} : { height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={prefersReduced ? {} : { height: 0, opacity: 0 }}
                    transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
                    style={{ overflow: 'hidden' }}>
                    <div style={{
                      padding: '0 24px 20px',
                      fontFamily: 'var(--font-tajawal)', fontSize: 14, color: '#475569',
                      lineHeight: 1.8,
                    }}>{faq.a}</div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          ))}
        </div>

        {/* Still have questions */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={inView ? { opacity: 1 } : {}}
          transition={{ delay: 0.6 }}
          style={{
            textAlign: 'center', marginTop: 48,
            background: '#F8FAFC', borderRadius: 16, padding: '24px',
            border: '1px solid #E2E8F0',
          }}>
          <p style={{
            fontFamily: 'var(--font-tajawal)', fontSize: 15, color: '#0F172A',
            fontWeight: 600, marginBottom: 12,
          }}>لديك سؤال آخر؟</p>
          <p style={{
            fontFamily: 'var(--font-tajawal)', fontSize: 13, color: '#475569',
            marginBottom: 16, lineHeight: 1.7,
          }}>فريق دعمنا متاح 7 أيام في الأسبوع للإجابة على كل استفساراتك</p>
          <a href="https://wa.me/213000000000" target="_blank" rel="noopener noreferrer"
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 8,
              background: '#25D366', color: '#fff',
              fontFamily: 'var(--font-tajawal)', fontWeight: 600, fontSize: 13,
              padding: '10px 24px', borderRadius: 10, textDecoration: 'none',
            }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
            </svg>
            تواصل معنا عبر واتساب
          </a>
        </motion.div>
      </div>
    </section>
  )
}
