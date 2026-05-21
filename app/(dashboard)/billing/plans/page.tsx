export const dynamic = 'force-dynamic'
export const metadata = { title: 'الخطط والاشتراك' }

import Link from 'next/link'
import { Check } from 'lucide-react'
import { createServerClient } from '@/lib/supabase/server'
import BillingPlansClient from '@/components/dashboard/BillingPlansClient'

export default async function BillingPlansPage() {
  const supabase = createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  const { data: store } = await supabase.from('stores').select('name,plan').eq('owner_id', user.id).single()
  return <BillingPlansClient storeName={store?.name ?? ''} currentPlan={store?.plan ?? 'free'} />
}
