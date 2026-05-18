-- ============================================================
-- ROW LEVEL SECURITY POLICIES
-- Tenant isolation: each store only sees its own data
-- ============================================================

-- Enable RLS on all tenant tables
ALTER TABLE stores                ENABLE ROW LEVEL SECURITY;
ALTER TABLE store_settings        ENABLE ROW LEVEL SECURITY;
ALTER TABLE categories            ENABLE ROW LEVEL SECURITY;
ALTER TABLE products              ENABLE ROW LEVEL SECURITY;
ALTER TABLE warehouses            ENABLE ROW LEVEL SECURITY;
ALTER TABLE warehouse_stock       ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders                ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_items           ENABLE ROW LEVEL SECURITY;
ALTER TABLE blacklisted_customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE coupons               ENABLE ROW LEVEL SECURITY;
ALTER TABLE reviews               ENABLE ROW LEVEL SECURITY;
ALTER TABLE delivery_logs         ENABLE ROW LEVEL SECURITY;
ALTER TABLE landing_pages         ENABLE ROW LEVEL SECURITY;

-- Wilayas & Communes are public reference data
ALTER TABLE wilayas   ENABLE ROW LEVEL SECURITY;
ALTER TABLE communes  ENABLE ROW LEVEL SECURITY;
CREATE POLICY "public_read_wilayas"  ON wilayas  FOR SELECT USING (true);
CREATE POLICY "public_read_communes" ON communes FOR SELECT USING (true);

-- ============================================================
-- STORES: owner can manage their own store
-- ============================================================
CREATE POLICY "stores_owner_all" ON stores
  FOR ALL USING (owner_id = auth.uid());

-- ============================================================
-- STORE SETTINGS
-- ============================================================
CREATE POLICY "tenant_isolation" ON store_settings
  FOR ALL USING (
    store_id IN (SELECT id FROM stores WHERE owner_id = auth.uid())
  );

-- ============================================================
-- CATEGORIES
-- ============================================================
CREATE POLICY "tenant_isolation" ON categories
  FOR ALL USING (
    store_id IN (SELECT id FROM stores WHERE owner_id = auth.uid())
  );

-- ============================================================
-- PRODUCTS
-- ============================================================
CREATE POLICY "tenant_isolation" ON products
  FOR ALL USING (
    store_id IN (SELECT id FROM stores WHERE owner_id = auth.uid())
  );

-- Allow public read for active products (storefront)
CREATE POLICY "public_read_active_products" ON products
  FOR SELECT USING (is_active = true);

-- ============================================================
-- WAREHOUSES
-- ============================================================
CREATE POLICY "tenant_isolation" ON warehouses
  FOR ALL USING (
    store_id IN (SELECT id FROM stores WHERE owner_id = auth.uid())
  );

-- ============================================================
-- WAREHOUSE STOCK
-- ============================================================
CREATE POLICY "tenant_isolation" ON warehouse_stock
  FOR ALL USING (
    store_id IN (SELECT id FROM stores WHERE owner_id = auth.uid())
  );

-- ============================================================
-- ORDERS
-- ============================================================
CREATE POLICY "tenant_isolation" ON orders
  FOR ALL USING (
    store_id IN (SELECT id FROM stores WHERE owner_id = auth.uid())
  );

-- ============================================================
-- ORDER ITEMS
-- ============================================================
CREATE POLICY "tenant_isolation" ON order_items
  FOR ALL USING (
    store_id IN (SELECT id FROM stores WHERE owner_id = auth.uid())
  );

-- ============================================================
-- BLACKLISTED CUSTOMERS
-- ============================================================
CREATE POLICY "tenant_isolation" ON blacklisted_customers
  FOR ALL USING (
    store_id IN (SELECT id FROM stores WHERE owner_id = auth.uid())
  );

-- ============================================================
-- COUPONS
-- ============================================================
CREATE POLICY "tenant_isolation" ON coupons
  FOR ALL USING (
    store_id IN (SELECT id FROM stores WHERE owner_id = auth.uid())
  );

-- ============================================================
-- REVIEWS
-- ============================================================
CREATE POLICY "tenant_isolation" ON reviews
  FOR ALL USING (
    store_id IN (SELECT id FROM stores WHERE owner_id = auth.uid())
  );

-- Allow public insert (customer submitting review)
CREATE POLICY "public_insert_reviews" ON reviews
  FOR INSERT WITH CHECK (true);

-- Allow public read approved reviews
CREATE POLICY "public_read_approved_reviews" ON reviews
  FOR SELECT USING (is_approved = true);

-- ============================================================
-- DELIVERY LOGS
-- ============================================================
CREATE POLICY "tenant_isolation" ON delivery_logs
  FOR ALL USING (
    store_id IN (SELECT id FROM stores WHERE owner_id = auth.uid())
  );

-- ============================================================
-- LANDING PAGES
-- ============================================================
CREATE POLICY "tenant_isolation" ON landing_pages
  FOR ALL USING (
    store_id IN (SELECT id FROM stores WHERE owner_id = auth.uid())
  );

-- Allow public read for active landing pages
CREATE POLICY "public_read_active_pages" ON landing_pages
  FOR SELECT USING (is_active = true);
