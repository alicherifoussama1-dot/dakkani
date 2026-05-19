-- ============================================================
-- Migration 007 — Public Read Policies for Storefront
-- The storefront needs to read stores/products without auth
-- Run this in Supabase SQL Editor
-- ============================================================

-- Allow public to read active stores (needed for storefront)
CREATE POLICY "public_read_active_stores" ON stores
  FOR SELECT USING (is_active = true);

-- Allow public to read store_settings (for delivery/payment config)
CREATE POLICY "public_read_store_settings" ON store_settings
  FOR SELECT USING (true);

-- Allow public to read active categories
CREATE POLICY "public_read_active_categories" ON categories
  FOR SELECT USING (is_active = true);

-- Allow public to read active landing pages
DROP POLICY IF EXISTS "public_read_active_pages" ON landing_pages;
CREATE POLICY "public_read_active_pages" ON landing_pages
  FOR SELECT USING (is_active = true);

-- Allow public to read approved reviews
DROP POLICY IF EXISTS "public_read_approved_reviews" ON reviews;
CREATE POLICY "public_read_approved_reviews" ON reviews
  FOR SELECT USING (is_approved = true);

-- Allow public to insert reviews (customers submitting)
CREATE POLICY "public_insert_reviews" ON reviews
  FOR INSERT WITH CHECK (true);

-- Allow public to read warehouse stock (for stock badges)
CREATE POLICY "public_read_stock" ON warehouse_stock
  FOR SELECT USING (true);
