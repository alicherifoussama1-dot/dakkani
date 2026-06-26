# Product Editor — UX Redesign (Analysis & Proposed IA)

**Status:** 🔬 Analysis only — no code, no commits, no migrations, no schema/API/logic changes.
**Scope:** The Admin **Product Editor** only (`AdminProductEditor`). The Product Page and Checkout storefront are out of scope except where a product setting feeds them.
**Date:** 2026-06-26

**Primary files inspected:**
- `components/admin/AdminProductEditor.tsx` (1,217 lines) — the editor used by both create & edit.
- `app/(dashboard)/products/new/page.tsx` and `app/(dashboard)/products/[id]/page.tsx` — both render `AdminProductEditor`.
- `lib/product-themes.ts` — `PRODUCT_THEMES`, `DEFAULT_SECTION_ORDER`, `SECTION_LABELS`, `ProductSectionId` (consumed by the editor's section-order UI).
- Cross-reference only: `components/storefront/ProductPageClient.tsx` & `app/(storefront)/[storeSlug]/product/[slug]/page.tsx` (to confirm which product settings actually reach the storefront), and `app/(marketplace)/discover/[storeSlug]/[slug]/page.tsx`.

---

## 1. Current Architecture

### 1.1 Entry points
Both `/products/new` and `/products/[id]` render the **same** `AdminProductEditor`. One `react-hook-form` + `zod` schema drives both create and edit.

### 1.2 Tabs (current)
A single tab bar with **7 tabs** (`TABS` constant):

| # | id | Label (current) | Renders |
|---|----|----|----|
| 1 | `basic` | أساسي 📝 | name/slug/description, **description image**, **price/compare/cost**, category/SKU, tags, active/featured, **+ Order Routing (Sheet/Confirmili)** |
| 2 | `images` | الصور 🖼️ | `ImageGallery` |
| 3 | `variants` | المتغيرات 🎨 | `VariantsSection` (`variant_groups`) |
| 4 | `design` | صفحة المنتج 📄¹ | ~~Theme picker~~¹, **section order + visibility (DnD)**, product video |
| 5 | `pixels` | البكسل 📡 | `use_store_pixel`, `meta_pixel_id`, `tiktok_pixel_id` |
| 6 | `seo` | SEO 🔍 | `meta_title`, `meta_description` |
| 7 | `stock` | المخزون 📦 | `track_inventory`, `initial_stock`, `warehouse_id`, per-variant stock table |

> ¹ The Product Theme picker was just **deprecated/hidden** (Phase 1) and the tab relabeled from «تصميم الصفحة» to «صفحة المنتج». `theme_key` is still saved for compatibility.

### 1.3 Complete field inventory (zod schema, lines 24–55)
| Field | Tab today | Reaches storefront? | Notes |
|---|---|---|---|
| `name`, `name_ar` | basic | ✅ | required name (fr/en); ar optional |
| `slug` | basic | ✅ | URL |
| `description`, `description_ar` | basic | ✅ | |
| `sku` | basic | ⚠️ internal | not shown to buyer |
| `barcode` | — (schema only) | ❌ | **in schema, no UI field → dead** |
| `price` | basic | ✅ | required |
| `compare_price` | basic | ✅ | strike-through |
| `cost_price` | basic | ⚠️ internal | margin only, not storefront |
| `category_id` | basic | ✅ | |
| `tags` | basic | ⚠️ | |
| `is_active`, `is_featured` | basic | ✅ | |
| `use_store_pixel`, `meta_pixel_id`, `tiktok_pixel_id` | pixels | ✅ | tracking |
| `meta_title`, `meta_description` | seo | ✅ | `generateMetadata` |
| `variant_groups` | variants | ✅ | |
| `track_inventory`, `initial_stock`, `warehouse_id` | stock | ✅ | |
| `theme_key` | design (hidden) | ✅ palette only | **deprecated UI** |
| `section_order` | design | ⚠️ **discover only** | **NOT read by the frozen storefront page** |
| `section_visibility` | design | ⚠️ **discover only** | same |
| `video_url` | design | ✅ | gallery |
| `description_image_url` | basic | ✅ | "تفاصيل المنتج" section |
| `order_routing`, `google_sheet_id` | basic | ✅ (backend) | order destination |

---

## 2. Problems

1. **Overloaded "basic" tab.** It mixes Identity (name/slug/category), **Pricing** (price/compare/cost), a **Media** item (description image), status flags, **and** backend **Order Routing**. Five unrelated concerns in one screen → high cognitive load.
2. **Misleading "Product Page" controls.** `section_order` / `section_visibility` promise "reflects on the product page," but the **frozen storefront page does not read them** — only the `/discover` route does. Merchants configure something that does nothing on their real store. *(Evidence: the storefront `page.tsx`/`ProductPageClient` never reference these keys; `discover/[storeSlug]/[slug]/page.tsx` does.)*
3. **Visual-only settings inflate the UI.** Product Theme (7 palettes) existed purely to change appearance — against the now-global design system. (Already hidden in Phase 1.)
4. **Dead field.** `barcode` exists in the schema but has no input and no storefront use.
5. **No grouping discipline.** Pricing isn't its own step; SEO/Pixels are separate tabs but Order Routing (also "advanced/backend") sits inside basic.
6. **No functional Product-Page business toggles.** There is no per-product Enable Reviews / Enable FAQ / Show WhatsApp — these don't exist as fields yet, so the requested "Product Page" section can't be fully functional without new columns (Phase 2).
7. **Checkout is store-level, not product-level.** All checkout config (`checkout_fields`, `checkout_field_order`, delivery toggles, free shipping) lives in `store_settings` via `SettingsPageClient`, **not** on the product. A "Checkout" tab inside the *product* editor implies per-product overrides that don't exist today.

---

## 3. Best Practices (extracted, not copied)

From Shopify, WooCommerce, BigCommerce, Ecwid, Saleor — common, platform-agnostic principles:

- **Progressive disclosure.** A short primary path (title, media, price, inventory) with advanced concerns (SEO, tracking, routing) tucked away. *(Shopify: "Search engine listing" and "Metafields" are collapsed/secondary.)*
- **One concern per section.** Pricing, Inventory, Media, Organization are distinct, predictable blocks.
- **Store-level vs product-level separation.** Checkout/shipping/tax are **store** settings; the product form links to them rather than duplicating. *(WooCommerce/Shopify keep checkout config global.)*
- **No appearance pickers inside the product editor.** Theme/skin is a global brand decision, never per-product. *(None of these platforms offer per-product visual themes.)*
- **Functional toggles only.** A setting earns its place only if it changes behavior (visibility, availability, tax, shipping), not looks.
- **Inline validation + a single persistent Save bar** (already present — keep).

---

## 4. Proposed Information Architecture

**10 sections**, each with a small, single-purpose set of options:

| New section | Contains (existing fields) | Source today |
|---|---|---|
| **1. General** | `name_ar`, `name`, `slug`, `category_id`, `sku`, `tags`, `is_active`, `is_featured` | basic |
| **2. Pricing** | `price`, `compare_price`, `cost_price` | basic |
| **3. Media** | product images, `video_url`, `description_image_url` | images + basic + design |
| **4. Variants** | `variant_groups` | variants |
| **5. Inventory** | `track_inventory`, `initial_stock`, `warehouse_id`, per-variant stock | stock |
| **6. Product Page** | `section_order`, `section_visibility` — **kept as a first-class feature**; to be consumed by `ProductPageClient` in a future phase | design |
| **7. Checkout** | (store-level defaults shown) visible fields, required fields, field order, home delivery, stopdesk, free shipping — **dedicated section retained**, architected for future per-product overrides | store_settings (default) |
| **8. Pixels** | `use_store_pixel`, `meta_pixel_id`, `tiktok_pixel_id` | pixels |
| **9. SEO** | `meta_title`, `meta_description` | seo |
| **10. Advanced** | `order_routing`, `google_sheet_id`, (legacy: `barcode`) | basic (Order Routing) |

**Locked decisions (owner-approved) governing this IA:**
1. **`section_order` / `section_visibility` are KEPT — not deprecated.** They are an important platform feature. The plan is to make **`ProductPageClient` consume them in a future phase** (today only `/discover` does). No DB change.
2. **No new Product Page toggles.** WhatsApp / Reviews / FAQ enable-toggles will **not** be introduced; the database stays unchanged. (FAQ/Reviews/WhatsApp remain always-on / data-driven on the storefront.)
3. **Checkout stays in the Product Editor as a dedicated section.** Store-level settings (`store_settings`) remain the **default and source of truth**. The section is **architected** so that **per-product overrides** can be added later — but **overrides are NOT implemented now** (no new columns, no logic).

**Deprecated (hidden from UI, kept in DB):** Product Theme (`theme_key`), Checkout Theme (`checkout_theme`). Any future Hero/Card/Color-preset pickers: same treatment. *(Note: only the visual theme pickers are deprecated — `section_order`/`section_visibility` are explicitly NOT deprecated.)*

---

## 5. Text Wireframe (proposed)

```
┌─ Product Editor ───────────────────────────────────────────┐
│ [General] [Pricing] [Media] [Variants] [Inventory]         │
│ [Product Page] [Checkout] [Pixels] [SEO] [Advanced]        │
├────────────────────────────────────────────────────────────┤
│ GENERAL                                                    │
│  Name (ar) *            Name (fr/en) *                      │
│  Slug *                 Category ▾                          │
│  SKU                    Tags                                │
│  ☑ Active   ☑ Featured                                     │
├────────────────────────────────────────────────────────────┤
│ PRICING                                                    │
│  Sale price *   Compare-at price   Cost (internal)         │
│  └ margin auto-hint (cost vs price)                         │
├────────────────────────────────────────────────────────────┤
│ MEDIA                                                      │
│  [▦ image grid — drag to reorder]                          │
│  Video URL                                                 │
│  Description banner image  [upload]                        │
├────────────────────────────────────────────────────────────┤
│ VARIANTS                                                   │
│  + Add option (Color / Size …)  → chips                    │
├────────────────────────────────────────────────────────────┤
│ INVENTORY                                                  │
│  ☑ Track inventory                                         │
│  Warehouse ▾   Initial stock                              │
│  [per-variant qty table]                                  │
├────────────────────────────────────────────────────────────┤
│ PRODUCT PAGE   (kept feature — section order/visibility)   │
│  Section order  [⠿ Gallery][⠿ Info][⠿ Reviews][⠿ FAQ]…    │
│   each row: ⠿ drag  •  👁 show/hide                        │
│  ⓘ note: will drive the storefront page in a future phase  │
│     (currently active on /discover). No new toggles added. │
├────────────────────────────────────────────────────────────┤
│ CHECKOUT   (store settings = default & source of truth)    │
│  ⓘ Defaults managed in Store Settings → Checkout           │
│     [Open store checkout settings →]                       │
│  Visible fields · Required fields · Field order            │
│  Home delivery · Stopdesk · Free shipping                  │
│  ⌁ (future) per-product override — architecture only, off  │
├────────────────────────────────────────────────────────────┤
│ PIXELS                                                     │
│  ☑ Use store pixel   Meta Pixel ID   TikTok Pixel ID      │
├────────────────────────────────────────────────────────────┤
│ SEO                                                        │
│  Meta title   Meta description   [Google preview]         │
├────────────────────────────────────────────────────────────┤
│ ADVANCED                                                   │
│  Order routing ▾   Google Sheet ▾                         │
│  (legacy/hidden: barcode, theme_key)                      │
├────────────────────────────────────────────────────────────┤
│ [💾 Save]                          ✓ Saved   [Cancel]      │
└────────────────────────────────────────────────────────────┘
```

---

## 6. Execution Phases (proposal — not started)

- **Phase A — Re-grouping (no schema):** split `basic` into General + Pricing; move description image to Media; move Order Routing to Advanced. Pure JSX relocation; same fields, same `register` names → zero behavior change.
- **Phase B — Product Page tab clarity:** keep `section_order`/`section_visibility` (first-class feature) with a clearer DnD UI + an honest note that it currently applies on `/discover` and will drive the storefront page once wired. **No new toggles.**
- **Phase C — Checkout section (store-level default):** the dedicated Checkout section surfaces/links the store-level checkout settings as the source of truth, and is **structured** so per-product overrides can slot in later (e.g. an `override?` boundary in the UI/types) — **without** adding columns or logic now.
- **Phase D — (future, needs separate approval) Wire `section_order`/`section_visibility` into `ProductPageClient`** so the storefront honors them; and/or per-product checkout overrides (would need a migration — out of current scope, DB stays unchanged).
- **Phase E — Dead-code cleanup (separate, after stabilization):** `barcode`, deprecated visual-theme branches. (Section order/visibility are **not** in this list.)

---

## 7. Risks

| Risk | Likelihood | Mitigation |
|---|---|---|
| Moving JSX blocks accidentally drops a `register('field')` → silent data loss | Med | Keep identical field names; diff field-by-field; build + manual save test before/after |
| Tab `id` rename breaks `useState<Tab>` typing / deep links | Low | Keep internal ids stable; only change labels/grouping |
| Merchants expect section-order to work on the storefront page | **High (already true)** | Feature is **kept**; add the honest note now; **wire into `ProductPageClient` in Phase D** |
| Adding non-functional toggles erodes trust | — | **Resolved:** no WhatsApp/Reviews/FAQ toggles are introduced; DB unchanged (decision 2) |
| Checkout-in-product implies per-product config that doesn't exist | Med | **Resolved:** store settings stay the default/source of truth; the section is only *architected* for future overrides, none implemented (decision 3) |
| Hidden DB fields (`theme_key`, `checkout_theme`) read by storefront forms | Med | Forms must keep safe fallbacks; unify on tokens in the Checkout phase |

---

## 8. Deprecated Settings (hide in UI, keep in DB)

| Setting | Where | Why deprecate | Keep in DB? |
|---|---|---|---|
| `theme_key` (Product Theme, 7 palettes) | product | visual-only; conflicts with one global design system | ✅ yes |
| `checkout_theme` (4 themes) | store_settings | visual-only; same | ✅ yes |
| (future) Hero/Card/Color-preset pickers | any | visual-only | ✅ yes |

---

## 9. Dead Code / Dead Settings

| Item | Evidence | Recommendation |
|---|---|---|
| `barcode` | in zod schema, **no input rendered**, no storefront read | mark dead; remove from UI later, keep column |
| `section_order` / `section_visibility` | currently read **only** by `/discover`, not by the frozen storefront page | **NOT dead — kept feature.** Decision: wire into `ProductPageClient` in Phase D; meanwhile label honestly. Do **not** deprecate or remove. |
| Checkout theme branches in `ProductOrderForm` / `CheckoutForm` | 4 hardcoded theme style blocks + invalid Tailwind classes (`amber-350`, `slate-805`, `blue-705`…) that render nothing | remove when unifying on tokens (Checkout phase) |
| `cost_price` | internal margin only | keep (business value: margin), just move to Pricing and label "internal" |

---

## Decisions (owner-approved — locked)
1. **`section_order` / `section_visibility`:** **KEEP** as a first-class feature (not deprecated). Wire into `ProductPageClient` in a **future phase**. No DB change.
2. **Checkout section:** **stays in the Product Editor** as a dedicated section. Store-level settings remain the **default & source of truth**. Architect for **future per-product overrides** — but **do not implement overrides now** (no columns, no logic).
3. **Product Page toggles** (FAQ / Reviews / WhatsApp): **NOT introduced.** Database remains unchanged.

## Still open (defer to their own phases)
- **Phase D timing** for wiring section order/visibility into the storefront page.
- The eventual **per-product checkout override** mechanism (would require a migration — explicitly out of current scope).

**End of analysis. No code was changed. Document updated per the approved decisions. Awaiting approval before implementation.**
