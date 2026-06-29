// GET /api/store/delivery/desks?store_id=&wilaya_id=  — SERVER-SIDE ONLY
// Unified stop-desk / office list for the routed carrier of a wilaya.
//   • Yalidine  → live centers API (X-API-ID / X-API-TOKEN)
//   • ZR Express + others → no carrier desks API exists, so we serve the
//     merchant-managed list (store_delivery_offices). See diagnosis.
// Normalized output: { offices: [{ id, name, address, wilaya, commune }], ... }
// Credentials are decrypted server-side; the browser only calls this route.
import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { decryptCredentials } from '@/lib/delivery'

export const dynamic = 'force-dynamic'

// brief in-memory cache (per server instance) to respect carrier rate limits
const cache = new Map<string, { at: number; offices: any[] }>()
const TTL = 10 * 60 * 1000

const mask = (s?: string) => (s ? s.slice(0, 4) + '…' + s.slice(-2) : '∅')

export async function GET(req: Request) {
  try {
    const url = new URL(req.url)
    const storeId = url.searchParams.get('store_id')
    const wilayaId = parseInt(url.searchParams.get('wilaya_id') ?? '', 10)
    if (!storeId || !wilayaId) return NextResponse.json({ error: 'store_id و wilaya_id مطلوبان' }, { status: 400 })
    const wilayaCode = String(wilayaId).padStart(2, '0')

    const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

    // Resolve the provider routed for this wilaya → else first active.
    const { data: map } = await supabase.from('wilaya_company_map')
      .select('provider_id').eq('store_id', storeId).eq('wilaya_code', wilayaCode).maybeSingle()
    let provider: any
    if (map?.provider_id) {
      provider = (await supabase.from('delivery_providers').select('*').eq('id', map.provider_id).eq('store_id', storeId).single()).data
    } else {
      provider = (await supabase.from('delivery_providers').select('*').eq('store_id', storeId).eq('is_active', true).order('created_at').limit(1).maybeSingle()).data
    }
    if (!provider) return NextResponse.json({ offices: [], hasProvider: false })

    const key = `${provider.id}:${wilayaCode}`
    const hit = cache.get(key)
    if (hit && Date.now() - hit.at < TTL) return NextResponse.json({ offices: hit.offices, hasProvider: true, providerType: provider.provider_type, cached: true })

    let offices: { id: string; name: string; address: string; wilaya: string; commune: string }[] = []

    // Fetch from local store_delivery_offices table
    const { data: manual } = await supabase.from('store_delivery_offices')
      .select('id, name, address').eq('store_id', storeId).eq('wilaya_code', wilayaCode).eq('is_active', true)
      .or(`provider_id.eq.${provider.id},provider_id.is.null`).order('name')

    offices = (manual ?? []).map((o: any) => {
      let commune = ''
      let name = o.name
      if (o.name.includes('|')) {
        const parts = o.name.split('|')
        commune = parts[0].trim()
        name = parts[1].trim()
      }
      return { id: String(o.id), name, address: o.address ?? '', wilaya: wilayaCode, commune }
    })
    console.log(`[desks] ${provider.provider_type} wilaya=${wilayaCode} → ${offices.length} offices from DB`)

    cache.set(key, { at: Date.now(), offices })
    return NextResponse.json({ offices, hasProvider: true, providerType: provider.provider_type })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? 'خطأ غير متوقع', hasProvider: false }, { status: 500 })
  }
}
