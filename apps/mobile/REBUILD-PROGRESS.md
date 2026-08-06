# COMMERCO Merchant — mobile app status

Real React Native app built from the production website's own design and
API contracts. Nothing outside `apps/mobile` has ever been modified: the
website, backend, Supabase, APIs, tracking, pixels and commerce logic are
untouched.

**Verification after every round:** TypeScript **0**, ESLint **0**, Expo
Doctor 16/17 (the 1 failure is a false positive — `app.config.js` line 17
is `require('./app.json').expo`, which Doctor cannot detect), production
bundle exports, APK installs and launches on an Android 36 emulator.

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

Also verified, not assumed: `border-gray-150` is undefined in
`tailwind.config.ts` so it renders as `#E5E7EB`; `components/ui/StatCard.tsx`
is legacy and unused — `KpiCardsRow` is what actually draws those cards.

---

## Done

### UI rebuild
- Design tokens ported 1:1 from `design/tokens.css`; UI kit from
  `design/components.css` (`.c-*`); shell from `DashboardShell.tsx`.
- **Typography — the largest gap.** The app declared `Tajawal_700Bold` but
  loaded **no font** and never set `fontFamily`, so every screen rendered in
  Android's system face. Loads IBM Plex Sans Arabic (the site's dashboard
  face) at 400/500/600/700, and every bare `fontWeight` was removed across
  14 files — RN cannot synthesise weight for a custom family.
- Icons: `lucide-react-native` pinned to **0.344.0**, matching the site's
  `lucide-react`. (It first resolved to 1.28.0 — different geometry.)
- RTL: every physical `left`/`right` converted to logical `start`/`end`.
- a11y: roles and labels on every pressable.

### Functional parity fixes (found by contract audit, not by clicking)
- **description/description_ar were collapsed into one field** — loaded
  `description_ar ?? description`, saved only to `description_ar`, so an
  English-only description was silently copied into the Arabic column.
- **SKU could not be cleared** (`|| undefined` omitted the key).
- **Image reordering was missing entirely.** Index 0 is the main image, so
  the cover could only be changed by deleting everything and re-uploading.
- **The "نفد المخزون" chip did nothing** — the server understands
  `all|active|hidden`; `out` fell through and returned everything.
- **Orders lacked the web's "مُرجَع" chip**; labels had drifted.
- **The "إنشاء طلب" button 404'd** — orders is GET-only in the mobile API.
- **The products count was the page length, not the store total.**

### Capability gaps closed
- **Store switching.** The backend always supported it
  (`X-Commerco-Store`, re-validated against `stores.owner_id`) and
  bootstrap returns every store; the app only printed the count. Switching
  uses `removeQueries`, not invalidate, so no screen can paint the previous
  store's data for a frame.
- **i18n (ar/fr/en) with persistence.** `src/i18n` — persisted locale,
  device detection on first run, `t()` falling back to Arabic so a missing
  key degrades to correct Arabic, never a raw key. RTL ownership moved from
  `forcesRTL:true` in app.json (which re-forced RTL every launch and would
  have undone a French choice) to the locale layer.
- **Camera capture.** Editor was gallery-only; both sources now share one
  upload path, and `CAMERA` is declared now that something calls it.

---

## Next task — i18n adoption

Dictionaries in `src/i18n/{ar,fr,en}.ts` cover every surface. Adopted so
far: `BottomNav`, `OfflineScreen`, the language picker. Remaining screens
still render Arabic literals — correct in Arabic, untranslated in fr/en.

Adopt per screen: `const t = useT()`, replace literals with `t('key')`,
add any missing key to **all three** dictionaries (ar first — it is the
fallback). Order by traffic: login → dashboard → orders → order detail →
products → editor → more/settings → notifications → customers → modules.

Then: `npx tsc --noEmit`, `npx expo lint`, `npx expo export --platform android`.

---

## Blocked — needs you

1. **Authenticated screens are untested by me.** Everything past login sits
   behind a real Supabase session and there is no demo mode. Driving it
   requires typing a password, which I cannot do — that holds even for a
   test account, so please don't send one. Pre-auth is verified on the
   emulator (launch, validation with zero network calls on empty submit,
   error states, RTL). To get real coverage: sign in once on the emulator
   yourself and I can drive the open session, or run the APK and tell me
   what fails.

## Blocked — needs a backend change (out of bounds)

2. **Products cap at 60, no pagination.** `/api/mobile/v1/products` takes no
   offset, so a merchant with more cannot reach them. The app now says so
   at the ceiling instead of pretending.
3. **`total` returns page length, not the store count** — same route.
4. **No download endpoint exists anywhere.** No CSV, PDF or
   `Content-Disposition` in `app/api` or `lib`, so "downloads" has no
   target. A helper was written and then deleted rather than left as dead
   code.
5. **Order creation is GET-only by design** — production commerce logic,
   deliberately not exposed.
6. **https deep links** need `assetlinks.json` on the site carrying the
   signing fingerprint. `commerco://` works today.
7. **Custom order sound** — `assets/sounds/new_order.wav` is absent, so the
   channel falls back to the system sound. Pre-existing.
