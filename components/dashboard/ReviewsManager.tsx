'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Check, X, Star, Trash2 } from 'lucide-react'

interface Review {
  id: string
  customer_name: string
  rating: number
  comment?: string
  is_approved: boolean
  created_at: string
  product?: { name: string; name_ar?: string }
}

export default function ReviewsManager({ storeId, initialReviews }: { storeId: string; initialReviews: Review[] }) {
  const router = useRouter()
  const [reviews, setReviews] = useState(initialReviews)
  const [filter, setFilter] = useState<'all'|'pending'|'approved'>('pending')

  const approve = async (id: string) => {
    const sb = createClient()
    await sb.from('reviews').update({ is_approved: true }).eq('id', id)
    setReviews(prev => prev.map(r => r.id === id ? {...r, is_approved: true} : r))
  }

  const reject = async (id: string) => {
    const sb = createClient()
    await sb.from('reviews').delete().eq('id', id)
    setReviews(prev => prev.filter(r => r.id !== id))
  }

  const filtered = reviews.filter(r => {
    if (filter === 'pending')  return !r.is_approved
    if (filter === 'approved') return r.is_approved
    return true
  })

  return (
    <div className="space-y-4">
      {/* Filter tabs */}
      <div className="tab-bar">
        {(['all','pending','approved'] as const).map(f => {
          const labels = {all:'الكل', pending:'قيد المراجعة', approved:'مُعتمدة'}
          const counts = {
            all: reviews.length,
            pending: reviews.filter(r=>!r.is_approved).length,
            approved: reviews.filter(r=>r.is_approved).length,
          }
          return (
            <button key={f} onClick={() => setFilter(f)}
              className={`tab-item ${filter === f ? 'active' : ''}`}>
              {labels[f]} ({counts[f]})
            </button>
          )
        })}
      </div>

      {filtered.length === 0 ? (
        <div className="card p-12 text-center">
          <Star size={28} className="mx-auto mb-2" style={{color:'var(--color-text-muted)',opacity:0.4}}/>
          <p className="text-sm" style={{color:'var(--color-text-muted)'}}>
            {filter === 'pending' ? 'لا توجد تقييمات تنتظر المراجعة' : 'لا توجد تقييمات'}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map(r => (
            <div key={r.id} className="card p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  {/* Stars */}
                  <div className="flex items-center gap-1 mb-1">
                    {[1,2,3,4,5].map(s => (
                      <Star key={s} size={14} style={{fill: s <= r.rating ? '#FFC107' : 'none', color: s <= r.rating ? '#FFC107' : '#DEE2E6'}}/>
                    ))}
                    <span className="text-xs font-medium mr-1" style={{color:'var(--color-text-secondary)'}}>{r.customer_name}</span>
                    {r.product && (
                      <span className="text-xs" style={{color:'var(--color-text-muted)'}}>
                        — {r.product.name_ar ?? r.product.name}
                      </span>
                    )}
                  </div>
                  {r.comment && (
                    <p className="text-sm" style={{color:'var(--color-text-secondary)'}}>{r.comment}</p>
                  )}
                  <p className="text-xs mt-1" style={{color:'var(--color-text-muted)'}}>
                    {new Date(r.created_at).toLocaleDateString('ar-DZ')}
                  </p>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2 flex-shrink-0">
                  {r.is_approved
                    ? <span className="badge badge-green text-[10px]">مُعتمدة</span>
                    : (
                      <button onClick={() => approve(r.id)}
                        className="p-1.5 rounded hover:bg-green-50 transition-colors" title="موافقة">
                        <Check size={15} style={{color:'#198754'}}/>
                      </button>
                    )
                  }
                  <button onClick={() => reject(r.id)}
                    className="p-1.5 rounded hover:bg-red-50 transition-colors" title="حذف">
                    <Trash2 size={14} style={{color:'#DC3545'}}/>
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
