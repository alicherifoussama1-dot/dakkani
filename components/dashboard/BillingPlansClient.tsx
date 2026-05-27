'use client'
import { useState } from 'react'
import Link from 'next/link'
import { Check, FileText } from 'lucide-react'

const PLANS = [
  {
    key: 'free',
    name: 'أساسي',
    subname: 'ادفع حسب الاستخدام',
    monthlyPrice: 990,
    annualPrice: 792,
    unit: '/ 1000 كريدت',
    border: 'var(--color-border)',
    featured: false,
    cta: 'ابدأ مجاناً',
    features: ['1 منتج','100 طلب/شهر','—','—','Meta Pixel فقط','—','—','—','JustForm أساسي','—','جوجل شيت','2 شركات شحن','—','—','—','إحصائيات أساسية'],
  },
  {
    key: 'pro',
    name: 'Pro',
    subname: 'موصى به',
    monthlyPrice: 3900,
    annualPrice: 3120,
    unit: '/شهر',
    border: 'var(--color-accent)',
    featured: true,
    cta: 'اشترك الآن',
    features: ['100 منتج','5,000 طلب/شهر','✓','✓','Meta + TikTok Pixel','✓','✓ AI','50 كريدت','JustForm كامل','✓','✓','كل الشركات','✓','3 أعضاء','2 نطاق','إحصائيات متقدمة'],
  },
  {
    key: 'elite',
    name: 'Elite',
    subname: 'للشركات',
    monthlyPrice: 7900,
    annualPrice: 6320,
    unit: '/شهر',
    border: 'var(--color-border)',
    featured: false,
    cta: 'اشترك الآن',
    features: ['غير محدود','غير محدود','✓','✓','كل البكسلات','✓','✓ AI متقدم','200 كريدت','JustForm كامل','✓ متقدم','✓','كل الشركات','✓','10 أعضاء','5 نطاقات','إحصائيات كاملة'],
  },
]

const FEATURE_LABELS = [
  'المنتجات','الطلبات','المتغيرات والـ Upsells','الطلبات المهجورة',
  'Meta+TikTok Pixel','صفحة هبوط','مولّد صفحة AI','كريدت صور AI',
  'JustForm','كشف الطلبات الوهمية','جوجل شيت','مزودو الشحن',
  'Confirmili','الفريق','النطاقات المخصصة','الإحصائيات والتحليلات',
]

interface Props { storeName: string; currentPlan: string }

export default function BillingPlansClient({ storeName, currentPlan }: Props) {
  const [billing, setBilling] = useState<'monthly'|'annual'>('monthly')

  return (
    <div className="p-4 md:p-6 max-w-5xl mx-auto space-y-6" dir="rtl" style={{ fontFamily: 'var(--font-arabic)' }}>
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="page-title">الخطط</h1>
          <p className="text-sm mt-0.5" style={{ color: 'var(--color-text-muted)' }}>مركز إدارة الاشتراك</p>
        </div>
        <Link href="/billing/history" className="btn btn-sm" style={{ border: '1px solid var(--color-border)', background: '#fff', color: 'var(--color-text-secondary)' }}>
          <FileText size={13} />سجل الفواتير
        </Link>
      </div>

      {/* Current plan banner */}
      <div className="card p-4" style={{ background: 'linear-gradient(135deg,#EBF5FF,#F8F9FA)' }}>
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <p className="font-semibold text-sm" style={{ color: 'var(--color-text-primary)' }}>{storeName || 'متجري'}</p>
            <p className="text-xs mt-0.5" style={{ color: 'var(--color-text-muted)' }}>مشترك في خطة <strong className="text-accent">{currentPlan === 'pro' ? 'Pro' : currentPlan === 'elite' ? 'Elite' : 'أساسي'}</strong></p>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
            {[
              { label:'أيام متبقية', val:'30' },
              { label:'المنتجات', val:'0/100' },
              { label:'الطلبات', val:'0/5000' },
              { label:'الأعضاء', val:'1/3' },
            ].map(s => (
              <div key={s.label} className="p-2 rounded-lg bg-white border" style={{ borderColor: 'var(--color-border)' }}>
                <p className="font-bold text-sm" style={{ color: 'var(--color-accent)', fontFamily: 'var(--font-primary)' }}>{s.val}</p>
                <p className="text-[11px]" style={{ color: 'var(--color-text-muted)' }}>{s.label}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Billing toggle */}
      <div className="flex items-center justify-center gap-3">
        <span className="text-sm" style={{ color: billing === 'monthly' ? 'var(--color-text-primary)' : 'var(--color-text-muted)' }}>شهري</span>
        <button
          onClick={() => setBilling(b => b === 'monthly' ? 'annual' : 'monthly')}
          className="relative w-12 h-6 rounded-full transition-colors"
          style={{ background: billing === 'annual' ? 'var(--color-accent)' : 'var(--color-border)' }}
        >
          <span className="absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-all duration-200"
            style={{ right: billing === 'annual' ? '4px' : 'calc(100% - 20px)' }} />
        </button>
        <span className="text-sm flex items-center gap-1.5" style={{ color: billing === 'annual' ? 'var(--color-text-primary)' : 'var(--color-text-muted)' }}>
          سنوي
          <span className="badge badge-green text-[10px]">-20%</span>
        </span>
      </div>

      {/* Plan cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5 items-start">
        {PLANS.map(plan => (
          <div key={plan.key} className="relative card p-5 flex flex-col gap-4"
            style={{ border: `2px solid ${plan.border}`, boxShadow: plan.featured ? '0 4px 20px rgba(13,110,253,0.15)' : undefined }}>
            {plan.featured && (
              <div className="absolute -top-3 right-1/2 translate-x-1/2 px-3 py-1 rounded-full text-white text-xs font-bold"
                style={{ background: 'var(--color-accent)' }}>
                الأشهر
              </div>
            )}
            <div>
              <p className="font-bold text-base" style={{ color: 'var(--color-text-primary)' }}>{plan.name}</p>
              <p className="text-xs mt-0.5" style={{ color: 'var(--color-text-muted)' }}>{plan.subname}</p>
            </div>
            <div>
              <span className="font-black text-3xl" style={{ color: 'var(--color-text-primary)', fontFamily: 'var(--font-primary)' }}>
                {(billing === 'annual' ? plan.annualPrice : plan.monthlyPrice).toLocaleString('ar-DZ')}
              </span>
              <span className="text-sm mr-1" style={{ color: 'var(--color-text-muted)' }}>دج{plan.unit}</span>
            </div>
            <ul className="space-y-1.5">
              {FEATURE_LABELS.map((label, i) => (
                <li key={label} className="flex items-center gap-2 text-xs" style={{ color: plan.features[i] === '—' ? 'var(--color-text-muted)' : 'var(--color-text-secondary)' }}>
                  {plan.features[i] !== '—'
                    ? <Check size={12} style={{ color: 'var(--color-success)', flexShrink: 0 }} />
                    : <span className="w-3 h-3 flex-shrink-0" />
                  }
                  <span>{label}: </span>
                  <strong style={{ color: plan.features[i] === '—' ? 'var(--color-text-muted)' : 'var(--color-text-primary)' }}>
                    {plan.features[i]}
                  </strong>
                </li>
              ))}
            </ul>
            <button
              onClick={() => {
                if (plan.key === currentPlan) return
                if (plan.key === 'free') return
                // Link to contact for elite, show subscribe flow for others
                if (plan.key === 'elite') { window.open('https://wa.me/213000000000?text=أريد الاشتراك في خطة Elite', '_blank'); return }
                alert('ميزة الدفع ستكون متاحة قريباً عبر SlickPay و Chargily')
              }}
              disabled={plan.key === currentPlan}
              className={`btn w-full mt-auto ${plan.key === currentPlan ? 'btn-ghost opacity-50 cursor-default' : plan.featured ? 'btn-primary' : 'btn-outline'}`}
              style={{ fontFamily: 'var(--font-arabic)' }}
            >
              {plan.key === currentPlan ? '✓ خطتك الحالية' : plan.cta}
            </button>
          </div>
        ))}
      </div>

      {/* Payment methods */}
      <div className="card p-4 flex items-center gap-3 flex-wrap">
        <p className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>طرق الدفع المقبولة:</p>
        {['SlickPay','Yassir Cash','Visa / Mastercard'].map(m => (
          <span key={m} className="badge badge-outline text-xs">{m}</span>
        ))}
      </div>
    </div>
  )
}
