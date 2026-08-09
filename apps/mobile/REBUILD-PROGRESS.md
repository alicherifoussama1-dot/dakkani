# COMMERCO Merchant — mobile app status

Real React Native app built from the production website's own design and
API contracts.

**Scope note (changed):** earlier rounds touched only `apps/mobile`. This
round also changed `app/api/mobile/v1/*` and `lib/mobile/context.ts`,
because several defects were in the mobile API itself and could not be
fixed from the client. The website, storefront, checkout, Supabase schema,
tracking and pixels are still untouched — no migration was needed and no
existing API response field was removed or renamed.

## Verification — what was actually run

| Check | Command | Result |
|---|---|---|
| Mobile types | `npx tsc --noEmit` | 0 errors |
| Mobile lint | `npm run lint` | 0 problems |
| Backend types | `npx tsc --noEmit` (repo root) | 0 errors |
| Android bundle | `npx expo export --platform android` | 6.32 MB, exit 0 |
| API contract | `npm run test:api` | **35 pass / 0 fail** |
| Fix regressions | `npm run test:fixes` | **42 pass / 0 fail / 1 skip** |
| i18n dictionaries | `node scripts/verify-i18n.mjs` | 163 keys × ar/fr/en, complete |

`test:api` and `test:fixes` run against a **real Supabase session on the
real backend** (magic-link, no password), not mocks. Every row they create
is deleted again; the one order `test:fixes` touches is PATCHed to the
status it already holds, so no order ever changes state.

**Typechecking and linting are not evidence the app works.** They were
both green while the products tab could not open a product and the i18n
provider was never mounted. The two API suites are the real gate.

---

## THE FINDING THAT GOVERNS THIS CODEBASE

**The production dashboard runs two design systems side by side.**

| Web page | System | Port against |
|---|---|---|
| `DashboardHome.tsx`, `KpiCardsRow.tsx`, other `components/dashboard/*` | plain Tailwind + hardcoded `#0D6EFD` | `src/theme/legacy.ts` |
| `OrdersPageClient`, `ProductsPageClient`, auth, settings — anything `.c-*` | Commerco Cobalt `#2952E3` | `src/theme/tokens.ts` + `src/components/ui.tsx` |

Matching the site means rendering what the browser paints, so the app
carries both palettes deliberately. **Do not unify them** — that would make
the app stop matching. Website-side inconsistency: documented, not changed.

---

## Fixed this round

### Blocking — features that did not work at all

- **A product could not be opened.** `ProductCard` wrapped its content in a
  nested `Pressable` for long-press. React Native's `Pressability` always
  returns `true` from `onStartShouldSetResponder` unless disabled, so the
  child took the responder and the card's own `onPress` never fired — the
  editor was unreachable by tap. Long-press moved onto `Card` itself, which
  now supports `onLongPress`. **Never nest a Pressable inside an
  interactive Card.**
- **No way to create a product once one existed.** The "إضافة منتج" button
  lived only in the empty state, which stops rendering after the first
  product. It is a `TopBar` action now.
- **The root layout never learned the merchant signed in.** `authed` was
  resolved once at boot and nothing updated it, so for the whole first
  session push handlers were unwired, notification taps and deep links were
  queued into `pendingOrder` and dropped, and the badge never refreshed —
  until a relaunch. Sign-out had the mirror bug. `src/lib/auth.ts` now
  raises explicit sign-in/sign-out events (`onSessionChange`). It does
  **not** use `supabase.auth.onAuthStateChange`: that fires
  `INITIAL_SESSION` on subscribe, which would report "signed in" before the
  biometric gate has run.
- **`I18nProvider` was imported and never rendered.** Every `useT()` and
  `useI18n()` resolved to the default context, whose `setLocale` is a no-op
  — so the language picker persisted nothing and no screen could translate.
  It wraps the tree now.
- **Every mobile status change lost its audit row.** The API wrote
  `from_status` / `to_status` / `note`; `order_history` has
  `old_status` / `new_status` / `notes` (migration 010) and `new_status` is
  `NOT NULL`. The insert failed every time, silently — supabase-js returns
  the error instead of throwing, so the `try/catch` around it never saw
  anything. The error is inspected explicitly now. The detail screen was
  reading the same wrong column names, so rows rendered blank.

### Correctness

- **RTL was re-forced on every launch.** `_layout.tsx` ran
  `forceRTL(true)` whenever `isRTL` was false — which is exactly the launch
  after a merchant picked French — putting the app back into RTL behind
  their back. Direction is now owned solely by `src/i18n`, which applies the
  **stored** locale's direction at startup. `app.json` keeps
  `forcesRTL: false`.
- **Variant data was destroyed on save.** The editor flattened each variant
  to its label on load and rebuilt it as `{key, label}` on save, dropping
  per-variant price, stock key, image and options. Variants now round-trip
  verbatim; only whole rows are added or removed.
- **Stock collapsed onto `default`.** One field was written to the
  `default` variant key regardless of how many keys existed. The editor
  shows one field per `variant_key` and PATCHes only the ones that changed;
  a blank field means "leave it alone", not zero.
- **Customer stats came from one page.** Order count was the page length
  and spend was summed over 50 rows. `GET /customers?phone=` returns a
  server-side aggregate over every order that phone placed, and the history
  list paginates on an exact `phone` match instead of a fuzzy `q` search
  that could also match an order number.
- **SKU search did nothing.** Both clients advertise "ابحث باسم المنتج أو
  SKU"; the query only covered `name` and `name_ar`. `sku` is searched and
  returned now, and shown on the row.
- **Search terms broke the PostgREST filter.** `q` was interpolated raw
  into `or=(...)`, so a comma or parenthesis produced a malformed filter or
  an extra OR branch. `ilikeTerm()` in `lib/mobile/context.ts` double-quotes
  and escapes it. Store isolation was never at risk (`.eq('store_id')` is a
  separate AND), and the suite asserts that still holds.
- **Bootstrap counters used the wrong day.** "Today" and "this month" were
  the server's own local midnight while the dashboard used
  `getAlgiersDateRange`, so the two disagreed between 00:00 and 01:00
  Algiers. Bootstrap uses the same helper now; the suite asserts the two
  endpoints return the same number.
- **Push preferences always displayed as on.** `PATCH /devices` could write
  them but nothing could read them back, so a merchant who muted the sound
  saw it unmuted next visit. `GET /devices?token=` was added; a failed save
  now rolls the switch back to the stored truth.
- **Device locale was hardcoded to `ar`**, so a merchant on French kept
  receiving Arabic notifications. It follows the stored locale.
- **Disabled-looking buttons still fired.** The product save and catalog
  create buttons only dimmed via `opacity`, so they submitted invalid data
  and surfaced a server error instead of the inline hint. Both use
  `disabled` and explain what is missing.
- **Reviews averaged the wrong population** — "متوسط N تقييم" used the
  filtered page length against the overall average. Uses the server total.
- **The customer initial was white on white** — left over from a gradient
  hero that became a plain white card.

### Reachability

- **The الإحصائيات tab rendered a second copy of the Dashboard**
  (`export { default } from './index'`). The website has a distinct
  `/analytics` page whose numbers appear nowhere on the dashboard. It is a
  real screen now, backed by `GET /api/mobile/v1/analytics`, which applies
  that page's exact rules (revenue counts delivered orders only,
  cancellation folds in returns). The page renders `ولاية <id>`; the app
  resolves the real name.
- **The map screen was unreachable.** `app/map.tsx` and `WilayaMap.tsx`
  (354 lines) had no entry point anywhere. It reads the same
  `wilayaDistribution` the dashboard does, so it is real — wired into More
  and the Analytics screen rather than deleted.
- **`needsRestart` was computed and never used.** It is a persistent banner
  on the language screen now; a one-shot Alert is missed if tapped through.
- **`app/` was never linted** — the script only covered `src/`, so every
  screen was unchecked, and `expo lint` walked `node_modules` and crashed.
  Fixed, plus `.eslintignore`.

---

## Known limits (unchanged, and honest)

1. **Products cap at 60, no pagination.** `/products` takes no offset. The
   app says so at the ceiling instead of pretending. `total` is the page
   length. Fixing it means an offset parameter on that route.
2. **No download endpoint exists anywhere** — no CSV, PDF or
   `Content-Disposition` in `app/api` or `lib`, so "downloads" has no target.
3. **Order creation is GET-only by design** — production commerce logic,
   deliberately not exposed to the app.
4. **https deep links** need `assetlinks.json` on the site carrying the
   signing fingerprint. `commerco://` works today.
5. **Custom order sound** — `assets/sounds/new_order.wav` is absent, so the
   channel falls back to the system sound. The settings screen used to claim
   a custom sound in `res/raw`; it now states what this build actually does.
6. **`getAlgiersDateRange` assumes the process runs in UTC.** Its
   `toAlgiersISO` subtracts a fixed hour from a *server-local* midnight,
   which is correct on Vercel and wrong on a developer machine in another
   timezone. Pre-existing, shared with the web dashboard, and out of scope
   here — but it is why `test:fixes` asserts bootstrap/dashboard *agreement*
   rather than an absolute boundary.

## Not verifiable in this environment

- **No emulator run.** The installed Android 36 system-image directories are
  empty shells (no `package.xml`), so no AVD can be created without a fresh
  ~1.5 GB download, and a native build additionally needs JDK 17 (only
  Java 24 is present). No APK was produced this round.
- **Per-variant stock writes** are the one skipped assertion in
  `test:fixes` — the test store has no warehouse, and creating one on a
  real store to satisfy a test was not worth the side effects. The server
  route is already covered by `test:api`; only the client's per-key loop is
  unproven.
- **Anything behind a password.** Driving the signed-in UI needs a real
  session typed on a device, which cannot be done here. The API suites cover
  the data layer that sits behind it.
