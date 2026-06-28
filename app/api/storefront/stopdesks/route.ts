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

    let offices: { code: string; name: string }[] = []

    // Fetch from local store_delivery_offices table
    const { data: manual } = await supabase
      .from('store_delivery_offices')
      .select('id, name, address')
      .eq('store_id', storeId)
      .eq('wilaya_code', wilayaCode)
      .eq('is_active', true)
      .or(`provider_id.eq.${provider.id},provider_id.is.null`)
      .order('name')

    offices = (manual ?? []).map((o: any) => {
      let commune = ''
      let name = o.name
      if (o.name.includes('|')) {
        const parts = o.name.split('|')
        commune = parts[0].trim()
        name = parts[1].trim()
      }
      const displayName = commune ? `${name} - ${o.address || ''} (${commune})` : (o.address ? `${name} — ${o.address}` : name)
      return {
        code: String(o.id),
        name: displayName
      }
    })

    return NextResponse.json({ offices, hasProvider: true, providerType: provider.provider_type })
  } catch (e: any) {
    return NextResponse.json({ error: e.message, hasProvider: false }, { status: 500 })
  }
}
