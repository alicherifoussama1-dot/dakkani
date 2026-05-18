// ============================================================
// Enhanced AI Fraud Detector — Score 0-100
// ============================================================
import type { SupabaseClient } from '@supabase/supabase-js'

export interface FraudInput {
  storeId:    string
  phone:      string
  name:       string
  wilayaId:   number
  communeId?: number
  orderTotal: number
  orderHour?: number  // 0-23
}

export interface FraudResult {
  score:          number
  reasons:        string[]
  recommendation: 'confirm' | 'call-first' | 'reject'
  isBlacklisted:  boolean
  details: {
    phoneInvalid:      boolean
    isBlacklisted:     boolean
    newPhone:          boolean
    multipleToday:     boolean
    highCancellation:  boolean
    lateNightOrder:    boolean
    highValueFirst:    boolean
    wilayaMismatch:    boolean
  }
}

const ALGERIAN_PHONE_RE = /^(05|06|07)\d{8}$/

export async function detectFraud(
  supabase: SupabaseClient,
  input: FraudInput,
  blockThreshold = 80,
): Promise<FraudResult> {
  let score = 0
  const reasons: string[] = []
  const details = {
    phoneInvalid:     false,
    isBlacklisted:    false,
    newPhone:         false,
    multipleToday:    false,
    highCancellation: false,
    lateNightOrder:   false,
    highValueFirst:   false,
    wilayaMismatch:   false,
  }

  // 1. Phone format validation (+20)
  if (!ALGERIAN_PHONE_RE.test(input.phone)) {
    score += 20
    reasons.push('رقم الهاتف غير صالح أو غير جزائري')
    details.phoneInvalid = true
  }

  // 2. Blacklist check (+40 → instant 100)
  const { data: blacklisted } = await supabase
    .from('blacklisted_customers')
    .select('id, reason')
    .eq('store_id', input.storeId)
    .eq('phone', input.phone)
    .maybeSingle()

  if (blacklisted) {
    details.isBlacklisted = true
    return {
      score: 100,
      reasons: ['العميل محظور: ' + (blacklisted.reason ?? 'حظر يدوي')],
      recommendation: 'reject',
      isBlacklisted: true,
      details,
    }
  }

  // 3. Fetch order history
  const { data: history } = await supabase
    .from('orders')
    .select('status, created_at, wilaya_id, total')
    .eq('store_id', input.storeId)
    .eq('customer_phone', input.phone)
    .order('created_at', { ascending: false })

  const allOrders    = history ?? []
  const cancelledCt  = allOrders.filter(o => ['cancelled','returned','failed'].includes(o.status)).length
  const totalCt      = allOrders.length

  // 4. New phone — no history (+5)
  if (totalCt === 0) {
    score += 5
    details.newPhone = true
  }

  // 5. Multiple orders same day (+15)
  const todayStart = new Date()
  todayStart.setHours(0, 0, 0, 0)
  const todayOrders = allOrders.filter(o => new Date(o.created_at) >= todayStart)
  if (todayOrders.length >= 2) {
    score += 15
    reasons.push(`${todayOrders.length} طلبات اليوم من نفس الرقم`)
    details.multipleToday = true
  }

  // 6. High cancellation rate (+20)
  if (totalCt >= 2 && cancelledCt / totalCt > 0.5) {
    score += 20
    reasons.push(`معدل إلغاء ${Math.round((cancelledCt / totalCt) * 100)}%`)
    details.highCancellation = true
  }
  // Extra penalty: ≥3 cancellations (+15)
  if (cancelledCt >= 3) {
    score += 15
    reasons.push(`${cancelledCt} طلبات ملغاة سابقاً`)
  }

  // 7. Late night order 2AM–5AM (+5)
  const hour = input.orderHour ?? new Date().getHours()
  if (hour >= 2 && hour <= 5) {
    score += 5
    reasons.push('طلب في ساعات الليل المتأخرة')
    details.lateNightOrder = true
  }

  // 8. High value first order >20,000 DZD (+10)
  if (totalCt === 0 && input.orderTotal > 20000) {
    score += 10
    reasons.push(`طلب بقيمة ${input.orderTotal.toLocaleString()} دج من عميل جديد`)
    details.highValueFirst = true
  }

  // 9. Wilaya mismatch (most orders from diff wilaya) (+10)
  if (allOrders.length >= 3) {
    const wilayas = allOrders.map(o => o.wilaya_id)
    const mode = wilayas.sort((a, b) =>
      wilayas.filter(w => w === a).length - wilayas.filter(w => w === b).length
    ).pop()
    if (mode && mode !== input.wilayaId) {
      score += 10
      reasons.push('الولاية مختلفة عن الطلبات السابقة')
      details.wilayaMismatch = true
    }
  }

  const finalScore = Math.min(score, 100)
  const recommendation: FraudResult['recommendation'] =
    finalScore >= blockThreshold ? 'reject' :
    finalScore >= 40            ? 'call-first' :
    'confirm'

  return {
    score: finalScore,
    reasons,
    recommendation,
    isBlacklisted: false,
    details,
  }
}
