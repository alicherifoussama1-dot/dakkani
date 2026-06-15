// POST /api/delivery/test — validate courier credentials.
// Body: { provider_type, credentials } (pre-save) OR { provider_id } (saved).
import { NextResponse } from 'next/server'
import { buildAdapter } from '@/lib/delivery'
import type { ProviderType, ProviderCredentials } from '@/lib/delivery'
import { storeCtx, getProvider, adapterFor } from '@/lib/delivery/route-helpers'

export async function POST(req: Request) {
  const ctx = await storeCtx(); if ('error' in ctx) return ctx.error
  try {
    const body = await req.json()
    let adapter
    if (body.provider_id) {
      const p = await getProvider(ctx.supabase, ctx.store.id, body.provider_id)
      if (!p) return NextResponse.json({ error: 'الشركة غير موجودة' }, { status: 404 })
      adapter = adapterFor(p)
    } else {
      adapter = buildAdapter(body.provider_type as ProviderType, (body.credentials ?? {}) as ProviderCredentials)
    }
    const result = await adapter.testCredentials()
    // Masked server-side diagnostic log (no secret values, only key names + URL).
    console.log('[delivery/test]', JSON.stringify({
      store: ctx.store.id,
      provider: body.provider_type ?? body.provider_id,
      ok: result.ok,
      url: result.debug?.url,
      method: result.debug?.method,
      httpStatus: result.debug?.httpStatus,
      sentKeys: result.debug?.sentKeys,
      response: result.debug?.response,
    }))
    return NextResponse.json(result, { status: result.ok ? 200 : 400 })
  } catch (e) {
    return NextResponse.json({ ok: false, message: (e as Error).message }, { status: 400 })
  }
}
