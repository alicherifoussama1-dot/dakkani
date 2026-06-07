-- ============================================================
-- 013: Product Page Theme System + Section Ordering + Baladia
-- ============================================================

-- Theme & layout customization per product
ALTER TABLE products
  ADD COLUMN IF NOT EXISTS theme_key          TEXT NOT NULL DEFAULT 'classic',
  ADD COLUMN IF NOT EXISTS section_order      JSONB NOT NULL DEFAULT
    '["gallery","info","variants","buybox","trust","description","reviews","upsells","related"]',
  ADD COLUMN IF NOT EXISTS section_visibility JSONB NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS video_url          TEXT;

COMMENT ON COLUMN products.theme_key IS 'Selected product-page theme key (see lib/product-themes.ts)';
COMMENT ON COLUMN products.section_order IS 'Ordered array of section ids controlling product page layout';
COMMENT ON COLUMN products.section_visibility IS 'Map of section id -> boolean, controls on/off per section';
COMMENT ON COLUMN products.video_url IS 'Optional product video URL shown in the gallery';

-- Denormalized baladia (commune) snapshot on orders — stored alongside commune_id
-- so the order keeps a readable label even if the commune reference changes.
ALTER TABLE orders
  ADD COLUMN IF NOT EXISTS baladia TEXT;

COMMENT ON COLUMN orders.baladia IS 'Commune (baladia) display name captured at order time';

-- Helpful index for theme-based analytics/filtering
CREATE INDEX IF NOT EXISTS idx_products_theme_key ON products(theme_key);
