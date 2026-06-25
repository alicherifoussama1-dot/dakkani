-- ============================================================
-- Migration 024 — Storefront Languages
-- ============================================================

ALTER TABLE store_settings
ADD COLUMN IF NOT EXISTS languages TEXT[] DEFAULT ARRAY['ar'],
ADD COLUMN IF NOT EXISTS default_language TEXT DEFAULT 'ar';
