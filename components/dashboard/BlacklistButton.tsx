'use client'
import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { ShieldOff, Shield } from 'lucide-react'

export default function BlacklistButton({
  storeId, phone, name, isBlacklisted,
}: { storeId: string; phone: string; name: string; isBlacklisted: boolean }) {
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  const toggle = async () => {
    if (!confirm(isBlacklisted ? `إزالة ${name} من القائمة السوداء؟` : `إضافة ${name} إلى القائمة السوداء؟`)) return
    setLoading(true)
    const supabase = createClient()

    if (isBlacklisted) {
      await supabase.from('blacklisted_customers').delete().eq('store_id', storeId).eq('phone', phone)
    } else {
      const reason = prompt('سبب الحظر (اختياري):') ?? ''
      await supabase.from('blacklisted_customers').upsert({ store_id: storeId, phone, full_name: name, reason })
    }

    router.refresh()
    setLoading(false)
  }

  return (
    <button
      onClick={toggle}
      disabled={loading}
      className={`flex items-center gap-1 text-xs px-2 py-1 rounded-lg transition font-medium ${
        isBlacklisted
          ? 'bg-green-100 text-green-700 hover:bg-green-200'
          : 'bg-red-100 text-red-600 hover:bg-red-200'
      }`}
    >
      {isBlacklisted ? <><Shield className="w-3 h-3" />رفع الحظر</> : <><ShieldOff className="w-3 h-3" />حظر</>}
    </button>
  )
}
