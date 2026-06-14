// ============================================================
// /api/delivery/providers
//  GET    → list providers (credentials masked, never raw)
//  POST   → add/update a provider (credentials encrypted server-side)
//  PATCH  → toggle is_active / is_automatic
//  DELETE → remove a provider (?id=)
// ============================================================
import { NextResponse } from 'next/server'
import { z } from 'zod'
import { encryptCredentials, decryptCredentials, maskCredential, providerMeta, validateCreds } from '@/lib/delivery'
import type { ProviderType } from '@/lib/delivery'
import { storeCtx } from '@/lib/delivery/route-helpers'

const addSchema = z.object({
  id: z.string().uuid().optional(),
  provider_type: z.enum(['yalidine', 'zrexpress', 'ecotrack', 'maystro', 'noest']),
  display_name: z.string().min(1),
  credentials: z.record(z.string()).default({}),
  is_automatic: z.boolean().optional(),
  from_wilaya_code: z.string().optional(),
})

const MASK = '••••'

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
    if (typeof body.is_automatic === 'boolean') row.is_automatic = body.is_automatic

    // A masked credential value means the merchant left it unchanged in the
    // edit form → keep the existing encrypted creds (avoid storing "••••").
    const values = Object.values(body.credentials)
    const anyMasked = values.some(v => String(v).includes(MASK))
    const hasValues = values.length > 0

    if (body.id) {
      // Editing: only re-encrypt + validate when fresh (unmasked) creds given.
      if (hasValues && !anyMasked) {
        const v = validateCreds(body.provider_type as ProviderType, body.credentials)
        if (!v.ok) return NextResponse.json({ error: `ينقص المفتاح: ${v.missing}` }, { status: 400 })
        row.credentials = encryptCredentials(body.credentials)
      }
      await ctx.supabase.from('delivery_providers').update(row).eq('id', body.id).eq('store_id', ctx.store.id)
      return NextResponse.json({ ok: true, id: body.id })
    }

    // Creating: credentials are required + must validate.
    if (!hasValues || anyMasked) return NextResponse.json({ error: 'أدخل بيانات الدخول (JSON)' }, { status: 400 })
    const v = validateCreds(body.provider_type as ProviderType, body.credentials)
    if (!v.ok) return NextResponse.json({ error: `ينقص المفتاح: ${v.missing}` }, { status: 400 })
    row.credentials = encryptCredentials(body.credentials)
    const { data, error } = await ctx.supabase.from('delivery_providers')
      .insert(row).select('id').single()
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
