-- ============================================================
-- Migration 015 — Order Routing + Google Sheets (IDEMPOTENT)
-- Merchant chooses WHERE new orders go: Google Sheet only,
-- Confirmili only, or both. Per-product override + store default.
-- ============================================================

-- ── GOOGLE ACCOUNTS (OAuth, refresh token server-side only) ──
CREATE TABLE IF NOT EXISTS google_accounts (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id      UUID NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  email         TEXT NOT NULL,
  refresh_token TEXT NOT NULL,
  status        BOOLEAN NOT NULL DEFAULT true,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (store_id, email)
);

CREATE INDEX IF NOT EXISTS idx_google_accounts_store ON google_accounts(store_id);

-- ── GOOGLE SHEETS REGISTRY ───────────────────────────────────
CREATE TABLE IF NOT EXISTS google_sheets (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id         UUID NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  account_id       UUID NOT NULL REFERENCES google_accounts(id) ON DELETE CASCADE,
  spreadsheet_id   TEXT NOT NULL,
  spreadsheet_name TEXT NOT NULL DEFAULT '',
  worksheet_name   TEXT NOT NULL DEFAULT 'Sheet1',
  is_default       BOOLEAN NOT NULL DEFAULT false,
  status           BOOLEAN NOT NULL DEFAULT true,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_google_sheets_store ON google_sheets(store_id);

-- ── ROUTING SETTINGS ─────────────────────────────────────────
-- Store-level default destination for new orders
ALTER TABLE store_settings
  ADD COLUMN IF NOT EXISTS order_routing TEXT NOT NULL DEFAULT 'confirmili_only'
    CHECK (order_routing IN ('sheet_only', 'confirmili_only', 'both'));

-- Per-product override ('inherit' = follow store default)
ALTER TABLE products
  ADD COLUMN IF NOT EXISTS order_routing TEXT NOT NULL DEFAULT 'inherit'
    CHECK (order_routing IN ('inherit', 'sheet_only', 'confirmili_only', 'both')),
  ADD COLUMN IF NOT EXISTS google_sheet_id UUID REFERENCES google_sheets(id) ON DELETE SET NULL;

-- ── ORDER ROUTING RESULT ─────────────────────────────────────
-- routed_to: where this order was sent ('confirmili' | 'sheet' | 'both')
-- sheet_status: 'sent' | 'failed' | NULL (not routed to a sheet)
ALTER TABLE orders
  ADD COLUMN IF NOT EXISTS routed_to    TEXT,
  ADD COLUMN IF NOT EXISTS sheet_status TEXT,
  ADD COLUMN IF NOT EXISTS sheet_error  TEXT;

CREATE INDEX IF NOT EXISTS idx_orders_routed ON orders(store_id, routed_to);

-- ── updated_at triggers ──────────────────────────────────────
DROP TRIGGER IF EXISTS set_updated_at ON google_accounts;
CREATE TRIGGER set_updated_at BEFORE UPDATE ON google_accounts
  FOR EACH ROW EXECUTE FUNCTION handle_updated_at();

DROP TRIGGER IF EXISTS set_updated_at ON google_sheets;
CREATE TRIGGER set_updated_at BEFORE UPDATE ON google_sheets
  FOR EACH ROW EXECUTE FUNCTION handle_updated_at();

-- ── RLS ──────────────────────────────────────────────────────
ALTER TABLE google_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE google_sheets   ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "tenant_isolation" ON google_accounts;
CREATE POLICY "tenant_isolation" ON google_accounts
  USING (store_id IN (SELECT id FROM stores WHERE owner_id = auth.uid()))
  WITH CHECK (store_id IN (SELECT id FROM stores WHERE owner_id = auth.uid()));

DROP POLICY IF EXISTS "tenant_isolation" ON google_sheets;
CREATE POLICY "tenant_isolation" ON google_sheets
  USING (store_id IN (SELECT id FROM stores WHERE owner_id = auth.uid()))
  WITH CHECK (store_id IN (SELECT id FROM stores WHERE owner_id = auth.uid()));

COMMENT ON TABLE google_accounts IS 'Merchant Google accounts connected via OAuth — refresh_token is server-side only, never sent to the client';
COMMENT ON TABLE google_sheets   IS 'Registered spreadsheets that can receive order rows';
COMMENT ON COLUMN products.order_routing IS 'Where orders for this product go: inherit (store default) / sheet_only / confirmili_only / both';
COMMENT ON COLUMN orders.routed_to       IS 'Resolved destination at creation time: confirmili / sheet / both';
