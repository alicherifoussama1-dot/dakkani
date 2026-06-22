# Store Delivery Module

Store-owned courier integration. **Independent of Confirmili** — deleting the
Confirmili module does NOT break the store's delivery.

## Boundaries
- **No imports from Confirmili.** This module (`lib/delivery/*`) imports only
  Supabase + its own types. Confirmili may import it (one-way); never the reverse.
- **Store-owned tables** (all scoped by `store_id`, RLS by store owner):
  `delivery_providers`, `delivery_declared_prices`, `delivery_real_prices`,
  `wilaya_company_map` (migration 018). These are NOT Confirmili tables.
- **UI**: `components/store/StoreDelivery.tsx`, page at
  `app/(dashboard)/store/delivery` (`/store/delivery`). Confirmili reuses the
  same component in its tab, but the store page stands alone.
- **API**: `app/api/delivery/*` (ship / track / cancel / label / test /
  import-rates / providers). Server-side only.

## Architecture
- **Unified adapter** (`providers/*` + `index.ts`): one interface for every
  courier — `createShipment`, `getTracking`, `cancelShipment`, `importRates`,
  `getLabel`. Provider tracking strings are normalized into one internal status
  set (`types.ts`). Add a courier by adding a `providers/<name>.ts`.
- **JSON credentials per provider** (`types.ts` → `PROVIDERS[].credTemplate`):
  one JSON textarea; each adapter reads only the keys it needs
  (ZR Express: `{secretKey, tenantId}`, Yalidine: `{token, key}`,
  Ecotrack/Maystro: `{token}`). No fixed token+key forced on everyone.
- **Security**: credentials are encrypted at rest (`crypto.ts`) and used
  server-side only. No secret ever reaches the client bundle.

## Known cross-module touchpoint (non-breaking)
`app/api/delivery/ship/[orderId]` writes a best-effort row to
`confirmili_send_reports` for Confirmili's "تقرير الإرسال". It is wrapped so a
missing table fails silently — if Confirmili is removed, shipping still works.
