export const dynamic = 'force-dynamic'
export const metadata = { title: 'التطبيقات' }

import Link from 'next/link'
import { CheckCircle2, Clock } from 'lucide-react'

const CONNECTED = [
  { name:'JustForm',                desc:'أفضل نموذج عملاء آمن',                          icon:'📋', href:'/dashboard/settings' },
  { name:'Meta Pixel',              desc:'تتبع تفاعلات المستخدم للتسويق',                   icon:'📊', href:'/dashboard/tracking' },
  { name:'TikTok Pixel',            desc:'بكسل تيك توك للإعلانات',                          icon:'🎵', href:'/dashboard/tracking' },
  { name:'Google Webdev',           desc:'أدوات مطور جوجل',                                 icon:'🔧', href:'/dashboard/settings' },
  { name:'Google Analytics',        desc:'تحليلات جوجل لموقعك',                             icon:'📈', href:'/dashboard/settings' },
  { name:'Google Spreadsheet',      desc:'إرسال الطلبات لجوجل شيت تلقائياً',                icon:'📄', href:'/dashboard/settings' },
  { name:'Cloudflare Turnstile',    desc:'حماية CAPTCHA لنماذجك',                           icon:'🛡️', href:'/dashboard/settings' },
]

const DELIVERY_COMPANIES = [
  'ZRexpress','Maystro Delivery','Yalidine Express','Guepex','EM/Ecomanager',
  'DHD Livraison','Noest','Ecom Delivery','Ecotrack','OrderDZ',
]

const FAQS = [
  { q:'كيف تعمل طريقة الدفع؟',          a:'ندعم الدفع عبر باريدي موب وبطاقة CIB.' },
  { q:'هل يمكنني إلغاء اشتراكي؟',       a:'نعم، يمكن الإلغاء في أي وقت من إعدادات الاشتراك.' },
  { q:'كيف أربط متجري؟',                 a:'من صفحة التطبيقات اختر منصتك وابتع الخطوات.' },
  { q:'ما هي شركات التوصيل المدعومة؟',   a:'ندعم أكثر من 10 شركات توصيل جزائرية.' },
  { q:'هل يوجد فترة تجريبية؟',           a:'نعم، 14 يوم مجاناً بدون بطاقة.' },
  { q:'كيف أحصل على دعم فني؟',           a:'عبر واتساب أو البريد الإلكتروني على مدار الساعة.' },
]

export default function AppsPage() {
  return (
    <div className="p-4 md:p-6 max-w-5xl mx-auto space-y-6" dir="rtl" style={{ fontFamily: 'var(--font-arabic)' }}>
      <div>
        <h1 className="page-title">التطبيقات</h1>
        <p className="text-sm mt-1" style={{ color: 'var(--color-text-muted)' }}>عزّز سير العمل بتكاملات متقدمة</p>
      </div>

      {/* Connected */}
      <div>
        <h2 className="font-semibold text-sm mb-3" style={{ color: 'var(--color-text-primary)' }}>✅ متصل</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {CONNECTED.map(app => (
            <div key={app.name} className="card p-4 flex items-start gap-3">
              <span className="text-2xl flex-shrink-0">{app.icon}</span>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-sm" style={{ color: 'var(--color-text-primary)' }}>{app.name}</p>
                <p className="text-xs mt-0.5" style={{ color: 'var(--color-text-muted)' }}>{app.desc}</p>
              </div>
              <div className="flex-shrink-0">
                <div className="w-9 h-5 rounded-full flex items-center bg-blue-500 transition-colors cursor-pointer">
                  <div className="w-4 h-4 bg-white rounded-full shadow mx-0.5 translate-x-[-8px]" />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Coming Soon */}
      <div>
        <h2 className="font-semibold text-sm mb-3 flex items-center gap-2" style={{ color: 'var(--color-text-primary)' }}>
          <Clock size={14} style={{ color: 'var(--color-warning)' }} />🔜 قريباً
        </h2>
        <div className="card p-4 flex items-center gap-3 opacity-60">
          <span className="text-2xl">🚀</span>
          <div>
            <p className="font-semibold text-sm">AZ Fulfillment</p>
            <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>تلبية الطلبات التلقائية — قريباً</p>
          </div>
          <span className="badge badge-yellow mr-auto">قريباً</span>
        </div>
      </div>

      {/* Delivery companies */}
      <div>
        <h2 className="font-semibold text-sm mb-3" style={{ color: 'var(--color-text-primary)' }}>🟢 شركات التوصيل المتاحة</h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          {DELIVERY_COMPANIES.map(co => (
            <div key={co} className="card p-3 text-center">
              <p className="font-medium text-xs" style={{ color: 'var(--color-text-primary)' }}>{co}</p>
              <button className="mt-2 text-xs font-medium" style={{ color: 'var(--color-accent)' }}>ربط</button>
            </div>
          ))}
        </div>
      </div>

      {/* FAQ */}
      <div>
        <h2 className="font-semibold text-sm mb-3" style={{ color: 'var(--color-text-primary)' }}>أسئلة شائعة</h2>
        <div className="space-y-0">
          {FAQS.map(({ q, a }, i) => (
            <details key={i} className="card mb-2 group">
              <summary className="flex items-center justify-between p-4 cursor-pointer list-none">
                <span className="font-medium text-sm" style={{ color: 'var(--color-text-primary)' }}>{q}</span>
                <span className="text-lg leading-none select-none group-open:rotate-45 transition-transform duration-200" style={{ color: 'var(--color-text-muted)' }}>+</span>
              </summary>
              <div className="px-4 pb-4 text-sm" style={{ color: 'var(--color-text-secondary)' }}>{a}</div>
            </details>
          ))}
        </div>
      </div>
    </div>
  )
}
