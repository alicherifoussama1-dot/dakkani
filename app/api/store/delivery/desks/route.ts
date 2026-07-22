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
import { resolveCommune } from '@/lib/algeria-baladias'
import { reportError } from '@/lib/monitoring/report'

export const dynamic = 'force-dynamic'

// brief in-memory cache (per server instance) to respect carrier rate limits.
// CACHE_VERSION is baked into every key so a deploy that changes how the office
// commune is derived (see parts[0] split below) never serves a stale entry that
// a warm serverless instance computed under older code.
const CACHE_VERSION = 'v3-commune-canonical'
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

    const key = `${CACHE_VERSION}:${provider.id}:${wilayaCode}`
    const hit = cache.get(key)
    if (hit && Date.now() - hit.at < TTL) return NextResponse.json({ offices: hit.offices, hasProvider: true, providerType: provider.provider_type, cached: true })

    let offices: { id: string; name: string; address: string; wilaya: string; commune: string }[] = []

    // 1) Live carrier desks API when the provider has one (Yalidine centers).
    //    Credentials are decrypted server-side; failures fall through to the
    //    merchant-managed list so the picker never breaks.
    if (provider.provider_type === 'yalidine') {
      try {
        const creds = decryptCredentials<Record<string, string>>(provider.credentials as string)
        const flat: Record<string, string> = {}
        for (const [k, v] of Object.entries(creds ?? {})) flat[k.toLowerCase().replace(/[-_\s]/g, '')] = String(v ?? '')
        const apiId = flat.apiid ?? flat.id ?? ''
        const apiToken = flat.apitoken ?? flat.token ?? ''
        if (apiId && apiToken) {
          const res = await fetch(`https://api.yalidine.app/v1/centers/?wilaya_id=${wilayaId}&page_size=100`, {
            headers: { 'X-API-ID': apiId, 'X-API-TOKEN': apiToken },
            signal: AbortSignal.timeout(8000),
          })
          if (res.ok) {
            const json = await res.json().catch(() => null)
            offices = (json?.data ?? []).map((c: any) => ({
              id: String(c.center_id ?? c.id),
              name: String(c.name ?? ''),
              address: String(c.address ?? ''),
              wilaya: wilayaCode,
              commune: String(c.commune_name ?? ''),
            })).filter((o: any) => o.id && o.name)
            console.log(`[desks] yalidine live centers wilaya=${wilayaCode} → ${offices.length}`)
          }
        }
      } catch (e) {
        console.error(`[desks] yalidine centers fetch failed (falling back to DB):`, (e as Error).message)
      }
    }

    // 2) Merchant-managed list (store_delivery_offices) — the fallback for
    //    carriers without a desks API, and for Yalidine when the live call fails.
    if (offices.length === 0) {
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
        // Normalize the commune to its canonical name_ar so the storefront picker
        // always renders the full bilingual "French - Arabic" label, even if the
        // stored value is an abbreviated/variant spelling. Display-only: falls back
        // to the raw string when nothing matches; the office id is untouched.
        const canonical = resolveCommune(wilayaCode, commune)
        if (canonical) commune = canonical.name_ar
        return { id: String(o.id), name, address: o.address ?? '', wilaya: wilayaCode, commune }
      })
      console.log(`[desks] ${provider.provider_type} wilaya=${wilayaCode} → ${offices.length} offices from DB`)
    }

    cache.set(key, { at: Date.now(), offices })
    return NextResponse.json({ offices, hasProvider: true, providerType: provider.provider_type })
  } catch (e: any) {
    reportError(e, { route: 'GET /api/store/delivery/desks', tags: { kind: 'desks_failure' } })
    return NextResponse.json({ error: e?.message ?? 'خطأ غير متوقع', hasProvider: false }, { status: 500 })
  }
}
