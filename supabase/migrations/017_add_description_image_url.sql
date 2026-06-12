-- ============================================================
-- 017: Add description_image_url to products
-- ============================================================

ALTER TABLE products
  ADD COLUMN IF NOT EXISTS description_image_url TEXT;

COMMENT ON COLUMN products.description_image_url IS 'Optional URL of a description image/banner shown below the product description';
