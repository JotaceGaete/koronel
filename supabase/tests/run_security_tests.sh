#!/bin/bash
# Corre las baterías SQL de PR #2 (businesses) y PR #3 (user_profiles), por separado y juntas,
# contra un Postgres local AISLADO. Crea y borra bases de datos sec_*: NUNCA apuntar a producción.
# Variables: PGHOST, PGPORT, PGUSER (deben ser de un servidor local de pruebas).
set -u
cd "$(dirname "$0")"
M=../migrations; R=../rollback
PR2_UP=($M/20261124000000_businesses_security_hardening.sql $M/20261124000100_businesses_anon_columns.sql)
PR3_UP=($M/20261125000000_user_profiles_private_rpcs.sql $M/20261125000100_user_profiles_column_privacy.sql)
status=0
pg_isready -q || { echo "No hay Postgres local de pruebas en ${PGHOST:-localhost}:${PGPORT:-5432}"; exit 2; }
fresh() { dropdb --if-exists "$1" 2>/dev/null; createdb "$1"; }
apply() { local db=$1; shift; for f in "$@"; do psql -X -q -v ON_ERROR_STOP=1 -d "$db" -f "$f" >/dev/null 2>"${TMPDIR:-/tmp}/sec_err" || { echo "ERROR aplicando $f"; cat "${TMPDIR:-/tmp}/sec_err"; status=1; }; done; }
suite() { local label=$1; shift; echo "### $label"; "$@" | grep -E "^(FAIL|==)|^      " ; [ "${PIPESTATUS[0]}" = 0 ] || status=1; }

# A. PR #2 solo
fresh sec_a; apply sec_a businesses_security_baseline.sql "${PR2_UP[@]}"
suite "A. PR #2 solo" env ANON_NOTES_EXPECT="permission denied" USER_PROFILES_COLUMN_PRIVACY=0 bash businesses_security_test.sh sec_a
# B. PR #3 solo, todas las fases
fresh sec_b; apply sec_b user_profiles_privacy_baseline.sql
suite "B1. PR #3 antes"   ./user_profiles_privacy_test.sh sec_b before
apply sec_b "${PR3_UP[0]}";  suite "B2. PR #3 paso 1" ./user_profiles_privacy_test.sh sec_b step1
apply sec_b "${PR3_UP[1]}";  suite "B3. PR #3 paso 2" ./user_profiles_privacy_test.sh sec_b step2
apply sec_b "${PR3_UP[@]}";  suite "B4. PR #3 re-aplicado" ./user_profiles_privacy_test.sh sec_b step2
apply sec_b $R/20261125000100_user_profiles_column_privacy_down.sql; suite "B5. rollback paso 2" ./user_profiles_privacy_test.sh sec_b before
apply sec_b $R/20261125000000_user_profiles_private_rpcs_down.sql;   suite "B6. rollback paso 1" ./user_profiles_privacy_test.sh sec_b rollback
# C. Juntos, orden de despliegue: PR #2 y luego PR #3
fresh sec_c; apply sec_c businesses_security_baseline.sql "${PR2_UP[@]}" "${PR3_UP[@]}"
suite "C1. PR #2 + #3 (batería de #2)" env ANON_NOTES_EXPECT="permission denied" USER_PROFILES_COLUMN_PRIVACY=1 bash businesses_security_test.sh sec_c
fresh sec_d; apply sec_d user_profiles_privacy_baseline.sql "${PR2_UP[0]}" "${PR3_UP[@]}"
suite "C2. PR #2 + #3 (batería de #3)" ./user_profiles_privacy_test.sh sec_d step2
# D. Rollback del paso 2 con PR #2 aplicado: role sigue protegido por el trigger
apply sec_d $R/20261125000100_user_profiles_column_privacy_down.sql
suite "D. rollback paso 2 con PR #2 (role)" ./user_profiles_privacy_test.sh sec_d rollback2_with_pr2
for d in sec_a sec_b sec_c sec_d; do dropdb --if-exists $d; done
echo "RESULTADO: $([ $status = 0 ] && echo OK || echo FALLOS)"; exit $status
