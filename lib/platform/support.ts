// ============================================================
// SUPPORT MODE — platform support enters a merchant account.
//
//  • Time-boxed (2h default), read-only via RLS policy
//    "support_session_read" (migration 027).
//  • Fully audited (start + end, with ip/device).
//  • Merchant-visible: support_sessions RLS lets the merchant
//    read sessions on their store; the dashboard surfaces them.
// ============================================================
import { createServiceClient } from './service-client'
import { audit } from './audit'

export async function startSupportSession(opts: {
  supportUserId: string
  supportEmail: string | null
  storeId: string
  reason: string
  request?: Request
}) {
  const client = createServiceClient()
  const { data, error } = await client.from('support_sessions').insert({
    support_user_id: opts.supportUserId,
    store_id: opts.storeId,
    reason: opts.reason,
  }).select('id, expires_at').single()
  if (error) throw new Error(`Failed to start support session: ${error.message}`)

  await audit({
    action: 'support.session_started',
    userId: opts.supportUserId,
    userEmail: opts.supportEmail,
    role: 'platform_support',
    storeId: opts.storeId,
    resource: `support_sessions/${data.id}`,
    metadata: { reason: opts.reason },
    severity: 'warning',
    request: opts.request,
  })
  return data
}

export async function endSupportSession(opts: {
  sessionId: string
  supportUserId: string
  request?: Request
}) {
  const client = createServiceClient()
  const { data, error } = await client.from('support_sessions')
    .update({ ended_at: new Date().toISOString() })
    .eq('id', opts.sessionId)
    .eq('support_user_id', opts.supportUserId)
    .is('ended_at', null)
    .select('id, store_id').single()
  if (error) throw new Error(`Failed to end support session: ${error.message}`)

  await audit({
    action: 'support.session_ended',
    userId: opts.supportUserId,
    storeId: data.store_id,
    resource: `support_sessions/${data.id}`,
    request: opts.request,
  })
  return data
}

/** Sessions visible to a merchant (their store's access history). */
export async function listStoreSupportSessions(storeId: string) {
  const client = createServiceClient()
  const { data } = await client.from('support_sessions')
    .select('id, reason, started_at, expires_at, ended_at')
    .eq('store_id', storeId)
    .order('started_at', { ascending: false })
    .limit(50)
  return data ?? []
}
