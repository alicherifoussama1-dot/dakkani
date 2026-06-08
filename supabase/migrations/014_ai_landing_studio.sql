-- ============================================================
-- 014: AI Landing Page Studio — Gemini copy generation +
--      AI Photo Studio (image enhancement), job queue & results
-- ============================================================

-- Async job queue for both AI copy-generation and AI photo-enhancement.
-- Frontend creates a job, then polls /api/ai/landing/status/[id] or
-- /api/ai/photo/status/[id] every ~2s until status is 'done'/'failed'.
CREATE TABLE IF NOT EXISTS landing_jobs (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  store_id    UUID NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  type        TEXT NOT NULL CHECK (type IN ('text', 'image')),
  status      TEXT NOT NULL DEFAULT 'pending'
                CHECK (status IN ('pending', 'processing', 'done', 'failed')),
  input       JSONB NOT NULL DEFAULT '{}',
  result      JSONB,
  images      JSONB,
  error       TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_landing_jobs_store   ON landing_jobs(store_id);
CREATE INDEX IF NOT EXISTS idx_landing_jobs_status  ON landing_jobs(status);
CREATE INDEX IF NOT EXISTS idx_landing_jobs_created ON landing_jobs(created_at DESC);

CREATE TRIGGER set_updated_at BEFORE UPDATE ON landing_jobs
  FOR EACH ROW EXECUTE FUNCTION handle_updated_at();

ALTER TABLE landing_jobs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "tenant_isolation" ON landing_jobs
  USING (store_id IN (SELECT id FROM stores WHERE owner_id = auth.uid()))
  WITH CHECK (store_id IN (SELECT id FROM stores WHERE owner_id = auth.uid()));

COMMENT ON TABLE landing_jobs IS 'Async AI job queue: Gemini copy generation (type=text) and AI Photo Studio image enhancement (type=image)';
COMMENT ON COLUMN landing_jobs.input  IS 'Job input payload (product info for text jobs, source image url + style for image jobs)';
COMMENT ON COLUMN landing_jobs.result IS 'Structured Gemini JSON output for text jobs (hero/benefits/social_proof/...)';
COMMENT ON COLUMN landing_jobs.images IS 'Array of generated/enhanced image option URLs for image jobs';

-- Persist the generated AI copy + chosen enhanced images + theme on the
-- landing page itself, so the rendered page is fully reproducible without
-- re-querying the job and merchants can edit/regenerate sections later.
ALTER TABLE landing_pages
  ADD COLUMN IF NOT EXISTS ai_content   JSONB,
  ADD COLUMN IF NOT EXISTS ai_images    JSONB NOT NULL DEFAULT '[]',
  ADD COLUMN IF NOT EXISTS theme_key    TEXT NOT NULL DEFAULT 'classic',
  ADD COLUMN IF NOT EXISTS hero_variant INT NOT NULL DEFAULT 0;

COMMENT ON COLUMN landing_pages.ai_content   IS 'Structured AI-generated landing copy JSON (hero/benefits/social_proof/faq/...)';
COMMENT ON COLUMN landing_pages.ai_images    IS 'Array of {url, source} chosen AI-enhanced product images for hero/gallery';
COMMENT ON COLUMN landing_pages.theme_key    IS 'Selected product-page theme key applied to the rendered landing page';
COMMENT ON COLUMN landing_pages.hero_variant IS 'Index of the chosen hero headline/CTA variation from ai_content.hero.variations';
