-- ============================================================
-- 025 — Tracking & Domains  (FINAL)
-- Provider-agnostic tracking library + custom domains, with
-- per-product isolation. See docs/tracking-domains-architecture.md
--
-- Model (production):
--   tracking_integrations  = the store's reusable pixel library
--   domains                = the store's custom domains
--   product_tracking       = per-product, per-provider assignment
--   products.domain_id     = per-product domain (NULL => store default => platform)
--
-- Conventions (match migrations 001/002):
--   • uuid_generate_v4()  (uuid-ossp, enabled in 001)
--   • handle_updated_at()  trigger for updated_at
--   • RLS: owner-scoped via stores.owner_id = auth.uid()
--   • Storefront reads via service role (bypasses RLS).
--
-- Idempotent + atomic: safe to run once or re-run.
-- ============================================================
BEGIN;

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ── Tracking library ────────────────────────────────────────
CREATE TABLE IF NOT EXISTS tracking_integrations (
  id             UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  store_id       UUID NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  provider       TEXT NOT NULL CHECK (provider IN ('meta','tiktok','google','snapchat')),
  name           TEXT NOT NULL,
  pixel_id       TEXT NOT NULL,                      -- Pixel ID / Measurement ID
  credentials    JSONB NOT NULL DEFAULT '{}'::jsonb, -- e.g. { capiToken, accessToken }
  is_active      BOOLEAN NOT NULL DEFAULT true,
  is_default     BOOLEAN NOT NULL DEFAULT false,     -- store default for this provider
  last_test_at     TIMESTAMPTZ,
  last_test_status TEXT CHECK (last_test_status IN ('healthy','warning','error')),
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_tracking_integrations_store    ON tracking_integrations(store_id);
CREATE INDEX IF NOT EXISTS idx_tracking_integrations_provider ON tracking_integrations(store_id, provider);
-- At most one default per (store, provider)
CREATE UNIQUE INDEX IF NOT EXISTS uq_tracking_integrations_default
  ON tracking_integrations(store_id, provider) WHERE is_default;

-- ── Domains ─────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS domains (
  id             UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  store_id       UUID NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  hostname       TEXT NOT NULL UNIQUE,                -- example.com
  -- Lifecycle: pending (zone created, NS not propagated) → ssl_active (live) → error
  status         TEXT NOT NULL DEFAULT 'pending'
                   CHECK (status IN ('pending','verified','ssl_active','error')),
  -- Cloudflare-for-SaaS (full-zone) provisioning ──────────────
  provider       TEXT NOT NULL DEFAULT 'cloudflare',  -- 'cloudflare' | 'txt'(fallback)
  cf_zone_id     TEXT,                                -- Cloudflare zone id
  nameservers    TEXT[] NOT NULL DEFAULT '{}',        -- assigned CF nameservers (2)
  ssl_status     TEXT NOT NULL DEFAULT 'pending'
                   CHECK (ssl_status IN ('pending','provisioning','issued','error')),
  dns_status     TEXT NOT NULL DEFAULT 'pending'
                   CHECK (dns_status IN ('pending','connected','error')),
  activated_at   TIMESTAMPTZ,
  last_checked_at TIMESTAMPTZ,
  -- TXT fallback (advanced / troubleshooting only)
  verification   JSONB NOT NULL DEFAULT '{}'::jsonb,  -- { method, token, record_host }
  is_default     BOOLEAN NOT NULL DEFAULT false,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_domains_store ON domains(store_id);
-- At most one default custom domain per store
CREATE UNIQUE INDEX IF NOT EXISTS uq_domains_default
  ON domains(store_id) WHERE is_default;

-- ── Per-product assignment (isolation lives here) ───────────
-- mode: 'default'     => inherit the store default integration for this provider
--       'disabled'    => provider is off for this product (inject nothing)
--       'integration' => use integration_id explicitly
-- Absence of a row is treated identically to mode='default'.
CREATE TABLE IF NOT EXISTS product_tracking (
  id             UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  product_id     UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  provider       TEXT NOT NULL CHECK (provider IN ('meta','tiktok','google','snapchat')),
  mode           TEXT NOT NULL DEFAULT 'default'
                   CHECK (mode IN ('default','disabled','integration')),
  integration_id UUID REFERENCES tracking_integrations(id) ON DELETE SET NULL,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (product_id, provider)                       -- powers upsert(onConflict: product_id,provider)
);

CREATE INDEX IF NOT EXISTS idx_product_tracking_product     ON product_tracking(product_id);
CREATE INDEX IF NOT EXISTS idx_product_tracking_integration ON product_tracking(integration_id);

-- ── Per-product domain (NULL => store default => platform) ──
ALTER TABLE products
  ADD COLUMN IF NOT EXISTS domain_id UUID REFERENCES domains(id) ON DELETE SET NULL;

-- ── updated_at triggers (reuse handle_updated_at from 001) ──
DROP TRIGGER IF EXISTS set_updated_at ON tracking_integrations;
CREATE TRIGGER set_updated_at BEFORE UPDATE ON tracking_integrations
  FOR EACH ROW EXECUTE FUNCTION handle_updated_at();

DROP TRIGGER IF EXISTS set_updated_at ON domains;
CREATE TRIGGER set_updated_at BEFORE UPDATE ON domains
  FOR EACH ROW EXECUTE FUNCTION handle_updated_at();

DROP TRIGGER IF EXISTS set_updated_at ON product_tracking;
CREATE TRIGGER set_updated_at BEFORE UPDATE ON product_tracking
  FOR EACH ROW EXECUTE FUNCTION handle_updated_at();

-- ============================================================
-- RLS — owner-scoped, mirroring migration 002.
-- (FOR ALL USING(expr) also gates INSERT via the same expr.)
-- ============================================================
ALTER TABLE tracking_integrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE domains               ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_tracking      ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS tracking_integrations_owner ON tracking_integrations;
CREATE POLICY tracking_integrations_owner ON tracking_integrations
  FOR ALL USING (store_id IN (SELECT id FROM stores WHERE owner_id = auth.uid()));

DROP POLICY IF EXISTS domains_owner ON domains;
CREATE POLICY domains_owner ON domains
  FOR ALL USING (store_id IN (SELECT id FROM stores WHERE owner_id = auth.uid()));

DROP POLICY IF EXISTS product_tracking_owner ON product_tracking;
CREATE POLICY product_tracking_owner ON product_tracking
  FOR ALL USING (
    product_id IN (
      SELECT p.id FROM products p
      JOIN stores s ON s.id = p.store_id
      WHERE s.owner_id = auth.uid()
    )
  );

-- ============================================================
-- Backfill: lift existing store-level pixel columns into the
-- new library as the default integration per provider.
-- Guarded on existing rows → safe to re-run.
-- ============================================================
INSERT INTO tracking_integrations (store_id, provider, name, pixel_id, is_default)
SELECT id, 'meta', 'Meta Pixel', meta_pixel_id, true
FROM stores
WHERE meta_pixel_id IS NOT NULL AND meta_pixel_id <> ''
  AND NOT EXISTS (SELECT 1 FROM tracking_integrations t WHERE t.store_id = stores.id AND t.provider = 'meta');

INSERT INTO tracking_integrations (store_id, provider, name, pixel_id, is_default)
SELECT id, 'tiktok', 'TikTok Pixel', tiktok_pixel_id, true
FROM stores
WHERE tiktok_pixel_id IS NOT NULL AND tiktok_pixel_id <> ''
  AND NOT EXISTS (SELECT 1 FROM tracking_integrations t WHERE t.store_id = stores.id AND t.provider = 'tiktok');

INSERT INTO tracking_integrations (store_id, provider, name, pixel_id, is_default)
SELECT id, 'google', 'Google Analytics', google_tag_id, true
FROM stores
WHERE google_tag_id IS NOT NULL AND google_tag_id <> ''
  AND NOT EXISTS (SELECT 1 FROM tracking_integrations t WHERE t.store_id = stores.id AND t.provider = 'google');

INSERT INTO tracking_integrations (store_id, provider, name, pixel_id, is_default)
SELECT id, 'snapchat', 'Snapchat Pixel', snapchat_pixel_id, true
FROM stores
WHERE snapchat_pixel_id IS NOT NULL AND snapchat_pixel_id <> ''
  AND NOT EXISTS (SELECT 1 FROM tracking_integrations t WHERE t.store_id = stores.id AND t.provider = 'snapchat');

COMMIT;
