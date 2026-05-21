-- ============================================================
-- Migration 008 — Additional indexes and missing columns
-- Run this AFTER migrations 001-007
-- ============================================================

-- Additional indexes for performance
CREATE INDEX IF NOT EXISTS idx_products_store_active    ON products(store_id, is_active);
CREATE INDEX IF NOT EXISTS idx_products_slug            ON products(slug);
CREATE INDEX IF NOT EXISTS idx_orders_store_status      ON orders(store_id, status);
CREATE INDEX IF NOT EXISTS idx_orders_store_created     ON orders(store_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_orders_phone             ON orders(customer_phone);
CREATE INDEX IF NOT EXISTS idx_orders_utm               ON orders(utm_source) WHERE utm_source IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_order_items_order        ON order_items(order_id);
CREATE INDEX IF NOT EXISTS idx_order_items_store        ON order_items(store_id);
CREATE INDEX IF NOT EXISTS idx_categories_store         ON categories(store_id, is_active);
CREATE INDEX IF NOT EXISTS idx_reviews_store_approved   ON reviews(store_id, is_approved);

-- Make sure stores has name_ar column (already in 001 but just in case)
ALTER TABLE stores ADD COLUMN IF NOT EXISTS name_ar TEXT;

-- Add google_tag_id + snapchat_pixel_id if not exists (already in 001)
ALTER TABLE stores ADD COLUMN IF NOT EXISTS google_tag_id   TEXT;
ALTER TABLE stores ADD COLUMN IF NOT EXISTS snapchat_pixel_id TEXT;

-- Add email column to stores if not exists
ALTER TABLE stores ADD COLUMN IF NOT EXISTS email TEXT;

-- Ensure addresses are stored
ALTER TABLE orders ADD COLUMN IF NOT EXISTS address TEXT;

-- Add call tracking
ALTER TABLE orders ADD COLUMN IF NOT EXISTS call_attempts  INT DEFAULT 0;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS last_call_at   TIMESTAMPTZ;

-- Add UTM columns
ALTER TABLE orders ADD COLUMN IF NOT EXISTS utm_source   TEXT;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS utm_medium   TEXT;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS utm_campaign TEXT;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS source       TEXT;

-- Add fraud score
ALTER TABLE orders ADD COLUMN IF NOT EXISTS fraud_score    INT DEFAULT 0;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS is_blacklisted BOOLEAN DEFAULT false;

-- Timestamps for order status changes
ALTER TABLE orders ADD COLUMN IF NOT EXISTS confirmed_at  TIMESTAMPTZ;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS shipped_at    TIMESTAMPTZ;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS delivered_at  TIMESTAMPTZ;

-- Full-text search on orders
CREATE INDEX IF NOT EXISTS idx_orders_search ON orders USING gin(
  to_tsvector('arabic', coalesce(customer_name, '') || ' ' || coalesce(customer_phone, '') || ' ' || coalesce(order_number, ''))
);

-- Completed
SELECT 'Migration 008 completed' as status;
