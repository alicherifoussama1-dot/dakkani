# Commerco Platform Architecture

Commerco is a multi-tenant SaaS ecommerce platform (Shopify/YouCan class) built on
**Next.js 14 (App Router) + Supabase (Postgres/RLS) + Vercel**. This document records
every architectural decision introduced by the platform-core work: what exists,
why it exists, and how to extend it.

The platform core lives in two places:

| Layer | Location |
|---|---|
| Database (tables, RLS, functions) | `supabase/migrations/027_platform_core.sql` |
| Application (guards, queue, events…) | `lib/platform/*` (import from `@/lib/platform`) |

Everything is **additive and backward compatible**: no existing table, policy,
route, or API contract was changed — merchants, stores, orders, and checkout
behave exactly as before.

---

## 1. Tenancy model

- The **tenant unit is a store** (`stores` table). Every tenant-owned table carries
  `store_id` and has RLS enabled.
- Pre-existing isolation: `owner_id = auth.uid()` policies (migration 002). These
  are untouched and still work.
- New isolation layer: `store_members` (see RBAC) with **additive** policies
  (`team_member_access`) so team members reach only their stores' rows.
- **Platform bypass** happens exclusively through the service-role client
  (`lib/platform/service-client.ts`). Rules:
  - Never import it in client components.
  - For tenant data, use `scoped(client, storeId)` — it force-appends
    `.eq('store_id', …)` to every query so a bypass can never leak across tenants.
  - Every privileged action must write an audit entry.

**Why:** RLS gives us database-enforced isolation that survives application bugs;
the `scoped()` wrapper gives service-role code the same guarantee by construction.

## 2. RBAC (centralized)

`lib/platform/roles.ts` is the **single permission matrix**:

- **Platform roles** (table `platform_users`): `platform_owner`, `platform_admin`,
  `platform_support`. Membership in this table is what makes someone platform staff.
- **Merchant roles** (table `store_members`): `owner`, `admin`, `manager`,
  `employee`, `viewer`. Store owners are backfilled + kept in sync by trigger
  `trg_sync_store_owner`.

Guards (`lib/platform/rbac.ts`) are the only sanctioned check sites:

```ts
const ctx = await requirePlatformPermission('platform.flags.write')
const ctx = await requireStorePermission(storeId, 'orders.write')
```

Both throw `RbacError` → `rbacResponse(e)` maps it to 401/403. **Do not write
ad-hoc role checks in routes**; add a permission to the matrix instead.

**Extending:** add the permission literal to `roles.ts`, grant it to roles in the
matrix, call the guard. One file, one diff, auditable.

## 3. Platform Admin vs Merchant Dashboard

- **Merchant dashboard** — `app/(dashboard)` (+ `app/admin` POS): products,
  orders, customers, payments, domains, tracking, store settings. Nothing
  platform-level appears here.
- **Platform Admin** — `app/platform`: health, merchants, audit logs, feature
  flags, job queue, support mode. Access requires a `platform_users` row;
  merchants who guess the URL are redirected to `/dashboard`.
  - Served at `/platform` (the `/admin` path was already taken by the merchant
    POS; `admin.commerco.app` can be pointed at `/platform` with a host rewrite
    in `middleware.ts` later — no code changes needed).
  - `X-Robots-Tag: noindex` + `Cache-Control: no-store` via `next.config.mjs`.

**Bootstrapping the first platform owner** (service role / SQL editor):

```sql
INSERT INTO platform_users (user_id, role)
VALUES ('<auth-user-uuid>', 'platform_owner');
```

## 4. Security

- **Headers** (`next.config.mjs headers()`): `X-Content-Type-Options`,
  `X-Frame-Options: SAMEORIGIN` (SAMEORIGIN, not DENY — the store builder
  previews storefronts in a same-origin iframe), `Referrer-Policy`, HSTS,
  `Permissions-Policy`. Helmet-equivalent for Next.js.
- **SQLi**: no string-built SQL anywhere; all access goes through supabase-js
  parameterized builders + RLS as depth defense.
- **XSS**: React escaping + zod validation at API boundaries; no
  `dangerouslySetInnerHTML` introduced by the platform core.
- **CSRF**: Supabase auth cookies are SameSite=Lax; state-changing platform APIs
  additionally require an authenticated session + RBAC permission. Public
  checkout POST is intentionally session-free (guest checkout) and protected by
  rate limiting + fraud scoring instead.
- **SSRF** (`lib/platform/security.ts`): `assertSafeUrl` / `safeFetch` block
  private/link-local/metadata hosts and non-HTTP protocols. **Any outbound fetch
  whose URL came from user input must use `safeFetch`** (webhooks already do).
- **Rate limiting** (`lib/platform/rate-limit.ts`): sliding window, in-memory.
  Wired on checkout (20/min/IP) and password reset (5/15min/IP). Per-instance on
  serverless — swap the store for Upstash Redis behind the same `checkRateLimit`
  signature for a strict global limit.
- **IP / device logging**: `getClientInfo(req)` parses ip + device + browser;
  recorded on every audit entry.
- **Suspicious activity**: `isSuspiciousIp()` counts recent warning/critical
  audit events per IP; auth flows can escalate (extra friction, blocking).
- **Sessions/cookies**: Supabase SSR manages refresh-token rotation; middleware
  refreshes sessions only on routes that need auth (see `middleware.ts`).

## 5. Audit logs

`audit_logs` table + `audit()` helper. Every entry: user, email, role, store, ip,
device, browser, action, resource, before/after JSON, severity, timestamp.

- Append-only: no UPDATE/DELETE policies exist; inserts happen via service role.
- Merchants can read their own store's trail (RLS); platform staff read all.
- `audit()` never throws — logging failure must not break the audited action.

**Convention:** `domain.verb_past` action names (`order.status_changed`,
`platform.flag_changed`, `support.session_started`).

## 6. Monitoring (Platform Health)

`lib/platform/health.ts` runs isolated, time-boxed checks: database, storage,
queue depth/dead jobs, Cloudflare token, email config, domains (error states),
tracking, worker heartbeat. Surfaced at `/platform` (dashboard) and
`/api/platform/health` (JSON; uptime monitors may authenticate with
`Authorization: Bearer $CRON_SECRET`; returns 503 when overall=down).

Worker liveness is inferred from the `queue.worker_heartbeat` audit entry each
cron run writes — no extra infrastructure.

## 7. Error isolation (graceful degradation)

`lib/platform/resilience.ts`:

```ts
const res = await safe('tracking', () => pushConversion(order), { timeoutMs: 10_000 })
if (!res.ok) { /* record + continue — never throw */ }
```

- Failures return result objects instead of throwing → tracking down ≠ orders down;
  Cloudflare down ≠ storefront down; email down ≠ checkout down.
- Built-in circuit breaker: 5 consecutive failures open the circuit for 60s so a
  dead dependency stops adding latency; state visible on the health page.
- `emit()`, `enqueue()`, `audit()` are additionally never-throw by construction.

## 8. Queue system

Postgres-backed queue (`job_queue` + `lib/platform/queue.ts`) — no new
infrastructure, transactional with business data:

- `enqueue(type, payload, { storeId, runAt, maxAttempts })`
- Worker: `/api/cron/process-queue` every 5 min (vercel.json), drains in batches
  within a 50s budget. Claims use `claim_jobs()` (`FOR UPDATE SKIP LOCKED`) —
  safe for concurrent workers. Crashed workers are healed by
  `recover_stuck_jobs()`.
- Retries with exponential backoff (2,4,8,…,60 min) until `max_attempts`, then
  status `dead` (visible in Platform Admin → Queue).
- Handlers registered in `lib/platform/queue-handlers.ts`
  (`initPlatformRuntime()`): `sheets.push` (retry path for failed checkout sheet
  pushes), `webhook.deliver` (SSRF-guarded), `email.send` (Resend when
  configured), `whatsapp.send` (stub), `tracking.push`.

**Scaling note:** at high volume, swap the worker trigger from cron to QStash or
a dedicated consumer; `enqueue`/handlers don't change.

## 9. Event bus

`lib/platform/events.ts` — outbox pattern:

```
order.created → platform_events (persisted) → one queue job per subscriber
```

- `emit(name, payload)` from business code (checkout emits `order.created`).
- `subscribe(event, jobType)` declared centrally in `queue-handlers.ts`.
- Each subscriber is an isolated queue job: independent retries, no shared fate,
  and the emitter never blocks or fails because of a subscriber.

**Extending:** register a handler, subscribe it to the event. The emitting code
is never touched.

## 10. Feature flags

`feature_flags` table + `isEnabled(key, { storeId, fallback })`:

- 30s in-memory cache per instance; managed in Platform Admin → Flags (audited).
- Optional per-tenant targeting via `config.store_ids` (also how plugin rollout
  works: flag `plugin_<id>`).
- Fail-open to `fallback` so a flags outage can't take features down.

## 11. Support Mode

- Platform staff start a session in Platform Admin → Support: store + mandatory
  reason, 2h expiry.
- RLS policy `support_session_read` grants **read-only** access to that store's
  data for the session's lifetime — no password sharing, no impersonation tokens.
- Fully audited (`support.session_started/ended`, severity=warning).
- **Merchant transparency:** `SupportAccessBanner` in the merchant dashboard
  shows active sessions (amber, live) and recent ones (last 7 days), backed by
  RLS letting merchants read their own store's `support_sessions`.

## 12. Plugin architecture

`lib/platform/plugins.ts` — a plugin declares event handlers + job types +
settings schema and calls `registerPlugin()`. Under the hood each event handler
becomes `plugin.<id>.<event>` queue jobs subscribed to the bus, so plugins get
retries and error isolation for free and can never block core flows. Rollout is
controlled per tenant via the `plugin_<id>` feature flag. Future TikTok Shop /
Meta / Google Merchant / payment / shipping integrations plug in here without
core changes.

## 13. Backup / restore / archive

Three layers (tooling in `scripts/`):

1. **Infrastructure:** Supabase managed daily backups + PITR (enable on Pro).
2. **Ownership:** `scripts/backup-db.sh` — compressed `pg_dump` custom-format
   dumps for off-site copies; restore full or per-table with `pg_restore`
   (commands in the script header).
3. **Retention:** `scripts/archive-old-data.sql` — monthly archival of
   audit_logs (180d), platform_events (90d) to `*_archive` tables; completed
   queue jobs deleted after 30d.

## 14. Operational notes

- **Apply migration 027** in the Supabase SQL editor (or `supabase db push`)
  before deploying — the app degrades gracefully if tables are missing
  (never-throw helpers), but RBAC/audit/queue need the schema.
- Required env: `SUPABASE_SERVICE_ROLE_KEY`, `CRON_SECRET`;
  optional: `RESEND_API_KEY`, `CLOUDFLARE_API_TOKEN`.
- Queue cron cadence (`*/5 * * * *`) requires a Vercel plan with minute-level
  crons; on Hobby it degrades to daily — checkout still pushes sheets
  synchronously, so nothing user-visible breaks.

## 15. Future improvements (known, deliberate deferrals)

- Distributed rate limiting (Upstash Redis) behind the existing signature.
- Content-Security-Policy header (needs an inventory of inline scripts/styles).
- Team-management UI for `store_members` (schema + RBAC ready; UI pending).
- Order-status-change events emitted from the dashboard update paths.
- Real WhatsApp/email providers behind the existing queue handlers.
- Read replicas / partitioning of `orders` when volume warrants it.
