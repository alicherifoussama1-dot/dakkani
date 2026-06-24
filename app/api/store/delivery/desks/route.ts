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

    if (provider.provider_type === 'yalidine') {
      const creds = decryptCredentials<any>(provider.credentials)
      const apiId = creds.apiId || creds.id || ''
      const apiToken = creds.apiToken || creds.token || ''
      console.log(`[desks] yalidine wilaya=${wilayaCode} id=${mask(apiId)} token=${mask(apiToken)}`)
      const res = await fetch('https://api.yalidine.app/v1/centers/?page_size=1000', {
        headers: { 'X-API-ID': apiId, 'X-API-TOKEN': apiToken }, next: { revalidate: 3600 },
      })
      if (!res.ok) {
        console.warn(`[desks] yalidine HTTP ${res.status}`)
        return NextResponse.json({ offices: [], hasProvider: true, providerType: 'yalidine', error: 'تعذّر جلب مكاتب Yalidine — تحقّق من المفاتيح.' })
      }
      const json = await res.json()
      offices = (json.data ?? [])
        .filter((c: any) => parseInt(c.wilaya_id, 10) === wilayaId)
        .map((c: any) => ({ id: String(c.id), name: c.name, address: c.address ?? '', wilaya: c.wilaya_name ?? '', commune: c.commune_name ?? '' }))
    } else {
      // ZR Express + others: no carrier desks API → merchant-managed list.
      const { data: manual } = await supabase.from('store_delivery_offices')
        .select('id, name, address').eq('store_id', storeId).eq('wilaya_code', wilayaCode).eq('is_active', true)
        .or(`provider_id.eq.${provider.id},provider_id.is.null`).order('name')
      offices = (manual ?? []).map((o: any) => ({ id: String(o.id), name: o.name, address: o.address ?? '', wilaya: wilayaCode, commune: '' }))
      console.log(`[desks] ${provider.provider_type} wilaya=${wilayaCode} → ${offices.length} managed offices`)
    }

    cache.set(key, { at: Date.now(), offices })
    return NextResponse.json({ offices, hasProvider: true, providerType: provider.provider_type })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? 'خطأ غير متوقع', hasProvider: false }, { status: 500 })
  }
}
