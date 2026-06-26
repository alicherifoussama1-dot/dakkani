# Product Page — Design Audit & Frozen Reference

**Status:** 🔒 Frozen (production quality). Do not modify the Product Page unless a bug is found.
**Last updated:** 2026-06-26
**Scope:** The public storefront Product Page.
**Primary files:**
- `app/(storefront)/[storeSlug]/product/[slug]/page.tsx` — server route (data + page composition).
- `components/storefront/ProductPageClient.tsx` — Hero (gallery, info, buy block, sticky bar).
- `components/storefront/ProductOrderForm.tsx` — inline one-page order form *(out of scope here; owned by the upcoming Checkout phase)*.
- `lib/product-themes.ts` — the 7-theme design-token system (`--pt-*`).
- `components/discover/product/product-theme.css` — token-bound utility classes (`.pt-heading`, `.pt-badge`, …).
- `app/globals.css` — FAQ accordion CSS.

This document is the **design reference for the entire ecommerce platform**. New storefront surfaces (Checkout, category, store home) should follow the rules below.

---

## 0. Design Philosophy (the north star)

> Simplicity · Mobile-first · Speed · Trust · Accessibility · Scalability.
> Inspired by Apple / Stripe / Linear / Notion / Vercel. **Not** imitating Shopify / WooCommerce / YouCan / JustSell.

Every change to this page had to improve **at least one** of: UX, Conversion, Trust, Performance, Accessibility. "Redesign for the sake of redesign" was explicitly rejected. The page should read as **one coherent product**, not a stack of components.

Market context: **Algeria, COD (Cash on Delivery)**. The dominant buyer objection is *"can I trust paying for something online?"* — so trust and COD reassurance are weighted heavily above the fold.

---

## 1. Final UX Decisions

| Decision | Reasoning |
|---|---|
| **One-page buy flow.** The order form (`ProductOrderForm`) lives inline on the product page; the mobile sticky CTA **smooth-scrolls to it** (`#order-form`) instead of navigating to a separate `/checkout`. | Every extra navigation leaks 10–20% of intent. Keeping the order in-page honors the One-Page Checkout principle and removes a full page load. |
| **Buy block kept high & tight.** Order: gallery → name → rating → price → trust → short description → variants → order form. The **long description image was moved *below* the buy block**. | A tall sales infographic used to push variants + CTA far down the page. Interested buyers scroll for detail; nobody should scroll *to be able to buy*. |
| **Trust placed directly under the price**, above the fold. | The COD reassurance (delivery / open-before-pay / guarantee) is the #1 conversion lever in the DZ market; it must be visible at the decision moment. |
| **Delivery-fee transparency line** under the price ("+ سعر التوصيل حسب ولايتك"). | Sets price expectation early, reducing checkout-time surprise and abandonment. |
| **FAQ as objection-handling**, not decoration. | Answers the real COD objections (how do I pay, can I open before paying, delivery time, all 58 wilayas, how to order) at the point of hesitation. |
| **Reviews convey authenticity** (verified-purchase badge + date), not just stars. | Star-only reviews read as decoration; a name + "شراء موثّق" + date reads as a real person. |

---

## 2. Final UI Decisions

- **Cards** (reviews, related, FAQ, review-form wrapper): `background: var(--pt-surface)`, `border: 1px solid var(--pt-border)`, `border-radius: var(--pt-radius-lg)`, `box-shadow: var(--pt-shadow-sm)`. This is the **canonical card** for the platform.
- **Primary CTA**: `var(--pt-btn-primary-bg)` / `var(--pt-btn-primary-text)` / `var(--pt-btn-radius)`.
- **WhatsApp action**: brand green `#25D366` (intentionally *not* themed — see §6), branded WhatsApp SVG icon.
- **Badges**: `.pt-badge` family (stock), plus an inline success-tinted "verified purchase" pill using `color-mix(in srgb, var(--pt-success) 14%, transparent)`.
- **Iconography**: `lucide-react` line icons + the branded WhatsApp SVG. **No emoji in UI chrome or CTAs** (emoji were removed from the sticky bar) — emoji clash with the premium line-icon system.
- **Sticky mobile bar**: theme-aware surface via `color-mix(in srgb, var(--pt-surface) 92%, transparent)` + `backdrop-blur`, `border-top: var(--pt-border)`.

---

## 3. Final Visual Hierarchy

Top → bottom, mobile-first:

1. **Gallery** (square, swipeable, dot indicator on mobile).
2. **Stock badge** (urgency when low).
3. **Product name** — `h1`, largest text on the page.
4. **Rating** (social proof, compact).
5. **Price** — largest *colored* element (`var(--pt-accent)`), `tabular-nums`.
6. **Delivery transparency** (muted, small).
7. **Trust strip** (3 COD levers).
8. **Short description**.
9. **Variants**.
10. **Order form** (`#order-form`) + WhatsApp (desktop inline).
11. **Long description image** ("تفاصيل المنتج").
12. **Reviews** → **FAQ** → **Review form** → **Related**.

Rule: **importance = size + color + position**. The name is biggest; the price is the strongest color; the CTA is reachable with minimal scroll; supporting detail descends in weight.

---

## 4. Typography Rules

- **Headings** use the `.pt-heading` class **only** — it binds `font-family: var(--pt-font-heading)`, `font-weight: var(--pt-heading-weight)`, `letter-spacing: var(--pt-heading-tracking)`, `color: var(--pt-text)`. **Never** hand-roll heading styles inline (this was the last typography inconsistency we fixed — inline headings were missing the tracking).
- **Heading scale**: `h1` = `text-3xl md:text-4xl`; section `h2` = `text-2xl`; sub-heading (e.g. "تفاصيل المنتج") = `text-lg`.
- **Body**: `text-base leading-relaxed` for descriptions; `text-sm` for review/FAQ body; `text-xs`/`text-[11px]` for muted meta.
- **Numbers** (price, related price): `tabular-nums` for stable digit width and clean RTL alignment.
- **RTL**: page is `dir="rtl"`; the Hero switches `dir` by language (`ar`/`fr`/`en`). Arabic uses the theme's distinctive Arabic font stack (Cairo / Amiri / Reem Kufi / El Messiri / Tajawal via tokens).

---

## 5. Spacing Rules

- **Page sections**: `py-12`, separated by `border-top: var(--pt-border)` (except the first section after the Hero, which needs no divider).
- **Hero wrapper**: `py-4 md:py-8` (tighter on mobile to lift content above the fold).
- **Info column**: `space-y-4 md:space-y-5`.
- **Grid gaps**: gallery↔info `gap-6 md:gap-10`; review grid `gap-3`; related grid `gap-4`.
- **Content widths**: text-heavy sections are narrower for readability (reviews `max-w-4xl`, FAQ/review-form `max-w-3xl`); grid sections are full (`max-w-6xl`). Width is chosen by content type, not uniformity.
- Principle: **mobile compresses vertical rhythm; desktop relaxes it.**

---

## 6. Color & Theme Usage

- **All color comes from `--pt-*` tokens** (7 themes, applied via `data-theme` + `themeToCSSVars`). The **entire page** — not just the Hero — is wrapped in the theme so reviews/FAQ/related inherit the same language. *(Before the audit, the page body used hardcoded grays; this was the single biggest consistency fix.)*
- **Token cheat-sheet**: `--pt-bg`, `--pt-surface`, `--pt-surface-soft`, `--pt-border`, `--pt-text` / `--pt-text-soft` / `--pt-text-muted`, `--pt-accent` / `--pt-accent-soft`, `--pt-success` / `--pt-danger` / `--pt-star`, `--pt-radius-sm/md/lg/pill`, `--pt-shadow-sm/md/lg`, `--pt-btn-*`, `--pt-font-heading/body`, `--pt-heading-weight/tracking`.
- **Intentional hardcoded exceptions** (do not theme these):
  - WhatsApp green `#25D366` — brand color, must stay recognizable across all themes.
  - Lightbox backdrop `bg-black/90` — a neutral overlay, not a themed surface.
- **Tinting**: derive related shades with `color-mix(in srgb, var(--pt-…) N%, transparent)` rather than new hardcoded colors.

---

## 7. Component Usage

| Component | Role | Notes |
|---|---|---|
| `ProductPageClient` | Hero: gallery, info, buy block, lightbox, sticky bar | Owns `--pt-*` via `data-pt-root`. |
| `ProductOrderForm` | Inline one-page order | **Frozen out of this audit** — owned by the Checkout phase. |
| `ProductVariants` | Color/size selection | Drives live stock badge + order form + WhatsApp message. |
| `ReviewForm` | Submit a review | Wrapper themed; **internal fields still use legacy styles** (known limitation §13). |
| `WhatsAppFloat` | Persistent contact | **Desktop only** on this page (collided with the mobile sticky bar). |
| `StorefrontLayout` | Header / nav | **Kept** after verifying its purpose (logo = trust). Not redesigned. |
| `.pt-heading` / `.pt-badge` | Token-bound utilities | Reuse instead of inline styling. |

---

## 8. Mobile-Specific Decisions

- **Sticky buy bar** (`md:hidden`): WhatsApp + "اطلب — {price}". The order button scrolls to `#order-form`. Theme-aware surface, `--pt-btn-radius`, 44px+ tap height, `gap-3` separation.
- **Gallery**: dot **position indicator** overlay (`md:hidden`, `pointer-events-none` so swipe stays primary); **thumbnails are desktop-only** (`hidden md:flex`) — cleaner and lighter on mobile.
- **WhatsAppFloat hidden on mobile** — it overlapped the sticky bar (z-50 over z-40) and duplicated its WhatsApp action.
- **Reduced above-the-fold height** on mobile (smaller padding, switcher margin, grid gap) so price/rating/CTA are reachable with minimal scroll.
- Mobile-first was the default: every spacing/size decision was set for mobile, then *relaxed* at `md:`.

---

## 9. Accessibility Decisions

- **`aria-label`** on all icon-only controls: gallery prev/next/zoom, thumbnails (`aria-current` for the active one), lightbox close, the sticky order button.
- **Star ratings** carry a text `aria-label` (e.g. "4.8 / 5 — 12 reviews"); the decorative star spans are `aria-hidden`.
- **FAQ** uses native `<details>/<summary>` — keyboard-operable and screen-reader-friendly for free, with no JS.
- **Touch targets** raised toward 44px (zoom button 36→40px, language switcher tap height bumped).
- **Semantic headings**: one `h1` (product name), `h2` for sections.

---

## 10. Performance Optimizations

- **LCP**: first gallery image is `priority`; all others lazy. Description image and related images are `loading="lazy"`. Lightbox `<img>` loads only on open.
- **Zero new libraries** added across the entire polish effort. **FAQ is pure CSS** (`<details>` + 4 lines in `globals.css`) — no JS cost.
- **`next/image`** everywhere with correct `sizes` for gallery / thumbnails / related.
- Mobile **does not download thumbnails** (`hidden`) — less work on the constrained device.
- Theme tokens are CSS variables — theming costs nothing at runtime.

---

## 11. Conversion Optimization Decisions

1. **Above-the-fold trust** (COD levers under the price) — addresses the primary DZ objection at the decision point.
2. **Tight, high buy block** — minimize scroll-to-buy.
3. **Sticky CTA → inline form** — one-page, no navigation drop-off.
4. **Delivery-fee transparency** — fewer surprise-driven abandonments.
5. **Authentic reviews** (verified + date) — credible social proof.
6. **FAQ objection handling** — removes hesitation before it costs the sale.
7. **Price as the strongest color** + `tabular-nums` — instant, stable readability.

---

## 12. Sections Intentionally Removed or Kept

**Kept (with justification):**
- **Header / navigation** — verified purpose (logo builds trust); not removed or redesigned.
- **WhatsApp ordering** — major DZ channel; kept (desktop inline + mobile sticky).
- **Related products** — discovery/AOV value; retained but re-themed.

**Removed / not added (with justification):**
- **No separate "Benefits" section** — the Hero trust strip already is the benefits; a second block would duplicate (violates "remove repetition").
- **Removed the floating WhatsApp on mobile** — duplicated the sticky bar's WhatsApp and physically overlapped it.
- **Removed emoji from CTAs/chrome** — off-brand vs the line-icon system.
- **Removed duplicate trust grid** — trust now appears once, under the price.

---

## 13. Known Limitations

- **`ReviewForm` internals** still use legacy hardcoded styles (the wrapper is themed; the fields inside are not) — the last non-themed island.
- **Language switcher** uses hardcoded grays rather than tokens (small floating control; cost/benefit didn't justify changing it now).
- **FAQ content is hardcoded Arabic** — not yet merchant-editable, and not localized with the Hero's language switch.
- **No `focus-visible` ring system** — keyboard focus states are browser-default, not a unified design token.
- **Gallery arrows are hover-only** (mouse); keyboard users rely on swipe/scroll + thumbnails.
- **Reviews are not paginated/collapsed** — a product with many reviews produces a long list.
- Two pre-existing **ESLint `react-hooks/exhaustive-deps` warnings** in `ProductPageClient` (non-blocking).

---

## 14. Future Improvement Opportunities

- Make **FAQ content merchant-editable** (and localized) from the dashboard.
- **Theme `ReviewForm` internals** and the **language switcher** to fully close the token gap.
- **Collapse/paginate reviews** beyond a threshold ("عرض المزيد").
- Add a **`focus-visible` token system** for unified keyboard accessibility.
- **WCAG AA contrast audit** of `--pt-text-muted` on `--pt-surface` across all 7 themes.
- **Keyboard-accessible gallery** navigation (arrow keys / focusable controls).
- Optional **numeric social proof** near the price (units sold / buyers) when data exists.
- Resolve the `useMemo`/`useEffect` dependency warnings for render stability.

---

## Change Log (this design cycle)

- **Batch 1** — Hero: trust above the fold, sticky CTA → inline form, a11y labels. (`dfd842d`)
- **Batch 2** — Conversion: above-fold density, mobile gallery dots, info-order fix, tabular price. (`58773d0`)
- **Batch 3** — Page-wide token consistency, reviews authenticity, FAQ (zero-JS), related re-theme. (`2e3f77d`)
- **Final QA** — heading typography unified on `.pt-heading`, premium iconography in sticky bar, WhatsApp float de-duplicated. (`1c1926f`)

**The Product Page is frozen as of `1c1926f`.** Next phase: dedicated Checkout (`ProductOrderForm`) optimization.
