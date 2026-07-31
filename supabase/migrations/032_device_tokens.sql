-- ============================================================
-- Migration 032 — device_tokens (mobile push notifications)
--
-- ADDITIVE ONLY. Creates one new, isolated table used solely by
-- the COMMERCO Merchant mobile app to receive push notifications.
--
-- Touches NOTHING existing: no orders, no tracking, no checkout,
-- no storefront. Dropping this table would leave every current
-- production behaviour completely unchanged.
-- ============================================================

CREATE TABLE IF NOT EXISTS device_tokens (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id     UUID NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  user_id      UUID NOT NULL,
  -- FCM registration token (Android) or APNs device token (iOS)
  token        TEXT NOT NULL UNIQUE,
  platform     TEXT NOT NULL CHECK (platform IN ('ios','android')),
  app_version  TEXT,
  locale       TEXT NOT NULL DEFAULT 'ar',
  -- Per-device preferences (the merchant can mute sound/vibration per device)
  push_enabled      BOOLEAN NOT NULL DEFAULT true,
  sound_enabled     BOOLEAN NOT NULL DEFAULT true,
  vibration_enabled BOOLEAN NOT NULL DEFAULT true,
  last_seen_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- The send path always filters by store; this index keeps it O(log n).
CREATE INDEX IF NOT EXISTS device_tokens_store_idx ON device_tokens(store_id);
CREATE INDEX IF NOT EXISTS device_tokens_user_idx  ON device_tokens(user_id);

-- ── RLS: a merchant may only ever see/manage tokens for stores they own ──
ALTER TABLE device_tokens ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS device_tokens_owner ON device_tokens;
CREATE POLICY device_tokens_owner ON device_tokens
  FOR ALL
  USING     (store_id IN (SELECT id FROM stores WHERE owner_id = auth.uid()))
  WITH CHECK(store_id IN (SELECT id FROM stores WHERE owner_id = auth.uid()));

COMMENT ON TABLE device_tokens IS
  'Mobile push registration tokens (FCM/APNs) for the COMMERCO Merchant app. Additive; unused by the web platform.';
