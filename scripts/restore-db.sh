#!/usr/bin/env bash
# Phase 11 hardening: restores a dump produced by backup-db.sh into the
# `postgres` service's `rapidfinil` database. Destructive — drops and
# recreates every table in that database before restoring, so this is
# intentionally NOT wired to run automatically anywhere.
#
# Usage:
#   ./scripts/restore-db.sh path/to/rapidfinil-<timestamp>.dump
set -euo pipefail

DUMP_FILE="${1:?Usage: ./scripts/restore-db.sh path/to/dump-file}"
if [ ! -f "$DUMP_FILE" ]; then
  echo "No such file: $DUMP_FILE" >&2
  exit 1
fi

read -r -p "This will DROP AND RECREATE the rapidfinil database with the contents of $DUMP_FILE. Type 'yes' to continue: " CONFIRM
if [ "$CONFIRM" != "yes" ]; then
  echo "Aborted."
  exit 1
fi

echo "Restoring $DUMP_FILE -> rapidfinil-postgres"
docker exec -i rapidfinil-postgres pg_restore -U rapidfinil -d rapidfinil --clean --if-exists --no-owner < "$DUMP_FILE"

echo "Restore complete."
