// ============================================================
// PLATFORM CORE — public surface.
// Import from '@/lib/platform' in app code.
// ============================================================
export * from './roles'
export { requirePlatformPermission, requireStorePermission, getPlatformContext, rbacResponse, RbacError } from './rbac'
export type { PlatformContext, StoreContext } from './rbac'
export { createServiceClient, scoped } from './service-client'
export { audit, isSuspiciousIp } from './audit'
export { enqueue, processQueue, registerHandler, queueStats } from './queue'
export type { Job, JobType, JobHandler } from './queue'
export { emit, subscribe } from './events'
export type { PlatformEvent } from './events'
export { isEnabled, invalidateFlagCache } from './flags'
export { safe, circuitStates } from './resilience'
export { checkRateLimit, rateLimitResponse } from './rate-limit'
export { getClientInfo, assertSafeUrl, safeFetch } from './security'
export { startSupportSession, endSupportSession, listStoreSupportSessions } from './support'
export { registerPlugin, listPlugins, pluginFlagKey } from './plugins'
export type { PluginDefinition } from './plugins'
export { platformHealth } from './health'
export type { HealthCheck, HealthStatus } from './health'
export { initPlatformRuntime } from './queue-handlers'
