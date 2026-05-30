-- ============================================================
-- Migration 010 — Confirmili Complete Feature Set
-- Run in Supabase SQL Editor AFTER migrations 001-009
-- ============================================================

-- ── ORDER HISTORY (timeline of status changes) ────────────────
CREATE TABLE IF NOT EXISTS order_history (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_id     UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  store_id     UUID NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  old_status   TEXT,
  new_status   TEXT NOT NULL,
  changed_by   TEXT DEFAULT 'system', -- 'system' | 'team_member_name'
  notes        TEXT,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_order_history_order ON order_history(order_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_order_history_store ON order_history(store_id, created_at DESC);

-- ── NOTIFICATIONS (bell icon unread count) ──────────────────────
CREATE TABLE IF NOT EXISTS confirmili_notifications (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  store_id    UUID NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  type        TEXT NOT NULL DEFAULT 'order' CHECK (type IN ('order','stock','team','system')),
  title       TEXT NOT NULL,
  message     TEXT NOT NULL,
  order_id    UUID REFERENCES orders(id) ON DELETE SET NULL,
  is_read     BOOLEAN NOT NULL DEFAULT false,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_notif_store_unread ON confirmili_notifications(store_id, is_read, created_at DESC);

-- ── DELIVERY COMPANIES (confirmili-specific) ──────────────────
CREATE TABLE IF NOT EXISTS confirmili_delivery_companies (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  store_id     UUID NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  name         TEXT NOT NULL,
  short_name   TEXT NOT NULL,
  is_active    BOOLEAN DEFAULT true,
  is_automatic BOOLEAN DEFAULT false, -- auto-send on confirmed
  is_bulk      BOOLEAN DEFAULT false,
  api_key      TEXT,
  api_secret   TEXT,
  created_at   TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(store_id, short_name)
);

-- ── WILAYA → COMPANY MAPPING ─────────────────────────────────
CREATE TABLE IF NOT EXISTS confirmili_wilaya_company_map (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  store_id    UUID NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  wilaya_id   INT NOT NULL REFERENCES wilayas(id),
  company_id  UUID NOT NULL REFERENCES confirmili_delivery_companies(id) ON DELETE CASCADE,
  UNIQUE(store_id, wilaya_id)
);

-- ── DELIVERY PRICE LISTS ─────────────────────────────────────
CREATE TABLE IF NOT EXISTS confirmili_price_lists (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  store_id    UUID NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  name        TEXT NOT NULL,
  company_id  UUID REFERENCES confirmili_delivery_companies(id) ON DELETE SET NULL,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS confirmili_price_list_wilayas (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  price_list_id UUID NOT NULL REFERENCES confirmili_price_lists(id) ON DELETE CASCADE,
  wilaya_id     INT NOT NULL REFERENCES wilayas(id),
  price_home    NUMERIC(10,2) DEFAULT 0,
  price_desk    NUMERIC(10,2) DEFAULT 0,
  UNIQUE(price_list_id, wilaya_id)
);

-- ── TEAM MEMBERS (Confirmili) ────────────────────────────────
CREATE TABLE IF NOT EXISTS confirmili_team (
  id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  store_id   UUID NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  name       TEXT NOT NULL,
  phone      TEXT,
  email      TEXT,
  role       TEXT DEFAULT 'confirmer' CHECK (role IN ('confirmer','delivery','manager')),
  is_active  BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ── SEND REPORTS (auto/manual delivery sends) ────────────────
CREATE TABLE IF NOT EXISTS confirmili_send_reports (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  store_id     UUID NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  order_id     UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  company_id   UUID REFERENCES confirmili_delivery_companies(id),
  tracking_num TEXT,
  sent_at      TIMESTAMPTZ DEFAULT NOW(),
  is_auto      BOOLEAN DEFAULT false,
  status       TEXT DEFAULT 'sent'
);

-- ── Add min_stock_alert to products if not exists ────────────
ALTER TABLE products ADD COLUMN IF NOT EXISTS min_stock_alert INT DEFAULT 5;

-- ── Add declared/real delivery price columns to orders ────────
ALTER TABLE orders ADD COLUMN IF NOT EXISTS declared_delivery_fee NUMERIC(10,2);
ALTER TABLE orders ADD COLUMN IF NOT EXISTS real_delivery_fee     NUMERIC(10,2);
ALTER TABLE orders ADD COLUMN IF NOT EXISTS delivery_company_id   UUID;

-- ── RLS Policies ─────────────────────────────────────────────
ALTER TABLE order_history               ENABLE ROW LEVEL SECURITY;
ALTER TABLE confirmili_notifications    ENABLE ROW LEVEL SECURITY;
ALTER TABLE confirmili_delivery_companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE confirmili_wilaya_company_map ENABLE ROW LEVEL SECURITY;
ALTER TABLE confirmili_price_lists      ENABLE ROW LEVEL SECURITY;
ALTER TABLE confirmili_price_list_wilayas ENABLE ROW LEVEL SECURITY;
ALTER TABLE confirmili_team             ENABLE ROW LEVEL SECURITY;
ALTER TABLE confirmili_send_reports     ENABLE ROW LEVEL SECURITY;

-- Tenant isolation
CREATE POLICY "tenant_isolation" ON order_history USING (
  store_id IN (SELECT id FROM stores WHERE owner_id = auth.uid())
);
CREATE POLICY "tenant_isolation" ON confirmili_notifications USING (
  store_id IN (SELECT id FROM stores WHERE owner_id = auth.uid())
);
CREATE POLICY "tenant_isolation" ON confirmili_delivery_companies USING (
  store_id IN (SELECT id FROM stores WHERE owner_id = auth.uid())
);
CREATE POLICY "tenant_isolation" ON confirmili_wilaya_company_map USING (
  store_id IN (SELECT id FROM stores WHERE owner_id = auth.uid())
);
CREATE POLICY "tenant_isolation" ON confirmili_price_lists USING (
  store_id IN (SELECT id FROM stores WHERE owner_id = auth.uid())
);
CREATE POLICY "tenant_isolation" ON confirmili_price_list_wilayas USING (
  price_list_id IN (SELECT id FROM confirmili_price_lists pl
    JOIN stores s ON pl.store_id = s.id WHERE s.owner_id = auth.uid())
);
CREATE POLICY "tenant_isolation" ON confirmili_team USING (
  store_id IN (SELECT id FROM stores WHERE owner_id = auth.uid())
);
CREATE POLICY "tenant_isolation" ON confirmili_send_reports USING (
  store_id IN (SELECT id FROM stores WHERE owner_id = auth.uid())
);

-- Realtime enable for notifications and orders
ALTER PUBLICATION supabase_realtime ADD TABLE confirmili_notifications;
ALTER PUBLICATION supabase_realtime ADD TABLE orders;

SELECT 'Migration 010 completed — Confirmili feature tables created' as status;
