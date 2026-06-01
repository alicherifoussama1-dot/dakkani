export const dynamic = 'force-dynamic'
export const metadata = { title: 'تعلم' }

import { Play, BookOpen, Clock } from 'lucide-react'

const VIDEOS = [
  { title: 'كيف تنشئ متجرك في 5 دقائق',      duration: '5:30',  level: 'مبتدئ', thumb: '🏪' },
  { title: 'إضافة منتجاتك وصورها',            duration: '8:15',  level: 'مبتدئ', thumb: '📦' },
  { title: 'إعداد الكوبونات والعروض',          duration: '4:20',  level: 'مبتدئ', thumb: '🎫' },
  { title: 'إعداد التوصيل وأسعاره',           duration: '7:45',  level: 'متوسط', thumb: '🚚' },
  { title: 'ربط فيسبوك بكسل',               duration: '6:00',  level: 'متوسط', thumb: '📊' },
  { title: 'ربط TikTok Pixel',              duration: '5:45',  level: 'متوسط', thumb: '🎵' },
  { title: 'تحليل الإحصائيات والمبيعات',    duration: '10:20', level: 'متقدم', thumb: '📈' },
  { title: 'استخدام Confirmili للمتابعة',    duration: '12:00', level: 'متقدم', thumb: '📱' },
  { title: 'إدارة المخزون والمستودعات',      duration: '9:30',  level: 'متقدم', thumb: '🏭' },
  { title: 'إعداد صفحات الهبوط الاحترافية', duration: '15:00', level: 'متقدم', thumb: '🚀' },
  { title: 'تفعيل الدفع الإلكتروني',        duration: '8:00',  level: 'متوسط', thumb: '💳' },
  { title: 'استخدام ذكاء اصطناعي لوصف المنتجات', duration: '6:30', level: 'مبتدئ', thumb: '🤖' },
]

const LEVEL_COLORS: Record<string, string> = {
  'مبتدئ': 'bg-green-100 text-green-700',
  'متوسط': 'bg-blue-100 text-blue-700',
  'متقدم': 'bg-purple-100 text-purple-700',
}

export default function LearnPage() {
  return (
    <div className="p-4 md:p-6 max-w-5xl mx-auto" dir="rtl" style={{fontFamily:'var(--font-arabic)'}}>
      <div className="mb-6">
        <h1 className="page-title">تعلم</h1>
        <p className="text-sm mt-1" style={{color:'var(--color-text-muted)'}}>دروس تعليمية لمساعدتك في تطوير متجرك</p>
      </div>

      {/* Featured */}
      <div className="card overflow-hidden mb-6">
        <div className="h-40 flex items-center justify-center text-6xl" style={{background:'#111'}}>
          🎥
        </div>
        <div className="p-5 flex items-start justify-between">
          <div>
            <span className="badge badge-blue mb-2">مميز</span>
            <h2 className="font-bold" style={{color:'var(--color-text-primary)'}}>الدليل الشامل لاستخدام دكاني</h2>
            <p className="text-sm mt-1 flex items-center gap-1" style={{color:'var(--color-text-muted)'}}>
              <Clock size={12} />35 دقيقة
            </p>
          </div>
          <button className="btn btn-primary btn-sm gap-1.5 flex-shrink-0">
            <Play size={13} fill="white" />مشاهدة
          </button>
        </div>
      </div>

      {/* Videos grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {VIDEOS.map(v => (
          <div key={v.title} className="card overflow-hidden group cursor-pointer hover:shadow-md transition-shadow">
            <div className="h-28 flex items-center justify-center text-4xl relative" style={{background:'#1a1a1a'}}>
              {v.thumb}
              <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/40">
                <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center">
                  <Play size={16} fill="#0D6EFD" style={{color:'#0D6EFD'}} />
                </div>
              </div>
            </div>
            <div className="p-3">
              <div className="flex items-center justify-between mb-1.5">
                <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${LEVEL_COLORS[v.level]}`}>{v.level}</span>
                <span className="text-xs flex items-center gap-1" style={{color:'var(--color-text-muted)'}}>
                  <Clock size={10} />{v.duration}
                </span>
              </div>
              <p className="font-semibold text-sm" style={{color:'var(--color-text-primary)'}}>{v.title}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-6 card p-4 flex items-center justify-between" style={{background:'var(--color-accent-soft)'}}>
        <div className="flex items-center gap-3">
          <BookOpen size={20} style={{color:'var(--color-accent)'}} />
          <div>
            <p className="font-semibold text-sm" style={{color:'var(--color-accent)'}}>مركز المساعدة</p>
            <p className="text-xs" style={{color:'var(--color-text-muted)'}}>توثيق كامل ودروس مكتوبة</p>
          </div>
        </div>
        <a href="https://help.dakkani.dz" target="_blank" rel="noopener noreferrer" className="btn btn-outline btn-sm">
          زيارة مركز المساعدة
        </a>
      </div>
    </div>
  )
}
