# Decisión arquitectónica: tablas `wa_*` (legado Walinka)

## Contexto

El proyecto vive sobre un proyecto Supabase que originalmente sirvió a
Walinka. Producto de ese origen, existen en la base tablas con prefijo
`wa_` (p. ej. `wa_businesses`, `wa_products`) que hoy siguen en uso — ya
no exclusivamente por Walinka, sino también por el motor de ciudad que
se está construyendo en este repo.

Nota de alcance: a día de hoy, ninguna migración ni archivo de este
repositorio (`supabase/migrations/`, `src/`) referencia directamente una
tabla `wa_*`. Es decir, el uso compartido ocurre a nivel de base de
datos/backend fuera de este codebase, no en el código que estamos
transformando. Esta decisión es de gobierno de nombres hacia adelante,
no un cambio de algo que el código actual toque.

## Decisión

- **No se renombran las tablas `wa_*` en esta fase.** Renombrar implica
  riesgo alto y no acotado: funciones `SECURITY DEFINER`, triggers,
  políticas RLS, código de frontend/servicios y migraciones antiguas que
  puedan referenciarlas por nombre literal — superficie que no está bajo
  auditoría completa ahora mismo. No es compatible con el objetivo actual
  de "cero cambio funcional visible" de la Fase A-E del motor
  multi-ciudad.
- **Las tablas `wa_*` se mantienen como están, por compatibilidad.**
- **No se crean tablas nuevas del motor de ciudad con prefijo `wa_`.**
  Aunque hoy compartan base de datos con Walinka, conceptualmente son
  entidades del motor de ciudad, no de Walinka.
- **Las nuevas entidades del motor de ciudad usan prefijo `community_`
  (p. ej. `community_cities`, `community_city_roles`) o nombres
  neutrales** (p. ej. `categories`, `businesses` — ya existentes, no
  Walinka-specific pese a no llevar prefijo).
- Esto queda registrado como **deuda técnica controlada**, no como un
  problema a resolver de inmediato.

## Futuro (no ahora)

Una fase de limpieza posterior — separada de la construcción del motor
multi-ciudad, y solo después de que esa auditoría completa de
dependencias (funciones, triggers, RLS, frontend, servicios, migraciones)
se pueda hacer con tiempo y sin presión de producción — podrá evaluar
renombrar, por ejemplo:

- `wa_businesses` → `businesses`
- `wa_products` → `products`

Eso queda fuera de alcance de la Fase A-E actual y no se implementa en
ningún commit de este trabajo.
