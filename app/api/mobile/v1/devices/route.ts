// ============================================================
// POST   /api/mobile/v1/devices  — register / refresh a push token
// PATCH  /api/mobile/v1/devices  — update per-device preferences
// DELETE /api/mobile/v1/devices  — unregister (logout)
// ============================================================
export const dynamic = 'force-dynamic'

import { z } from 'zod'
import { getMobileContext, ok, fail } from '@/lib/mobile/context'

const registerSchema = z.object({
  token: z.string().min(20),
  platform: z.enum(['ios', 'android']),
  app_version: z.string().optional(),
  locale: z.string().default('ar'),
})

export async function POST(req: Request) {
  const ctx = await getMobileContext(req)
  if ('error' in ctx) return ctx.error

  const parsed = registerSchema.safeParse(await req.json().catch(() => ({})))
  if (!parsed.success) return fail(parsed.error.errors[0]?.message ?? 'Invalid payload')

  // Upsert on token: reinstalling or switching account re-points the same
  // device row instead of leaving an orphan that would double-notify.
  const { error } = await ctx.supabase.from('device_tokens').upsert(
    {
      store_id: ctx.store.id,
      user_id: ctx.userId,
      token: parsed.data.token,
      platform: parsed.data.platform,
      app_version: parsed.data.app_version ?? null,
      locale: parsed.data.locale,
      last_seen_at: new Date().toISOString(),
    },
    { onConflict: 'token' },
  )
  if (error) return fail(error.message, 500)

  return ok({ registered: true, store_id: ctx.store.id })
}

const prefsSchema = z.object({
  token: z.string().min(20),
  push_enabled: z.boolean().optional(),
  sound_enabled: z.boolean().optional(),
  vibration_enabled: z.boolean().optional(),
})

export async function PATCH(req: Request) {
  const ctx = await getMobileContext(req)
  if ('error' in ctx) return ctx.error

  const parsed = prefsSchema.safeParse(await req.json().catch(() => ({})))
  if (!parsed.success) return fail('Invalid payload')

  const { token, ...prefs } = parsed.data
  if (Object.keys(prefs).length === 0) return fail('No preferences supplied')

  const { error } = await ctx.supabase
    .from('device_tokens')
    .update(prefs)
    .eq('token', token)
    .eq('store_id', ctx.store.id) // RLS also enforces this; belt and braces
  if (error) return fail(error.message, 500)

  return ok({ updated: true })
}

export async function DELETE(req: Request) {
  const ctx = await getMobileContext(req)
  if ('error' in ctx) return ctx.error

  const token = new URL(req.url).searchParams.get('token')
  if (!token) return fail('token query param required')

  await ctx.supabase.from('device_tokens').delete().eq('token', token).eq('store_id', ctx.store.id)
  return ok({ unregistered: true })
}
