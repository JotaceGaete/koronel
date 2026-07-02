# Hotfix de seguridad: dejar de confiar en `raw_user_meta_data` para admin

**Estado: migración creada en `supabase/migrations/`. No aplicada a ninguna base de datos. Completamente separada de las migraciones multi-ciudad pausadas (`20260601000001` en adelante), que no se tocan.**

## Corrección importante: el admin real no es quien el historial sugería

El historial de migraciones (seed inicial + promoción explícita a `role='admin'`) apunta consistentemente a `carlos@coronellocal.cl`. Le pregunté al usuario para confirmarlo antes de crear el archivo real, y la respuesta fue que **el admin real es `contacto@walinka.com`, no Carlos**. La lista `v_admin_emails` de la migración usa `contacto@walinka.com`. Esto confirma por qué no convenía derivar automáticamente la lista de admins desde los datos existentes (fueran migraciones o la condición insegura en vivo): ninguna de las dos fuentes tenía el email correcto.

## Alcance ampliado tras revisar a fondo

Al buscar *todos* los lugares que leen `raw_user_meta_data`/`raw_app_meta_data` en el historial de migraciones (no solo los dos que ya sabíamos), encontré que **no son dos funciones duplicadas, son tres**:

| Función | Definida en | Gobierna |
|---|---|---|
| `public.is_admin()` | `20260304163200_admin_tables.sql` | `categories`, `businesses`, `classified_ads`, `business_claims`, `featured_listings`, `user_profiles` |
| `public.is_admin_user()` | `20260305_community_qa.sql`, redefinida (idéntica) en `20260306000000_business_status.sql` y `20260306_business_status.sql` | `community_posts`, `community_replies`, `community_votes`, `suggested_businesses`, `community_question_images`, y (según la versión de `business_status`) también partes de `businesses` |
| **`public.is_admin_jobs()`** — nueva, no mencionada antes | `20260310_jobs_module.sql` | `jobs`, `job_applications` (7 usos de policy) |

Las tres tienen la lógica **byte-idéntica**: `raw_user_meta_data->>'role' = 'admin' OR raw_app_meta_data->>'role' = 'admin'`. El hotfix tiene que unificar las tres, no dos — si dejo `is_admin_jobs()` afuera, el módulo de empleos queda con el mismo hueco después del "fix".

También until confirmar: `raw_user_meta_data->>'full_name'`/`avatar_url` aparecen en el trigger de creación de `user_profiles` (`20260304161514_coronellocal_schema.sql:164-165`) — **eso no es un check de seguridad**, es solo copiar el nombre/avatar que el usuario puso al registrarse a su perfil público. No lo toco.

## El problema, en una frase

`raw_user_meta_data` es `user_metadata`, el campo que cualquier usuario logueado puede escribir él mismo con `supabase.auth.updateUser({ data: { role: 'admin' } })` — una llamada estándar del SDK, sin privilegios especiales, ejecutable desde la consola del navegador en 10 segundos. Las tres funciones de arriba lo aceptan como prueba válida de ser admin.

## Diseño del fix

1. **No usar "todos los que ya cumplen la condición insegura" como fuente para decidir quién se promueve** — sería circular: la misma condición que no confiamos decide quién queda con acceso seguro. En su lugar, una lista explícita y corta de emails, para revisar a mano antes de aplicar.
2. **Guardar un respaldo exacto** de `raw_user_meta_data` de cualquier usuario al que se le va a quitar la clave `role`, en una tabla de auditoría chica, para que el rollback pueda restaurar el valor exacto (no solo "algo parecido").
3. `is_admin()` pasa a chequear **solo** `raw_app_meta_data`.
4. `is_admin_user()` e `is_admin_jobs()` dejan de tener lógica propia — pasan a ser un `SELECT public.is_admin()`. Mismo nombre, misma firma, ninguna política existente necesita tocarse.

---

## SQL exacto propuesto

**Archivo (a crear recién cuando confirmes):** `supabase/migrations/20260518000000_secure_admin_role_check.sql`

```sql
-- SECURITY HOTFIX — no mezclar con las migraciones multi-ciudad pausadas.
--
-- Problema: is_admin(), is_admin_user() e is_admin_jobs() (tres funciones
-- independientes, misma lógica) confían en raw_user_meta_data->>'role',
-- que es el campo "user_metadata" del SDK de Supabase — editable por
-- cualquier usuario autenticado con una llamada estándar del cliente
-- (supabase.auth.updateUser({ data: { role: 'admin' } })), sin privilegios
-- especiales. Cualquier usuario registrado puede auto-otorgarse admin hoy.
--
-- Fix: is_admin() pasa a confiar solo en raw_app_meta_data (no editable
-- por el cliente). is_admin_user() e is_admin_jobs() dejan de tener lógica
-- propia y delegan en is_admin() — misma firma, ninguna policy existente
-- se toca.

-- ============================================================
-- 0. AUDITORÍA PREVIA — correr esto POR SEPARADO antes de aplicar el resto
--    de este archivo, y revisar el resultado a mano.
-- ============================================================
-- SELECT id, email,
--        raw_user_meta_data->>'role' AS role_en_user_metadata,
--        raw_app_meta_data->>'role'  AS role_en_app_metadata,
--        created_at
-- FROM auth.users
-- WHERE raw_user_meta_data->>'role' = 'admin'
--    OR raw_app_meta_data->>'role' = 'admin';
--
-- Confirmar que la lista sea EXACTAMENTE quiénes deberían ser admin hoy.
-- Si aparece un email inesperado, es evidencia de que el hueco ya fue
-- explotado — investigar antes de seguir, y NO agregarlo a la lista de
-- abajo.

-- ============================================================
-- 1. TABLA DE AUDITORÍA (para poder revertir el paso 3 con precisión)
-- ============================================================
CREATE TABLE IF NOT EXISTS public._security_hotfix_20260518_audit (
    user_id UUID PRIMARY KEY,
    email TEXT,
    previous_raw_user_meta_data JSONB NOT NULL,
    recorded_at TIMESTAMPTZ DEFAULT now()
);

INSERT INTO public._security_hotfix_20260518_audit (user_id, email, previous_raw_user_meta_data)
SELECT id, email, raw_user_meta_data
FROM auth.users
WHERE raw_user_meta_data ? 'role'
ON CONFLICT (user_id) DO NOTHING;

-- ============================================================
-- 2. LISTA EXPLÍCITA DE ADMINS A MIGRAR — EDITAR ANTES DE APLICAR
-- ============================================================
DO $$
DECLARE
  v_admin_emails TEXT[] := ARRAY[
    'contacto@walinka.com'
    -- agregar acá cualquier otro admin real, confirmado contra el paso 0
  ];
  v_updated INTEGER;
BEGIN
  UPDATE auth.users
  SET raw_app_meta_data = COALESCE(raw_app_meta_data, '{}'::jsonb)
                           || jsonb_build_object('role', 'admin')
  WHERE email = ANY(v_admin_emails);

  GET DIAGNOSTICS v_updated = ROW_COUNT;
  IF v_updated = 0 THEN
    RAISE WARNING 'Ningún email de v_admin_emails existe en auth.users. Revisar la lista antes de continuar — sin esto, nadie queda con role=admin en app_metadata.';
  END IF;
END $$;

-- ============================================================
-- 3. LIMPIAR EL CAMPO INSEGURO
-- ============================================================
-- Saca solo la clave 'role' de raw_user_meta_data (resta quirúrgica de una
-- clave; no toca full_name, avatar_url ni ningún otro dato del usuario).
-- Afecta a CUALQUIER usuario que tenga la clave, no solo a los de la lista
-- de arriba — incluye a cualquiera que ya se la haya auto-asignado.
UPDATE auth.users
SET raw_user_meta_data = raw_user_meta_data - 'role'
WHERE raw_user_meta_data ? 'role';

-- ============================================================
-- 4. is_admin(): fuente única y segura de verdad
-- ============================================================
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT EXISTS (
    SELECT 1 FROM auth.users au
    WHERE au.id = auth.uid()
    AND au.raw_app_meta_data->>'role' = 'admin'
  )
$$;

-- ============================================================
-- 5. is_admin_user() e is_admin_jobs(): dejan de tener lógica propia.
--    Misma firma que hoy (sin argumentos, RETURNS BOOLEAN) — ninguna
--    política que las referencia por nombre necesita cambiar.
-- ============================================================
CREATE OR REPLACE FUNCTION public.is_admin_user()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT public.is_admin()
$$;

CREATE OR REPLACE FUNCTION public.is_admin_jobs()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT public.is_admin()
$$;
```

---

## Rollback

```sql
-- 1. Restaurar is_admin_user() e is_admin_jobs() a sus versiones
--    independientes originales (idénticas a la is_admin() original).
CREATE OR REPLACE FUNCTION public.is_admin_user()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT EXISTS (
    SELECT 1 FROM auth.users au
    WHERE au.id = auth.uid()
    AND (
      au.raw_user_meta_data->>'role' = 'admin'
      OR au.raw_app_meta_data->>'role' = 'admin'
    )
  )
$$;

CREATE OR REPLACE FUNCTION public.is_admin_jobs()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT EXISTS (
    SELECT 1 FROM auth.users au
    WHERE au.id = auth.uid()
    AND (
      au.raw_user_meta_data->>'role' = 'admin'
      OR au.raw_app_meta_data->>'role' = 'admin'
    )
  )
$$;

-- 2. Restaurar is_admin() a su versión original (insegura). Solo por
--    completitud del rollback — no usar salvo emergencia real, ya que
--    reabre la vulnerabilidad.
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT EXISTS (
    SELECT 1 FROM auth.users au
    WHERE au.id = auth.uid()
    AND (
      au.raw_user_meta_data->>'role' = 'admin'
      OR au.raw_app_meta_data->>'role' = 'admin'
    )
  )
$$;

-- 3. Restaurar exactamente el raw_user_meta_data previo de cada usuario
--    afectado por el paso 3 de la migración, usando la tabla de auditoría.
UPDATE auth.users au
SET raw_user_meta_data = a.previous_raw_user_meta_data
FROM public._security_hotfix_20260518_audit a
WHERE au.id = a.user_id;

-- 4. La tabla de auditoría se puede dejar (no molesta a nada) o borrar
--    después de confirmar que no hace falta revertir:
-- DROP TABLE IF EXISTS public._security_hotfix_20260518_audit;
```

**Nota honesta sobre los límites del rollback:** los pasos 1, 2 y 3 del rollback son perfectos — restauran exactamente el estado anterior, byte a byte, gracias a la tabla de auditoría. Lo único que el rollback **no** deshace, a propósito, es el `role: 'admin'` que el paso 2 de la migración escribió en `raw_app_meta_data` para los emails de `v_admin_emails` — no hace falta revertirlo, porque tener ese valor ahí nunca fue el problema (es la fuente correcta); dejarlo no reabre nada. Si algún día hace falta sacarlo, es un `UPDATE ... SET raw_app_meta_data = raw_app_meta_data - 'role'` manual, fuera de este rollback.

---

## Verificación

### a) El admin real sigue teniendo acceso

```sql
-- Confirma que quedó con el campo correcto
SELECT email, raw_app_meta_data->>'role' AS role_en_app_metadata
FROM auth.users
WHERE email = ANY(ARRAY['contacto@walinka.com']);
-- Esperado: role_en_app_metadata = 'admin'.
```

Esto confirma el dato, pero **no** prueba que `is_admin()` lo reconozca en una request real — `auth.uid()`/`auth.jwt()` son `NULL` cuando se corre como superusuario desde el SQL Editor, así que una función `SECURITY DEFINER` que depende de `auth.uid()` no se puede probar de verdad fuera de una sesión autenticada real. La prueba que sí prueba algo: **loguearse en la app con la cuenta admin y confirmar que el panel de administración sigue funcionando** (aprobar un negocio, editar una categoría, etc.) — antes de dar por cerrado el hotfix.

### b) Un usuario normal no puede autoasignarse admin desde `user_metadata`

Verificación estructural (confirma que el código ya no lee el campo inseguro):

```sql
SELECT proname, prosrc FROM pg_proc WHERE proname = 'is_admin';
-- Esperado: prosrc NO contiene la palabra 'raw_user_meta_data'.

SELECT proname, prosrc FROM pg_proc WHERE proname IN ('is_admin_user', 'is_admin_jobs');
-- Esperado: prosrc de ambas es exactamente "SELECT public.is_admin()"
-- (o equivalente), sin condición propia.
```

Verificación funcional (la que realmente prueba el exploit está cerrado):

1. Crear o usar una cuenta de prueba **no admin**, loguearse con ella en la app.
2. Desde la consola del navegador: `await supabase.auth.updateUser({ data: { role: 'admin' } })`. Esto **va a funcionar** — es una operación normal y permitida del SDK, nada la bloquea ni debería bloquearla.
3. Intentar una acción que hoy requiere `is_admin()` (por ejemplo, editar/borrar una categoría, o aprobar un negocio ajeno).
4. **Esperado: la acción falla** (error de RLS / 403), a pesar de que `user_metadata.role` quedó en `'admin'` en el paso 2 — porque `is_admin()` ya no lo lee. Ese es el resultado que demuestra que el hueco está cerrado.

### c) Ninguna policy queda dependiendo del campo inseguro

```sql
-- Confirma que no queda ninguna función is_admin* con lógica propia
-- distinta a is_admin() (deben ser 3 filas: is_admin, is_admin_user,
-- is_admin_jobs — las dos últimas con el mismo cuerpo, delegando).
SELECT proname, prosrc FROM pg_proc WHERE proname LIKE 'is_admin%';

-- Búsqueda global: confirma que raw_user_meta_data ya no aparece en
-- ninguna función de la base relacionada con roles/permisos.
SELECT proname FROM pg_proc
WHERE prosrc ILIKE '%raw_user_meta_data%role%'
   OR prosrc ILIKE '%role%raw_user_meta_data%';
-- Esperado: 0 filas.
```

Esto cubre las funciones. Las **policies** en sí (`CREATE POLICY ...`) nunca leyeron el campo directamente en este esquema — todas pasan por una de las tres funciones (confirmado por el grep hecho antes de escribir este hotfix, sobre las ~7 migraciones que definen políticas de admin). Con las tres funciones unificadas, no queda ningún camino alternativo.

---

## Qué decisiones tomé y por qué (para que las confirmes)

1. **Lista explícita de emails en vez de "migrar automáticamente a quien ya cumple la condición insegura"**: es deliberadamente más conservador que el enfoque que había usado en la A2 pausada — ahí la circularidad no importaba tanto (era solo un seed adicional de un modelo nuevo), acá sí importa porque estamos decidiendo quién queda con acceso seguro permanente.
2. **Unificar via delegación, no borrar `is_admin_user()`/`is_admin_jobs()`**: renombrarlas o eliminarlas obligaría a tocar ~15 políticas existentes en 4 tablas distintas — fuera del espíritu de "hotfix mínimo". Delegar logra el mismo resultado (una sola fuente de lógica real) sin tocar una sola política.
3. **Tabla de auditoría temporal**: agrega una tabla nueva (`_security_hotfix_20260518_audit`) que no existía en el plan original — la incluyo porque sin ella el rollback del paso de limpieza no sería exacto, y me pediste explícitamente que el rollback siguiera siendo válido.
4. **No toco `src/pages/business-profile-page/components/ChurchDetails.jsx:43`**, que en el frontend replica `user_metadata?.role === 'admin' || app_metadata?.role === 'admin'` para un flag puramente visual. No es un hueco de seguridad (ninguna escritura real depende de eso, solo qué botones se muestran), pero después de este hotfix un usuario que se auto-asigne el rol en `user_metadata` va a seguir viendo ese botón aunque cualquier click real le sea rechazado por RLS. Lo dejo anotado como *follow-up* de UI, no como parte de este hotfix de base de datos.

No creé el archivo en `supabase/migrations/` ni ejecuté nada. Decime si el diseño te convence (sobre todo los puntos 1-4 de arriba) o si hay que ajustar algo antes de crear el archivo real.
