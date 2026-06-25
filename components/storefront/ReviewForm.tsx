'use client'
import { useState } from 'react'
import { Star } from 'lucide-react'
import { translateStorefront, type Locale } from '@/lib/utils/translations'

interface Props { storeId: string; productId?: string; lang?: Locale }

export default function ReviewForm({ storeId, productId, lang = 'ar' }: Props) {
  const [name,    setName]    = useState('')
  const [rating,  setRating]  = useState(5)
  const [comment, setComment] = useState('')
  const [hover,   setHover]   = useState(0)
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error,   setError]   = useState('')

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    try {
      const res = await fetch('/api/reviews', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ store_id: storeId, product_id: productId, customer_name: name, rating, comment }),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error ?? translateStorefront('error_try_again', lang)); return }
      setSuccess(true)
    } catch {
      setError(translateStorefront('error_try_again', lang))
    } finally {
      setLoading(false)
    }
  }

  const isRtl = lang === 'ar'

  if (success) {
    return (
      <div className="text-center py-6 space-y-2">
        <p className="text-4xl">⭐</p>
        <p className="font-bold text-green-700">{translateStorefront('thank_you_opinion', lang)}</p>
        <p className="text-sm text-gray-500">{translateStorefront('review_pending', lang)}</p>
      </div>
    )
  }

  return (
    <form onSubmit={submit} className="space-y-4" dir={isRtl ? 'rtl' : 'ltr'}>
      <h3 className="font-black text-[#111827] text-lg">{translateStorefront('share_your_opinion', lang)}</h3>

      {/* Star rating */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">{translateStorefront('your_rating', lang)}</label>
        <div className="flex gap-1">
          {[1,2,3,4,5].map(s => (
            <button key={s} type="button"
              onClick={() => setRating(s)}
              onMouseEnter={() => setHover(s)}
              onMouseLeave={() => setHover(0)}
              className="transition-transform hover:scale-110">
              <Star size={28} style={{
                fill: s <= (hover || rating) ? '#FFC107' : 'none',
                color: s <= (hover || rating) ? '#FFC107' : '#D1D5DB',
              }}/>
            </button>
          ))}
        </div>
      </div>

      {/* Name */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">{translateStorefront('your_name', lang)}</label>
        <input value={name} onChange={e=>setName(e.target.value)} required
          placeholder={lang === 'ar' ? 'أحمد م.' : lang === 'fr' ? 'Ahmed M.' : 'Ahmed M.'}
          dir={isRtl ? 'rtl' : 'ltr'}
          className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:ring-2 focus:ring-primary/30 outline-none"/>
      </div>

      {/* Comment */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">{translateStorefront('your_opinion_optional', lang)}</label>
        <textarea value={comment} onChange={e=>setComment(e.target.value)}
          placeholder={translateStorefront('tell_us_about_experience', lang)}
          dir={isRtl ? 'rtl' : 'ltr'} rows={3}
          className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:ring-2 focus:ring-primary/30 outline-none resize-none"/>
      </div>

      {error && <p className="text-red-500 text-sm">{error}</p>}

      <button type="submit" disabled={loading || !name}
        className="w-full bg-[#0D6EFD] hover:bg-[#0B5ED7] text-white font-bold py-3 rounded-xl text-sm transition-colors disabled:opacity-50">
        {loading ? translateStorefront('submitting', lang) : translateStorefront('submit_review', lang)}
      </button>
    </form>
  )
}
