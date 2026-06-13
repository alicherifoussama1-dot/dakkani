-- ============================================================
-- Migration 018 — Unified Delivery System (IDEMPOTENT)
-- Single source of truth for couriers + prices, shared by
-- Confirmili (shipments/tracking/real prices) and the storefront
-- (declared prices shown to the customer).
-- Credentials are stored ENCRYPTED (AES-256-GCM) — server-side only.
-- ============================================================

-- ── PROVIDERS (one row per courier account the merchant adds) ─
CREATE TABLE IF NOT EXISTS delivery_providers (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id      UUID NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  provider_type TEXT NOT NULL CHECK (provider_type IN ('yalidine','zrexpress','ecotrack','maystro','noest')),
  display_name  TEXT NOT NULL,
  credentials   TEXT,                       -- AES-256-GCM blob (iv.tag.ciphertext)
  is_active     BOOLEAN NOT NULL DEFAULT true,
  is_automatic  BOOLEAN NOT NULL DEFAULT false,   -- auto-ship confirmed orders
  from_wilaya_code TEXT DEFAULT '16',
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_delivery_providers_store ON delivery_providers(store_id, is_active);

-- ── DECLARED PRICES (shown to customer, added to order total) ─
CREATE TABLE IF NOT EXISTS delivery_declared_prices (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id        UUID NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  provider_id     UUID NOT NULL REFERENCES delivery_providers(id) ON DELETE CASCADE,
  wilaya_code     TEXT NOT NULL,            -- 2-digit '01'..'58'
  home_price      NUMERIC(10,2) NOT NULL DEFAULT 0,
  stopdesk_price  NUMERIC(10,2) NOT NULL DEFAULT 0,
  source          TEXT NOT NULL DEFAULT 'manual' CHECK (source IN ('imported','manual')),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(provider_id, wilaya_code)
);
CREATE INDEX IF NOT EXISTS idx_declared_prices_store ON delivery_declared_prices(store_id, wilaya_code);

-- ── REAL PRICES (profit calc only, never shown to customer) ──
CREATE TABLE IF NOT EXISTS delivery_real_prices (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id        UUID NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  provider_id     UUID NOT NULL REFERENCES delivery_providers(id) ON DELETE CASCADE,
  wilaya_code     TEXT NOT NULL,
  home_price      NUMERIC(10,2) NOT NULL DEFAULT 0,
  stopdesk_price  NUMERIC(10,2) NOT NULL DEFAULT 0,
  source          TEXT NOT NULL DEFAULT 'manual' CHECK (source IN ('imported','manual')),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(provider_id, wilaya_code)
);
CREATE INDEX IF NOT EXISTS idx_real_prices_store ON delivery_real_prices(store_id, wilaya_code);

-- ── WILAYA → PROVIDER MAP (auto-routing) ─────────────────────
CREATE TABLE IF NOT EXISTS wilaya_company_map (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id    UUID NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  wilaya_code TEXT NOT NULL,
  provider_id UUID NOT NULL REFERENCES delivery_providers(id) ON DELETE CASCADE,
  UNIQUE(store_id, wilaya_code)
);
CREATE INDEX IF NOT EXISTS idx_wilaya_map_store ON wilaya_company_map(store_id);

-- ── ORDER COLUMNS (link order → provider + unified tracking) ──
ALTER TABLE orders ADD COLUMN IF NOT EXISTS delivery_provider_id UUID REFERENCES delivery_providers(id) ON DELETE SET NULL;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS tracking_status TEXT;   -- unified status
ALTER TABLE orders ADD COLUMN IF NOT EXISTS label_url TEXT;
-- (delivery_type / tracking_number already exist from migration 001)

-- ── RLS ──────────────────────────────────────────────────────
ALTER TABLE delivery_providers       ENABLE ROW LEVEL SECURITY;
ALTER TABLE delivery_declared_prices ENABLE ROW LEVEL SECURITY;
ALTER TABLE delivery_real_prices     ENABLE ROW LEVEL SECURITY;
ALTER TABLE wilaya_company_map       ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "tenant_isolation" ON delivery_providers;
DROP POLICY IF EXISTS "tenant_isolation" ON delivery_declared_prices;
DROP POLICY IF EXISTS "tenant_isolation" ON delivery_real_prices;
DROP POLICY IF EXISTS "tenant_isolation" ON wilaya_company_map;
DROP POLICY IF EXISTS "public_read_declared" ON delivery_declared_prices;

CREATE POLICY "tenant_isolation" ON delivery_providers USING (
  store_id IN (SELECT id FROM stores WHERE owner_id = auth.uid())
);
CREATE POLICY "tenant_isolation" ON delivery_declared_prices USING (
  store_id IN (SELECT id FROM stores WHERE owner_id = auth.uid())
);
CREATE POLICY "tenant_isolation" ON delivery_real_prices USING (
  store_id IN (SELECT id FROM stores WHERE owner_id = auth.uid())
);
CREATE POLICY "tenant_isolation" ON wilaya_company_map USING (
  store_id IN (SELECT id FROM stores WHERE owner_id = auth.uid())
);
-- Storefront (anon) needs to read declared prices to show delivery cost.
CREATE POLICY "public_read_declared" ON delivery_declared_prices FOR SELECT USING (true);

SELECT 'Migration 018 completed — unified delivery system' as status;
