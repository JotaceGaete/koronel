#!/bin/bash
# Pruebas de 20261125000000 + 20261125000100 contra un Postgres local AISLADO (nunca producción).
# Uso: user_profiles_privacy_test.sh <db> <fase>   fase: before | step1 | step2 | rollback
DB=$1; PHASE=$2
PSQL="psql -h ${PGHOST:-localhost} -p ${PGPORT:-5432} -U ${PGUSER:-postgres} -d $DB -X -q -t -A"
ADMIN=00000000-0000-0000-0000-00000000000a; OWNER=00000000-0000-0000-0000-00000000000b; FAKE=00000000-0000-0000-0000-00000000000c
pass=0; fail=0
t() { # nombre, rol, sub, sql, esperado (regex)
  local name="$1" role="$2" sub="$3" sql="$4" exp="$5" claims
  claims="{\"role\":\"$role\",\"sub\":\"$sub\"}"; [ "$role" = anon ] && claims='{"role":"anon"}'
  local out
  out=$($PSQL 2>&1 <<SQL
BEGIN;
SELECT set_config('request.jwt.claims', '$claims', true);
SET LOCAL ROLE $role;
$sql
ROLLBACK;
SQL
)
  out=$(echo "$out" | sed 1d | tr '\n' ' ')
  if echo "$out" | grep -Eq -- "$exp"; then pass=$((pass+1)); printf 'PASS  %s\n' "$name"
  else fail=$((fail+1)); printf 'FAIL  %s\n      esperado /%s/ obtenido: %s\n' "$name" "$exp" "$out"; fi
}
DENIED="permission denied"
case $PHASE in before|step1|rollback) LEAK=1;; *) LEAK=0;; esac

# --- Filtración (lo que se corrige)
if [ $LEAK = 1 ]; then
  t "[$PHASE] anon lee emails (filtración presente)" anon "" "SELECT count(email) FROM user_profiles;" "^3 ?$"
  t "[$PHASE] authenticated se pone role=admin (hueco presente)" authenticated $OWNER "UPDATE user_profiles SET role='admin' WHERE id='$OWNER' RETURNING role;" "^admin ?$"
else
  t "anon NO lee email"                    anon "" "SELECT email FROM user_profiles;" "$DENIED"
  t "anon NO lee phone"                    anon "" "SELECT phone FROM user_profiles;" "$DENIED"
  t "anon NO lee location/role/notif"      anon "" "SELECT location, role, email_notifications FROM user_profiles;" "$DENIED"
  t "anon NO puede select *"               anon "" "SELECT * FROM user_profiles;" "$DENIED"
  t "anon NO filtra por email (oráculo)"   anon "" "SELECT id FROM user_profiles WHERE email='owner@x';" "$DENIED"
  t "authenticated NO lee email ajeno"     authenticated $OWNER "SELECT email FROM user_profiles WHERE id='$ADMIN';" "$DENIED"
  t "authenticated NO lee ni su propio email por tabla" authenticated $OWNER "SELECT email FROM user_profiles WHERE id='$OWNER';" "$DENIED"
  t "admin tampoco lee email por tabla"    authenticated $ADMIN "SELECT email FROM user_profiles;" "$DENIED"
  t "authenticated NO lee phone/location/role ajenos" authenticated $OWNER "SELECT phone, location, role FROM user_profiles WHERE id='$ADMIN';" "$DENIED"
  t "authenticated NO deduce email ajeno filtrando" authenticated $OWNER "SELECT count(*) FROM user_profiles WHERE email LIKE 'admin%';" "$DENIED"
  t "authenticated NO se pone role=admin (UPDATE)" authenticated $OWNER "UPDATE user_profiles SET role='admin' WHERE id='$OWNER';" "$DENIED"
  t "authenticated NO cambia su email de perfil"   authenticated $OWNER "UPDATE user_profiles SET email='admin@x' WHERE id='$OWNER';" "$DENIED"
  t "authenticated NO se recrea como admin (DELETE+INSERT)" authenticated $FAKE "DELETE FROM user_profiles WHERE id='$FAKE'; INSERT INTO user_profiles (id, full_name, role) VALUES ('$FAKE','x','admin');" "$DENIED"
  t "authenticated se recrea sin role (queda 'user')" authenticated $FAKE "DELETE FROM user_profiles WHERE id='$FAKE'; INSERT INTO user_profiles (id, full_name) VALUES ('$FAKE','x'); SELECT role FROM get_my_profile();" "^user ?$"
  t "role sigue intacto tras los intentos" postgres "" "SELECT role FROM user_profiles WHERE id='$OWNER';" "^user ?$"
  t "anon NO escribe"                      anon "" "UPDATE user_profiles SET full_name='x';" "$DENIED"
  t "service_role sigue leyendo todo"      service_role "" "SELECT count(email) FROM user_profiles;" "^3 ?$"
  t "SECURITY DEFINER no afectado (handle_new_user)" postgres "" "INSERT INTO auth.users (id,email) VALUES ('00000000-0000-0000-0000-0000000000ee','nuevo@x'); SELECT email FROM user_profiles WHERE id='00000000-0000-0000-0000-0000000000ee';" "^nuevo@x ?$"
fi

# --- Lo que debe seguir funcionando en todas las fases (consultas reales del frontend)
t "anon reseñas + autor (embed id,full_name,avatar_url)" anon "" "SELECT r.comment, u.full_name, u.avatar_url FROM business_reviews r LEFT JOIN LATERAL (SELECT id, full_name, avatar_url FROM user_profiles p WHERE p.id = r.user_id) u ON true;" "^ok\|owner\|a.png ?$"
t "anon aviso + última conexión (updated_at)" anon "" "SELECT a.title, u.full_name, u.updated_at IS NOT NULL FROM classified_ads a LEFT JOIN LATERAL (SELECT id, full_name, avatar_url, updated_at FROM user_profiles p WHERE p.id = a.user_id) u ON true;" "^aviso\|owner\|t ?$"
t "anon contador de usuarios (StatsBar)" anon "" "SELECT count(*) FROM (SELECT id FROM user_profiles) s;" "^3 ?$"
t "authenticated actualiza su perfil (sin RETURNING)" authenticated $OWNER "UPDATE user_profiles SET full_name='Nuevo', phone='+569', location='Lota', email_notifications=false WHERE id='$OWNER'; SELECT full_name FROM user_profiles WHERE id='$OWNER';" "^Nuevo ?$"
t "authenticated no actualiza perfil ajeno" authenticated $OWNER "UPDATE user_profiles SET full_name='Hack' WHERE id='$ADMIN'; SELECT full_name FROM user_profiles WHERE id='$ADMIN';" "^admin ?$"

if [ $PHASE != before ] && [ $PHASE != rollback ]; then
  t "get_my_profile devuelve solo mi fila completa" authenticated $OWNER "SELECT count(*), max(email), max(phone), max(location) FROM get_my_profile();" "^1\|owner@x\|\+56911111111\|Coronel ?$"
  t "get_my_profile anon: sin permiso"   anon "" "SELECT * FROM get_my_profile();" "$DENIED"
  t "admin_get_user_contacts admin"      authenticated $ADMIN "SELECT string_agg(email||'/'||coalesce(phone,'-'), ',' ORDER BY email) FROM admin_get_user_contacts(ARRAY['$OWNER','$FAKE']::uuid[]);" "^fake@x/-,owner@x/\+56911111111 ?$"
  t "admin_get_user_contacts no admin"   authenticated $OWNER "SELECT * FROM admin_get_user_contacts(ARRAY['$ADMIN']::uuid[]);" "Solo un administrador"
  t "admin_get_user_contacts user_metadata/perfil admin falso" authenticated $FAKE "SELECT * FROM admin_get_user_contacts(ARRAY['$ADMIN']::uuid[]);" "Solo un administrador"
  t "admin_get_user_contacts anon"       anon "" "SELECT * FROM admin_get_user_contacts(ARRAY['$ADMIN']::uuid[]);" "$DENIED"
  t "admin_get_user_contacts tope 1000"  authenticated $ADMIN "SELECT * FROM admin_get_user_contacts(array_fill('$OWNER'::uuid, ARRAY[1001]));" "máximo 1000"
fi
if [ $PHASE = rollback ]; then
  t "rollback: RPC eliminadas" authenticated $OWNER "SELECT * FROM get_my_profile();" "does not exist"
fi
echo "== $PHASE: $pass PASS, $fail FAIL"; [ $fail = 0 ]
