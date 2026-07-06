-- ============================================================
-- 027 PLATFORM CORE — SaaS platform architecture
-- Adds: platform roles, store team RBAC, audit logs, feature
-- flags, job queue, event outbox, support sessions.
--
-- BACKWARD COMPATIBLE: all changes are additive. Existing
-- owner_id-based RLS policies keep working; store_members adds
-- team access on top (owners are backfilled automatically).
-- ============================================================

-- ────────────────────────────────────────────────────────────
-- 1. PLATFORM USERS (platform_owner / platform_admin / platform_support)
--    Membership in this table is what separates platform staff
--    from merchants. Managed only via service role.
-- ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS platform_users (
  user_id     UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  role        TEXT NOT NULL CHECK (role IN ('platform_owner', 'platform_admin', 'platform_support')),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by  UUID REFERENCES auth.users(id)
);

ALTER TABLE platform_users ENABLE ROW LEVEL SECURITY;

-- A platform user can read their own row (used by the app to resolve role).
CREATE POLICY "platform_users_read_self" ON platform_users
  FOR SELECT USING (user_id = auth.uid());

-- Writes only via service role (no policy = denied for anon/authenticated).

-- Helper: is the current user platform staff? (SECURITY DEFINER so it can
-- be used inside other tables' RLS policies without recursive RLS.)
CREATE OR REPLACE FUNCTION is_platform_user()
RETURNS BOOLEAN LANGUAGE sql SECURITY DEFINER STABLE AS $$
  SELECT EXISTS (SELECT 1 FROM platform_users WHERE user_id = auth.uid());
$$;

CREATE OR REPLACE FUNCTION platform_role()
RETURNS TEXT LANGUAGE sql SECURITY DEFINER STABLE AS $$
  SELECT role FROM platform_users WHERE user_id = auth.uid();
$$;

-- ────────────────────────────────────────────────────────────
-- 2. STORE MEMBERS (merchant team RBAC)
--    owner / admin / manager / employee / viewer per store.
--    stores.owner_id remains the source of truth for ownership;
--    a trigger keeps the owner row in sync.
-- ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS store_members (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id    UUID NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  user_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role        TEXT NOT NULL CHECK (role IN ('owner', 'admin', 'manager', 'employee', 'viewer')),
  invited_by  UUID REFERENCES auth.users(id),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (store_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_store_members_user  ON store_members(user_id);
CREATE INDEX IF NOT EXISTS idx_store_members_store ON store_members(store_id);

ALTER TABLE store_members ENABLE ROW LEVEL SECURITY;

-- Helper: does the current user belong to this store? (SECURITY DEFINER to
-- avoid RLS recursion when used inside store_members' own policies.)
CREATE OR REPLACE FUNCTION has_store_access(p_store_id UUID)
RETURNS BOOLEAN LANGUAGE sql SECURITY DEFINER STABLE AS $$
  SELECT EXISTS (
    SELECT 1 FROM store_members WHERE store_id = p_store_id AND user_id = auth.uid()
  ) OR EXISTS (
    SELECT 1 FROM stores WHERE id = p_store_id AND owner_id = auth.uid()
  );
$$;

CREATE OR REPLACE FUNCTION store_role(p_store_id UUID)
RETURNS TEXT LANGUAGE sql SECURITY DEFINER STABLE AS $$
  SELECT COALESCE(
    (SELECT 'owner' FROM stores WHERE id = p_store_id AND owner_id = auth.uid()),
    (SELECT role FROM store_members WHERE store_id = p_store_id AND user_id = auth.uid())
  );
$$;

-- Members can see the team of stores they belong to.
CREATE POLICY "store_members_read" ON store_members
  FOR SELECT USING (has_store_access(store_id));

-- Only store owner/admin can manage the team.
CREATE POLICY "store_members_manage" ON store_members
  FOR ALL USING (store_role(store_id) IN ('owner', 'admin'));

-- Backfill: every existing store owner becomes an 'owner' member.
INSERT INTO store_members (store_id, user_id, role)
SELECT id, owner_id, 'owner' FROM stores
ON CONFLICT (store_id, user_id) DO NOTHING;

-- Keep owner membership in sync for future stores.
CREATE OR REPLACE FUNCTION sync_store_owner_member()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  INSERT INTO store_members (store_id, user_id, role)
  VALUES (NEW.id, NEW.owner_id, 'owner')
  ON CONFLICT (store_id, user_id) DO UPDATE SET role = 'owner';
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_store_owner ON stores;
CREATE TRIGGER trg_sync_store_owner
  AFTER INSERT OR UPDATE OF owner_id ON stores
  FOR EACH ROW EXECUTE FUNCTION sync_store_owner_member();

-- ────────────────────────────────────────────────────────────
-- 2b. TEAM ACCESS POLICIES (additive — owner policies untouched)
--     Team members gain access to tenant tables through their
--     store membership. Role-level restrictions (e.g. viewer is
--     read-only) are enforced centrally in the app layer
--     (lib/platform/rbac.ts); RLS enforces the tenant boundary.
-- ────────────────────────────────────────────────────────────
DO $$
DECLARE t TEXT;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'store_settings','categories','products','warehouses','orders',
    'order_items','blacklisted_customers','coupons','reviews',
    'delivery_logs','landing_pages'
  ] LOOP
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = t AND table_schema = 'public') THEN
      EXECUTE format('DROP POLICY IF EXISTS "team_member_access" ON %I', t);
      IF t = 'order_items' THEN
        EXECUTE 'CREATE POLICY "team_member_access" ON order_items FOR ALL USING (
          order_id IN (SELECT o.id FROM orders o JOIN store_members m ON m.store_id = o.store_id AND m.user_id = auth.uid())
        )';
      ELSE
        EXECUTE format('CREATE POLICY "team_member_access" ON %I FOR ALL USING (
          store_id IN (SELECT store_id FROM store_members WHERE user_id = auth.uid())
        )', t);
      END IF;
    END IF;
  END LOOP;
END $$;

-- Platform staff read access to stores (for the Platform Admin dashboard).
DROP POLICY IF EXISTS "platform_read_stores" ON stores;
CREATE POLICY "platform_read_stores" ON stores
  FOR SELECT USING (is_platform_user());

-- ────────────────────────────────────────────────────────────
-- 3. AUDIT LOGS
--    Every critical action: who, role, store, ip, device,
--    browser, action, before/after, when.
-- ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS audit_logs (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID,
  user_email  TEXT,
  role        TEXT,
  store_id    UUID,
  action      TEXT NOT NULL,               -- e.g. 'order.status_changed'
  resource    TEXT,                        -- e.g. 'orders/1234'
  ip          TEXT,
  device      TEXT,                        -- desktop / mobile / tablet / bot
  browser     TEXT,
  before      JSONB,
  after       JSONB,
  metadata    JSONB,
  severity    TEXT NOT NULL DEFAULT 'info' CHECK (severity IN ('info','warning','critical')),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_audit_store   ON audit_logs(store_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_user    ON audit_logs(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_action  ON audit_logs(action, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_created ON audit_logs(created_at DESC);

ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- Platform staff see everything; merchants see their own store's trail.
CREATE POLICY "audit_platform_read" ON audit_logs
  FOR SELECT USING (is_platform_user());
CREATE POLICY "audit_merchant_read" ON audit_logs
  FOR SELECT USING (store_id IS NOT NULL AND has_store_access(store_id));
-- Inserts happen via service role only (append-only; no update/delete policies).

-- ────────────────────────────────────────────────────────────
-- 4. FEATURE FLAGS
--    Platform Owner toggles features without a deploy.
-- ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS feature_flags (
  key         TEXT PRIMARY KEY,            -- e.g. 'ai_landing_studio'
  enabled     BOOLEAN NOT NULL DEFAULT false,
  description TEXT,
  -- Optional targeting: {"store_ids": [...]} limits the flag to specific tenants.
  config      JSONB NOT NULL DEFAULT '{}',
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_by  UUID REFERENCES auth.users(id)
);

ALTER TABLE feature_flags ENABLE ROW LEVEL SECURITY;

-- Everyone may read flags (evaluation happens app-side); writes are
-- platform-owner-only through the API (service role).
CREATE POLICY "flags_public_read" ON feature_flags FOR SELECT USING (true);

INSERT INTO feature_flags (key, enabled, description) VALUES
  ('ai_landing_studio',   true,  'AI landing page generation'),
  ('ai_product_tools',    true,  'AI description / photo enhancement'),
  ('google_sheets_sync',  true,  'Order routing to Google Sheets'),
  ('custom_domains',      true,  'Merchant custom domains via Cloudflare'),
  ('confirmili',          true,  'Confirmili call-center confirmation'),
  ('tracking_pixels',     true,  'Meta/TikTok tracking integrations'),
  ('new_merchant_signup', true,  'Allow new merchant registration')
ON CONFLICT (key) DO NOTHING;

-- ────────────────────────────────────────────────────────────
-- 5. JOB QUEUE (Postgres-backed)
--    Heavy/fragile side effects (email, WhatsApp, tracking,
--    webhooks, Confirmili, AI) run async with retries.
--    Claimed with FOR UPDATE SKIP LOCKED → safe for concurrent
--    workers on serverless.
-- ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS job_queue (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type         TEXT NOT NULL,              -- e.g. 'email.send', 'tracking.push'
  payload      JSONB NOT NULL DEFAULT '{}',
  store_id     UUID,                       -- tenant scope (nullable for platform jobs)
  status       TEXT NOT NULL DEFAULT 'pending'
               CHECK (status IN ('pending','processing','completed','failed','dead')),
  attempts     INT  NOT NULL DEFAULT 0,
  max_attempts INT  NOT NULL DEFAULT 5,
  run_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  locked_at    TIMESTAMPTZ,
  locked_by    TEXT,
  last_error   TEXT,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_queue_ready ON job_queue(status, run_at) WHERE status = 'pending';
CREATE INDEX IF NOT EXISTS idx_queue_store ON job_queue(store_id, created_at DESC);

ALTER TABLE job_queue ENABLE ROW LEVEL SECURITY;
CREATE POLICY "queue_platform_read" ON job_queue
  FOR SELECT USING (is_platform_user());
-- All writes via service role.

-- Atomic claim used by the worker (SKIP LOCKED prevents double-processing).
CREATE OR REPLACE FUNCTION claim_jobs(p_worker TEXT, p_limit INT DEFAULT 10)
RETURNS SETOF job_queue LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  RETURN QUERY
  UPDATE job_queue SET
    status = 'processing', locked_at = now(), locked_by = p_worker, attempts = attempts + 1
  WHERE id IN (
    SELECT id FROM job_queue
    WHERE status = 'pending' AND run_at <= now()
    ORDER BY run_at
    LIMIT p_limit
    FOR UPDATE SKIP LOCKED
  )
  RETURNING *;
END;
$$;

-- Recover jobs stuck in 'processing' (worker crashed / function timed out).
CREATE OR REPLACE FUNCTION recover_stuck_jobs(p_minutes INT DEFAULT 10)
RETURNS INT LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE n INT;
BEGIN
  UPDATE job_queue SET status = 'pending', locked_at = NULL, locked_by = NULL
  WHERE status = 'processing' AND locked_at < now() - make_interval(mins => p_minutes);
  GET DIAGNOSTICS n = ROW_COUNT;
  RETURN n;
END;
$$;

-- ────────────────────────────────────────────────────────────
-- 6. PLATFORM EVENTS (event bus outbox)
--    Domain events (OrderCreated, …) are persisted here, then
--    fanned out to subscriber jobs. Modules stay decoupled.
-- ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS platform_events (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name        TEXT NOT NULL,               -- e.g. 'order.created'
  store_id    UUID,
  payload     JSONB NOT NULL DEFAULT '{}',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_events_name  ON platform_events(name, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_events_store ON platform_events(store_id, created_at DESC);

ALTER TABLE platform_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "events_platform_read" ON platform_events
  FOR SELECT USING (is_platform_user());

-- ────────────────────────────────────────────────────────────
-- 7. SUPPORT SESSIONS (Support Mode)
--    Platform Support enters a merchant account with an explicit,
--    time-boxed, fully-audited session the merchant can see.
-- ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS support_sessions (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  support_user_id UUID NOT NULL REFERENCES auth.users(id),
  store_id        UUID NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  reason          TEXT NOT NULL,
  started_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at      TIMESTAMPTZ NOT NULL DEFAULT now() + interval '2 hours',
  ended_at        TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_support_sessions_store ON support_sessions(store_id, started_at DESC);

ALTER TABLE support_sessions ENABLE ROW LEVEL SECURITY;

-- Platform staff see all sessions; merchants see sessions on their store
-- (this is how the merchant knows support accessed their account).
CREATE POLICY "support_sessions_platform" ON support_sessions
  FOR SELECT USING (is_platform_user());
CREATE POLICY "support_sessions_merchant" ON support_sessions
  FOR SELECT USING (has_store_access(store_id));

-- Active support session grants READ access to the tenant's data.
-- (Writes during support require the merchant's explicit consent flow and
-- happen through audited service-role endpoints, not direct table access.)
CREATE OR REPLACE FUNCTION has_active_support_session(p_store_id UUID)
RETURNS BOOLEAN LANGUAGE sql SECURITY DEFINER STABLE AS $$
  SELECT EXISTS (
    SELECT 1 FROM support_sessions
    WHERE store_id = p_store_id
      AND support_user_id = auth.uid()
      AND ended_at IS NULL
      AND expires_at > now()
  );
$$;

DO $$
DECLARE t TEXT;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'store_settings','categories','products','warehouses','orders',
    'order_items','coupons','reviews','delivery_logs','landing_pages'
  ] LOOP
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = t AND table_schema = 'public') THEN
      EXECUTE format('DROP POLICY IF EXISTS "support_session_read" ON %I', t);
      IF t = 'order_items' THEN
        EXECUTE 'CREATE POLICY "support_session_read" ON order_items FOR SELECT USING (
          order_id IN (SELECT id FROM orders WHERE has_active_support_session(store_id))
        )';
      ELSE
        EXECUTE format('CREATE POLICY "support_session_read" ON %I FOR SELECT USING (
          has_active_support_session(store_id)
        )', t);
      END IF;
    END IF;
  END LOOP;
END $$;
