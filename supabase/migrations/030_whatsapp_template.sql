-- ============================================================
-- Migration 030 — Add WhatsApp Order Confirmation Template to store_settings
-- ============================================================

ALTER TABLE store_settings ADD COLUMN IF NOT EXISTS whatsapp_template TEXT;

COMMENT ON COLUMN store_settings.whatsapp_template IS 'Customizable WhatsApp order confirmation message template for the store';
