-- ============================================================
-- Migration 028 — Stopdesk commune snapshot (AR + FR),
-- abandoned-checkout capture, safe coupon usage increment.
-- ============================================================

-- ── 1. Stopdesk commune snapshot on orders ──────────────────
-- The customer-chosen office commune is stored in BOTH languages at
-- order time (baladia keeps the legacy raw value for compatibility).
ALTER TABLE orders ADD COLUMN IF NOT EXISTS stopdesk_commune_ar TEXT;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS stopdesk_commune_fr TEXT;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS stopdesk_office_name TEXT;

COMMENT ON COLUMN orders.stopdesk_commune_ar IS 'Stopdesk office commune (Arabic) captured at order time';
COMMENT ON COLUMN orders.stopdesk_commune_fr IS 'Stopdesk office commune (French) — Google Sheets receives THIS';
COMMENT ON COLUMN orders.stopdesk_office_name IS 'Chosen pickup office display name';

-- ── 2. Abandoned-checkout drafts ────────────────────────────
-- Drafts are ordinary orders rows with status 'abandoned'. A draft may
-- hold only a phone number, so wilaya becomes optional.
ALTER TABLE orders ALTER COLUMN wilaya_id DROP NOT NULL;

ALTER TABLE orders ADD COLUMN IF NOT EXISTS abandoned_product_id  UUID REFERENCES products(id) ON DELETE SET NULL;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS abandoned_last_activity TIMESTAMPTZ;

-- Extend the status check (009 list + 'abandoned').
ALTER TABLE orders DROP CONSTRAINT IF EXISTS orders_status_check;
ALTER TABLE orders
  ADD CONSTRAINT orders_status_check
  CHECK (status IN (
    'new', 'confirmed', 'processing', 'shipped', 'delivered',
    'returned', 'cancelled', 'failed',
    'failed_1', 'failed_2', 'failed_3',
    'postponed', 'duplicate',
    'in_transit', 'out_for_delivery', 'with_driver', 'at_stopdesk',
    'exception',
    'abandoned'
  ));

-- Dedupe lookup: one live draft per store+phone(+product).
CREATE INDEX IF NOT EXISTS idx_orders_abandoned_lookup
  ON orders (store_id, customer_phone)
  WHERE status = 'abandoned';

-- ── 3. Merchant toggles for abandoned handling ──────────────
ALTER TABLE store_settings ADD COLUMN IF NOT EXISTS abandoned_track_conversions BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE store_settings ADD COLUMN IF NOT EXISTS abandoned_push_to_sheet     BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE store_settings ADD COLUMN IF NOT EXISTS abandoned_window_minutes    INT     NOT NULL DEFAULT 30;

COMMENT ON COLUMN store_settings.abandoned_track_conversions IS 'Fire InitiateCheckout/Lead pixel+CAPI for abandoned drafts (never Purchase)';
COMMENT ON COLUMN store_settings.abandoned_push_to_sheet     IS 'Push matured abandoned drafts to the assigned Google Sheet (status Abandonné)';
COMMENT ON COLUMN store_settings.abandoned_window_minutes    IS 'Minutes before a draft is considered abandoned (default 30)';

-- ── 4. Atomic coupon usage increment ────────────────────────
-- Replaces the broken client-side rpc('increment') update-value pattern.
CREATE OR REPLACE FUNCTION increment_coupon_usage(p_coupon_id UUID)
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  UPDATE coupons SET used_count = COALESCE(used_count, 0) + 1 WHERE id = p_coupon_id;
$$;

SELECT 'Migration 028 completed — stopdesk communes, abandoned capture, coupon RPC' AS status;
