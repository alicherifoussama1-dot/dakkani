-- ============================================================
-- 021 — Merchant-managed delivery offices (stopdesk pickup points)
--
-- Couriers without an offices API (ZR Express, etc.) need the merchant to
-- list their pickup offices per wilaya. The storefront checkout shows them
-- when the customer chooses "التوصيل للمكتب". Yalidine still auto-fetches.
-- ============================================================
CREATE TABLE IF NOT EXISTS store_delivery_offices (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id    UUID NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  provider_id UUID REFERENCES delivery_providers(id) ON DELETE CASCADE, -- NULL = any courier
  wilaya_code TEXT NOT NULL,                 -- '01'..'58'
  name        TEXT NOT NULL,                 -- office name (e.g. "مكتب ZR وسط المدينة")
  address     TEXT,
  is_active   BOOLEAN NOT NULL DEFAULT true,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_store_offices ON store_delivery_offices(store_id, wilaya_code, is_active);

ALTER TABLE store_delivery_offices ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "offices_owner" ON store_delivery_offices;
CREATE POLICY "offices_owner" ON store_delivery_offices
  USING      (store_id IN (SELECT id FROM stores WHERE owner_id = auth.uid()))
  WITH CHECK (store_id IN (SELECT id FROM stores WHERE owner_id = auth.uid()));
