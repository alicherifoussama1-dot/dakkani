-- ============================================================
-- DAKKANI - Multi-Tenant Algerian E-Commerce SaaS
-- Initial Schema Migration
-- ============================================================

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";
CREATE EXTENSION IF NOT EXISTS "unaccent";

-- ============================================================
-- STORES (Tenants)
-- ============================================================
CREATE TABLE stores (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  owner_id        UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name            TEXT NOT NULL,
  name_ar         TEXT,
  slug            TEXT UNIQUE NOT NULL,
  domain          TEXT UNIQUE,
  logo_url        TEXT,
  description     TEXT,
  description_ar  TEXT,
  phone           TEXT,
  email           TEXT,
  address         TEXT,
  wilaya_id       INT,
  commune_id      INT,
  currency        TEXT NOT NULL DEFAULT 'DZD',
  plan            TEXT NOT NULL DEFAULT 'free' CHECK (plan IN ('free','starter','pro','enterprise')),
  is_active       BOOLEAN NOT NULL DEFAULT true,
  meta_pixel_id   TEXT,
  tiktok_pixel_id TEXT,
  google_tag_id   TEXT,
  snapchat_pixel_id TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- STORE SETTINGS
-- ============================================================
CREATE TABLE store_settings (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  store_id        UUID NOT NULL UNIQUE REFERENCES stores(id) ON DELETE CASCADE,
  -- Appearance
  primary_color   TEXT DEFAULT '#f97316',
  secondary_color TEXT DEFAULT '#1e293b',
  font_family     TEXT DEFAULT 'Tajawal',
  rtl             BOOLEAN DEFAULT true,
  -- Notifications
  order_sms       BOOLEAN DEFAULT false,
  order_email     BOOLEAN DEFAULT true,
  low_stock_alert BOOLEAN DEFAULT true,
  low_stock_threshold INT DEFAULT 5,
  -- Delivery
  default_delivery_partner TEXT DEFAULT 'yalidine',
  free_delivery_threshold NUMERIC(10,2),
  -- Payment
  cash_on_delivery BOOLEAN DEFAULT true,
  baridimob        BOOLEAN DEFAULT false,
  ccp              BOOLEAN DEFAULT false,
  -- Fraud
  fraud_auto_block_score INT DEFAULT 80,
  max_call_attempts INT DEFAULT 3,
  -- SEO
  meta_title      TEXT,
  meta_description TEXT,
  og_image_url    TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- WILAYAS (58 Algerian Provinces)
-- ============================================================
CREATE TABLE wilayas (
  id                    SERIAL PRIMARY KEY,
  code                  TEXT NOT NULL UNIQUE,
  name_ar               TEXT NOT NULL,
  name_fr               TEXT NOT NULL,
  -- Delivery pricing
  delivery_fee_home     NUMERIC(10,2) NOT NULL,
  delivery_fee_stopdesk NUMERIC(10,2) NOT NULL,
  delivery_days_home    TEXT NOT NULL CHECK (delivery_days_home IN ('24h','48h','72h')),
  delivery_days_stopdesk TEXT NOT NULL CHECK (delivery_days_stopdesk IN ('24h','48h','72h')),
  zone                  INT NOT NULL DEFAULT 1 CHECK (zone BETWEEN 1 AND 4),
  is_active             BOOLEAN NOT NULL DEFAULT true
);

-- ============================================================
-- COMMUNES (Municipalities)
-- ============================================================
CREATE TABLE communes (
  id         SERIAL PRIMARY KEY,
  wilaya_id  INT NOT NULL REFERENCES wilayas(id),
  name_ar    TEXT NOT NULL,
  name_fr    TEXT NOT NULL,
  post_code  TEXT,
  is_active  BOOLEAN NOT NULL DEFAULT true
);

-- ============================================================
-- CATEGORIES
-- ============================================================
CREATE TABLE categories (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  store_id    UUID NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  parent_id   UUID REFERENCES categories(id),
  name        TEXT NOT NULL,
  name_ar     TEXT,
  slug        TEXT NOT NULL,
  image_url   TEXT,
  sort_order  INT DEFAULT 0,
  is_active   BOOLEAN NOT NULL DEFAULT true,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(store_id, slug)
);

-- ============================================================
-- PRODUCTS
-- ============================================================
CREATE TABLE products (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  store_id          UUID NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  category_id       UUID REFERENCES categories(id),
  name              TEXT NOT NULL,
  name_ar           TEXT,
  slug              TEXT NOT NULL,
  description       TEXT,
  description_ar    TEXT,
  sku               TEXT,
  barcode           TEXT,
  price             NUMERIC(10,2) NOT NULL,
  compare_price     NUMERIC(10,2),
  cost_price        NUMERIC(10,2),
  weight            NUMERIC(8,3),
  images            JSONB DEFAULT '[]',
  variants          JSONB DEFAULT '[]',
  attributes        JSONB DEFAULT '{}',
  tags              TEXT[] DEFAULT '{}',
  -- Pixels (can override store-level)
  use_store_pixel   BOOLEAN NOT NULL DEFAULT true,
  meta_pixel_id     TEXT,
  tiktok_pixel_id   TEXT,
  snapchat_pixel_id TEXT,
  -- SEO
  meta_title        TEXT,
  meta_description  TEXT,
  -- Status
  is_active         BOOLEAN NOT NULL DEFAULT true,
  is_featured       BOOLEAN NOT NULL DEFAULT false,
  is_digital        BOOLEAN NOT NULL DEFAULT false,
  sort_order        INT DEFAULT 0,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(store_id, slug)
);

-- ============================================================
-- WAREHOUSES
-- ============================================================
CREATE TABLE warehouses (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  store_id    UUID NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  name        TEXT NOT NULL,
  name_ar     TEXT,
  address     TEXT,
  wilaya_id   INT REFERENCES wilayas(id),
  commune_id  INT REFERENCES communes(id),
  phone       TEXT,
  is_default  BOOLEAN NOT NULL DEFAULT false,
  is_active   BOOLEAN NOT NULL DEFAULT true,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- WAREHOUSE STOCK
-- ============================================================
CREATE TABLE warehouse_stock (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  warehouse_id  UUID NOT NULL REFERENCES warehouses(id) ON DELETE CASCADE,
  product_id    UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  store_id      UUID NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  variant_key   TEXT DEFAULT 'default',
  quantity      INT NOT NULL DEFAULT 0,
  reserved      INT NOT NULL DEFAULT 0,
  low_stock_at  INT DEFAULT 5,
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(warehouse_id, product_id, variant_key)
);

-- ============================================================
-- COUPONS
-- ============================================================
CREATE TABLE coupons (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  store_id        UUID NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  code            TEXT NOT NULL,
  type            TEXT NOT NULL CHECK (type IN ('percentage','fixed','free_shipping')),
  value           NUMERIC(10,2) NOT NULL,
  min_order_amount NUMERIC(10,2),
  max_uses        INT,
  used_count      INT NOT NULL DEFAULT 0,
  per_user_limit  INT DEFAULT 1,
  starts_at       TIMESTAMPTZ,
  expires_at      TIMESTAMPTZ,
  applies_to      JSONB DEFAULT '{"all": true}',
  is_active       BOOLEAN NOT NULL DEFAULT true,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(store_id, code)
);

-- ============================================================
-- BLACKLISTED CUSTOMERS
-- ============================================================
CREATE TABLE blacklisted_customers (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  store_id    UUID NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  phone       TEXT,
  full_name   TEXT,
  reason      TEXT,
  added_by    UUID REFERENCES auth.users(id),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(store_id, phone)
);

-- ============================================================
-- ORDERS
-- ============================================================
CREATE TABLE orders (
  id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  store_id            UUID NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  order_number        TEXT NOT NULL,
  -- Customer info
  customer_name       TEXT NOT NULL,
  customer_phone      TEXT NOT NULL,
  customer_phone2     TEXT,
  customer_email      TEXT,
  -- Delivery
  delivery_type       TEXT NOT NULL DEFAULT 'home' CHECK (delivery_type IN ('home','stopdesk')),
  wilaya_id           INT NOT NULL REFERENCES wilayas(id),
  commune_id          INT REFERENCES communes(id),
  address             TEXT,
  stopdesk_code       TEXT,
  delivery_fee        NUMERIC(10,2) NOT NULL DEFAULT 0,
  delivery_partner    TEXT DEFAULT 'yalidine',
  tracking_number     TEXT,
  delivery_timeline   JSONB DEFAULT '[]',
  -- Pricing
  subtotal            NUMERIC(10,2) NOT NULL,
  discount_amount     NUMERIC(10,2) NOT NULL DEFAULT 0,
  coupon_id           UUID REFERENCES coupons(id),
  coupon_code         TEXT,
  total               NUMERIC(10,2) NOT NULL,
  -- Status & Fraud
  status              TEXT NOT NULL DEFAULT 'new'
                        CHECK (status IN ('new','confirmed','processing','shipped',
                                          'delivered','returned','cancelled','failed')),
  payment_status      TEXT NOT NULL DEFAULT 'pending'
                        CHECK (payment_status IN ('pending','paid','refunded','failed')),
  payment_method      TEXT NOT NULL DEFAULT 'cod'
                        CHECK (payment_method IN ('cod','baridimob','ccp','card')),
  fraud_score         INT NOT NULL DEFAULT 0 CHECK (fraud_score BETWEEN 0 AND 100),
  is_blacklisted      BOOLEAN NOT NULL DEFAULT false,
  -- Operations
  call_attempts       INT NOT NULL DEFAULT 0,
  last_call_at        TIMESTAMPTZ,
  confirmed_at        TIMESTAMPTZ,
  shipped_at          TIMESTAMPTZ,
  delivered_at        TIMESTAMPTZ,
  -- Pixels
  source              TEXT,
  utm_source          TEXT,
  utm_medium          TEXT,
  utm_campaign        TEXT,
  -- Notes
  notes               TEXT,
  internal_notes      TEXT,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(store_id, order_number)
);

-- ============================================================
-- ORDER ITEMS
-- ============================================================
CREATE TABLE order_items (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_id      UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  store_id      UUID NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  product_id    UUID REFERENCES products(id),
  product_name  TEXT NOT NULL,
  product_sku   TEXT,
  variant_key   TEXT DEFAULT 'default',
  variant_label TEXT,
  quantity      INT NOT NULL,
  unit_price    NUMERIC(10,2) NOT NULL,
  cost_price    NUMERIC(10,2),
  total_price   NUMERIC(10,2) NOT NULL,
  image_url     TEXT
);

-- ============================================================
-- DELIVERY LOGS
-- ============================================================
CREATE TABLE delivery_logs (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_id    UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  store_id    UUID NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  status      TEXT NOT NULL,
  description TEXT,
  location    TEXT,
  source      TEXT DEFAULT 'system' CHECK (source IN ('system','manual','webhook')),
  metadata    JSONB DEFAULT '{}',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- REVIEWS
-- ============================================================
CREATE TABLE reviews (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  store_id    UUID NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  product_id  UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  order_id    UUID REFERENCES orders(id),
  customer_name TEXT,
  customer_phone TEXT,
  rating      INT NOT NULL CHECK (rating BETWEEN 1 AND 5),
  comment     TEXT,
  images      JSONB DEFAULT '[]',
  is_verified BOOLEAN NOT NULL DEFAULT false,
  is_approved BOOLEAN NOT NULL DEFAULT false,
  reply       TEXT,
  replied_at  TIMESTAMPTZ,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- LANDING PAGES
-- ============================================================
CREATE TABLE landing_pages (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  store_id      UUID NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  product_id    UUID REFERENCES products(id),
  title         TEXT NOT NULL,
  title_ar      TEXT,
  slug          TEXT NOT NULL,
  template      TEXT NOT NULL DEFAULT 'default',
  sections      JSONB NOT NULL DEFAULT '[]',
  seo_title     TEXT,
  seo_desc      TEXT,
  meta_pixel_id TEXT,
  tiktok_pixel_id TEXT,
  custom_css    TEXT,
  custom_js     TEXT,
  is_active     BOOLEAN NOT NULL DEFAULT true,
  views         INT NOT NULL DEFAULT 0,
  conversions   INT NOT NULL DEFAULT 0,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(store_id, slug)
);

-- ============================================================
-- INDEXES
-- ============================================================
CREATE INDEX idx_products_store ON products(store_id);
CREATE INDEX idx_products_category ON products(category_id);
CREATE INDEX idx_products_active ON products(store_id, is_active);
CREATE INDEX idx_orders_store ON orders(store_id);
CREATE INDEX idx_orders_status ON orders(store_id, status);
CREATE INDEX idx_orders_phone ON orders(store_id, customer_phone);
CREATE INDEX idx_orders_number ON orders(store_id, order_number);
CREATE INDEX idx_orders_created ON orders(store_id, created_at DESC);
CREATE INDEX idx_order_items_order ON order_items(order_id);
CREATE INDEX idx_order_items_store ON order_items(store_id);
CREATE INDEX idx_warehouse_stock_product ON warehouse_stock(product_id);
CREATE INDEX idx_warehouse_stock_store ON warehouse_stock(store_id);
CREATE INDEX idx_delivery_logs_order ON delivery_logs(order_id);
CREATE INDEX idx_reviews_product ON reviews(product_id);
CREATE INDEX idx_blacklist_phone ON blacklisted_customers(store_id, phone);
CREATE INDEX idx_landing_pages_slug ON landing_pages(store_id, slug);

-- Full-text search on products
CREATE INDEX idx_products_search ON products USING gin(
  to_tsvector('simple', coalesce(name,'') || ' ' || coalesce(name_ar,'') || ' ' || coalesce(sku,''))
);
-- Full-text search on orders
CREATE INDEX idx_orders_search ON orders USING gin(
  to_tsvector('simple', coalesce(customer_name,'') || ' ' || coalesce(customer_phone,'') || ' ' || coalesce(order_number,''))
);

-- ============================================================
-- UPDATED_AT TRIGGER
-- ============================================================
CREATE OR REPLACE FUNCTION handle_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

CREATE TRIGGER set_updated_at BEFORE UPDATE ON stores
  FOR EACH ROW EXECUTE FUNCTION handle_updated_at();
CREATE TRIGGER set_updated_at BEFORE UPDATE ON store_settings
  FOR EACH ROW EXECUTE FUNCTION handle_updated_at();
CREATE TRIGGER set_updated_at BEFORE UPDATE ON products
  FOR EACH ROW EXECUTE FUNCTION handle_updated_at();
CREATE TRIGGER set_updated_at BEFORE UPDATE ON orders
  FOR EACH ROW EXECUTE FUNCTION handle_updated_at();
CREATE TRIGGER set_updated_at BEFORE UPDATE ON landing_pages
  FOR EACH ROW EXECUTE FUNCTION handle_updated_at();

-- ============================================================
-- ORDER NUMBER GENERATOR
-- ============================================================
CREATE SEQUENCE IF NOT EXISTS order_number_seq START 1000;

CREATE OR REPLACE FUNCTION generate_order_number(p_store_id UUID)
RETURNS TEXT LANGUAGE plpgsql AS $$
DECLARE
  v_prefix TEXT;
  v_seq    BIGINT;
BEGIN
  SELECT UPPER(LEFT(slug, 3)) INTO v_prefix FROM stores WHERE id = p_store_id;
  v_seq := nextval('order_number_seq');
  RETURN v_prefix || '-' || TO_CHAR(NOW(), 'YYMMDD') || '-' || LPAD(v_seq::TEXT, 4, '0');
END;
$$;

-- ============================================================
-- FRAUD SCORE FUNCTION
-- ============================================================
CREATE OR REPLACE FUNCTION calculate_fraud_score(
  p_store_id UUID,
  p_phone TEXT,
  p_name TEXT,
  p_wilaya_id INT
) RETURNS INT LANGUAGE plpgsql AS $$
DECLARE
  v_score INT := 0;
  v_order_count INT;
  v_cancelled_count INT;
  v_is_blacklisted BOOLEAN;
BEGIN
  -- Check blacklist
  SELECT EXISTS(
    SELECT 1 FROM blacklisted_customers
    WHERE store_id = p_store_id AND phone = p_phone
  ) INTO v_is_blacklisted;
  IF v_is_blacklisted THEN RETURN 100; END IF;

  -- Count past orders and cancellations
  SELECT COUNT(*), COUNT(*) FILTER (WHERE status IN ('cancelled','returned'))
  INTO v_order_count, v_cancelled_count
  FROM orders WHERE store_id = p_store_id AND customer_phone = p_phone;

  -- High cancellation rate
  IF v_order_count > 0 AND (v_cancelled_count::FLOAT / v_order_count) > 0.5 THEN
    v_score := v_score + 40;
  END IF;

  -- More than 3 cancellations
  IF v_cancelled_count >= 3 THEN v_score := v_score + 30; END IF;

  -- Multiple pending orders same phone
  IF (SELECT COUNT(*) FROM orders
      WHERE store_id = p_store_id AND customer_phone = p_phone
        AND status = 'new' AND created_at > NOW() - INTERVAL '7 days') >= 2 THEN
    v_score := v_score + 20;
  END IF;

  RETURN LEAST(v_score, 100);
END;
$$;

-- ============================================================
-- STOCK RESERVATION FUNCTIONS
-- ============================================================
CREATE OR REPLACE FUNCTION reserve_stock(
  p_store_id UUID,
  p_product_id UUID,
  p_variant_key TEXT,
  p_quantity INT
) RETURNS BOOLEAN LANGUAGE plpgsql AS $$
DECLARE
  v_available INT;
BEGIN
  SELECT quantity - reserved INTO v_available
  FROM warehouse_stock
  WHERE store_id = p_store_id AND product_id = p_product_id
    AND variant_key = COALESCE(p_variant_key, 'default')
  LIMIT 1;

  IF v_available IS NULL OR v_available < p_quantity THEN
    RETURN FALSE;
  END IF;

  UPDATE warehouse_stock
  SET reserved = reserved + p_quantity, updated_at = NOW()
  WHERE store_id = p_store_id AND product_id = p_product_id
    AND variant_key = COALESCE(p_variant_key, 'default');

  RETURN TRUE;
END;
$$;

CREATE OR REPLACE FUNCTION release_stock(
  p_store_id UUID,
  p_product_id UUID,
  p_variant_key TEXT,
  p_quantity INT,
  p_deduct BOOLEAN DEFAULT FALSE
) RETURNS VOID LANGUAGE plpgsql AS $$
BEGIN
  IF p_deduct THEN
    UPDATE warehouse_stock
    SET quantity = quantity - p_quantity,
        reserved = GREATEST(reserved - p_quantity, 0),
        updated_at = NOW()
    WHERE store_id = p_store_id AND product_id = p_product_id
      AND variant_key = COALESCE(p_variant_key, 'default');
  ELSE
    UPDATE warehouse_stock
    SET reserved = GREATEST(reserved - p_quantity, 0),
        updated_at = NOW()
    WHERE store_id = p_store_id AND product_id = p_product_id
      AND variant_key = COALESCE(p_variant_key, 'default');
  END IF;
END;
$$;
