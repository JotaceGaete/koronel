# Datos privados de `user_profiles` (nov 2026)

> Esta rama incluye el PR #2 (`fix/businesses-security`) fusionado: se revisan, prueban y
> despliegan juntos.

## Problema
`public_read_user_profiles` (`FOR SELECT TO public USING (true)`) junto con el `GRANT ALL` a
`anon` y `authenticated` permite a cualquier visitante leer `email`, `phone`, `location`, `role` y
`email_notifications` de todos los usuarios con la anon key. Además cualquier usuario puede
escribir `role` en su propio perfil.

RLS filtra filas, no columnas: reseñas, comunidad, mensajes y avisos necesitan leer
`full_name`/`avatar_url` de otros usuarios, así que la solución es por columna.

## Solución
| Quién | Lee de `user_profiles` | Escribe |
|---|---|---|
| `anon` | `id, full_name, avatar_url, created_at, updated_at` | nada |
| `authenticated` | lo mismo, de todas las filas | su fila: `full_name, phone, location, avatar_url, email_notifications` |
| Usuario autenticado | su fila completa vía `get_my_profile()` | — |
| Admin (`auth.users.raw_app_meta_data.role = 'admin'`) | `email, phone` de otros vía `admin_get_user_contacts(uuid[])`, máx. 1000 | — |
| `service_role`, funciones `SECURITY DEFINER` | todo | todo |

- `admin_get_user_contacts` comprueba `raw_app_meta_data` directamente: **no depende de
  `is_admin()`** (probado redefiniendo `is_admin()` para que devuelva `true`). `user_metadata` y
  `user_profiles.role` no cuentan.
- `role` y `email` no son escribibles por el usuario, tampoco borrando y recreando el perfil. El
  trigger `user_profiles_guard_role` del PR #2 queda como segunda capa.
- Columnas futuras: privadas por defecto.

Frontend:
- `AuthContext`: perfil propio con `get_my_profile` (respaldo a `select('*')` solo mientras la RPC
  no exista, es decir antes del paso 1). `updateProfile` sin `RETURNING *`.
- Panel admin: los embeds piden `(id, full_name)` y `attachUserContacts` agrega email/phone con
  una sola RPC. **Si la RPC falla** se registra `console.error('[admin-contacts] …')` y el panel
  muestra un aviso rojo (`data-testid="admin-contacts-error"`); no se pierde en silencio.
- Reclamos: aprobar/rechazar sigue pasando solo por `approve_business_claim` /
  `reject_business_claim` (PR #2), sin UPDATE directo (cubierto por `adminService.claims.test.js`).

## Archivos
- Migraciones: `20261124000000`, `20261124000100` (PR #2); `20261125000000` (paso 1), `20261125000100` (paso 2).
- Rollback: `supabase/rollback/20261125000000_..._down.sql`, `20261125000100_..._down.sql`.
- Precheck de solo lectura: `supabase/tests/user_profiles_privacy_precheck.sql`.
- Pruebas SQL: `supabase/tests/run_security_tests.sh` (corre ambas baterías por separado y juntas).
- Verificación PostgREST: `scripts/verify-user-profiles-privacy.mjs`.

## Precheck en producción (corrido por Juan el 2026-11-24, bloques 1–6)
Sin vistas, funciones SECURITY INVOKER ni políticas de otras tablas que usen `user_profiles`; sin
permisos por columna previos. Políticas: `admin_read_user_profiles`, `public_read_user_profiles`,
`users_delete/insert/update_own_user_profiles`. **Falta el bloque 7** (definición de `is_admin`,
`approve_business_claim`, `reject_business_claim`): correrlo antes del paso 1.

## Walinka (`JotaceGaete/saas`, rama por defecto, 753ad4d)
Sin consultas a `user_profiles` (ni `from`, ni embeds por FK, ni REST, ni SQL/edge functions); solo
en `database.types.ts`. Otras ramas o código desplegado fuera del repo no están verificados.

## Orden de publicación
1. Precheck bloque 7 en producción (solo lectura). Confirmar que `is_admin()` usa solo
   `raw_app_meta_data` y que existen las RPC de reclamos.
2. **Staging** (recomendado): aplicar las 4 migraciones en este orden con el frontend de esta rama y
   correr `verify-user-profiles-privacy.mjs step2` con un usuario y un admin de prueba. Probar a mano
   en el panel: aprobar y rechazar un reclamo, listados con email (negocios, reclamos, avisos,
   eventos, comunidad, sugerencias) y que no aparezca el aviso rojo.
3. Producción, migraciones del PR #2: `20261124000000`.
4. Producción, paso 1: `20261125000000` → `verify-user-profiles-privacy.mjs step1`.
5. Desplegar el frontend (PR #2 + #3). Comprobar panel admin con emails y Mi cuenta.
6. Producción: `20261124000100` (columnas de businesses, PR #2) y paso 2 `20261125000100`
   → `verify-user-profiles-privacy.mjs step2` + prueba manual del punto 2.
7. No dar el paso 6 sin que 4 y 5 estén verificados.

## Rollback
- Paso 2 (`..._column_privacy_down.sql`): **reversión de emergencia, no es un estado seguro.**
  Vuelve a abrir la lectura de email/phone/location/role a anon y authenticated y la escritura de
  todas las columnas del propio perfil (role sigue bloqueado si está el trigger del PR #2). Aplica
  mínimos privilegios: solo `SELECT` a anon/authenticated e `INSERT/UPDATE/DELETE` a
  authenticated; no devuelve `TRUNCATE`, `TRIGGER`, `REFERENCES` ni escritura a anon (el estado
  original tenía `GRANT ALL`). No toca privilegios de `businesses` del PR #2. Recuperación:
  corregir y re-aplicar `20261125000100` (idempotente) cuanto antes.
- Paso 1 (`..._private_rpcs_down.sql`): solo tras revertir el paso 2.

## Pruebas (Postgres 16 local aislado, `run_security_tests.sh`)
| Escenario | Resultado |
|---|---|
| A. PR #2 solo (batería de #2) | 49/49 |
| B. PR #3: antes / paso 1 / paso 2 / re-aplicado / rollback 2 / rollback 1 | 7/7, 15/15, 31/31, 31/31, 7/7, 8/8 |
| C1. #2 + #3 (batería de #2, `USER_PROFILES_COLUMN_PRIVACY=1`) | 49/49 |
| C2. #2 + #3 (batería de #3) | 31/31 |
| D. Rollback del paso 2 con #2 aplicado | 10/10 (lectura reabierta, role bloqueado por trigger, sin TRUNCATE) |

Dos casos del PR #2 (`usuario no se hace admin en perfil`, `admin cambia rol`) ahora esperan
`permission denied for table user_profiles` cuando el paso 2 está aplicado (Postgres corta antes del
trigger); sin el paso 2 siguen esperando `USER_ROLE_ADMIN_ONLY`. `vitest run`: 21/21; `vite build`: OK.

## Riesgos pendientes
- Sin prueba contra PostgREST real todavía: el script existe, falta correrlo en staging.
- `reject_business_claim` no está en la réplica SQL (su definición de producción no se copió); su
  uso desde el frontend sí está probado. Verificar con el bloque 7 y en staging.
- `get_rescue_businesses()` sigue exponiendo emails a anon: corrección aparte. No dar por segura
  toda la base.
