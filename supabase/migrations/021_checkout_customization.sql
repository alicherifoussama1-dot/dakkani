-- ============================================================
-- 021: Checkout Customization (Themes, Sorting, Fields)
-- ============================================================

-- Add columns for checkout customization in store_settings
ALTER TABLE store_settings
  ADD COLUMN IF NOT EXISTS checkout_theme TEXT DEFAULT 'default',
  ADD COLUMN IF NOT EXISTS checkout_section_order JSONB DEFAULT '["customer_info", "delivery_info", "payment_info", "coupon"]'::jsonb,
  ADD COLUMN IF NOT EXISTS checkout_fields JSONB DEFAULT '{"phone2": {"visible": true, "required": false}, "notes": {"visible": true, "required": false}, "address": {"visible": true, "required": false}}'::jsonb;

COMMENT ON COLUMN store_settings.checkout_theme IS 'Checkout page visual theme key (default, modern, glassmorphism, compact)';
COMMENT ON COLUMN store_settings.checkout_section_order IS 'Ordered array of section ids controlling checkout page layout';
COMMENT ON COLUMN store_settings.checkout_fields IS 'Metadata for showing/hiding and requiring specific optional checkout inputs';
