// POST /api/delivery/import-rates/[providerId]?target=declared|real
// Calls the courier rates API → upserts 58-wilaya prices (source 'imported').
// Manual edits are preserved (only rows still 'imported' are overwritten).
import { NextResponse } from 'next/server'
import { storeCtx, getProvider, adapterFor } from '@/lib/delivery/route-helpers'
import { providerMeta, decryptCredentials } from '@/lib/delivery'
import { ZR_OFFICES } from '@/lib/delivery/zr-offices'

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

  const adapter = adapterFor(provider)
  const test = await adapter.testCredentials().catch(err => ({ ok: false, message: err.message }))
  if (!test.ok) {
    return NextResponse.json({ error: `بيانات الاعتماد غير صالحة: ${test.message}` }, { status: 400 })
  }

  let rates: any[] = []
  let priceSyncError: string | null = null

  try {
    rates = await adapter.importRates(provider.from_wilaya_code)
  } catch (e: any) {
    priceSyncError = e?.message ?? String(e)
    if (provider.provider_type !== 'zrexpress') {
      return NextResponse.json({ error: `فشل استيراد الأسعار: ${priceSyncError}` }, { status: 502 })
    }
  }

  let importedCount = 0
  let skippedManualCount = 0

  if (rates && rates.length > 0) {
    // Don't clobber rows the merchant manually edited.
    const { data: manualRows } = await ctx.supabase
      .from(table).select('wilaya_code').eq('provider_id', provider.id).eq('source', 'manual')
    const manual = new Set((manualRows ?? []).map((r: any) => r.wilaya_code))
    skippedManualCount = manual.size

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
      importedCount = payload.length
    }
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
          await ctx.supabase.from('store_delivery_offices')
            .delete()
            .eq('store_id', ctx.store.id)
            .eq('provider_id', provider.id)

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
  } else if (provider.provider_type === 'zrexpress') {
    try {
      // Seed offices from static bundled data ZR_OFFICES
      const officesPayload = ZR_OFFICES.map(o => {
        const wCode = String(o.wilaya).padStart(2, '0')
        const formattedName = `${o.commune || ''} | ${o.name}`
        return {
          store_id: ctx.store.id,
          provider_id: provider.id,
          wilaya_code: wCode,
          name: formattedName,
          address: o.phone ? `الهاتف: ${o.phone}` : null,
          is_active: true
        }
      })

      if (officesPayload.length > 0) {
        await ctx.supabase.from('store_delivery_offices')
          .delete()
          .eq('store_id', ctx.store.id)
          .eq('provider_id', provider.id)

        const { error: officeErr } = await ctx.supabase.from('store_delivery_offices').insert(officesPayload)
        if (officeErr) {
          console.error('Error inserting ZR Express offices:', officeErr.message)
        } else {
          officesImported = officesPayload.length
        }
      }
    } catch (err) {
      console.error('Error seeding ZR Express offices:', err)
    }
  }

  if (priceSyncError && provider.provider_type === 'zrexpress') {
    return NextResponse.json({ ok: true, imported: 0, skippedManual: 0, officesImported, warning: priceSyncError })
  }

  return NextResponse.json({ ok: true, imported: importedCount, skippedManual: skippedManualCount, officesImported })
}
