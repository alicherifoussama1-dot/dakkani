-- ============================================================
-- Migration 016 — Confirmili delivery pricing kind (IDEMPOTENT)
-- Distinguishes "declared" (shown to customer) vs "real" (cost
-- used for profit calc) price lists. Defaults existing rows to
-- 'declared' so nothing breaks.
-- ============================================================

ALTER TABLE confirmili_price_lists
  ADD COLUMN IF NOT EXISTS kind TEXT NOT NULL DEFAULT 'declared'
  CHECK (kind IN ('declared','real'));

SELECT 'Migration 016 completed — Confirmili delivery pricing kind' as status;
