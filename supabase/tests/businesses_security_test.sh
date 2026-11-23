#!/bin/bash
# Pruebas de la migración 20261124000000 contra un Postgres local AISLADO (nunca producción).
# Preparación: crear una BD vacía, cargar businesses_security_baseline.sql (réplica mínima del
# estado de producción del 2026-11-23) y luego las migraciones. Variables: PGHOST, PGPORT.
# ANON_NOTES_EXPECT="permission denied" si se aplicó también 20261124000100.
# Uso: run_tests.sh <db>
DB=$1
PSQL="psql -h ${PGHOST:-localhost} -p ${PGPORT:-5432} -U ${PGUSER:-postgres} -d $DB -X -q -t -A"
ADMIN=00000000-0000-0000-0000-00000000000a; OWNER=00000000-0000-0000-0000-00000000000b
FAKE=00000000-0000-0000-0000-00000000000c; CLAIMER=00000000-0000-0000-0000-00000000000d
B_PUB=10000000-0000-0000-0000-000000000001; B_PEND=10000000-0000-0000-0000-000000000002
B_REJ=10000000-0000-0000-0000-000000000003; B_UNCL=10000000-0000-0000-0000-000000000004; B_REJOWN=10000000-0000-0000-0000-000000000005
pass=0; fail=0
t() { # nombre, rol, sub, sql, esperado (regex sobre stdout+stderr)
  local name="$1" role="$2" sub="$3" sql="$4" exp="$5"
  local claims="{\"role\":\"$role\",\"sub\":\"$sub\"}"
  [ "$role" = anon ] && claims={\"role\":\"anon\"}
  local out
  out=$($PSQL 2>&1 <<SQL
BEGIN;
SELECT set_config('request.jwt.claims', '$claims', true);
SET LOCAL ROLE $role;
$sql
ROLLBACK;
SQL
)
  out=$(echo "$out" | sed 1d | tr '\n' ' ')   # quita el set_config
  if echo "$out" | grep -Eq -- "$exp"; then pass=$((pass+1)); printf 'PASS  %s\n' "$name"
  else fail=$((fail+1)); printf 'FAIL  %s\n      esperado /%s/ obtenido: %s\n' "$name" "$exp" "$out"; fi
}
# --- Lectura pública
t "anon solo ve publicados"            anon "" "SELECT string_agg(name, ',' ORDER BY name) FROM businesses;" "^Premium expired,Pub owner,Unclaimed pub ?$"
t "anon no ve pending por id"          anon "" "SELECT count(*) FROM businesses WHERE id='$B_PEND';" "^0 ?$"
t "anon directorio (columnas públicas)" anon "" "SELECT count(*) FROM businesses WHERE status IN ('published','premium') AND featured = false;" "^3 ?$"
t "anon no lee admin_notes"            anon "" "SELECT admin_notes FROM businesses;" "$ANON_NOTES_EXPECT"
t "authenticated ajeno no ve pending"  authenticated $CLAIMER "SELECT count(*) FROM businesses WHERE status NOT IN ('published','premium');" "^0 ?$"
t "dueño ve sus pending/rejected"      authenticated $OWNER "SELECT count(*) FROM businesses WHERE owner_id='$OWNER';" "^3 ?$"
t "admin ve todo"                      authenticated $ADMIN "SELECT count(*) FROM businesses;" "^6 ?$"
# --- Registro de negocios
t "registro: premium forzado a pending" authenticated $OWNER "INSERT INTO businesses (owner_id,name,category,status,verified,featured,premium_until,claimed,rating,walinka_enabled,admin_notes) VALUES ('$OWNER','N','x','premium',true,true,now()+interval '30 days',false,5,true,'x') RETURNING status,verified,featured,premium_until IS NULL,claimed,rating,walinka_enabled,admin_notes IS NULL;" "^pending\|f\|f\|t\|t\|0\|f\|t ?$"
t "registro: owner_id ajeno rechazado"  authenticated $OWNER "INSERT INTO businesses (owner_id,name,category) VALUES ('$CLAIMER','N','x');" "row-level security"
t "registro: anon no puede insertar"    anon "" "INSERT INTO businesses (name,category) VALUES ('N','x');" "permission denied|row-level security"
# --- Edición por el dueño
t "dueño edita campos normales"       authenticated $OWNER "UPDATE businesses SET name='Nuevo', phone='123', description='d', whatsapp='w', redes_sociales='r', address='a', logo_url='l', opening_hours='{}' WHERE id='$B_PUB' RETURNING name, status;" "^Nuevo\|published ?$"
t "dueño reenvía payload sin cambios en reservados" authenticated $OWNER "UPDATE businesses SET name='Otro', status='published', verified=false, featured=false, claimed=true, updated_at=now() WHERE id='$B_PUB' RETURNING name;" "^Otro ?$"
t "dueño no publica su pending"       authenticated $OWNER "UPDATE businesses SET status='published' WHERE id='$B_PEND';" "BUSINESS_STATUS_ADMIN_ONLY"
t "dueño no pasa a premium"           authenticated $OWNER "UPDATE businesses SET status='premium' WHERE id='$B_PUB';" "BUSINESS_STATUS_ADMIN_ONLY"
t "dueño reenvía rejected -> pending" authenticated $OWNER "UPDATE businesses SET status='pending' WHERE id='$B_REJOWN' RETURNING status;" "^pending ?$"
for col in "verified=true" "featured=true" "premium_until=now()" "claimed=false" "rating=5" "review_count=99" "profile_visits=1000" "contacts_count=5" "walinka_enabled=true" "walinka_catalog_url='https://x'" "walinka_business_slug='x'" "admin_notes='x'" "rejection_reason='x'" "account_id=gen_random_uuid()"; do
  t "dueño no cambia $col" authenticated $OWNER "UPDATE businesses SET $col WHERE id='$B_PUB';" "BUSINESS_PRIVILEGED_COLUMN_ADMIN_ONLY"
done
t "dueño no transfiere owner_id"      authenticated $OWNER "UPDATE businesses SET owner_id='$CLAIMER' WHERE id='$B_PUB';" "BUSINESS_PRIVILEGED_COLUMN_ADMIN_ONLY|row-level security"
t "dueño no se apropia de ficha ajena" authenticated $OWNER "UPDATE businesses SET owner_id='$OWNER', claimed=true WHERE id='$B_UNCL' RETURNING id;" "^ ?$|UPDATE 0"
t "anon no actualiza"                 anon "" "UPDATE businesses SET verified=true WHERE id='$B_UNCL';" "permission denied|^ ?$"
t "user_metadata.role=admin no da admin" authenticated $FAKE "UPDATE businesses SET verified=true WHERE id='$B_UNCL' RETURNING id;" "^ ?$"
# --- Administración
t "admin publica y verifica"          authenticated $ADMIN "UPDATE businesses SET status='published', verified=true, featured=true, premium_until=now()+interval '30 days', admin_notes='ok' WHERE id='$B_PEND' RETURNING status, verified, featured;" "^published\|t\|t ?$"
t "admin crea negocio publicado"      authenticated $ADMIN "INSERT INTO businesses (name,category,status,verified,claimed) VALUES ('Adm','x','published',true,false) RETURNING status, verified;" "^published\|t ?$"
t "admin rechaza"                     authenticated $ADMIN "UPDATE businesses SET status='rejected', rejection_reason='r' WHERE id='$B_PEND' RETURNING status;" "^rejected ?$"
t "admin borra"                       authenticated $ADMIN "DELETE FROM businesses WHERE id='$B_REJ' RETURNING id;" "$B_REJ"
t "service_role sin restricciones"    service_role "" "UPDATE businesses SET status='premium', verified=true WHERE id='$B_PEND' RETURNING status;" "^premium ?$"
# --- Reclamación de fichas
t "reclamante crea solicitud"         authenticated $CLAIMER "INSERT INTO business_claims (business_id,user_id,claimant_name) VALUES ('$B_UNCL','$CLAIMER','c') RETURNING claim_status;" "^pending ?$"
t "admin aprueba reclamo (RPC)"       authenticated $ADMIN "SELECT (approve_business_claim('20000000-0000-0000-0000-000000000001')).claim_status; SELECT owner_id='$CLAIMER', claimed, verified FROM businesses WHERE id='$B_UNCL';" "^approved t\|t\|t ?$"
t "no admin no aprueba reclamo"       authenticated $CLAIMER "SELECT approve_business_claim(gen_random_uuid());" "Solo un administrador"
# --- Triggers/funciones de sistema
t "reseña actualiza rating (definer)" authenticated $CLAIMER "INSERT INTO business_reviews (business_id,user_id,rating) VALUES ('$B_PUB','$CLAIMER',4); SELECT rating, review_count FROM businesses WHERE id='$B_PUB';" "^4\.0\|1 ?$"
t "anon expira premium (definer)"     anon "" "SELECT check_premium_expiry(); SELECT count(*) FROM businesses WHERE status='premium';" "^ ?0 ?$"
# --- Roles
t "usuario no se hace admin en perfil" authenticated $OWNER "UPDATE user_profiles SET role='admin' WHERE id='$OWNER';" "USER_ROLE_ADMIN_ONLY"
t "usuario edita su perfil"           authenticated $OWNER "UPDATE user_profiles SET full_name='Juan P' WHERE id='$OWNER' RETURNING full_name;" "^Juan P ?$"
t "alta de perfil fuerza role=user"   authenticated $CLAIMER "DELETE FROM user_profiles WHERE id='$CLAIMER'; INSERT INTO user_profiles (id,email,role) VALUES ('$CLAIMER','c2@x','admin') RETURNING role;" "user|permission denied|row-level"
t "admin cambia rol"                  authenticated $ADMIN "UPDATE user_profiles SET role='admin' WHERE id='$OWNER' RETURNING role;" "^ ?$|admin"
t "registro auth crea perfil"         postgres "" "INSERT INTO auth.users (id,email) VALUES (gen_random_uuid(),'n@x'); SELECT role FROM user_profiles WHERE email='n@x';" "user"
t "anon no puede TRUNCATE"            anon "" "TRUNCATE businesses CASCADE;" "permission denied"
echo "== $pass ok, $fail fallos"
