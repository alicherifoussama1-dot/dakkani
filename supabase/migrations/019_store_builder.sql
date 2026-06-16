-- ============================================================
-- 019 — Store Builder + storefront-wide theme
--
-- Mirrors the per-product builder (products.theme_key / section_order)
-- at the STORE level so merchants compose their storefront home/catalog
-- from reorderable, toggleable sections saved as a single JSON layout.
--
--   stores.layout     jsonb  — ordered array of section objects:
--                              [{ id, type, visible, settings }, …]
--                              NULL → storefront falls back to the
--                              built-in default layout (current page).
--   stores.theme_key  text   — storefront theme (see lib/product-themes.ts)
-- ============================================================
ALTER TABLE stores
  ADD COLUMN IF NOT EXISTS layout    JSONB,
  ADD COLUMN IF NOT EXISTS theme_key TEXT NOT NULL DEFAULT 'classic';

COMMENT ON COLUMN stores.layout    IS 'Ordered array of storefront sections {id,type,visible,settings}; NULL = default layout';
COMMENT ON COLUMN stores.theme_key IS 'Storefront-wide theme key (lib/product-themes.ts)';

-- ── AI store-generation jobs (mirror of landing_jobs) ───────────
-- Server-side Gemini builds a full store layout asynchronously; the
-- builder polls status until the layout JSON is ready.
CREATE TABLE IF NOT EXISTS store_builder_jobs (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id    UUID NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  status      TEXT NOT NULL DEFAULT 'pending',   -- pending | running | done | error
  input       JSONB NOT NULL DEFAULT '{}',       -- {name, niche, vibe, …}
  result      JSONB,                             -- { layout, theme_key }
  error       TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_store_builder_jobs_store ON store_builder_jobs(store_id, created_at DESC);

-- ── Newsletter subscribers (Newsletter section) ─────────────────
CREATE TABLE IF NOT EXISTS newsletter_subscribers (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id   UUID NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  email      TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (store_id, email)
);
ALTER TABLE newsletter_subscribers ENABLE ROW LEVEL SECURITY;
-- Anonymous storefront visitors may subscribe (INSERT only); owners read theirs.
DROP POLICY IF EXISTS "public_subscribe" ON newsletter_subscribers;
CREATE POLICY "public_subscribe" ON newsletter_subscribers FOR INSERT WITH CHECK (true);
DROP POLICY IF EXISTS "owner_read" ON newsletter_subscribers;
CREATE POLICY "owner_read" ON newsletter_subscribers FOR SELECT USING (
  store_id IN (SELECT id FROM stores WHERE owner_id = auth.uid())
);

ALTER TABLE store_builder_jobs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "tenant_isolation" ON store_builder_jobs;
CREATE POLICY "tenant_isolation" ON store_builder_jobs USING (
  store_id IN (SELECT id FROM stores WHERE owner_id = auth.uid())
);
