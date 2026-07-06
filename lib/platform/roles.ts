// ============================================================
// CENTRALIZED RBAC — role & permission definitions
// Single source of truth. No permission checks anywhere else:
// routes call requirePlatformRole / requireStorePermission
// (lib/platform/rbac.ts) which consult this matrix.
// ============================================================

export type PlatformRole = 'platform_owner' | 'platform_admin' | 'platform_support'
export type StoreRole = 'owner' | 'admin' | 'manager' | 'employee' | 'viewer'

// Ordered high → low; used for "at least X" comparisons.
const PLATFORM_ORDER: PlatformRole[] = ['platform_owner', 'platform_admin', 'platform_support']
const STORE_ORDER: StoreRole[] = ['owner', 'admin', 'manager', 'employee', 'viewer']

export function platformRoleAtLeast(role: PlatformRole, min: PlatformRole): boolean {
  return PLATFORM_ORDER.indexOf(role) <= PLATFORM_ORDER.indexOf(min)
}

export function storeRoleAtLeast(role: StoreRole, min: StoreRole): boolean {
  return STORE_ORDER.indexOf(role) <= STORE_ORDER.indexOf(min)
}

// ── Store-level permissions ─────────────────────────────────
export type StorePermission =
  | 'products.read' | 'products.write'
  | 'orders.read' | 'orders.write' | 'orders.confirm'
  | 'customers.read' | 'customers.write'
  | 'payments.read' | 'payments.write'
  | 'domains.manage'
  | 'tracking.manage'
  | 'settings.read' | 'settings.write'
  | 'team.manage'
  | 'store.delete'

const ALL: StorePermission[] = [
  'products.read', 'products.write',
  'orders.read', 'orders.write', 'orders.confirm',
  'customers.read', 'customers.write',
  'payments.read', 'payments.write',
  'domains.manage', 'tracking.manage',
  'settings.read', 'settings.write',
  'team.manage', 'store.delete',
]

const READ_ONLY: StorePermission[] = [
  'products.read', 'orders.read', 'customers.read', 'payments.read', 'settings.read',
]

export const STORE_PERMISSIONS: Record<StoreRole, ReadonlySet<StorePermission>> = {
  owner: new Set(ALL),
  admin: new Set(ALL.filter(p => p !== 'store.delete')),
  manager: new Set<StorePermission>([
    ...READ_ONLY,
    'products.write', 'orders.write', 'orders.confirm', 'customers.write', 'tracking.manage',
  ]),
  employee: new Set<StorePermission>([...READ_ONLY, 'orders.write', 'orders.confirm']),
  viewer: new Set(READ_ONLY),
}

export function storeRoleCan(role: StoreRole, permission: StorePermission): boolean {
  return STORE_PERMISSIONS[role]?.has(permission) ?? false
}

// ── Platform-level permissions ──────────────────────────────
export type PlatformPermission =
  | 'platform.stores.read' | 'platform.stores.suspend'
  | 'platform.users.manage'
  | 'platform.flags.read' | 'platform.flags.write'
  | 'platform.audit.read'
  | 'platform.queue.read' | 'platform.queue.manage'
  | 'platform.health.read'
  | 'platform.support.start'
  | 'platform.backup.run'

export const PLATFORM_PERMISSIONS: Record<PlatformRole, ReadonlySet<PlatformPermission>> = {
  platform_owner: new Set<PlatformPermission>([
    'platform.stores.read', 'platform.stores.suspend', 'platform.users.manage',
    'platform.flags.read', 'platform.flags.write', 'platform.audit.read',
    'platform.queue.read', 'platform.queue.manage', 'platform.health.read',
    'platform.support.start', 'platform.backup.run',
  ]),
  platform_admin: new Set<PlatformPermission>([
    'platform.stores.read', 'platform.stores.suspend',
    'platform.flags.read', 'platform.flags.write', 'platform.audit.read',
    'platform.queue.read', 'platform.queue.manage', 'platform.health.read',
    'platform.support.start',
  ]),
  platform_support: new Set<PlatformPermission>([
    'platform.stores.read', 'platform.audit.read', 'platform.health.read',
    'platform.support.start',
  ]),
}

export function platformRoleCan(role: PlatformRole, permission: PlatformPermission): boolean {
  return PLATFORM_PERMISSIONS[role]?.has(permission) ?? false
}
