#!/usr/bin/env bash
# ============================================================
# Commerco database backup — pg_dump against Supabase Postgres.
#
# Usage:
#   SUPABASE_DB_URL="postgresql://postgres:<pwd>@db.<ref>.supabase.co:5432/postgres" \
#     ./scripts/backup-db.sh [output-dir]
#
# Produces a timestamped, compressed custom-format dump that
# pg_restore can restore selectively (single tables or full).
#
# Restore (full):
#   pg_restore --clean --if-exists -d "$SUPABASE_DB_URL" backups/commerco-<ts>.dump
# Restore (one table, e.g. orders):
#   pg_restore -d "$SUPABASE_DB_URL" -t orders backups/commerco-<ts>.dump
#
# Layered strategy (see docs/ARCHITECTURE.md §Backup):
#   1. Supabase managed daily backups + PITR  (infrastructure layer)
#   2. This script via CI/cron for off-site copies (ownership layer)
#   3. archive-old-data.sh for cold archival     (retention layer)
# ============================================================
set -euo pipefail

OUT_DIR="${1:-backups}"
STAMP="$(date -u +%Y%m%d-%H%M%S)"

if [ -z "${SUPABASE_DB_URL:-}" ]; then
  echo "ERROR: SUPABASE_DB_URL is not set." >&2
  exit 1
fi

mkdir -p "$OUT_DIR"
FILE="$OUT_DIR/commerco-$STAMP.dump"

echo "Dumping database to $FILE ..."
pg_dump "$SUPABASE_DB_URL" \
  --format=custom \
  --compress=9 \
  --no-owner \
  --no-privileges \
  --schema=public \
  --file="$FILE"

echo "Backup complete: $FILE ($(du -h "$FILE" | cut -f1))"
echo "Verify with: pg_restore --list \"$FILE\" | head"
