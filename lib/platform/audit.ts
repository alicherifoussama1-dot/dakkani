// ============================================================
// AUDIT LOG — append-only trail of critical actions.
// Writes via service role (RLS: merchants read their store's
// entries, platform staff read everything).
//
// Auditing must NEVER break the action being audited: failures
// are swallowed and reported to console only.
// ============================================================
import { createServiceClient } from './service-client'
import { getClientInfo } from './security'

export interface AuditEntry {
  action: string                       // 'order.status_changed', 'support.session_started', …
  userId?: string | null
  userEmail?: string | null
  role?: string | null
  storeId?: string | null
  resource?: string | null             // 'orders/<id>'
  before?: unknown
  after?: unknown
  metadata?: Record<string, unknown>
  severity?: 'info' | 'warning' | 'critical'
  request?: Request                    // pass the incoming request to capture ip/device/browser
}

export async function audit(entry: AuditEntry): Promise<void> {
  try {
    const client = createServiceClient()
    const info = entry.request ? getClientInfo(entry.request) : null
    const { error } = await client.from('audit_logs').insert({
      action: entry.action,
      user_id: entry.userId ?? null,
      user_email: entry.userEmail ?? null,
      role: entry.role ?? null,
      store_id: entry.storeId ?? null,
      resource: entry.resource ?? null,
      before: entry.before ?? null,
      after: entry.after ?? null,
      metadata: entry.metadata ?? null,
      severity: entry.severity ?? 'info',
      ip: info?.ip ?? null,
      device: info?.device ?? null,
      browser: info?.browser ?? null,
    })
    if (error) console.error('[audit] insert failed:', error.message)
  } catch (e) {
    console.error('[audit] failed:', e instanceof Error ? e.message : e)
  }
}

// ── Suspicious-activity detection ───────────────────────────
// Counts recent warning/critical events from one IP; callers (login,
// password reset) escalate when the threshold is crossed.
export async function isSuspiciousIp(ip: string, windowMinutes = 15, threshold = 10): Promise<boolean> {
  if (!ip || ip === 'unknown') return false
  try {
    const client = createServiceClient()
    const since = new Date(Date.now() - windowMinutes * 60_000).toISOString()
    const { count } = await client
      .from('audit_logs')
      .select('id', { count: 'exact', head: true })
      .eq('ip', ip)
      .in('severity', ['warning', 'critical'])
      .gte('created_at', since)
    return (count ?? 0) >= threshold
  } catch {
    return false
  }
}
