export const dynamic = 'force-dynamic'
export const metadata = { title: 'JustAd' }

import Link from 'next/link'
import { BarChart2, Zap, Target, TrendingUp } from 'lucide-react'

const FEATURES = [
  { icon: Target,    title: 'حملات ذكية',    desc: 'أنشئ حملات إعلانية بنقرة واحدة على فيسبوك وتيك توك' },
  { icon: TrendingUp, title: 'تحليل ROAS',   desc: 'اعرف عائد كل دينار تنفقه في الإعلانات' },
  { icon: Zap,       title: 'ربط تلقائي',   desc: 'ربط مباشر مع بكسل فيسبوك وتيك توك Pixel' },
]

export default function JustAdPage() {
  return (
    <div className="p-4 md:p-6 max-w-4xl mx-auto" dir="rtl" style={{fontFamily:'var(--font-arabic)'}}>
      <div className="mb-6">
        <h1 className="page-title">JustAd</h1>
        <p className="text-sm mt-1" style={{color:'var(--color-text-muted)'}}>أداة الإعلانات الذكية لتجار دكاني</p>
      </div>

      {/* Coming Soon Banner */}
      <div className="card p-8 text-center mb-6" style={{background:'linear-gradient(135deg,#EBF5FF,#F8F9FA)'}}>
        <div className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4" style={{background:'var(--color-accent)'}}>
          <BarChart2 size={28} className="text-white" />
        </div>
        <h2 className="font-black text-xl mb-2" style={{color:'var(--color-text-primary)'}}>قريباً 🚀</h2>
        <p className="text-sm mb-4" style={{color:'var(--color-text-muted)'}}>
          منصة الإعلانات المتكاملة لزيادة مبيعاتك — قيد التطوير
        </p>
        <span className="badge badge-blue text-sm px-4 py-1" style={{height:'auto'}}>نوتيفيكيشن عند الإطلاق</span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {FEATURES.map(f => (
          <div key={f.title} className="card p-4">
            <div className="w-9 h-9 rounded-lg flex items-center justify-center mb-3" style={{background:'var(--color-accent-soft)'}}>
              <f.icon size={18} style={{color:'var(--color-accent)'}} />
            </div>
            <h3 className="font-bold text-sm mb-1" style={{color:'var(--color-text-primary)'}}>{f.title}</h3>
            <p className="text-xs" style={{color:'var(--color-text-muted)'}}>{f.desc}</p>
          </div>
        ))}
      </div>

      <div className="mt-6 text-center">
        <Link href="/dashboard/tracking" className="btn btn-primary gap-2">
          ابدأ بإعداد البكسلات الآن
        </Link>
      </div>
    </div>
  )
}
