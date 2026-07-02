# Tracking & Domains Architecture (Design v1 — no code)

> Goal: a provider-agnostic, per-product-isolated tracking system + multi-domain
> management that beats JustSell and scales to thousands of stores and millions
> of events. This document is the design contract. No implementation yet.

---

## 0. Current state (audit) — what we are replacing

| Area | Today | Problem |
|---|---|---|
| Pixels storage | Flat columns on `stores` and `products` (`meta_pixel_id`, `tiktok_pixel_id`, `google_tag_id`, `snapchat_pixel_id`) | Not a library. One value per platform per store. Can't have "Pixel A" + "Pixel B" and assign different ones per product. |
| Product override | `use_store_pixel` boolean → store pixel OR one product pixel | Binary. No true per-product selection from a pool. |
| Providers | Only Meta + TikTok inject/fire; Google/Snapchat are dead columns | Not generic. Adding GA4/Ads/Pinterest/LinkedIn = new columns + new code. |
| Server events (CAPI) | `/api/meta-events`, `/api/tiktok-events`, token from **global** `META_ACCESS_TOKEN` env | All tenants share one token → wrong attribution + isolation risk. |
| Domains | `stores.domain` column, unused by routing | No verify, no default, no per-product domain, no SSL flow. |
| Isolation | Emergent from "resolve one id" | Not a guaranteed invariant. |

The redesign turns **columns → normalized library + assignment tables**, and
**hard-coded providers → a provider registry**.

---

## 1. Core principles

1. **Library + Assignment separation.** A merchant defines reusable *integrations*
   (pixels/domains) once. Products *reference* them. Nothing is duplicated per product.
2. **Provider-agnostic registry.** Every provider (Meta, TikTok, GA4, Google Ads,
   Snapchat, Pinterest, LinkedIn, Custom) is a plugin described by metadata + a small
   adapter. Adding a provider = add one registry entry. **The product settings UI and
   the `product_tracking` schema never change** when a provider is added.
3. **Per-product isolation is an invariant, not a side effect.** The resolver returns
   *only* the integrations assigned to that product; the loader can physically only
   emit those. No global pixel is ever appended.
4. **Fallback is deterministic.** No domain → platform store domain. No tracking → no
   code injected. Documented resolution order, no surprises.
5. **Server-first, queue-backed events.** Browser pixels for reach; server-side
   Conversions APIs (per-integration tokens) for accuracy; a durable queue so millions
   of events never block a request or get lost.
6. **Backward compatible.** Existing column values migrate into the new tables; old
   product pages keep working during rollout.

---

## 2. Data model

### 2.1 New tables

```
tracking_integrations            -- the merchant's reusable "pixel library"
  id               uuid pk
  store_id         uuid fk -> stores
  provider         text          -- registry key: 'meta' | 'tiktok' | 'ga4' | 'google_ads'
                                  --  | 'snapchat' | 'pinterest' | 'linkedin' | 'custom'
  name             text          -- merchant label, e.g. "Pixel A - Main"
  external_id      text          -- Pixel ID / Measurement ID / Tag ID / Partner ID
  credentials      jsonb         -- encrypted: CAPI token, api secret, conversion label...
  config           jsonb         -- provider-specific extras (test_event_code, custom code)
  status           text          -- 'unconfigured' | 'active' | 'error' | 'disabled'
  last_verified_at timestamptz
  is_default       boolean       -- default for this provider (used as fallback)
  created_at / updated_at
  UNIQUE(store_id, provider, external_id)
  PARTIAL UNIQUE(store_id, provider) WHERE is_default  -- one default per provider

domains
  id               uuid pk
  store_id         uuid fk -> stores
  hostname         text unique   -- "samabrand.com" (apex or sub)
  status           text          -- 'pending' | 'verifying' | 'active' | 'error'
  verification     jsonb         -- {method:'txt'|'cname', token, expected, checkedAt}
  ssl_status       text          -- 'none' | 'provisioning' | 'issued' | 'error'
  is_default       boolean
  is_platform      boolean       -- true for the auto Dakkani subdomain row (virtual)
  created_at / updated_at
  PARTIAL UNIQUE(store_id) WHERE is_default

tracking_profiles                -- reusable Domain + Tracking bundle products inherit
  id               uuid pk
  store_id         uuid fk -> stores
  name             text          -- "Sama Brand - FB+TikTok", "Default DZ"
  domain_id        uuid fk -> domains NULL   -- profile's domain (NULL => store/platform fallback)
  is_default       boolean       -- store's default profile for new products
  created_at / updated_at
  PARTIAL UNIQUE(store_id) WHERE is_default

profile_tracking                 -- a profile's provider -> integration assignments
  id               uuid pk
  profile_id       uuid fk -> tracking_profiles
  provider         text
  integration_id   uuid fk -> tracking_integrations   -- NULL = explicit "off" for this provider
  UNIQUE(profile_id, provider)

product_tracking                 -- PER-PRODUCT OVERRIDE of a single provider (optional)
  id               uuid pk
  product_id       uuid fk -> products
  provider         text          -- registry key
  integration_id   uuid fk -> tracking_integrations  -- NULL allowed (explicit "off")
  UNIQUE(product_id, provider)    -- at most ONE integration per provider per product

product_domains                  -- link table (future-proof: many domains per product)
  id               uuid pk
  product_id       uuid fk -> products
  domain_id        uuid fk -> domains
  is_primary       boolean       -- the ONE active/serving domain today
  role             text          -- 'primary' (reserved: 'mirror'|'geo'|'ab' later)
  UNIQUE(product_id, domain_id)
  PARTIAL UNIQUE(product_id) WHERE is_primary   -- exactly one primary now; UI exposes only this

products (add columns)
  profile_id       uuid fk -> tracking_profiles NULL  -- inherited config; NULL => store default profile
  tracking_mode    text  DEFAULT 'inherit'            -- 'inherit' | 'custom'
```

**Inherit vs. override.** `tracking_mode='inherit'` → the product uses its `profile_id`
(or the store default profile) verbatim. `tracking_mode='custom'` → the product may keep
the profile as a base but store per-provider overrides in `product_tracking` and its own
primary in `product_domains`. A product with *no* override rows always tracks its profile
live — this is what makes profile edits propagate (§10).

Why this shape:
- `product_tracking` is **one row per (product, provider)** → future providers slot in
  as new rows, never new columns. The schema is closed; the provider set is open.
- `is_default` on both integrations and domains powers the mandatory fallback.
- `credentials` is per-integration → **each pixel carries its own CAPI token**, killing
  the shared-token problem.

### 2.2 Provider registry (code-level metadata, not DB)

A single source of truth object, e.g. `lib/tracking/registry.ts`:

```
registry[provider] = {
  key, label, logo, color,
  idLabel,                 // "Pixel ID" / "Measurement ID" / "Conversion ID"
  idPattern,               // validation regex
  supportsServerEvents,    // Meta/TikTok/GA4/Ads/Snap/Pinterest = true; Custom = false
  credentialFields,        // [{key:'capiToken', label, secret:true}, ...]
  browserAdapter,          // how to inject + fire the 5 events client-side
  serverAdapter,           // how to POST to the provider's Conversions API
  eventMap,                // canonical event -> provider event name
}
```

The Tracking UI, Product Settings tab, validation, and both event pipelines all read
from this registry. **Adding Pinterest = add `registry.pinterest = {...}`.** No schema
migration, no product-settings change, no new columns. This is the future-proof core.

Canonical events (provider-neutral): `PageView, ViewContent, AddToCart,
InitiateCheckout, Purchase`. Each adapter's `eventMap` translates
(e.g. TikTok Purchase → `CompletePayment`, GA4 → `purchase`).

---

## 3. Domains subsystem

### 3.1 UX — Settings → Domains

- **List**: each domain as a card row → hostname, status badge (Pending / Verifying /
  Active / Error), SSL badge, Default star, Edit, Delete.
- A permanent, non-deletable **Platform domain** row at top:
  `store-slug.dakkani.com` — labelled "Default (Dakkani)". Always Active. This is the
  guaranteed fallback and cannot be removed.
- **Add domain** modal: enter hostname → we show DNS records to add
  (apex → A/ALIAS to platform; subdomain → CNAME) plus a TXT verification token.
- **Verify** button: server re-checks DNS; on success status → Active and triggers SSL
  provisioning (ACME/hosting provider API). Auto-retry with backoff; webhook/poll updates.
- **Set Default**: exactly one custom domain can be default; used when a product has no
  explicit domain and the merchant wants custom over platform.
- **Edit / Delete**: delete blocked (with warning) if products point to it — offer
  "reassign to default first".

### 3.2 Verification & SSL flow (state machine)

```
pending --(merchant adds DNS)--> verifying --(DNS+TXT match)--> active
   \--(timeout / mismatch)--> error --(retry)--> verifying
active --(SSL issue)--> ssl:provisioning --> ssl:issued
```

- Verification is a background job (queue), not a request-blocking call.
- Never trust client claims; the server resolves DNS itself.

### 3.3 Routing & fallback

- Middleware gains a **host resolver**: incoming `Host` header →
  `domains.hostname (active)` → `store_id`. Cache the map (Redis/edge KV, short TTL) so
  it costs ~0 per request at scale.
- Platform domain path (`slug.dakkani.com` / `/store/:slug`) keeps working unchanged.
- **Product → domain resolution order** (mandatory fallback):
  1. `product.domain_id` if set and Active.
  2. else store **default custom domain** if one is Active.
  3. else **platform store domain** (`slug.dakkani.com`). ← always succeeds.
- Canonical URLs, OG tags, and pixel `event_source_url` all use the resolved domain so
  attribution and SEO stay consistent.

---

## 4. Tracking subsystem

### 4.1 UX — Settings → Tracking (the pixel library)

- **List** grouped by provider, each integration row: Name · Platform (logo) ·
  masked External ID · Status (Active/Error/Unconfigured) · Default star · Edit · Delete.
- **Add tracking** modal driven by the registry:
  1. pick Provider → 2. the form renders that provider's fields
  (`idLabel`, credential fields, test code, or a raw code box for Custom) → 3. Save.
- **Verify** per integration (where supported): fire a test server event / validate ID
  format + token → sets `status` + `last_verified_at`.
- **Default** per provider → the fallback pixel for that platform.
- Unlimited integrations per provider (that's what enables "Pixel A" vs "Pixel B").

### 4.2 Server-side (Conversions API) — per integration

- Refactor `/api/meta-events` + `/api/tiktok-events` into one **`/api/track/[provider]`**
  (or an internal dispatcher) that looks up `integration_id`, decrypts its own token
  from `credentials`, and calls that provider's `serverAdapter`.
- **Token is per pixel**, never a shared env var → correct attribution, tenant isolation.
- Dedup preserved: browser + server share the same `event_id`.

---

## 5. Product Settings → "Tracking & Domain" tab

### 5.1 UX

A new tab in `AdminProductEditor` (`TABS`), rendered from the registry so it never needs
editing when providers grow:

```
Store Domain        [ Select ▾ ]  (options: platform default + active custom domains)

Tracking
  Facebook Pixel    [ Select ▾ ]  (options: merchant's Meta integrations + "None")
  TikTok Pixel      [ Select ▾ ]
  Google Analytics  [ Select ▾ ]
  Google Ads        [ Select ▾ ]
  Snapchat Pixel    [ Select ▾ ]
  Pinterest         [ Select ▾ ]
  LinkedIn Insight  [ Select ▾ ]
  (Custom Script)   [ Select ▾ ]
```

- Each dropdown lists only that store's integrations for that provider, plus
  **"Use default"** and **"None (off)"**.
- The list of rows is generated by iterating the registry → adding a provider adds a row
  automatically.
- Saving writes/updates `product_tracking` rows (one per provider) and `products.domain_id`.

### 5.2 Resolution logic (per product, at render)

The resolver now layers **profile → product override → fallback**. Effective profile =
`product.profile_id` or, if NULL, the store's default profile.

For each provider (in registry order):
```
if tracking_mode='custom' AND product_tracking[product, provider] exists:
     integration = product_tracking.integration_id      # NULL => explicit "off"
elif profile_tracking[effectiveProfile, provider] exists:
     integration = profile_tracking.integration_id       # inherited
elif store default integration for provider exists:
     integration = store default                          # back-compat fallback
else:
     integration = none                                   # nothing injected
```

Domain resolution order:
```
1. product_domains primary (is_primary, Active)      # per-product override
2. effectiveProfile.domain_id (Active)               # inherited from profile
3. store default custom domain (Active)
4. platform store domain (slug.dakkani.com)          # always succeeds
```

The resolver returns a **closed, frozen list of integrations + one domain** for exactly
this product. Everything downstream (loader, Preview, Status, server events) consumes this
single resolved object — one source of truth, which is what guarantees isolation (§6) and
makes Preview (§13) and profile propagation (§10) trivially correct.

---

## 6. Isolation guarantee (the critical requirement)

Isolation is enforced at three layers so it cannot be violated by a single bug:

1. **Data layer:** `product_tracking` can hold at most one integration per provider per
   product (unique constraint). There is no "all pixels" query path in the render.
2. **Resolver layer:** a single pure function `resolveProductTracking(product)` returns
   only the assigned integrations. The storefront **never** reads store-wide pixel lists
   when rendering a product. The store default is only consulted *through* the resolver
   as a fallback for that one product.
3. **Loader layer:** the pixel loader is initialised with exactly the resolved list and
   scopes each provider SDK to its own `external_id`. Events fire in a loop over *that
   list only*. There is no global `fbq('init', ...)` for other pixels on the page.

Result: if Product A resolves to `[Meta:PixelA]`, the page can only ever init PixelA and
fire the 5 events to PixelA. Product B, resolving to `[Meta:PixelB]`, physically has no
reference to PixelA. Cross-product bleed is structurally impossible, not merely avoided.

Events covered end-to-end: `PageView, ViewContent, AddToCart, InitiateCheckout, Purchase`
— each dispatched (browser + server) to *only* the resolved integrations, with a shared
`event_id` for dedup.

---

## 7. Event data flow

```
Storefront product page (resolved integrations only)
   │  browser adapters init  → fire PageView, ViewContent, AddToCart,
   │                            InitiateCheckout, Purchase  (event_id = uuid)
   ▼
POST /api/track  { productId, provider(s), event, event_id, userData, value }
   │  server verifies product→integration assignment (re-resolves; ignores client-supplied pixel ids)
   ▼
Durable queue (e.g. Redis stream / Upstash / QStash / pg outbox)
   │  workers pull, decrypt per-integration token, call provider serverAdapter
   ▼
Provider Conversions APIs (Meta CAPI, TikTok Events, GA4 MP, Ads, Snap, Pinterest, LinkedIn)
   │
   ▼
tracking_events log (append-only: status, provider response, dedup key) for the Status card + debugging
```

Key hardening: the server **re-resolves** the product→integration mapping and ignores any
pixel id the client tries to send → a tampered client cannot fire to another store's pixel.

---

## 8. Health Status (replaces simple "Connected")

Every integration and every product exposes a **three-state health rollup**, computed
server-side, not a static boolean:

```
Healthy  ● green   — verified, credentials valid, recent successful events, domain+SSL active
Warning  ● amber   — configured but: never tested / no events in N days / token nearing expiry
                     / test succeeded but browser+server dedup mismatch
Error    ● red     — failing: invalid/expired token, CAPI 4xx/5xx, DNS/SSL failure, ID rejected
```

Health inputs (per integration): `status`, `last_verified_at`, last **Test Event** result
(§12), rolling success rate + recency from `tracking_events` (§11), credential/token expiry.

Product-level health = worst state among its resolved integrations + its domain. The
Product Settings card:

```
Tracking Health                                    Overall ● Healthy
  Domain      samabrand.com                        ● Healthy   (SSL issued)
  Facebook    Pixel A                              ● Healthy   (last event 2m ago · 99% 24h)
  TikTok      Pixel B                              ● Warning   (no events in 3d)   [Send Test]
  GA4         Analytics A                          ● Error     (token expired)     [Fix] [Send Test]
  Server API  CAPI                                 ● Healthy   (200s in last 24h)
```

Each row deep-links to that integration's Event Log (§11) and a Send Test Event action
(§12). This is the JustSell-killer: tracking correctness becomes observable and actionable,
not a black box.

---

## 9. Fallback logic (explicit)

- **No custom domain** → product serves on the platform domain `slug.dakkani.com`.
  Always works; never an error state.
- **No tracking selected for a provider** → nothing injected for that provider; page is
  clean, zero overhead. A product with no tracking at all ships zero tracking code.
- **"Use default" chosen** → resolves to the store's default integration for that provider
  at render time (change the default once, all "use default" products follow).

---

## 10. Tracking Profiles (inheritance + propagation)

A **profile** is a named, reusable bundle: one domain + one integration per provider
(`tracking_profiles` + `profile_tracking`). Products *inherit* a profile instead of being
configured one by one.

**UX — Settings → Tracking → Profiles**
- List profiles; each shows its domain + provider chips + how many products are linked.
- Create/Edit profile using the *same registry-driven form* as the product tab.
- One profile is the store **default** (auto-applied to new products).
- On the Product "Tracking & Domain" tab, the top control is **Profile: [ Select ▾ ]**
  with two modes:
  - **Inherit** (default) — product mirrors the profile; per-provider dropdowns are shown
    read-only as "inherited from <profile>".
  - **Customize** — unlocks per-provider overrides (`product_tracking`) and a per-product
    primary domain (`product_domains`), while still falling back to the profile for
    anything left untouched.

**Propagation (requirement 7).** Because inheriting products store *no* copied values —
they hold only `profile_id` and resolve through the profile at render time — editing a
profile (swap Pixel A → Pixel C, change domain) **instantly updates every linked product**
with zero per-product work. Implementation notes:
- Changing a profile only writes to `profile_tracking` / `tracking_profiles`; nothing is
  fanned out to products.
- Invalidate the cached resolver output for products where `profile_id = X AND
  tracking_mode='inherit'` (single indexed update / cache-bust, not a row rewrite).
- Products in `custom` mode keep their explicit overrides; untouched providers still track
  the new profile value. A "Reset to profile" action clears overrides back to pure inherit.
- Safe-change guard: before saving a profile edit, show "This will affect N products" and
  surface any resulting Health regressions (§8) in a diff preview.

## 11. Event Logs (per integration)

Backed by the append-only `tracking_events` table (already in the pipeline, §7):

```
tracking_events
  id, store_id, integration_id, product_id, provider,
  event_name, event_id, source ('browser'|'server'|'test'),
  status ('success'|'failed'|'deduped'), http_status, response jsonb,
  value, currency, created_at
  INDEX (integration_id, created_at DESC), INDEX (product_id, created_at DESC)
```

**UX** — an integration's detail drawer and the product Health rows expose a **recent
events** list: event name, source (browser/server/test badge), status, value, relative
timestamp ("2m ago"), and expandable raw provider response for debugging. Filters by
event type and status. This is the audit trail that powers Health (§8) and lets a merchant
*see* that Purchase actually reached Meta CAPI.

Retention: hot window (e.g. 30–90d) in Postgres partitioned by day; older rows rolled to
cold storage / analytics. High-volume writes go through the queue (§7), never inline.

## 12. Send Test Event

A per-integration **"Send Test Event"** button (in Tracking library, Health rows, and the
profile editor) that validates an integration *before publishing*.

- Fires a real event through the provider's `serverAdapter` (and browser adapter where
  relevant) tagged `source='test'` — Meta `test_event_code`, TikTok test mode, GA4
  debug/validation endpoint, etc. — so it never pollutes production conversion data.
- Returns a concrete result: provider HTTP status, `events_received`, dedup id, latency.
- Writes a `tracking_events` row (`source='test'`) and updates `last_verified_at` +
  Health. A green test is a precondition the UI can *require* before a product/profile is
  marked publish-ready.
- For **Custom Script**: no server test; instead a sandboxed dry-run that lints the snippet
  and confirms it loads without throwing (browser-only, never server-executed).

## 13. Product Tracking Preview

A read-only **Preview panel** on the product tab that renders the resolver's output (§5.2)
before publish — the "what will actually happen" view:

```
Preview
  Final domain     https://samabrand.com
  Final product URL https://samabrand.com/product/ayla        [copy] [open]
  Serving via      Profile "Sama Brand" (inherited)   ·  SSL issued
  Providers that will load & fire:
    Facebook   Pixel A   (from profile)      ● Healthy
    TikTok     Pixel B   (product override)  ● Warning
    GA4        Analytics A (from profile)    ● Healthy
  Providers OFF:  Google Ads, Snapchat, Pinterest, LinkedIn
  Events wired:   PageView · ViewContent · AddToCart · InitiateCheckout · Purchase
```

- Pure function of the resolved object → guaranteed to match what the storefront emits
  (no drift between preview and reality).
- Shows *source* of each choice (profile vs override vs store default vs platform
  fallback) so merchants understand inheritance at a glance.
- The **final product URL** is built from the resolved domain + product slug, honoring the
  domain fallback chain.

## 14. Multi-domain future-proofing

Requirement 6: the UI exposes **one active domain per product today**, but the schema is
already many-to-many via `product_domains` (link table, `is_primary`, `role`). This means
future capabilities need **no migration**, only UI:
- **Mirror domains** (same product served on several verified domains).
- **Geo/AB domain routing** (`role='geo'|'ab'`) choosing a domain by audience.
- Today: `PARTIAL UNIQUE(product_id) WHERE is_primary` enforces exactly one serving
  domain, and the resolver reads only the primary — so current behavior is identical to a
  single column, with the door left open. Same pattern keeps `tracking_integrations`
  ready for multiple pixels of the *same* provider per product later if ever needed.

## 15. Scalability (thousands of stores, millions of events)

- **Host→store map cached** at the edge (KV/Redis, short TTL) → domain routing is O(1).
- **Resolver output cached** per product (invalidate on assignment change) → render adds
  no extra round-trips.
- **Events are queued**, workers batch to provider APIs → request latency unaffected;
  spikes absorbed; retries with backoff; dead-letter for poison events.
- **`tracking_events` partitioned by day** (or shipped to an analytics store) so the log
  scales without bloating OLTP.
- **Credentials encrypted at rest** (KMS/pgcrypto), decrypted only in the worker.
- Stateless API + workers → horizontal scale.

---

## 16. Migration & rollout

- **Migration 025**: create `tracking_integrations`, `domains`, `product_domains`,
  `tracking_profiles`, `profile_tracking`, `product_tracking`, `tracking_events`; add
  `products.profile_id`, `products.tracking_mode`. Backfill: each non-null store pixel
  column → a `tracking_integrations` row (`is_default=true`); build one **default profile**
  per store from those defaults; each product override → a `product_tracking` row +
  `tracking_mode='custom'`; existing `stores.domain` → a `domains` row + `product_domains`
  primary where used.
- Keep old columns readable during transition; resolver prefers new tables, falls back to
  columns until backfill verified, then drop columns in a later migration.
- **Phases:** (1) data model + registry + backfill (invisible). (2) Settings → Tracking
  library UI + **Profiles**. (3) Settings → Domains UI + verification/SSL. (4) Product
  "Tracking & Domain" tab + resolver + **Preview** on storefront. (5) queue-backed server
  events + **Event Logs** + **Health Status** + **Send Test Event**. (6) add
  GA4/Ads/Pinterest/LinkedIn as pure registry entries. (7) unlock multi-domain UI when
  needed (schema already supports it).

---

## 17. Why this beats JustSell

| Dimension | JustSell | Dakkani (this design) |
|---|---|---|
| Pixel model | Store-level, limited providers | Reusable **library**, unlimited pixels per provider, assignable per product |
| Config reuse | Per-product setup | **Tracking Profiles** — configure once, inherit everywhere, edit propagates instantly |
| Per-product isolation | Weak / store-wide bleed risk | **Structural invariant** across data + resolver + loader layers |
| Providers | Fixed set | **Open registry** — add a provider without touching product settings/schema |
| Server-side events | Partial / shared tokens | **Per-pixel CAPI tokens**, queue-backed, deduped, all major providers |
| Pre-publish validation | None | **Send Test Event** per integration (test-mode, no data pollution) |
| Domains | Basic connect | Unlimited, verified, SSL state machine, per-product primary + **multi-domain-ready schema**, guaranteed platform fallback |
| Observability | Minimal | **Health Status (Healthy/Warning/Error)** + per-integration **Event Logs** |
| Predictability | Publish and hope | **Product Tracking Preview** shows final domain, URL, and exactly which pixels fire |
| Attribution accuracy | Client-only drift | Browser+server dedup, resolved `event_source_url` on the real domain |
| Scale | Store-tier | Edge-cached routing, partitioned event log, worker fleet → millions of events |
| Future-proofing | Schema churn per provider | Closed schema, open provider set + multi-domain link table — zero migration to extend |

---

## 18. Open decisions to confirm before build

1. Queue/infra choice (Upstash QStash vs Redis streams vs pg outbox) — pick per hosting.
2. SSL/domain provider (Vercel Domains API vs Cloudflare for SaaS vs custom ACME).
3. Credential encryption (Supabase Vault/pgcrypto vs external KMS).
4. Should "Custom Script" be allowed to fire on Purchase server-side, or browser-only
   (safer)? Recommend browser-only + sandboxed.
5. Per-plan limits (max domains / integrations / profiles) for billing tiers.
6. Health thresholds — how many days without events = Warning; token-expiry lead time.
7. Profile-edit propagation UX — apply instantly vs. "review N affected products" gate
   (recommend: instant for inherit-mode, with a pre-save impact + Health-diff preview).
8. Whether "publish-ready" should *hard-require* a passing Send Test Event, or only warn.
```
