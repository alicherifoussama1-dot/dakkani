-- ============================================================
-- Migration 009 — Extend order status values for Confirmili
-- Add: failed_1, failed_2, failed_3, postponed, duplicate
-- Run this in Supabase SQL Editor
-- ============================================================

-- Remove old CHECK constraint and add extended version
ALTER TABLE orders
  DROP CONSTRAINT IF EXISTS orders_status_check;

ALTER TABLE orders
  ADD CONSTRAINT orders_status_check
  CHECK (status IN (
    'new',
    'confirmed',
    'processing',
    'shipped',
    'delivered',
    'returned',
    'cancelled',
    'failed',
    'failed_1',
    'failed_2',
    'failed_3',
    'postponed',
    'duplicate',
    'in_transit',
    'out_for_delivery',
    'with_driver',
    'at_stopdesk',
    'exception'
  ));

-- Add call_attempts column if not exists
ALTER TABLE orders ADD COLUMN IF NOT EXISTS call_attempts INT DEFAULT 0;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS last_call_at TIMESTAMPTZ;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS confirmed_at TIMESTAMPTZ;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS shipped_at   TIMESTAMPTZ;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS delivered_at TIMESTAMPTZ;

-- Add index on status for fast filtering
CREATE INDEX IF NOT EXISTS idx_orders_status_store ON orders(store_id, status);
CREATE INDEX IF NOT EXISTS idx_orders_call_attempts ON orders(call_attempts) WHERE call_attempts > 0;

SELECT 'Migration 009 completed — order statuses extended for Confirmili' as status;
