// ============================================================
// Auto-blacklist engine
// Triggered by order status changes
// ============================================================
import type { SupabaseClient } from '@supabase/supabase-js'

const CANCEL_THRESHOLD = 3

export async function checkAndAutoBlacklist(
  supabase: SupabaseClient,
  storeId: string,
  phone: string,
  customerName: string
): Promise<{ blacklisted: boolean; reason?: string }> {
  // Already blacklisted?
  const { data: existing } = await supabase
    .from('blacklisted_customers')
    .select('id')
    .or(`store_id.eq.${storeId},store_id.is.null`)
    .eq('phone', phone)
    .maybeSingle()

  if (existing) return { blacklisted: true }

  // Count cancellations
  const { count } = await supabase
    .from('orders')
    .select('id', { count: 'exact', head: true })
    .eq('store_id', storeId)
    .eq('customer_phone', phone)
    .in('status', ['cancelled', 'returned', 'failed'])

  if ((count ?? 0) >= CANCEL_THRESHOLD) {
    const reason = `حظر تلقائي: ${count} طلبات ملغاة/مرجعة`
    await supabase.from('blacklisted_customers').upsert({
      store_id:  storeId,
      phone,
      full_name: customerName,
      reason,
    }, { onConflict: 'store_id,phone' })

    return { blacklisted: true, reason }
  }

  return { blacklisted: false }
}
