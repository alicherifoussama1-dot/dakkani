// ============================================================
// /api/delivery/providers
//  GET    → list providers (credentials masked, never raw)
//  POST   → add/update a provider (credentials encrypted server-side)
//  PATCH  → toggle is_active / is_automatic
//  DELETE → remove a provider (?id=)
// ============================================================
import { NextResponse } from 'next/server'
import { z } from 'zod'
import { encryptCredentials, decryptCredentials, maskCredential, providerMeta } from '@/lib/delivery'
import type { ProviderType } from '@/lib/delivery'
import { storeCtx } from '@/lib/delivery/route-helpers'

const addSchema = z.object({
  id: z.string().uuid().optional(),
  provider_type: z.enum(['yalidine', 'zrexpress', 'ecotrack', 'maystro', 'noest']),
  display_name: z.string().min(1),
  credentials: z.record(z.string()).default({}),
  from_wilaya_code: z.string().optional(),
})

export async function GET() {
  const ctx = await storeCtx(); if ('error' in ctx) return ctx.error
  const { data } = await ctx.supabase
    .from('delivery_providers').select('*').eq('store_id', ctx.store.id).order('created_at')
  const safe = (data ?? []).map((p: any) => {
    const c = decryptCredentials<Record<string, string>>(p.credentials)
    const masked: Record<string, string> = {}
    for (const k of Object.keys(c)) masked[k] = maskCredential(c[k])
    return { ...p, credentials: masked }
  })
  return NextResponse.json({ providers: safe })
}

export async function POST(req: Request) {
  const ctx = await storeCtx(); if ('error' in ctx) return ctx.error
  try {
    const body = addSchema.parse(await req.json())
    const row: Record<string, unknown> = {
      store_id: ctx.store.id,
      provider_type: body.provider_type as ProviderType,
      display_name: body.display_name,
      from_wilaya_code: body.from_wilaya_code ?? '16',
      updated_at: new Date().toISOString(),
    }
    // Only re-encrypt when real (non-masked) credentials are provided.
    const hasReal = Object.values(body.credentials).some(v => v && !v.startsWith('••••'))
    if (hasReal) row.credentials = encryptCredentials(body.credentials)

    if (body.id) {
      await ctx.supabase.from('delivery_providers').update(row).eq('id', body.id).eq('store_id', ctx.store.id)
      return NextResponse.json({ ok: true, id: body.id })
    }
    const { data, error } = await ctx.supabase.from('delivery_providers')
      .insert({ ...row, credentials: row.credentials ?? encryptCredentials(body.credentials) })
      .select('id').single()
    if (error) return NextResponse.json({ error: error.message }, { status: 400 })
    return NextResponse.json({ ok: true, id: data.id, hasRatesApi: providerMeta(body.provider_type)?.hasRatesApi })
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 400 })
  }
}

export async function PATCH(req: Request) {
  const ctx = await storeCtx(); if ('error' in ctx) return ctx.error
  const { id, is_active, is_automatic } = await req.json()
  if (!id) return NextResponse.json({ error: 'id مطلوب' }, { status: 400 })
  const patch: Record<string, unknown> = { updated_at: new Date().toISOString() }
  if (typeof is_active === 'boolean') patch.is_active = is_active
  if (typeof is_automatic === 'boolean') patch.is_automatic = is_automatic
  await ctx.supabase.from('delivery_providers').update(patch).eq('id', id).eq('store_id', ctx.store.id)
  return NextResponse.json({ ok: true })
}

export async function DELETE(req: Request) {
  const ctx = await storeCtx(); if ('error' in ctx) return ctx.error
  const id = new URL(req.url).searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'id مطلوب' }, { status: 400 })
  await ctx.supabase.from('delivery_providers').delete().eq('id', id).eq('store_id', ctx.store.id)
  return NextResponse.json({ ok: true })
}
