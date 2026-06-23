-- ============================================================
-- 022: Checkout Field Order
-- ============================================================

-- Allow merchants to reorder individual checkout fields
ALTER TABLE store_settings
  ADD COLUMN IF NOT EXISTS checkout_field_order JSONB DEFAULT '["name", "wilaya", "baladia", "phone", "address"]'::jsonb;

COMMENT ON COLUMN store_settings.checkout_field_order IS 'Ordered array of field ids controlling the order of main checkout input fields (name, wilaya, phone, address)';
