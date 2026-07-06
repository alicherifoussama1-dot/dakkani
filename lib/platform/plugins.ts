// ============================================================
// PLUGIN ARCHITECTURE — extension points for future channels
// (TikTok Shop, Meta, Google Merchant, Amazon, payment and
// shipping providers) without touching the core.
//
// A plugin is a plain object that declares:
//  • which platform events it reacts to (event → queue handler)
//  • which settings it needs per store (schema, stored in
//    store_settings.integrations JSON — no new tables per plugin)
//
// Registration is code-side (lib/platform/registry.ts imports the
// plugin and calls registerPlugin). Enabling/disabling per tenant
// is data-side via feature flags: flag `plugin_<id>` with
// config.store_ids targeting.
// ============================================================
import { subscribe, type PlatformEvent } from './events'
import { registerHandler, type JobHandler } from './queue'

export interface PluginDefinition {
  /** unique id, e.g. 'tiktok-shop' */
  id: string
  name: string
  description?: string
  /** event subscriptions: which domain events this plugin consumes */
  events?: Partial<Record<PlatformEvent, JobHandler>>
  /** extra job types the plugin processes (cron-driven work, callbacks) */
  jobs?: Record<string, JobHandler>
  /** per-store settings keys the plugin expects (documented, validated app-side) */
  settingsSchema?: Record<string, 'string' | 'boolean' | 'number' | 'json'>
}

const plugins = new Map<string, PluginDefinition>()

export function registerPlugin(plugin: PluginDefinition): void {
  if (plugins.has(plugin.id)) return
  plugins.set(plugin.id, plugin)

  // Each event handler becomes an isolated queue job type:
  // plugin fails → its own job retries; core flow never blocks.
  for (const [event, handler] of Object.entries(plugin.events ?? {})) {
    const jobType = `plugin.${plugin.id}.${event}`
    registerHandler(jobType, handler as JobHandler)
    subscribe(event as PlatformEvent, jobType)
  }
  for (const [jobType, handler] of Object.entries(plugin.jobs ?? {})) {
    registerHandler(`plugin.${plugin.id}.${jobType}`, handler)
  }
}

export function listPlugins(): PluginDefinition[] {
  return Array.from(plugins.values())
}

/** Feature-flag key controlling a plugin's rollout. */
export const pluginFlagKey = (pluginId: string) => `plugin_${pluginId}`
