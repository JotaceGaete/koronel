# Diagnostico vinculo real Walinka/Koronel

## Resumen

Koronel y Walinka/Ventalink comparten el mismo proyecto Supabase, pero el repo actual es el frontend/backend de Koronel. En este codebase no aparecen rutas, servicios, migraciones ni contextos propios del onboarding Walinka (`getMyBusiness`, `complete-business-setup`, triggers `wa_*`, etc.).

La auditoria confirma que Koronel ya tiene un flujo de propiedad/reclamo funcional sobre `public.businesses`. Para un vinculo real con Walinka conviene agregar una relacion explicita entre `businesses` y `wa_businesses`, preferentemente con tabla puente, y mantener el CTA actual solo como entrypoint hasta que esa relacion exista.

No se aplicaron migraciones ni cambios de runtime.

## Archivos leidos

- `src/contexts/AuthContext.jsx`
- `src/Routes.jsx`
- `src/services/businessService.js`
- `src/services/adminService.js`
- `src/pages/business-profile-page/components/ClaimBusiness.jsx`
- `src/pages/user-account-dashboard/components/MyBusinessesTab.jsx`
- `src/pages/business-owner-dashboard/index.jsx`
- `src/pages/business-owner-dashboard/components/OwnerBusinessCard.jsx`
- `src/pages/user-business-dashboard/components/EditBusinessModal.jsx`
- `src/pages/publish-business-form/index.jsx`
- `src/pages/admin-dashboard/components/AdminBusinessForm.jsx`
- `supabase/migrations/20260304161514_coronellocal_schema.sql`
- `supabase/migrations/20260304163200_admin_tables.sql`
- `supabase/migrations/20260306000000_business_status.sql`
- `supabase/migrations/20260306_business_status.sql`
- `supabase/migrations/20260320000000_business_claimed_column.sql`
- `supabase/migrations/20260322000000_ensure_businesses_claimed.sql`
- `docs/decision-prefijo-wa.md`
- `docs/diagnostico-integracion-walinka-koronel.md`

Tambien se hizo introspeccion segura con la anon key:

- El endpoint OpenAPI de PostgREST devolvio `401` porque requiere `service_role`.
- Se consultaron tablas esperadas con `HEAD`/`count`, sin leer filas.
- Se probaron columnas candidatas con `HEAD`, sin leer datos.

## Estado Walinka/Ventalink encontrado

En el repo Koronel no hay implementacion del flujo Walinka:

- No hay rutas `complete-business-setup`, onboarding Walinka ni pantallas de catalogo.
- No hay servicio `getMyBusiness` para `wa_businesses`.
- No hay migraciones locales que creen `wa_businesses`, `wa_products`, `wa_orders`, `wa_customers` o `billing_subscriptions`.
- No hay SQL local de triggers sobre `wa_businesses`.
- No hay policies RLS locales de tablas `wa_*`.

La base compartida si expone tablas Walinka al cliente actual para conteo:

- `wa_businesses`: existe.
- `wa_products`: existe.
- `billing_subscriptions`: existe.
- `wa_orders`: existe.
- `wa_customers`: existe.

Columnas confirmadas por consultas `HEAD` sin leer filas:

- `wa_businesses`: `id`, `user_id`, `name`, `slug`, `whatsapp`, `address`, `logo_url`, `created_at`, `updated_at`, `is_active`.
- `wa_products`: `id`, `business_id`, `name`, `description`, `price`, `image_url`, `is_active`, `created_at`, `updated_at`.
- `billing_subscriptions`: `id`, `business_id`, `status`, `trial_ends_at`, `created_at`, `updated_at`.
- `wa_orders`: `id`, `business_id`, `customer_id`, `created_at`, `updated_at`.
- `wa_customers`: `id`, `business_id`, `name`, `phone`, `whatsapp`, `created_at`, `updated_at`.

Pendiente para cerrar la auditoria Walinka:

- Revisar el repo/app Walinka donde viva `AuthContext`, `getMyBusiness`, onboarding y `complete-business-setup`.
- Revisar triggers y RLS reales con acceso `service_role` o dump de schema.
- Confirmar si `wa_businesses.user_id` referencia `auth.users(id)` y si `wa_products.business_id` referencia `wa_businesses(id)`.

## Flujo Koronel de propiedad/reclamo

### Modelo

Koronel usa `public.businesses` como entidad local:

- `businesses.owner_id`: propietario en `auth.users`/`user_profiles`.
- `businesses.claimed`: verdadero cuando el negocio fue creado por un usuario o asignado tras reclamo.
- `business_claims`: solicitudes de reclamo con `business_id`, `user_id`, datos del solicitante y `claim_status`.

### Alta de negocio

`src/pages/publish-business-form/index.jsx` crea negocios autenticados con:

- `owner_id: user.id`
- `claimed: true`
- `status: pending` o `premium`

Luego `businessService.create` sanitiza el payload y escribe en `businesses`.

### Reclamo

`ClaimBusiness.jsx` muestra el formulario si el negocio no esta reclamado. Si el usuario no esta autenticado, lo manda a login. Al enviar, llama:

- `businessService.submitClaim({ businessId, userId, name, email, phone, role })`

Ese servicio inserta en `business_claims`.

### Aprobacion admin

`adminClaimService.updateStatus(id, status)`:

1. Lee `business_claims.id`, `business_id`, `user_id`.
2. Actualiza `claim_status`.
3. Si `status === 'approved'`, actualiza `businesses`:
   - `owner_id = claim.user_id`
   - `claimed = true`

### Dashboards de propietario

Hay dos superficies:

- `MyBusinessesTab`: carga `businessService.getByOwner(userId)` y `businessService.getMyClaimRequests(userId)`.
- `BusinessOwnerDashboard`: carga `businessService.getByOwner(user.id)`, permite editar negocio y revisar resenas/estadisticas/mensajes.

### RLS Koronel

Las policies relevantes:

- Lectura publica de negocios publicados/premium.
- Owners pueden leer/actualizar negocios donde `owner_id = auth.uid()`.
- Inserts autenticados requieren `owner_id = auth.uid()`.
- `business_images` se administran verificando ownership del negocio.
- `business_claims` permite insertar a usuarios autenticados con `user_id = auth.uid()` y leer reclamos propios.
- Admins tienen policies de gestion sobre negocios y reclamos.

## Comparacion de modelos de vinculo

### Opcion A: tabla puente recomendada

Ventajas:

- No acopla directamente el dominio Koronel al dominio Walinka.
- Permite multiples estados: `pending`, `connected`, `revoked`, `duplicate_review`.
- Permite auditar origen (`source`) y fecha.
- Soporta casos futuros de multiples sucursales/catalogos sin forzar cardinalidad prematura.
- Permite policies RLS especificas sin abrir `businesses` ni `wa_businesses`.

Desventajas:

- Requiere una query adicional o vista para resolver el vinculo.
- Requiere UI/servicio para crear y aprobar el link.

### Opcion B: `businesses.walinka_business_id`

Ventajas:

- Simple de consultar desde Koronel.
- Buena si la relacion es estrictamente 1:1 y Koronel siempre inicia el vinculo.

Desventajas:

- Acopla `businesses` a una tabla legacy `wa_*`.
- Dificulta estados intermedios y auditoria.
- Complica duplicados o negocios Walinka existentes que quieran vincularse a mas de una ficha local/sucursal.

### Opcion C: `wa_businesses.koronel_business_id`

Ventajas:

- Buena si Walinka debe saber explicitamente que un negocio nacio desde Koronel.
- Facilita queries desde Walinka hacia el origen local.

Desventajas:

- Modifica el dominio Walinka.
- Puede requerir cambios en RLS/triggers/servicios Walinka que no estan en este repo.
- No resuelve bien auditoria, estados ni solicitudes pendientes por si sola.

## Propuesta SQL no aplicada

```sql
CREATE TABLE public.business_walinka_links (
  koronel_business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  walinka_business_id UUID NOT NULL REFERENCES public.wa_businesses(id) ON DELETE CASCADE,
  connected_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  connection_status TEXT NOT NULL DEFAULT 'connected'
    CHECK (connection_status IN ('pending', 'connected', 'revoked', 'duplicate_review')),
  source TEXT NOT NULL DEFAULT 'koronel'
    CHECK (source IN ('koronel', 'walinka', 'admin')),
  connected_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  notes TEXT,
  PRIMARY KEY (koronel_business_id, walinka_business_id)
);

CREATE UNIQUE INDEX business_walinka_links_one_active_koronel
ON public.business_walinka_links (koronel_business_id)
WHERE connection_status IN ('pending', 'connected');

CREATE UNIQUE INDEX business_walinka_links_one_active_walinka
ON public.business_walinka_links (walinka_business_id)
WHERE connection_status IN ('pending', 'connected');
```

RLS sugerida, a revisar con schema real de Walinka:

```sql
ALTER TABLE public.business_walinka_links ENABLE ROW LEVEL SECURITY;

CREATE POLICY "owners_read_own_business_walinka_links"
ON public.business_walinka_links
FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.businesses b
    WHERE b.id = koronel_business_id
      AND b.owner_id = auth.uid()
  )
  OR EXISTS (
    SELECT 1
    FROM public.wa_businesses wb
    WHERE wb.id = walinka_business_id
      AND wb.user_id = auth.uid()
  )
);

CREATE POLICY "koronel_owner_request_business_walinka_link"
ON public.business_walinka_links
FOR INSERT TO authenticated
WITH CHECK (
  connection_status = 'pending'
  AND source = 'koronel'
  AND connected_by = auth.uid()
  AND EXISTS (
    SELECT 1
    FROM public.businesses b
    WHERE b.id = koronel_business_id
      AND b.owner_id = auth.uid()
      AND b.claimed = true
  )
);

CREATE POLICY "admin_manage_business_walinka_links"
ON public.business_walinka_links
FOR ALL TO authenticated
USING (public.is_admin_user())
WITH CHECK (public.is_admin_user());
```

Para pasar de `pending` a `connected` conviene usar RPC `SECURITY DEFINER` o accion admin/servicio, porque debe validar simultaneamente ownership en Koronel y ownership/permiso en Walinka.

## Riesgos identificados

### RLS

El vinculo cruza dos dominios con policies distintas. Si se permite insertar links directamente desde cliente, se puede intentar vincular un `wa_businesses` ajeno. La solucion debe validar ownership de ambos lados o usar RPC server-side.

### Usuarios distintos

Un negocio puede estar reclamado en Koronel por `user A`, pero el catalogo Walinka puede pertenecer a `user B`. Debe haber flujo de verificacion o aprobacion para evitar secuestro de catalogos.

### Koronel reclamado sin cuenta Walinka

Caso esperado. El CTA debe llevar a alta Walinka con datos precargados, pero el link real debe crearse solo despues de que exista `wa_businesses` y se confirme ownership.

### Cuenta Walinka existente con otro negocio

Un usuario puede tener una cuenta Walinka con un catalogo distinto o multiples catalogos. La UI debe permitir elegir catalogo existente y no crear duplicados automaticamente.

### Duplicados

Puede existir una ficha Koronel duplicada o varios `wa_businesses` con nombres parecidos. La tabla puente permite estado `duplicate_review` antes de conectar.

### Billing/trial

No se debe tocar `billing_subscriptions` al vincular. La conexion Koronel -> Walinka no debe activar planes, trials ni cambios de suscripcion sin flujo explicito.

### Sincronizacion de datos

Datos candidatos a precargar al crear alta:

- `name`
- `whatsapp`
- `address`
- `category`
- `logo_url`

Datos que no deben sincronizarse automaticamente en Fase 1:

- Productos (`wa_products`).
- Precios/ofertas.
- Pedidos/clientes (`wa_orders`, `wa_customers`).
- Billing/subscripciones.
- Reviews, metricas, premium de Koronel.
- Cambios posteriores bidireccionales de nombre, WhatsApp, direccion o logo.

## Flujo recomendado Fase 1

1. Solo negocios Koronel reclamados/publicados por el usuario pueden iniciar conexion:
   - `businesses.owner_id = auth.uid()`
   - `businesses.claimed = true`

2. En dashboard de propietario Koronel, mostrar modulo "Catalogo Walinka":
   - Si no hay link: "Conectar o crear catalogo".
   - Si hay `pending`: mostrar estado en revision/continuar.
   - Si hay `connected`: mostrar "Ver catalogo" y estado de conexion.

3. Si el usuario ya tiene Walinka:
   - Listar `wa_businesses` donde `user_id = auth.uid()` via servicio/RPC.
   - Permitir elegir uno.
   - Crear link `pending` o `connected` segun politica elegida.

4. Si el usuario no tiene Walinka:
   - Enviar a alta Walinka con query params seguros ya existentes:
     - `source=koronel`
     - `koronel_business_id`
     - `name`
     - `whatsapp`
     - `address`
     - `city`
     - `category`
   - Walinka crea/continua `wa_businesses`.
   - Al finalizar onboarding, Walinka llama RPC/endpoint para crear el link.

5. No hacer todavia:
   - Sincronizacion bidireccional.
   - Modificacion de productos.
   - Cambios de billing/trial.
   - Migracion masiva de URLs existentes.

## Plan por fases

### Fase 1: vinculo manual seguro

- Crear tabla puente y RLS/RPC revisadas.
- Agregar modulo en dashboard de propietario Koronel.
- Permitir conectar solo negocios reclamados.
- Permitir elegir catalogo Walinka propio o continuar alta.

### Fase 2: enlace desde onboarding Walinka

- Modificar app Walinka para reconocer `source=koronel` y `koronel_business_id`.
- Al crear `wa_businesses`, proponer link.
- Confirmar ownership por usuario autenticado.

### Fase 3: sincronizacion unidireccional opt-in

- Permitir copiar datos Koronel -> Walinka al conectar.
- Mantener cambios posteriores manuales.
- Guardar auditoria de campos copiados.

### Fase 4: admin y deduplicacion

- Panel admin para revisar `pending` y `duplicate_review`.
- Herramienta para resolver duplicados.
- Reporte de negocios Koronel reclamados sin catalogo y catalogos Walinka sin ficha local.

## Verificacion

No se cambio codigo runtime ni UI. No se ejecutaron tests porque el cambio es documentacion pura.
