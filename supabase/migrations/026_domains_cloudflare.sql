-- ============================================================
-- 026 — Domains: Cloudflare full-zone provisioning
-- Adds the Cloudflare-for-SaaS lifecycle fields to `domains`.
-- Idempotent + safe to run after 025 (or if 025 predates these).
-- ============================================================
BEGIN;

ALTER TABLE domains ADD COLUMN IF NOT EXISTS provider        TEXT NOT NULL DEFAULT 'cloudflare';
ALTER TABLE domains ADD COLUMN IF NOT EXISTS cf_zone_id      TEXT;
ALTER TABLE domains ADD COLUMN IF NOT EXISTS nameservers     TEXT[] NOT NULL DEFAULT '{}';
ALTER TABLE domains ADD COLUMN IF NOT EXISTS ssl_status      TEXT NOT NULL DEFAULT 'pending';
ALTER TABLE domains ADD COLUMN IF NOT EXISTS dns_status      TEXT NOT NULL DEFAULT 'pending';
ALTER TABLE domains ADD COLUMN IF NOT EXISTS activated_at    TIMESTAMPTZ;
ALTER TABLE domains ADD COLUMN IF NOT EXISTS last_checked_at TIMESTAMPTZ;

-- CHECK constraints (added separately so re-runs don't fail)
DO $$ BEGIN
  ALTER TABLE domains ADD CONSTRAINT domains_ssl_status_chk CHECK (ssl_status IN ('pending','provisioning','issued','error'));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE domains ADD CONSTRAINT domains_dns_status_chk CHECK (dns_status IN ('pending','connected','error'));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

COMMIT;
