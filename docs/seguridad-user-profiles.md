# Datos privados de `user_profiles` (nov 2026)

## Problema
La política `public_read_user_profiles` (`FOR SELECT TO public USING (true)`) junto con el
`GRANT ALL` por defecto a `anon` y `authenticated` permite a **cualquier visitante sin sesión**
leer `email`, `phone`, `location`, `role` y `email_notifications` de todos los usuarios con la
anon key (`GET /rest/v1/user_profiles?select=email,phone`). Cualquier usuario autenticado
también puede leerlos.

RLS filtra filas, no columnas, así que no basta con cambiar la política: las reseñas, la
comunidad, los mensajes y los avisos necesitan leer `full_name`/`avatar_url` de otros usuarios.

## Solución
Permisos por columna + dos RPC `SECURITY DEFINER`:

| Quién | Puede leer de `user_profiles` |
|---|---|
| `anon`, `authenticated` (tabla) | `id, full_name, avatar_url, created_at, updated_at` de todas las filas |
| Usuario autenticado | Su fila completa vía `get_my_profile()` |
| Admin (`is_admin()`, app_metadata) | `email, phone` de otros vía `admin_get_user_contacts(uuid[])` (máx. 1000) |
| `service_role`, funciones `SECURITY DEFINER` | Todo, sin cambios |

Escritura de `authenticated` (solo su fila, por las políticas existentes): `full_name, phone,
location, avatar_url, email_notifications`. `role` y `email` no se pueden escribir, ni con UPDATE
ni borrando y recreando el perfil. Esto no depende del trigger del PR de businesses.

Las columnas que se agreguen en el futuro quedan **privadas por defecto** (ni lectura ni escritura).

Frontend:
- `AuthContext`: el perfil propio se carga con `get_my_profile` (respaldo a `select('*')` si la
  RPC no existe todavía). `updateProfile` ya no usa `.select()` (RETURNING * pediría email).
- Panel admin (negocios, reclamos, avisos, eventos, comunidad, sugerencias): el embed pide
  `(id, full_name)` y `attachUserContacts` agrega `email/phone` con una sola RPC.
- Las consultas públicas ya pedían solo `id, full_name, avatar_url, updated_at`: sin cambios.

## Archivos
- `supabase/migrations/20261125000000_user_profiles_private_rpcs.sql` (paso 1, aditivo)
- `supabase/migrations/20261125000100_user_profiles_column_privacy.sql` (paso 2, corrige la filtración)
- `supabase/rollback/*_down.sql`
- `supabase/tests/user_profiles_privacy_precheck.sql` (solo lectura, para producción)
- `supabase/tests/user_profiles_privacy_baseline.sql` + `user_profiles_privacy_test.sh` (local)

## Precheck en producción (corrido por Juan el 2026-11-24)
- Políticas: `admin_read_user_profiles`, `public_read_user_profiles`, `users_delete/insert/update_own_user_profiles`.
  Tras el paso 2 los admins ya no leen email/phone por tabla (el permiso de columna se aplica a
  todos); los obtienen con `admin_get_user_contacts`.
- Vistas, funciones SECURITY INVOKER y políticas de otras tablas que usen `user_profiles`: ninguna.
- Permisos por columna previos: ninguno. Columnas: las 10 de la réplica de pruebas.

## Walinka (`JotaceGaete/saas`, rama por defecto, commit 753ad4d)
Ninguna consulta a `user_profiles`: ni `from('user_profiles')`, ni embeds por FK
(`*_user_id_fkey`, `owner_id(...)`), ni llamadas REST directas, ni SQL/edge functions. Las únicas
menciones están en `database.types.ts` (tipos generados). No usa tablas de Koronel. Solo se
revisó la rama por defecto: si producción corre otra rama o código fuera del repo, no está cubierto.

## Pruebas (Postgres 16 local aislado)
`supabase/tests/user_profiles_privacy_test.sh <db> <fase>` sobre `user_profiles_privacy_baseline.sql`:
antes 7/7 (muestra la filtración y la escalada de role), paso 1 14/14, paso 2 30/30,
re-aplicar ambos 30/30, rollback paso 2 7/7 (vuelve al estado original), rollback paso 1 8/8.
Con el PR de businesses aplicado: mis 30/30 pasan; en su script, `usuario no se hace admin en perfil`
y `admin cambia rol` reciben `permission denied` antes que el trigger (sigue bloqueado; ajustar regex).

## Orden de despliegue
1. Precheck: hecho el 2026-11-24, sin bloqueos. Repetirlo si pasa tiempo antes del paso 2.
2. Aplicar el paso 1 (no cambia nada visible).
3. Desplegar el frontend de esta rama.
4. Aplicar el paso 2.
5. Verificar con la anon key: `GET /rest/v1/user_profiles?select=email` → 401/42501;
   `select=id,full_name` → 200. Probar ficha de negocio con reseñas, comunidad, avisos,
   mensajes, "Mi cuenta" (guardar perfil) y panel admin.
6. Si algo se rompe: `rollback/20261125000100_..._down.sql` (vuelve al estado anterior).

## Riesgos pendientes
- Walinka: compatible según la rama por defecto de `saas` (ver arriba); no verificado contra
  otras ramas o código desplegado fuera del repo.
- No se probó contra PostgREST real (solo SQL equivalente a los embeds); probar en staging o
  justo tras el paso 2 con la lista de verificación del paso 5.
- `get_rescue_businesses()` (anon) sigue filtrando emails de dueños Walinka: no lo cubre este cambio.
- `email` de `user_profiles` sigue siendo editable por el propio usuario (no es el email de Auth).
