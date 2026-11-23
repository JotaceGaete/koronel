#!/usr/bin/env bash
# Valida get_public_walinka_link en un Postgres LOCAL y desechable (nunca contra Supabase).
# Uso: PGHOST=/ruta/socket PGPORT=55432 PGUSER=postgres ./run.sh
set -euo pipefail
DIR="$(cd "$(dirname "$0")" && pwd)"
MIG="$DIR/../../migrations/20261123000000_walinka_public_link.sql"
DB="walinka_test_$$"
createdb "$DB"
trap 'dropdb --if-exists "$DB"' EXIT
P=(psql -d "$DB" -v ON_ERROR_STOP=1 -q)
"${P[@]}" -f "$DIR/00_mock.sql"
"${P[@]}" -f "$MIG"
"${P[@]}" -f "$DIR/02_tests.sql"
"${P[@]}" -f "$DIR/03_rollback.sql"
