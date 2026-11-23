# Integración Koronel ↔ Walinka: seguridad y SQL propuesto

Fecha de la auditoría: 2026-11-23. Proyecto Supabase: `coronel-portal` (`hxxdketymcntadffmajf`).
Todo lo de este documento es **propuesta**. No se ha ejecutado ningún SQL en Supabase.

---

## 1. Migración de la integración (incluida en la rama)

Archivo: `supabase/migrations/20261123000000_walinka_public_link.sql`

Crea solo `public.get_public_walinka_link(uuid)`. No cambia tablas, políticas ni funciones existentes.

| Aspecto | Decisión |
|---|---|
| `SECURITY DEFINER` | Es necesario porque la RLS de `business_walinka_links` solo deja leer al dueño o a un admin, y `anon` no puede ejecutar `wa_resolve_catalog_url`. Para compensar, la función devuelve solo datos que ya son públicos. |
| `search_path` | Se fija en `''` y todos los objetos van con su esquema (`public.`), así ningún objeto homónimo puede secuestrar la ejecución. |
| Permisos | `REVOKE ALL … FROM PUBLIC` y `GRANT EXECUTE … TO anon, authenticated`. |
| Datos devueltos | Solo `walinka_name` y `public_url`. No devuelve IDs de Walinka, dueños, emails, fechas ni estado interno. |
| Consulta de negocios ajenos por UUID | Es el uso esperado, porque la ficha pública muestra negocios de otros. Solo responde si el negocio Koronel está `published`/`premium` (el mismo criterio de su política pública), el vínculo está `connected`, el catálogo está `is_active` y tiene URL pública `https://`. En cualquier otro caso devuelve 0 filas, sin decir el motivo, así que no permite enumerar estados. |
| URL | La calcula el servidor (`wa_resolve_catalog_url`: dominio propio activo o `https://miralatienda.de/catalogo/<slug>`) y además se valida con una expresión regular `https://`. El cliente la vuelve a validar con `safeCatalogUrl` (solo `https:`, sin credenciales ni puerto). |

La verificación posterior y el rollback están comentados al final del archivo.

### Validación en Postgres local aislado (2026-11-23)
`supabase/tests/walinka_public_link/` replica las tablas, la RLS y `wa_resolve_catalog_url` tal como están en producción, con datos ficticios, y aplica la migración tal cual. Resultados:

| Caso | Resultado |
|---|---|
| Vínculo activo + negocio publicado (anon) | Devuelve nombre + `https://miralatienda.de/catalogo/<slug>` |
| Negocio `pending` | 0 filas |
| Vínculo revocado | 0 filas |
| Catálogo inactivo | 0 filas |
| Dominio propio activo (negocio `premium`) | Devuelve `https://<dominio>`; el dominio inactivo se ignora |
| Catálogo sin slug ni dominio / dominio con caracteres inválidos | 0 filas |
| UUID inexistente / NULL | 0 filas |
| `authenticated` ajeno al negocio | Mismo resultado público, nada más |
| Revocar y revincular | Desaparece y vuelve (los índices únicos son parciales) |
| `search_path` hostil (tabla homónima en otro esquema) | No afecta |
| Permisos | `SECURITY DEFINER`, `search_path=""`, `STABLE`; EXECUTE para anon, authenticated y service_role (este último por los privilegios por defecto de Supabase); 0 permisos a PUBLIC |
| Escrituras | Hash de `wa_businesses` idéntico antes, después y tras el rollback |
| Rollback | `DROP FUNCTION` OK |

Limitación: es una réplica local, no el Supabase real. Antes de aplicar en el proyecto compartido conviene repetir los casos en una rama de Supabase o justo después de aplicar, con la verificación del final de la migración.

---

## 2. Impedir que los propietarios modifiquen `status` y `verified` (NO aplicado)

### Problema
- Las políticas `owner_update_businesses` y `owners_update_businesses` (están duplicadas) usan `USING/WITH CHECK (owner_id = auth.uid())` y no restringen columnas.
- `authenticated_insert_businesses` y `owner_insert_businesses` solo exigen `owner_id = auth.uid()`.
- El filtro `sanitizeBusinessPayload` existe solo en React.
- Por eso un dueño, con la anon key y su sesión, puede:
  - pasar su negocio a `published` o `premium` sin aprobación,
  - marcarse `verified`/`featured` o extender `premium_until`,
  - escribir `walinka_catalog_url`/`walinka_enabled` (hoy no se usan),
  - crear un negocio directamente como `premium`. El formulario de publicación ya lo hace con `handleSimulatePayment`, porque el pago es simulado en el cliente.

### Por qué no basta con permisos por columna
`REVOKE UPDATE (status) FROM authenticated` también bloquearía a los administradores, que usan el mismo rol `authenticated`. Por eso la alternativa es un trigger que distinga si quien escribe es admin.

### SQL propuesto
```sql
CREATE OR REPLACE FUNCTION public.businesses_guard_privileged_columns()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  -- service_role, postgres y admins (app_metadata.role = 'admin') no se restringen.
  IF coalesce(auth.role(), '') NOT IN ('anon', 'authenticated') OR public.is_admin() THEN
    RETURN NEW;
  END IF;

  IF TG_OP = 'INSERT' THEN
    NEW.status          := 'pending';
    NEW.verified        := false;
    NEW.featured        := false;
    NEW.premium_until   := NULL;
    NEW.walinka_enabled := false;
    NEW.walinka_catalog_url   := NULL;
    NEW.walinka_business_slug := NULL;
    RETURN NEW;
  END IF;

  -- UPDATE: único cambio de estado permitido al dueño: rejected -> pending (reenviar a revisión).
  IF NEW.status IS DISTINCT FROM OLD.status
     AND NOT (OLD.status = 'rejected' AND NEW.status = 'pending') THEN
    RAISE EXCEPTION 'BUSINESS_STATUS_ADMIN_ONLY' USING ERRCODE = '42501';
  END IF;

  IF NEW.verified        IS DISTINCT FROM OLD.verified
  OR NEW.featured        IS DISTINCT FROM OLD.featured
  OR NEW.premium_until   IS DISTINCT FROM OLD.premium_until
  OR NEW.owner_id        IS DISTINCT FROM OLD.owner_id
  OR NEW.claimed         IS DISTINCT FROM OLD.claimed
  OR NEW.walinka_enabled IS DISTINCT FROM OLD.walinka_enabled
  OR NEW.walinka_catalog_url   IS DISTINCT FROM OLD.walinka_catalog_url
  OR NEW.walinka_business_slug IS DISTINCT FROM OLD.walinka_business_slug THEN
    RAISE EXCEPTION 'BUSINESS_PRIVILEGED_COLUMN_ADMIN_ONLY' USING ERRCODE = '42501';
  END IF;

  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.businesses_guard_privileged_columns() FROM PUBLIC, anon, authenticated;

CREATE TRIGGER businesses_guard_privileged_columns
BEFORE INSERT OR UPDATE ON public.businesses
FOR EACH ROW EXECUTE FUNCTION public.businesses_guard_privileged_columns();
```

### Impacto antes de aplicarlo
1. **El flujo «premium» de `publish-business-form` deja de funcionar** (`handleSimulatePayment` → `status: 'premium'`). El negocio queda `pending`. Antes de aplicar el trigger hay que pasar la activación premium al servidor (webhook de pago con service role) o aceptar que premium lo asigne un admin.
2. El formulario de publicación envía `verified: false`, `featured: false` y `status: 'pending'`. Con el trigger se sobrescriben con los mismos valores, así que no hay cambio visible.
3. `EditBusinessModal` no envía columnas protegidas, así que no se ve afectado.
4. Los paneles de admin usan `is_admin()` (app_metadata), así que tampoco se ven afectados.
5. Limpieza recomendada en la misma migración: borrar las políticas duplicadas (`owners_update_businesses`, `owner_insert_businesses`, `admin_manage_businesses` o `admin_all_businesses`) y revisar `public_read_businesses USING (true)`, que deja leer **todos** los negocios, incluidos los `pending`/`rejected`, y anula el filtro de `public_read_published_businesses`.

Recomendación: probar primero en una rama de Supabase (branching) o en local, con los casos: dueño edita nombre (OK), dueño cambia status (rechazado), admin cambia status (OK) y alta de negocio (queda `pending`).

---

## 3. Exposición anónima de `wa_businesses` (NO aplicado)

### Políticas y permisos responsables
| Objeto | Detalle |
|---|---|
| Política `wa_businesses_public_read` | `FOR SELECT TO public USING (true)`: cualquier visitante (anon o autenticado) lee **todas las filas**. |
| Permisos | `anon` y `authenticated` tienen `SELECT` sobre **todas las columnas** (también `INSERT`, `DELETE` y `UPDATE` por columna, pero la RLS los bloquea porque `wa_businesses_owner_all` exige `user_id = auth.uid()`). |
| Columnas sensibles expuestas | `user_id`, `email`, `whatsapp`, `address`, `lat`/`lng`, `plan_slug`, `plan_expires_at`, `trial_expires_at`, `scheduled_plan_slug`, `onboarding_*`, `activated_at`, `seo_content_ai`, `order_message_template`… de los 98 negocios. |

### Hallazgo urgente relacionado
`public.get_rescue_businesses()` es `SECURITY DEFINER`, **la puede ejecutar `anon`** y no comprueba ningún rol. Devuelve `owner_email` (de `auth.users`) junto con el nombre del negocio de todos los comercios elegibles. Es una filtración de emails que ya existía, independiente de esta integración. `pg_stat_statements` no registra llamadas de `anon`/`authenticated` (probablemente la usa un proceso interno con service role), así que revocar el permiso sería de bajo riesgo:
```sql
REVOKE EXECUTE ON FUNCTION public.get_rescue_businesses() FROM PUBLIC, anon, authenticated;
```
También son ejecutables por `anon`, sin comprobar rol, `wa_apply_scheduled_plan_changes()` y `wa_enforce_expired_plans()`. Solo aplican cambios de plan que ya vencieron, así que el riesgo es bajo, pero lo correcto es revocarles `anon`/`authenticated`. Hay que confirmar antes que el cron usa `postgres` o el service role (`pg_stat_statements` muestra llamadas solo desde `postgres`).

### Consultas de Walinka que dependen de la lectura pública
No encontré el código fuente de producción de Walinka entre los repositorios accesibles: `walinka` y `walinka_0671` no consultan `wa_businesses`. Las consultas se obtuvieron de `pg_stat_statements` (desde el último reset):

| Rol | Llamadas | Filtro | Columnas leídas |
|---|---|---|---|
| anon | 1589 | `slug = ? AND …` (+ `wa_rubros`) | id, name, description, slug, logo_url, cover_image_url, design_settings, og_image_url, city, region, country, country_code, currency, rubro_id, seo_content_ai, seo_content_override, seo_family_key, updated_at, whatsapp |
| anon | 244 | `slug = ? AND is_active = ?` | id, currency |
| anon | 96 | `slug = ? AND …` (+ `wa_rubros`) | todo lo anterior **+ email, address, lat, lng, plan_slug, plan_expires_at, trial_expires_at, scheduled_*, operating_days, order_message_template, instagram/facebook/tiktok_url, business_mode, document_title_type, print_legend, is_active, created_at** |
| anon | 6 | `id = ?` | plan_slug, plan_expires_at, trial_expires_at, plan_started_at |
| anon | 2 | `slug = ? AND is_active = ?` | name, description, logo_url, cover_image_url, design_settings |
| authenticated | 2552 | `user_id = ?` | `*` (panel del dueño) |
| authenticated | 14 | sin filtro, `ORDER BY created_at` | `*` (probable panel admin) |

Ninguna consulta anónima lee `user_id`, `onboarding_step`, `onboarding_completed_at`, `activated_at` ni `ticket_logo_url`. Además, las ~70 políticas RLS de otras tablas Walinka usan subconsultas `wa_businesses.user_id = auth.uid()`, que dependen de que el dueño pueda leer **sus propias** filas (`wa_businesses_owner_all`), no de la lectura pública.

### Solución propuesta, compatible con producción (por fases)

**Fase 1 (sin cambios de código en Walinka).** Restringir columnas para `anon` a las que hoy se usan. Así se elimina la exposición de `user_id` y de los campos de onboarding sin romper ninguna consulta observada:
```sql
REVOKE SELECT ON public.wa_businesses FROM anon;
GRANT SELECT (
  id, name, description, slug, logo_url, cover_image_url, design_settings, og_image_url,
  city, region, country, country_code, currency, rubro_id, seo_content_ai,
  seo_content_override, seo_family_key, updated_at, whatsapp, email, address, lat, lng,
  plan_slug, plan_expires_at, trial_expires_at, plan_started_at, scheduled_plan_slug,
  scheduled_change_at, operating_days, order_message_template, instagram_url,
  facebook_url, tiktok_url, business_mode, document_title_type, print_legend,
  is_active, created_at
) ON public.wa_businesses TO anon;
```
Riesgo: si alguna página anónima usa `select=*` o una columna fuera de la lista, PostgREST devolverá `permission denied`. Hay que comprobarlo en una rama de Supabase o con el código de Walinka antes de aplicar.

**Fase 2 (requiere cambio en Walinka).** Mover la consulta pública del catálogo a una vista o RPC, por ejemplo `wa_get_public_catalog(p_slug)`, que devuelva solo lo que la página necesita y filtre `is_active = true`. Después:
- quitar `email`, `address`, `plan_*`, `trial_*` y `scheduled_*` de los permisos de `anon` (la consulta de 96 llamadas es la que los pide);
- cambiar `wa_businesses_public_read` a `TO anon USING (is_active = true)`, o eliminarla si todo pasa por la RPC.

**Fase 3 (usuarios autenticados).** Hoy cualquier usuario con sesión, incluido cualquier comerciante de Koronel, lee todas las columnas de todos los negocios Walinka por la misma política. No se puede restringir por columnas sin romper `select('*')` del panel del dueño, así que la solución es la misma de la fase 2: la lectura pública solo por RPC o vista, y quitar `authenticated` de `wa_businesses_public_read`.

---

## 4. Otros riesgos pendientes
- Las migraciones del repo de Koronel están desactualizadas respecto de producción (por ejemplo, `is_admin_user()` en el repo todavía acepta `user_metadata`). Conviene regenerar una línea base.
- `get_my_walinka_catalogs()` devuelve también catálogos inactivos o sin URL. La interfaz los filtra.
- El vínculo exige `businesses.claimed = true`, pero hoy el dueño puede escribir `claimed` (ver sección 2).
- `WALINKA_INFO_URL` usa por defecto `https://walinka.com/` (la página informativa oficial; `miralatienda.de` es solo el origen técnico de los catálogos). Se puede cambiar con `VITE_WALINKA_INFO_URL`.
- **Este flujo no está completamente protegido mientras sigan abiertos los riesgos de la sección 2**: un dueño puede marcar su negocio como `claimed`, `published` o `verified` por su cuenta, y la lectura pública de `businesses` es demasiado amplia. La vinculación en sí exige que el catálogo Walinka sea del mismo usuario, pero el lanzamiento debería esperar esas correcciones.
