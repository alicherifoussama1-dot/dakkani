-- ============================================================
-- Cold-data archival — keeps hot tables small without losing history.
-- Run monthly (psql or the Supabase SQL editor).
--
-- Archive targets (append-only, high-volume):
--   audit_logs        → keep 180 days hot
--   platform_events   → keep 90 days hot
--   job_queue         → completed jobs older than 30 days
--
-- Rows are copied to *_archive tables (created on first run),
-- then deleted from the hot table in the same transaction.
-- Restore = plain INSERT ... SELECT back from the archive.
-- ============================================================

BEGIN;

CREATE TABLE IF NOT EXISTS audit_logs_archive      (LIKE audit_logs      INCLUDING ALL);
CREATE TABLE IF NOT EXISTS platform_events_archive (LIKE platform_events INCLUDING ALL);

WITH moved AS (
  DELETE FROM audit_logs
  WHERE created_at < now() - interval '180 days'
  RETURNING *
)
INSERT INTO audit_logs_archive SELECT * FROM moved;

WITH moved AS (
  DELETE FROM platform_events
  WHERE created_at < now() - interval '90 days'
  RETURNING *
)
INSERT INTO platform_events_archive SELECT * FROM moved;

-- Completed queue jobs carry no value after 30 days — delete outright.
DELETE FROM job_queue
WHERE status = 'completed' AND completed_at < now() - interval '30 days';

COMMIT;
