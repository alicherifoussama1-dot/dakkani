-- ============================================================
-- Migration 017 — Missing Confirmili columns (IDEMPOTENT)
-- These two columns are referenced by the Confirmili orders query
-- (app/(dashboard)/confirmili/page.tsx BASE_COLS) but were never
-- created, which made the ENTIRE orders SELECT fail (PostgREST
-- rejects unknown columns) → no orders appeared in Confirmili.
--   • orders.confirmed_by    — which team member confirmed the order
--   • order_items.variant_sku — per-line SKU shown in the orders table
-- ============================================================

ALTER TABLE orders      ADD COLUMN IF NOT EXISTS confirmed_by TEXT;
ALTER TABLE order_items ADD COLUMN IF NOT EXISTS variant_sku  TEXT;

SELECT 'Migration 017 completed — orders.confirmed_by + order_items.variant_sku' as status;
