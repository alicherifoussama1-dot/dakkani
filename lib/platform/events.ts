// ============================================================
// EVENT BUS — decoupled, event-driven module communication.
//
//   emit('order.created', { orderId, storeId, ... })
//     → persisted to platform_events (outbox / audit of events)
//     → each subscriber becomes an isolated job in the queue
//
// Subscribers never run inline and never block or break the
// emitting request. One failing subscriber only retries itself.
// Register subscribers in lib/platform/queue-handlers.ts.
// ============================================================
import { createServiceClient } from './service-client'
import { enqueue } from './queue'

export type PlatformEvent =
  | 'order.created'
  | 'order.confirmed'
  | 'order.status_changed'
  | 'order.cancelled'
  | 'product.created'
  | 'product.updated'
  | 'store.created'
  | 'store.suspended'
  | 'domain.connected'
  | 'customer.blacklisted'
  | (string & {})    // plugins can define custom events

export interface EventPayload {
  storeId?: string
  [key: string]: unknown
}

// event name → job types to fan out to
const subscriptions = new Map<string, Set<string>>()

/** Declare that `jobType` should run whenever `event` is emitted. */
export function subscribe(event: PlatformEvent, jobType: string): void {
  if (!subscriptions.has(event)) subscriptions.set(event, new Set())
  subscriptions.get(event)!.add(jobType)
}

/**
 * Emit a domain event. Never throws — emitting is a side effect and must
 * not break the business action (graceful degradation by construction).
 */
export async function emit(event: PlatformEvent, payload: EventPayload): Promise<void> {
  try {
    const client = createServiceClient()
    const { error } = await client.from('platform_events').insert({
      name: event,
      store_id: payload.storeId ?? null,
      payload,
    })
    if (error) console.error('[events] persist failed:', error.message)

    const subs = subscriptions.get(event)
    if (subs) {
      await Promise.all(Array.from(subs).map(jobType =>
        enqueue(jobType, { event, ...payload }, { storeId: payload.storeId }),
      ))
    }
  } catch (e) {
    console.error('[events] emit failed:', e instanceof Error ? e.message : e)
  }
}
