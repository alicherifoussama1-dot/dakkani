-- ============================================================
-- Migration 031 — Add Product-Specific & Store-Fallback Thank You Page Settings
-- ============================================================

-- 1. Product-level Thank You Page settings
ALTER TABLE products ADD COLUMN IF NOT EXISTS thankyou_whatsapp TEXT;
ALTER TABLE products ADD COLUMN IF NOT EXISTS thankyou_phone TEXT;
ALTER TABLE products ADD COLUMN IF NOT EXISTS thankyou_whatsapp_template TEXT;
ALTER TABLE products ADD COLUMN IF NOT EXISTS thankyou_wa_enabled BOOLEAN DEFAULT true;
ALTER TABLE products ADD COLUMN IF NOT EXISTS thankyou_call_enabled BOOLEAN DEFAULT true;

-- 2. Store-level default Thank You Page settings
ALTER TABLE store_settings ADD COLUMN IF NOT EXISTS whatsapp_number TEXT;
ALTER TABLE store_settings ADD COLUMN IF NOT EXISTS call_number TEXT;
ALTER TABLE store_settings ADD COLUMN IF NOT EXISTS thankyou_wa_enabled BOOLEAN DEFAULT true;
ALTER TABLE store_settings ADD COLUMN IF NOT EXISTS thankyou_call_enabled BOOLEAN DEFAULT true;

COMMENT ON COLUMN products.thankyou_whatsapp IS 'Product-specific WhatsApp number for order confirmation';
COMMENT ON COLUMN products.thankyou_phone IS 'Product-specific Call phone number for order confirmation';
COMMENT ON COLUMN products.thankyou_whatsapp_template IS 'Product-specific WhatsApp confirmation message template';
COMMENT ON COLUMN products.thankyou_wa_enabled IS 'Enable/disable WhatsApp confirmation button for this product';
COMMENT ON COLUMN products.thankyou_call_enabled IS 'Enable/disable Call confirmation button for this product';

COMMENT ON COLUMN store_settings.whatsapp_number IS 'Store default WhatsApp number fallback';
COMMENT ON COLUMN store_settings.call_number IS 'Store default Call phone number fallback';
COMMENT ON COLUMN store_settings.thankyou_wa_enabled IS 'Store default enable/disable WhatsApp button';
COMMENT ON COLUMN store_settings.thankyou_call_enabled IS 'Store default enable/disable Call button';
