-- ============================================================
-- Migration 029 — Abandoned orders: PER-PRODUCT configuration
-- + fast capture window (5 min default, was 30).
--
-- The product setting WINS; store_settings columns from 028 are
-- kept only as a fallback for products that predate this migration.
-- ============================================================

-- ── 1. Per-product toggles (product editor → وجهة الطلبات tab) ──
ALTER TABLE products ADD COLUMN IF NOT EXISTS abandoned_count_conversion BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE products ADD COLUMN IF NOT EXISTS abandoned_send_to_sheet    BOOLEAN NOT NULL DEFAULT false;

COMMENT ON COLUMN products.abandoned_count_conversion IS 'تحتسب: abandoned drafts of THIS product fire InitiateCheckout pixel+CAPI (never Purchase)';
COMMENT ON COLUMN products.abandoned_send_to_sheet    IS 'ترسل: abandoned drafts of THIS product are pushed to its assigned sheet as Abandonné';

-- ── 2. Fast window: 5 minutes default ──
ALTER TABLE store_settings ALTER COLUMN abandoned_window_minutes SET DEFAULT 5;
-- The feature shipped minutes ago with a 30-min default no merchant chose
-- deliberately — normalize those rows to the new fast default.
UPDATE store_settings SET abandoned_window_minutes = 5 WHERE abandoned_window_minutes = 30;

SELECT 'Migration 029 completed — per-product abandoned toggles + 5-min window' AS status;
