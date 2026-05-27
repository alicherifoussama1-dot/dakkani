export const dynamic = 'force-dynamic'
export const metadata = { title: 'صفحة هبوط جديدة' }

import Link from 'next/link'
import { ArrowRight, Zap } from 'lucide-react'

const TEMPLATES = [
  { name: 'منتج واحد', desc: 'صفحة مخصصة لمنتج واحد مع فيديو وشهادات', icon: '📦', badge: 'الأكثر استخداماً' },
  { name: 'عرض خاص', desc: 'صفحة عروض محدودة الوقت مع عداد تنازلي', icon: '⚡', badge: 'تحويل عالي' },
  { name: 'مجموعة منتجات', desc: 'اعرض أكثر من 3 منتجات في صفحة واحدة', icon: '🛍️', badge: null },
  { name: 'صفحة فارغة', desc: 'ابدأ من صفر وصمم صفحتك بالكامل', icon: '✏️', badge: null },
]

export default function NewLandingPage() {
  return (
    <div className="p-4 md:p-6 max-w-3xl mx-auto" dir="rtl" style={{fontFamily:'var(--font-arabic)'}}>
      <div className="flex items-center gap-3 mb-6">
        <Link href="/landing-pages" className="p-1.5 rounded hover:bg-[#F8F9FA] transition-colors">
          <ArrowRight size={16} style={{color:'var(--color-text-muted)'}} />
        </Link>
        <h1 className="page-title">صفحة هبوط جديدة</h1>
      </div>

      <p className="text-sm mb-6" style={{color:'var(--color-text-muted)'}}>اختر قالباً للبدء أو ابدأ من صفر</p>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {TEMPLATES.map(t => (
          <div key={t.name} className="card p-5 cursor-pointer hover:shadow-md transition-shadow group relative">
            {t.badge && (
              <span className="absolute top-3 left-3 badge badge-blue text-[10px]">{t.badge}</span>
            )}
            <div className="text-3xl mb-3">{t.icon}</div>
            <h3 className="font-bold text-sm mb-1 group-hover:text-[#0D6EFD] transition-colors" style={{color:'var(--color-text-primary)'}}>{t.name}</h3>
            <p className="text-xs" style={{color:'var(--color-text-muted)'}}>{t.desc}</p>
          </div>
        ))}
      </div>

      <div className="mt-6 card p-4 flex items-center gap-3" style={{background:'linear-gradient(135deg,#EBF5FF,#F8F9FA)'}}>
        <Zap size={18} style={{color:'var(--color-accent)'}} />
        <div>
          <p className="font-semibold text-sm" style={{color:'var(--color-accent)'}}>قريباً — بناء الصفحات بالذكاء الاصطناعي</p>
          <p className="text-xs mt-0.5" style={{color:'var(--color-text-muted)'}}>صف منتجك وسيبني AI صفحتك تلقائياً</p>
        </div>
      </div>
    </div>
  )
}
