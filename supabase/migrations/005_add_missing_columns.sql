-- ============================================================
-- Migration 005 — Add missing columns discovered during dev
-- Run this AFTER migrations 001-004
-- ============================================================

-- Add whatsapp column to stores (used for WhatsApp float button)
ALTER TABLE stores ADD COLUMN IF NOT EXISTS whatsapp TEXT;

-- Add description_ar if not exists (should already be there)
ALTER TABLE stores ADD COLUMN IF NOT EXISTS description_ar TEXT;

-- Add CRON secret support note
-- (CRON_SECRET is an env var, no DB change needed)

-- Fix: store_settings missing baridimob column in some setups
ALTER TABLE store_settings ADD COLUMN IF NOT EXISTS baridimob BOOLEAN DEFAULT false;
ALTER TABLE store_settings ADD COLUMN IF NOT EXISTS ccp BOOLEAN DEFAULT false;
ALTER TABLE store_settings ADD COLUMN IF NOT EXISTS free_delivery_threshold NUMERIC(10,2);
ALTER TABLE store_settings ADD COLUMN IF NOT EXISTS default_delivery_partner TEXT DEFAULT 'yalidine';

-- Add whatsapp to store index
CREATE INDEX IF NOT EXISTS idx_stores_slug ON stores(slug);
CREATE INDEX IF NOT EXISTS idx_stores_owner ON stores(owner_id);

-- Auto-blacklist function (used by cron)
CREATE OR REPLACE FUNCTION get_blacklist_candidates(
  p_store_id UUID,
  p_threshold INT DEFAULT 3
)
RETURNS TABLE(customer_phone TEXT, customer_name TEXT, cancel_count BIGINT)
LANGUAGE plpgsql AS $$
BEGIN
  RETURN QUERY
  SELECT
    o.customer_phone,
    o.customer_name,
    COUNT(*)::BIGINT AS cancel_count
  FROM orders o
  WHERE o.store_id = p_store_id
    AND o.status IN ('cancelled','returned','failed')
    AND o.customer_phone NOT IN (
      SELECT phone FROM blacklisted_customers
      WHERE store_id = p_store_id AND phone IS NOT NULL
    )
  GROUP BY o.customer_phone, o.customer_name
  HAVING COUNT(*) >= p_threshold;
END;
$$;

-- Increment helper for coupons used_count
CREATE OR REPLACE FUNCTION increment(x INT)
RETURNS INT LANGUAGE sql AS $$ SELECT x + 1 $$;
