# Diagnóstico: regresión "Profesiones" desaparecida + aviso mezclado en Clasificados

**Estado: diagnóstico. Ningún código se modifica en este documento.**

## Respuesta directa a cada pregunta planteada

### 1. ¿Por qué desapareció la sección de Profesiones?

**No encontré evidencia de que haya existido nunca como sección propia
en este repositorio.** Busqué en todo el historial de git (`git log -p
--all`) y en el código actual las palabras `oficio`, `profesion`,
`professional` — cero resultados, en ningún commit, desde el primer
commit del repo (`f6b6696 primer commit portal koronel`) hasta hoy.

Lo que sí encontré, y es el candidato más fuerte a lo que se recuerda
como "Profesiones":

**Archivo:** `src/pages/homepage/components/PopularCategories.jsx`

Es un componente completo ("Categorías Populares"), con pills de
categorías que incluyen específicamente oficios/profesiones:
`Abogados`, `Electricistas`, junto con `Restaurantes`, `Mecánica`,
`Veterinarias`, `Farmacias`, etc. — 12 categorías en total, enlazando a
`/directorio-negocios?category=...`.

**Este componente nunca fue importado ni renderizado en
`homepage/index.jsx`, en ningún commit del historial** — lo confirmé
mirando tanto el `homepage/index.jsx` actual como el del primer commit
del repo: la lista de imports es idéntica en ambos (`HeroSection`,
`RecentContentSection`, `FeaturedBusinesses`, `RecentClassifiedAds`,
`UpcomingEvents`, `PostAdCTA`, `FooterSection`, `WelcomePopup`,
`LatestJobs`) y `PopularCategories` nunca apareció ahí. No es una
regresión reciente ni algo que mi trabajo haya tocado — es un archivo
huérfano desde el commit inicial, probablemente generado por el
scaffold original y nunca conectado a la página.

**No puedo confirmar con certeza al 100%** que esto sea exactamente lo
que recuerdas como "Profesiones" (no tengo una captura de cómo se veía
antes) — lo marco como la hipótesis más respaldada por evidencia, no
como un hecho cerrado. Si tienes una captura o más detalle de cómo se
veía esa sección, ayuda a confirmar o descartar esto.

### 2. ¿El renombre de `/oficios` a `/clasificados` mezcló dos dominios?

**No encontré ningún rastro de una ruta `/oficios` en este repositorio,
en ningún momento de su historia.** `git log -p --all -- src/Routes.jsx`
no tiene ninguna coincidencia con "oficio". Tampoco existe ni existió
ningún archivo o carpeta con ese nombre (`git log --all --name-only` sin
coincidencias).

La ruta de listado de avisos siempre se llamó `/classified-ads-listing`
(con alias en español para el detalle: `/clasificados/:id`), desde el
primer commit. No hay evidencia de un rename — si ese rename ocurrió, no
fue en este repositorio/rama. Lo dejo así de explícito para no inventar
una causa que no puedo verificar.

Lo que sí es un hallazgo real y verificable (siguiente punto) es que
**los "dominios" de categorías (negocio vs. clasificado) sí están
mezclados hoy — pero no por un rename de ruta, sino por un problema de
datos/consulta.**

### 3. ¿Los registros de profesionales/oficios quedaron usando `classified_ad` o una categoría incorrecta?

Sí, y encontré la causa exacta con tres piezas que encajan entre sí:

**Pieza A — origen histórico duplicado.** Existen (y existieron siempre,
desde marzo) dos generaciones de categorías en la misma tabla
`categories`, sin ninguna distinción de tipo hasta hace muy poco:

- `supabase/migrations/20260304200000_seed_ad_categories.sql` (4 de
  marzo): sembró 10 categorías **pensadas para avisos clasificados**
  (`vehiculos`, `inmuebles`, `electronica`, `ropa-accesorios`,
  `empleos`, `servicios`, `muebles-hogar`, `deportes-recreacion`,
  `mascotas`, `otros`) — solo si la tabla estaba vacía en ese momento
  (corrió, porque en ese punto del historial la tabla sí estaba vacía).
- `supabase/migrations/20260310000000_business_category_hierarchy.sql`
  (10 de marzo): sembró ~40 categorías jerárquicas **pensadas para
  negocios** (Restaurantes, Ferreterías, Servicios Profesionales,
  Abogados, Electricistas, etc.), en la misma tabla, sin ninguna
  distinción de tipo.

Resultado: desde marzo, `categories` tiene ~50 filas mezclando ambos
dominios, sin ninguna columna que diga cuál es cuál.

**Pieza B — mi propia migración de category_type mal etiquetó las
categorías originales de avisos.** En
`supabase/migrations/20260621000004_add_category_type_and_city.sql`
(la que yo escribí en la fase multi-ciudad):

```sql
ALTER TABLE public.categories
  ADD COLUMN IF NOT EXISTS category_type TEXT NOT NULL DEFAULT 'business'
    CHECK (category_type IN ('business', 'classified_ad', 'event')),
```

`ADD COLUMN ... DEFAULT 'business'` aplica ese default a **todas las
filas existentes**, incluidas las 10 originales de avisos de la Pieza A.
El comentario que dejé en esa misma migración decía: *"Las ~40 filas
existentes quedan category_type='business' (correcto, son todas de
negocio)"* — **esa premisa era incorrecta**: eran ~50 filas, no ~40, y
10 de ellas (`vehiculos`, `inmuebles`, `servicios`, `otros`, etc.) eran
en realidad de avisos, no de negocios. Quedaron mal etiquetadas.

**Pieza C — mi propia migración de seed duplicó las categorías en vez de
corregirlas.**
`supabase/migrations/20260621000005_seed_classified_ad_categories.sql`
insertó un **segundo set paralelo** de 10 categorías de avisos, con
`name_key` distintos a propósito (`clasificados-empleos`,
`clasificados-servicios`, `clasificados-otros`, etc.) — mi propio
comentario en esa migración explica por qué: *"para evitar choques con
la UNIQUE (name_key) existente"*. Es decir, en vez de corregir las 10
originales mal etiquetadas, agregué 10 nuevas — dejando en la tabla
**dos categorías "Servicios", dos "Otros", dos "Vehículos"**, etc., una
mal etiquetada como `business` (la de marzo) y otra correctamente
`classified_ad` (la mía, de junio).

**Conclusión de esta pregunta:** el registro de "profesión" no
necesariamente usó una categoría incorrecta por error del usuario —
había (y hay) categorías duplicadas y mal etiquetadas conviviendo en la
misma tabla, y ningún filtro se lo impidió (ver punto 4). No puedo saber
con certeza, sin consultar la fila real del aviso "actor", qué
`category_id`/`category_key` quedó guardado — pero la superficie para
que quedara "raro" es real y verificable en el esquema.

### 4. ¿El filtro de la home trae todo junto sin distinguir tipos?

Sí, en dos lugares distintos, con causas distintas:

**4a. El formulario "Nuevo aviso" ofrece categorías de negocio y de
avisos mezcladas, sin filtro de tipo.**

**Archivo:** `src/services/adService.js`, método `getAdCategories()`
(líneas 13–22):

```js
async getAdCategories() {
  const { data, error } = await supabase
    ?.from('categories')
    ?.select('id, name, name_key')
    ?.order('name', { ascending: true });
  ...
}
```

**No filtra por `category_type` en absoluto.** Devuelve las ~40
categorías de negocio, las 10 originales mal etiquetadas y las 10 nuevas
de avisos — todas juntas, en un solo `<select>` plano.

**Cadena completa:** `src/pages/post-classified-ad/index.jsx:85`
(`adService.getAdCategories()`) → pasa el resultado sin filtrar como
prop `categories` a `src/pages/post-classified-ad/components/AdForm.jsx`
→ línea 67, `categories?.map(c => ...)`, renderiza todo tal cual, sin
agrupar ni filtrar por tipo. Un usuario publicando un aviso puede elegir
literalmente cualquier categoría de negocio (o cualquiera de las dos
versiones duplicadas de "Servicios"), sin ninguna barrera.

**4b. La sección "Reciente" del home mezcla negocios y avisos por
diseño — esto no es nuevo, siempre fue así.**

**Archivo:** `src/pages/homepage/components/RecentContentSection.jsx`,
hook `useRecentContent()` (líneas 18–86).

```js
const [businessRes, adsRes] = await Promise.all([
  businessService?.getAll({ sort: 'newest', page: 1, pageSize: LIMIT }),
  adService?.getRecent(LIMIT),
]);
...
const merged = [...businessList, ...adList]
  .filter((x) => x?.created_at)
  .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
  .slice(0, LIMIT * 2);
```

Trae negocios y avisos de dos fuentes distintas, los junta y ordena
solo por fecha — sin ningún tercer tipo "profesión/oficio", porque ese
tipo nunca existió como entidad separada en el código (confirmado en
puntos 1 y 2). **Verifiqué que esta lógica de merge es idéntica desde el
primer commit del repo** (`git show f6b6696:...` vs. el archivo actual)
— lo único que cambié yo en la Fase C fue `sector: 'Coronel'` fijo →
`sector: CITY_CONFIG.name` dinámico. El merge negocios+avisos no es una
regresión de mi trabajo reciente; es el comportamiento original,
documentado en el propio subtítulo de la sección: *"Negocios y avisos
recién agregados"*.

Cada tarjeta sí distingue tipo visualmente hoy: pill de categoría +
CTA distinto (`"Ver negocio"` vs. `"Ver aviso"`) — pero no hay ninguna
etiqueta de "esto es un negocio" / "esto es un aviso" explícita más allá
de eso, y cero mención a "profesión".

### 5. ¿"Reciente" debería separar visualmente o restaurar una sección propia para Profesionales?

Esto es una decisión de producto, no algo que pueda "diagnosticar" como
bug — lo dejo como pregunta abierta para la etapa de diseño de la
solución, no la respondo yo unilateralmente acá.

## Resumen para decidir la estrategia

| # | Pregunta | Hallazgo | Evidencia |
|---|---|---|---|
| 1 | Sección "Profesiones" desaparecida | No hay evidencia de que existiera como sección propia; candidato más fuerte: `PopularCategories.jsx`, huérfano desde el primer commit, nunca importado en `homepage/index.jsx` | `git log` completo de ambos archivos |
| 2 | Rename `/oficios` → `/clasificados` | Sin evidencia en este repo, en ningún momento de su historia | `git log -p --all` sin coincidencias |
| 3 | Categorías mal etiquetadas | Confirmado: `category_type` se agregó con `DEFAULT 'business'` sobre filas preexistentes que en realidad eran de avisos (marzo), y luego se sembró un set duplicado en vez de corregir las originales | `20260621000004` y `20260621000005`, comparado con `20260304200000` |
| 4a | Form "Nuevo aviso" sin filtro de tipo | Confirmado: `adService.getAdCategories()` no filtra `category_type` | `src/services/adService.js:13-22` |
| 4b | "Reciente" mezcla negocios+avisos | Confirmado, pero **no es regresión** — comportamiento original desde el primer commit | Diff `f6b6696` vs. actual |
| 5 | ¿Separar visualmente o sección propia? | Decisión de producto, pendiente | — |

## Causa raíz más probable, en una frase

**El síntoma visible (aviso "actor" categorizado de forma confusa) es
consecuencia directa de mi propia migración de Fase A/B**
(`20260621000004`), que etiquetó mal categorías preexistentes de avisos
como si fueran de negocio, seguida de una migración de seed
(`20260621000005`) que dupli en vez de corregir — combinado con un bug
preexistente independiente de mi trabajo (`adService.getAdCategories()`
nunca filtró por tipo, desde siempre). La sección "Profesiones" que se
recuerda probablemente nunca estuvo activa en este código; lo más
parecido que existe es un componente huérfano nunca conectado.

## No implementado — pendiente de tu decisión

No propongo todavía una solución de código. Antes de eso, necesito que
confirmes/decidas:

1. **Sobre las categorías duplicadas/mal etiquetadas:** ¿corrijo el
   `category_type` de las 10 filas originales de marzo (las que
   corresponden 1:1 con las 10 nuevas de junio) y elimino/fusiono el
   duplicado, o prefieres revisar primero cuántos negocios/avisos reales
   están usando cada una antes de tocar nada?
2. **Sobre `adService.getAdCategories()`:** ¿agrego el filtro
   `category_type = 'classified_ad'` (cambio quirúrgico, una línea) para
   que el formulario de avisos deje de mostrar categorías de negocio?
3. **Sobre `PopularCategories.jsx`:** ¿quieres que lo conecte al home tal
   cual está, lo rediseñe, o lo dejamos huérfano y creamos algo nuevo
   específico para "Profesiones/Oficios" si es que eso es lo que
   realmente se busca?
4. **Sobre "Reciente":** ¿separar visualmente, mantener como está, o
   esperar a resolver 1–3 primero y ver si el problema percibido
   desaparece solo?
