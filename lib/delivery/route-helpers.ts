// Shared auth/store context + provider resolution for /api/delivery/* routes.
import { NextResponse } from 'next/server'
import { createServerClient, getActiveStore } from '@/lib/supabase/server'
import { adapterFromRow } from '@/lib/delivery'

export async function storeCtx() {
  const supabase = createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: NextResponse.json({ error: 'غير مصرح' }, { status: 401 }) }
  const { activeStore: store } = await getActiveStore(supabase, user.id)
  if (!store) return { error: NextResponse.json({ error: 'لا يوجد متجر' }, { status: 404 }) }
  return { supabase, store }
}

export async function getProvider(supabase: any, storeId: string, providerId: string) {
  const { data } = await supabase
    .from('delivery_providers').select('*')
    .eq('id', providerId).eq('store_id', storeId).single()
  return data
}

export function adapterFor(provider: any) {
  return adapterFromRow({ provider_type: provider.provider_type, credentials: provider.credentials })
}
