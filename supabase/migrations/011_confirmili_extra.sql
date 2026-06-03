-- ============================================================
-- Migration 011 — Confirmili remaining tables (IDEMPOTENT)
-- Adds: is_trashed on orders, store_integrations, finance_config,
--       payments. Safe to run multiple times. Run AFTER 010.
-- ============================================================

-- ── orders: trash flag for soft-delete ──────────────────────
ALTER TABLE orders ADD COLUMN IF NOT EXISTS is_trashed BOOLEAN NOT NULL DEFAULT false;
CREATE INDEX IF NOT EXISTS idx_orders_trashed ON orders(store_id, is_trashed);

-- ── STORE INTEGRATIONS (youcan/shopify/woo/google_sheet) ─────
CREATE TABLE IF NOT EXISTS confirmili_store_integrations (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id    UUID NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  platform    TEXT NOT NULL DEFAULT 'youcan' CHECK (platform IN ('youcan','shopify','woocommerce','google_sheet')),
  name        TEXT NOT NULL,
  status      BOOLEAN DEFAULT true,
  config      JSONB DEFAULT '{}'::jsonb,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- ── FINANCE CONFIG (one row per store) ───────────────────────
CREATE TABLE IF NOT EXISTS confirmili_finance_config (
  store_id                UUID PRIMARY KEY REFERENCES stores(id) ON DELETE CASCADE,
  monthly_ad_cost         NUMERIC(12,2) DEFAULT 0,
  confirmation_price      NUMERIC(10,2) DEFAULT 0,
  confirmation_price_mode TEXT DEFAULT 'per_confirmed' CHECK (confirmation_price_mode IN ('per_confirmed','per_delivered')),
  packaging_price         NUMERIC(10,2) DEFAULT 0,
  packaging_price_mode    TEXT DEFAULT 'per_confirmed' CHECK (packaging_price_mode IN ('per_confirmed','per_delivered')),
  tracking_price          NUMERIC(10,2) DEFAULT 0,
  other_costs             JSONB DEFAULT '[]'::jsonb,
  updated_at              TIMESTAMPTZ DEFAULT NOW()
);

-- ── PAYMENTS (balance history) ───────────────────────────────
CREATE TABLE IF NOT EXISTS confirmili_payments (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id    UUID NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  amount      NUMERIC(12,2) NOT NULL DEFAULT 0,
  status      TEXT DEFAULT 'paid' CHECK (status IN ('paid','pending','failed')),
  date        DATE DEFAULT CURRENT_DATE,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- ── product alias / known flag (Octomatic "معرفة؟") ──────────
ALTER TABLE products ADD COLUMN IF NOT EXISTS confirmili_alias TEXT;
ALTER TABLE products ADD COLUMN IF NOT EXISTS confirmili_is_known BOOLEAN DEFAULT true;
ALTER TABLE products ADD COLUMN IF NOT EXISTS confirmili_team_note TEXT;

-- ── RLS ──────────────────────────────────────────────────────
ALTER TABLE confirmili_store_integrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE confirmili_finance_config     ENABLE ROW LEVEL SECURITY;
ALTER TABLE confirmili_payments           ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "tenant_isolation" ON confirmili_store_integrations;
DROP POLICY IF EXISTS "tenant_isolation" ON confirmili_finance_config;
DROP POLICY IF EXISTS "tenant_isolation" ON confirmili_payments;

CREATE POLICY "tenant_isolation" ON confirmili_store_integrations USING (
  store_id IN (SELECT id FROM stores WHERE owner_id = auth.uid())
);
CREATE POLICY "tenant_isolation" ON confirmili_finance_config USING (
  store_id IN (SELECT id FROM stores WHERE owner_id = auth.uid())
);
CREATE POLICY "tenant_isolation" ON confirmili_payments USING (
  store_id IN (SELECT id FROM stores WHERE owner_id = auth.uid())
);

-- ── SEED mock data for the first store (only if empty) ───────
DO $$
DECLARE s_id UUID;
BEGIN
  SELECT id INTO s_id FROM stores ORDER BY created_at ASC LIMIT 1;
  IF s_id IS NULL THEN RETURN; END IF;

  -- Delivery companies (3)
  IF NOT EXISTS (SELECT 1 FROM confirmili_delivery_companies WHERE store_id = s_id) THEN
    INSERT INTO confirmili_delivery_companies (store_id, name, short_name, is_active, is_automatic) VALUES
      (s_id, 'ZR Express',       'ZR', true,  true),
      (s_id, 'Yalidine Express', 'YL', true,  false),
      (s_id, 'Maystro Delivery', 'MS', false, false);
  END IF;

  -- Team (Aya On, oumyma Off)
  IF NOT EXISTS (SELECT 1 FROM confirmili_team WHERE store_id = s_id) THEN
    INSERT INTO confirmili_team (store_id, name, phone, email, role, is_active) VALUES
      (s_id, 'Aya',    '0555000001', 'aya@example.com',    'confirmer', true),
      (s_id, 'oumyma', '0555000002', 'oumyma@example.com', 'confirmer', false);
  END IF;

  -- Finance config (1 row)
  INSERT INTO confirmili_finance_config (store_id, monthly_ad_cost, confirmation_price, packaging_price, tracking_price)
  VALUES (s_id, 0, 50, 30, 20)
  ON CONFLICT (store_id) DO NOTHING;
END $$;

SELECT 'Migration 011 completed — Confirmili extra tables + seed' as status;
