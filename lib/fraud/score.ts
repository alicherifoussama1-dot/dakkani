import type { SupabaseClient } from '@supabase/supabase-js'

export interface FraudCheckInput {
  storeId: string
  phone: string
  name: string
  wilayaId: number
  orderTotal: number
}

export interface FraudCheckResult {
  score: number
  isBlacklisted: boolean
  reasons: string[]
  shouldBlock: boolean
}

export async function checkFraud(
  supabase: SupabaseClient,
  input: FraudCheckInput,
  blockThreshold = 80
): Promise<FraudCheckResult> {
  const reasons: string[] = []
  let score = 0

  // 1. Check blacklist
  const { data: blacklisted } = await supabase
    .from('blacklisted_customers')
    .select('id, reason')
    .eq('store_id', input.storeId)
    .eq('phone', input.phone)
    .maybeSingle()

  if (blacklisted) {
    return {
      score: 100,
      isBlacklisted: true,
      reasons: ['العميل موجود في القائمة السوداء'],
      shouldBlock: true,
    }
  }

  // 2. Past order history
  const { data: pastOrders } = await supabase
    .from('orders')
    .select('status, created_at')
    .eq('store_id', input.storeId)
    .eq('customer_phone', input.phone)

  if (pastOrders && pastOrders.length > 0) {
    const cancelled = pastOrders.filter(o =>
      ['cancelled', 'returned', 'failed'].includes(o.status)
    ).length

    const cancellationRate = cancelled / pastOrders.length

    if (cancellationRate > 0.5) {
      score += 40
      reasons.push(`معدل إلغاء مرتفع: ${Math.round(cancellationRate * 100)}%`)
    }
    if (cancelled >= 3) {
      score += 30
      reasons.push(`${cancelled} طلبات ملغاة سابقاً`)
    }

    // Recent duplicate orders
    const recentDate = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()
    const recentPending = pastOrders.filter(
      o => o.status === 'new' && o.created_at > recentDate
    ).length

    if (recentPending >= 2) {
      score += 20
      reasons.push('طلبات متعددة معلقة في آخر 7 أيام')
    }
  }

  // 3. High-value order from unknown customer
  if (!pastOrders?.length && input.orderTotal > 15000) {
    score += 15
    reasons.push('طلب بقيمة عالية من عميل جديد')
  }

  const finalScore = Math.min(score, 100)

  return {
    score: finalScore,
    isBlacklisted: false,
    reasons,
    shouldBlock: finalScore >= blockThreshold,
  }
}
