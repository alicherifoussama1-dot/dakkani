// ============================================================
// POST /api/mobile/v1/devices/test — send a REAL push to one device.
//
// The point of this route is diagnostic honesty. A local notification
// fired by the app proves the phone can ring; it proves nothing about
// FCM/APNs credentials, the stored token, or whether the server can reach
// the device when the app is closed. This walks the exact production path
// — lib/push/send.ts, the same transport the order pipeline uses — so a
// merchant can tell "my phone is muted" apart from "the server cannot
// reach me".
//
// It does NOT create an order and does not touch the order pipeline.
// ============================================================
export const dynamic = 'force-dynamic'

import { z } from 'zod'
import { getMobileContext, ok, fail } from '@/lib/mobile/context'

const schema = z.object({ token: z.string().min(20) })

export async function POST(req: Request) {
  const ctx = await getMobileContext(req)
  if ('error' in ctx) return ctx.error

  const parsed = schema.safeParse(await req.json().catch(() => ({})))
  if (!parsed.success) return fail('token مطلوب')

  // The token must belong to a device registered to THIS store. Without this
  // the route would be an arbitrary push sender for any token a caller can
  // guess. RLS enforces the same boundary; this is the explicit check.
  const { data: device } = await ctx.supabase
    .from('device_tokens')
    .select('token,platform,sound_enabled,push_enabled')
    .eq('token', parsed.data.token)
    .eq('store_id', ctx.store.id)
    .maybeSingle()

  if (!device) {
    return fail('هذا الجهاز غير مُسجَّل لهذا المتجر — فعّل الإشعارات أولاً', 404)
  }
  if ((device as any).push_enabled === false) {
    return fail('إشعارات هذا الجهاز موقوفة من الإعدادات', 409)
  }

  const { sendPush } = await import('@/lib/push/send')

  // Deliberately `type: 'test'`, not 'new_order': the app suppresses the OS
  // banner for new_order (it draws its own card) and taps route to the order
  // id, which would 404 here.
  const [result] = await sendPush(
    [{
      token: (device as any).token,
      platform: (device as any).platform,
      sound_enabled: (device as any).sound_enabled,
    }],
    {
      title: '🔔 اختبار إشعارات COMMERCO',
      body: 'وصلك هذا من الخادم — الإشعارات تعمل من طرف إلى طرف.',
      androidChannel: 'orders_v1',
      iosSound: 'new-order.caf',
      data: { type: 'test', sent_at: new Date().toISOString() },
    },
  )

  if (!result?.ok) {
    // `stale` means FCM/APNs rejected the token permanently — the device has
    // to re-register. Say which failure it is; "لم يصل" is not actionable.
    return fail(
      result?.stale
        ? 'التوكن لم يعد صالحاً — أوقف الإشعارات وأعد تفعيلها لإعادة التسجيل'
        : `تعذّر الإرسال: ${result?.error ?? 'سبب غير معروف'}`,
      502,
    )
  }

  return ok({ sent: true, platform: (device as any).platform })
}
