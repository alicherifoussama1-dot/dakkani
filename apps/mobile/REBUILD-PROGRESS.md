# Mobile rebuild — complete

A real React Native app whose UI is built from the production website's own
design sources. The WebView shell was fully reversed; nothing about the
website, backend, Supabase, APIs, tracking or ad systems was touched.

**Verification (all green):**

| Check | Result |
|---|---|
| TypeScript | **0 errors** |
| ESLint (`npx expo lint`) | **0 problems** |
| Expo Doctor | 16/17 — the 1 failure is a known false positive, see below |
| Production bundle (`expo export`) | succeeds, 6.27 MB Hermes bytecode |

The Doctor failure claims `app.config.js` ignores `app.json`. It does not:
line 17 is `const base = require('./app.json').expo`. Doctor cannot detect
that pattern. Verified by resolving the config — name, package, FCM file,
plugins, permissions and `forcesRTL` all present.

---

## THE FINDING THAT GOVERNS THIS CODEBASE

**The production dashboard runs two design systems side by side.** Before
styling anything, check which one the web page uses:

| Web page | System | Port against |
|---|---|---|
| `DashboardHome.tsx`, `KpiCardsRow.tsx`, other `components/dashboard/*` | plain Tailwind + hardcoded `#0D6EFD` | `src/theme/legacy.ts` |
| `OrdersPageClient.tsx`, `ProductsPageClient.tsx`, auth, settings — anything using `.c-*` | Commerco Cobalt `#2952E3` | `src/theme/tokens.ts` + `src/components/ui.tsx` |

Matching the site means rendering what the browser actually paints, so the
app deliberately carries both palettes. **Do not unify them** — that would
make the app stop matching the site.

This is a website-side inconsistency. Per the production-protection rule it
was documented, **not** changed. If you ever unify it on the web, retire
`src/theme/legacy.ts` in the same pass.

Related, both verified rather than assumed:
- `border-gray-150` is undefined in `tailwind.config.ts`, so it renders as
  Tailwind's default `#E5E7EB`. The app matches what renders.
- `components/ui/StatCard.tsx` is legacy and **unused** by the dashboard;
  `KpiCardsRow` is what actually draws those cards.

---

## Architecture

```
app/
  _layout.tsx          providers, RTL, auth gate, push, deep links,
                       font gate, app-wide offline notice
  (tabs)/_layout.tsx   hosts BottomNav
  (tabs)/index.tsx     dashboard      ← DashboardHome.tsx      [legacy]
  (tabs)/orders.tsx    orders list    ← OrdersPageClient.tsx   [cobalt]
  (tabs)/products.tsx  products list  ← ProductsPageClient.tsx [cobalt]
  (tabs)/analytics.tsx · (tabs)/more.tsx
  login.tsx            ← .auth-card                            [cobalt]
  orders/[id].tsx      ← orders/[id]/page.tsx                  [cobalt]
  products/[id].tsx · customers/ · settings/ · notifications · map · module/
src/
  theme/tokens.ts      1:1 port of design/tokens.css
  theme/legacy.ts      the dashboard's Tailwind palette (see above)
  theme/fonts.ts       IBM Plex Sans Arabic loader
  components/ui.tsx    1:1 port of design/components.css (.c-*)
  components/dashboard.tsx  KpiCard, AreaSparkline, panels
  components/BottomNav · TopBar · Stepper · OfflineScreen · Icons
  lib/{api,auth,push,contact,time}.ts   production logic — UNTOUCHED
```

**Never modify:** `src/lib/api.ts`, `src/lib/auth.ts`, `src/lib/push.ts`, the
website, backend, Supabase, database, tracking, or ad systems.

---

## What was fixed

- **Typography — the largest gap.** The app declared `Tajawal_700Bold` but
  loaded **no font at all** and never set `fontFamily`, so every screen
  rendered in Android's system face while the site uses IBM Plex Sans
  Arabic. Installed the real font at 400/500/600/700 and gated the splash
  on it. Then removed **every bare `fontWeight`** across 14 files: RN cannot
  synthesise a weight for a custom family, so each one was silently falling
  back to the system font even after colours were right. Weight now always
  comes from `text(size, weight)`.
- **Icons.** `lucide-react-native` pinned to **0.344.0**, matching
  `lucide-react@^0.344.0` on the site. (It first resolved to 1.28.0 — a
  different major with different geometry.) `Icons.tsx` is now a thin alias
  layer over lucide, so 43 historic `Icon*` names keep working.
- **Every screen** rebuilt against the correct system, in the website's own
  layout order and measurements.
- **RTL.** Converted every physical `left`/`right`/`marginLeft` to logical
  `start`/`end`/`marginStart` — RN only auto-flips the logical forms.
- **Accessibility.** Roles and labels on every pressable; the Stepper is a
  `progressbar`; the wilaya tiles announce name and count.
- **Removed:** the glassmorphism kit, `LiquidGlassTabBar`, `BrandHero`
  gradients, hand-drawn icons, hand-rolled headers, and the `index` stagger
  prop — none of which the website has.

---

## Deliberate deviations (all additive, all noted in code)

1. **Tables → cards.** `.c-table` cannot survive 375px. Order and product
   rows became `.c-card`s carrying the *same* columns in the same hierarchy
   and typography.
2. **Stepper labels kept.** The web hides them below `sm`; a phone is below
   `sm`, but a bare row of numbers tells a merchant nothing.
3. **Isometric Algeria map → ranked list.** The SVG cartogram is a
   desktop flourish; the ranked list carries the same information legibly.

## Known gaps (need your decision — not app-side bugs)

1. **Downloads have no target.** The brief asked to keep downloads, but the
   website has **no file-download endpoint at all** — no CSV, no PDF, no
   `Content-Disposition` anywhere in `app/api` or `lib`. A helper was
   written, then deleted rather than left as dead code. Adding exports means
   a backend route, which is out of bounds without approval.
2. **`CAMERA` is not declared.** Nothing calls the camera — the product
   editor uses `launchImageLibraryAsync` (gallery). Declaring an unused
   permission gets flagged by Play Console. Say the word if you want camera
   capture in the editor; it is a small addition.
3. **https deep links unverified.** `commerco://` works. Making
   `dakkani.vercel.app` links open the app needs `assetlinks.json` on the
   site carrying the signing fingerprint — a website change.
4. **Custom order sound missing.** `assets/sounds/new_order.wav` is absent,
   so the channel falls back to the system sound. Pre-existing.
