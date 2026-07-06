// ============================================================
// RBAC GUARDS — the single entry point for authorization.
//
//   const ctx = await requirePlatformPermission('platform.flags.write')
//   const ctx = await requireStorePermission(storeId, 'orders.write')
//
// Both throw RbacError (→ mapped to 401/403 by rbacResponse) so
// route handlers stay one-liners. No scattered permission checks.
// ============================================================
import { NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'
import {
  type PlatformRole, type StoreRole,
  type PlatformPermission, type StorePermission,
  platformRoleCan, storeRoleCan,
} from './roles'

export class RbacError extends Error {
  constructor(public status: 401 | 403, message: string) { super(message) }
}

export interface PlatformContext {
  userId: string
  email: string | null
  role: PlatformRole
}

export interface StoreContext {
  userId: string
  email: string | null
  storeId: string
  role: StoreRole
  /** set when access is granted through an active support session */
  viaSupportSession: boolean
}

async function currentUser() {
  const supabase = createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new RbacError(401, 'Not authenticated')
  return { supabase, user }
}

/** Resolve the caller's platform role, or null if they are not platform staff. */
export async function getPlatformContext(): Promise<PlatformContext | null> {
  try {
    const { supabase, user } = await currentUser()
    const { data } = await supabase
      .from('platform_users')
      .select('role')
      .eq('user_id', user.id)
      .maybeSingle()
    if (!data) return null
    return { userId: user.id, email: user.email ?? null, role: data.role as PlatformRole }
  } catch {
    return null
  }
}

export async function requirePlatformPermission(permission: PlatformPermission): Promise<PlatformContext> {
  const { supabase, user } = await currentUser()
  const { data } = await supabase
    .from('platform_users')
    .select('role')
    .eq('user_id', user.id)
    .maybeSingle()
  if (!data) throw new RbacError(403, 'Platform access required')
  const role = data.role as PlatformRole
  if (!platformRoleCan(role, permission)) {
    throw new RbacError(403, `Missing platform permission: ${permission}`)
  }
  return { userId: user.id, email: user.email ?? null, role }
}

/**
 * Require store-scoped access. Resolution order:
 *  1. store ownership (stores.owner_id)   → role 'owner'
 *  2. team membership (store_members)     → member role
 *  3. active support session              → role 'viewer' (read-only)
 * Then the resolved role is checked against the permission matrix.
 */
export async function requireStorePermission(
  storeId: string,
  permission: StorePermission,
): Promise<StoreContext> {
  if (!storeId) throw new RbacError(403, 'storeId is required')
  const { supabase, user } = await currentUser()

  let role: StoreRole | null = null
  let viaSupportSession = false

  const { data: owned } = await supabase
    .from('stores').select('id').eq('id', storeId).eq('owner_id', user.id).maybeSingle()
  if (owned) role = 'owner'

  if (!role) {
    const { data: member } = await supabase
      .from('store_members').select('role')
      .eq('store_id', storeId).eq('user_id', user.id).maybeSingle()
    if (member) role = member.role as StoreRole
  }

  if (!role) {
    const { data: session } = await supabase
      .from('support_sessions').select('id')
      .eq('store_id', storeId).eq('support_user_id', user.id)
      .is('ended_at', null).gt('expires_at', new Date().toISOString())
      .maybeSingle()
    if (session) { role = 'viewer'; viaSupportSession = true }
  }

  if (!role) throw new RbacError(403, 'No access to this store')
  if (!storeRoleCan(role, permission)) {
    throw new RbacError(403, `Role '${role}' lacks permission: ${permission}`)
  }
  return { userId: user.id, email: user.email ?? null, storeId, role, viaSupportSession }
}

/** Map RbacError → JSON response; rethrow anything else. */
export function rbacResponse(e: unknown): NextResponse {
  if (e instanceof RbacError) {
    return NextResponse.json({ error: e.message }, { status: e.status })
  }
  throw e
}
