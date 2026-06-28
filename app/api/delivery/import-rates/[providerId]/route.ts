// POST /api/delivery/import-rates/[providerId]?target=declared|real
// Calls the courier rates API → upserts 58-wilaya prices (source 'imported').
// Manual edits are preserved (only rows still 'imported' are overwritten).
import { NextResponse } from 'next/server'
import { storeCtx, getProvider, adapterFor } from '@/lib/delivery/route-helpers'
import { providerMeta, decryptCredentials } from '@/lib/delivery'

export async function POST(req: Request, { params }: { params: { providerId: string } }) {
  const ctx = await storeCtx(); if ('error' in ctx) return ctx.error
  const target = new URL(req.url).searchParams.get('target') === 'real' ? 'real' : 'declared'
  const table = target === 'real' ? 'delivery_real_prices' : 'delivery_declared_prices'

  const provider = await getProvider(ctx.supabase, ctx.store.id, params.providerId)
  if (!provider) return NextResponse.json({ error: 'الشركة غير موجودة' }, { status: 404 })

  const meta = providerMeta(provider.provider_type)
  if (meta && !meta.hasRatesApi) {
    return NextResponse.json({ error: 'هذه الشركة لا توفر استيراد الأسعار تلقائياً — أدخل الأسعار يدوياً', code: 'NO_RATES_API' }, { status: 422 })
  }

  let rates
  try {
    rates = await adapterFor(provider).importRates(provider.from_wilaya_code)
  } catch (e) {
    return NextResponse.json({ error: `فشل الاستيراد: ${(e as Error).message}` }, { status: 502 })
  }
  if (!rates.length) {
    return NextResponse.json({ error: 'لم تُرجع الشركة أي أسعار — تحقق من البيانات أو أدخلها يدوياً', code: 'EMPTY' }, { status: 422 })
  }

  // Don't clobber rows the merchant manually edited.
  const { data: manualRows } = await ctx.supabase
    .from(table).select('wilaya_code').eq('provider_id', provider.id).eq('source', 'manual')
  const manual = new Set((manualRows ?? []).map((r: any) => r.wilaya_code))

  const payload = rates
    .filter(r => !manual.has(r.wilayaCode))
    .map(r => ({
      store_id: ctx.store.id, provider_id: provider.id, wilaya_code: r.wilayaCode,
      home_price: r.homePrice, stopdesk_price: r.stopdeskPrice,
      source: 'imported', updated_at: new Date().toISOString(),
    }))

  if (payload.length) {
    const { error } = await ctx.supabase.from(table).upsert(payload, { onConflict: 'provider_id,wilaya_code' })
    if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  }

  let officesImported = 0
  if (provider.provider_type === 'yalidine') {
    try {
      const creds = decryptCredentials<any>(provider.credentials)
      const apiId = creds.apiId || creds.id || ''
      const apiToken = creds.apiToken || creds.token || ''

      const res = await fetch('https://api.yalidine.app/v1/centers/?page_size=1000', {
        headers: { 'X-API-ID': apiId, 'X-API-TOKEN': apiToken }
      })
      if (res.ok) {
        const json = await res.json()
        const centers = json.data || []
        const officesPayload = centers.map((c: any) => {
          const wCode = String(c.wilaya_id).padStart(2, '0')
          const formattedName = `${c.commune_name || ''} | ${c.name}`
          return {
            store_id: ctx.store.id,
            provider_id: provider.id,
            wilaya_code: wCode,
            name: formattedName,
            address: c.address || null,
            is_active: true
          }
        })

        if (officesPayload.length > 0) {
          // Delete existing imported offices for this provider to prevent duplicates
          await ctx.supabase.from('store_delivery_offices')
            .delete()
            .eq('store_id', ctx.store.id)
            .eq('provider_id', provider.id)

          // Insert new ones
          const { error: officeErr } = await ctx.supabase.from('store_delivery_offices').insert(officesPayload)
          if (officeErr) {
            console.error('Error inserting Yalidine offices:', officeErr.message)
          } else {
            officesImported = officesPayload.length
          }
        }
      }
    } catch (err) {
      console.error('Error syncing Yalidine offices:', err)
    }
  }

  return NextResponse.json({ ok: true, imported: payload.length, skippedManual: manual.size, officesImported })
}
