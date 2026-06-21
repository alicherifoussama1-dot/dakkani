-- ============================================================
-- 020 — Google Sheets via Service Account (replaces OAuth)
--
-- One server-side service account; merchants share their own sheet with
-- its email (Editor). No per-merchant OAuth tokens. Multi-tenant via RLS.
--
-- Keeps order routing (store_settings.order_routing, products.order_routing)
-- and the per-product link products.google_sheet_id (repointed to sheets).
-- The old google_accounts / google_sheets tables are left in place (unused).
-- ============================================================

-- ── sheets: one row per connected spreadsheet, per store ──
CREATE TABLE IF NOT EXISTS sheets (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id        UUID NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  sheet_name      TEXT NOT NULL,                       -- merchant label
  sheet_id        TEXT NOT NULL,                       -- spreadsheet ID (from URL)
  sheet_page_name TEXT NOT NULL DEFAULT 'Sheet1',      -- worksheet tab
  last_sync       TIMESTAMPTZ,
  is_active       BOOLEAN NOT NULL DEFAULT true,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_sheets_store ON sheets(store_id, created_at DESC);

-- ── sheet_mapping: which product (or store default) uses which sheet ──
CREATE TABLE IF NOT EXISTS sheet_mapping (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sheet_id       UUID NOT NULL REFERENCES sheets(id) ON DELETE CASCADE,
  linked_to_type TEXT NOT NULL CHECK (linked_to_type IN ('product','default')),
  linked_to_id   UUID,                                  -- product id; NULL for 'default'
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_sheet_mapping_sheet ON sheet_mapping(sheet_id);
CREATE INDEX IF NOT EXISTS idx_sheet_mapping_link  ON sheet_mapping(linked_to_type, linked_to_id);

-- ── Ensure routing + per-product link columns exist (idempotent) ──
ALTER TABLE store_settings
  ADD COLUMN IF NOT EXISTS order_routing TEXT NOT NULL DEFAULT 'confirmili_only';
ALTER TABLE products
  ADD COLUMN IF NOT EXISTS order_routing   TEXT NOT NULL DEFAULT 'inherit',
  ADD COLUMN IF NOT EXISTS google_sheet_id UUID;

-- Repoint products.google_sheet_id at the new sheets table.
ALTER TABLE products DROP CONSTRAINT IF EXISTS products_google_sheet_id_fkey;
ALTER TABLE products
  ADD CONSTRAINT products_google_sheet_id_fkey
  FOREIGN KEY (google_sheet_id) REFERENCES sheets(id) ON DELETE SET NULL;

-- ── RLS: each merchant sees only their own sheets + mappings ──
ALTER TABLE sheets        ENABLE ROW LEVEL SECURITY;
ALTER TABLE sheet_mapping ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "sheets_owner" ON sheets;
CREATE POLICY "sheets_owner" ON sheets
  USING      (store_id IN (SELECT id FROM stores WHERE owner_id = auth.uid()))
  WITH CHECK (store_id IN (SELECT id FROM stores WHERE owner_id = auth.uid()));

DROP POLICY IF EXISTS "sheet_mapping_owner" ON sheet_mapping;
CREATE POLICY "sheet_mapping_owner" ON sheet_mapping
  USING      (sheet_id IN (SELECT id FROM sheets WHERE store_id IN (SELECT id FROM stores WHERE owner_id = auth.uid())))
  WITH CHECK (sheet_id IN (SELECT id FROM sheets WHERE store_id IN (SELECT id FROM stores WHERE owner_id = auth.uid())));

COMMENT ON TABLE sheets IS 'Merchant Google Sheets connected via the shared service account (no OAuth)';
COMMENT ON COLUMN sheets.sheet_id IS 'Spreadsheet ID parsed from the sheet URL';
