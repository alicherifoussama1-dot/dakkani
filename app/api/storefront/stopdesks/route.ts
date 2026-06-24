import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { decryptCredentials } from '@/lib/delivery'

export const dynamic = 'force-dynamic'

export async function GET(req: Request) {
  try {
    const url = new URL(req.url)
    const storeId = url.searchParams.get('store_id')
    const wilayaIdStr = url.searchParams.get('wilaya_id')

    if (!storeId || !wilayaIdStr) {
      return NextResponse.json({ error: 'store_id and wilaya_id are required' }, { status: 400 })
    }

    const wilayaId = parseInt(wilayaIdStr, 10)
    const wilayaCode = String(wilayaId).padStart(2, '0')

    // Initialize Supabase admin client to query delivery_providers bypass RLS
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    // 1. Resolve provider for this specific wilaya using mapping
    let providerId: string | undefined
    const { data: map } = await supabase
      .from('wilaya_company_map')
      .select('provider_id')
      .eq('store_id', storeId)
      .eq('wilaya_code', wilayaCode)
      .maybeSingle()

    if (map?.provider_id) {
      providerId = map.provider_id
    }

    let provider: any
    if (providerId) {
      const { data } = await supabase
        .from('delivery_providers')
        .select('*')
        .eq('id', providerId)
        .eq('store_id', storeId)
        .single()
      provider = data
    } else {
      // Fallback to first active provider
      const { data } = await supabase
        .from('delivery_providers')
        .select('*')
        .eq('store_id', storeId)
        .eq('is_active', true)
        .order('created_at')
        .limit(1)
        .maybeSingle()
      provider = data
    }

    if (!provider) {
      return NextResponse.json({ offices: [], hasProvider: false })
    }

    const creds = decryptCredentials<any>(provider.credentials)

    if (provider.provider_type === 'yalidine') {
      const apiId = creds.apiId || ''
      const apiToken = creds.apiToken || ''

      // Fetch centers from Yalidine API (filtered by wilaya_id to save bandwidth/processing)
      const res = await fetch(`https://api.yalidine.app/v1/centers/?page_size=1000`, {
        headers: {
          'X-API-ID': apiId,
          'X-API-TOKEN': apiToken,
        },
        next: { revalidate: 3600 } // Cache for 1 hour
      })

      if (!res.ok) {
        return NextResponse.json({ offices: [], hasProvider: true, providerType: 'yalidine' })
      }

      const json = await res.json()
      const centers = json.data || []
      const offices = centers
        .filter((c: any) => parseInt(c.wilaya_id, 10) === wilayaId)
        .map((c: any) => ({
          code: String(c.id),
          name: `${c.name} - ${c.address || ''} (${c.commune_name || ''})`,
        }))

      return NextResponse.json({ offices, hasProvider: true, providerType: 'yalidine' })
    }

    // Other couriers (ZR Express, etc.) have no offices API → use the
    // merchant-managed list (store_delivery_offices) for this wilaya.
    const { data: manual } = await supabase
      .from('store_delivery_offices')
      .select('id, name, address')
      .eq('store_id', storeId)
      .eq('wilaya_code', wilayaCode)
      .eq('is_active', true)
      .or(`provider_id.eq.${provider.id},provider_id.is.null`)
      .order('name')

    const offices = (manual ?? []).map((o: any) => ({
      code: String(o.id),
      name: o.address ? `${o.name} — ${o.address}` : o.name,
    }))
    return NextResponse.json({ offices, hasProvider: true, providerType: provider.provider_type })
  } catch (e: any) {
    return NextResponse.json({ error: e.message, hasProvider: false }, { status: 500 })
  }
}
