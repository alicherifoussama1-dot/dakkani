-- ============================================================
-- Migration 006 — Auth Configuration
-- Run this in Supabase SQL Editor
-- ============================================================

-- This configures the auth settings programmatically
-- Note: Some settings must be done via Dashboard UI

-- Allow password reset emails to work correctly
-- The redirect URL must match what's in Authentication > URL Configuration

-- Disable email confirmation requirement (optional — allows immediate login)
-- To enable: change to TRUE
UPDATE auth.config
SET confirm_email_change_send_email = TRUE
WHERE TRUE;

-- Note: The following must be done in Supabase Dashboard:
-- Authentication > URL Configuration > Redirect URLs:
--   https://dakkani.vercel.app/reset-password
--   https://dakkani.vercel.app/**
--   http://localhost:3000/reset-password
