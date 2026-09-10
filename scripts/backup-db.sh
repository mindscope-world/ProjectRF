#!/usr/bin/env bash
# Phase 11 hardening: a runnable backup script, not a scheduled/automated
# backup system — cron it yourself (or wire into your platform's managed
# backup feature) once you have a real deployment target.
#
# Usage:
#   ./scripts/backup-db.sh [output-directory]   (default: ./backups)
#
# Dumps the `postgres` service's `rapidfinil` database (see compose.yaml) to
# a timestamped, custom-format pg_dump file — restore with restore-db.sh.
set -euo pipefail

OUT_DIR="${1:-backups}"
mkdir -p "$OUT_DIR"

TIMESTAMP="$(date -u +%Y%m%dT%H%M%SZ)"
OUT_FILE="$OUT_DIR/rapidfinil-$TIMESTAMP.dump"

echo "Backing up rapidfinil-postgres -> $OUT_FILE"
docker exec rapidfinil-postgres pg_dump -U rapidfinil -d rapidfinil --format=custom > "$OUT_FILE"

echo "Done. $(du -h "$OUT_FILE" | cut -f1) written."
echo "Restore with: ./scripts/restore-db.sh $OUT_FILE"
