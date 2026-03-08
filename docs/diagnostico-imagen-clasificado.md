# Diagnóstico: imagen no queda asociada al clasificado

## Flujo completo (paso a paso)

1. **Usuario sube foto** en post-classified-ad → `photos` tiene `{ file }`.
2. **Al enviar el formulario** (`doSubmit`):
   - Se crea `photoPaths = []`.
   - Para cada `photo.file` se llama `adService.uploadPhoto(photo.file, user?.id)`.
3. **uploadPhoto** → llama `uploadFile(file, { entityType: 'ad_image', entityId: null })`.
4. **uploadFile**:
   - `getSignedUrl()` → OK, devuelve `uploadUrl`, `storageKey`, `publicUrl`.
   - `uploadToR2(file, uploadUrl, mimeType)` → PUT a R2 (aquí la imagen ya queda en el bucket).
   - `confirmUpload({ storageKey, mimeType, size, entityType, entityId })` → POST a `/api/upload/confirm`.
5. **Si confirm devuelve 200**: insert en `media_files` OK. `uploadFile` devuelve `{ path: storageKey, ... }`.  
   **Si confirm devuelve 400**: `confirmUpload` hace `throw new Error(err?.error)`. No se devuelve `path`.
6. **uploadPhoto**: si `uploadFile` lanzó → devuelve `{ path: null, publicUrl: null, error }`.  
   Si no lanzó → devuelve `{ path: storageKey, publicUrl: url, error: null }`.
7. **post-classified-ad**: `if (!uploadError && path) photoPaths.push(path)`.  
   Si hay error o `path` es null → **no se hace push**. `photoPaths` puede quedar vacío.
8. **create({ photoPaths, ... })**: insert en `classified_ads`, luego si `photoPaths?.length > 0` insert en `ad_images` con `storage_path: path` por cada path.  
   Si `photoPaths` está vacío → **no se inserta ninguna fila en `ad_images`**.
9. **Visualización**: `formatAd` usa `ad.ad_images` y `primaryImage.storage_path` para armar la URL. Si no hay filas en `ad_images`, no hay imagen.

---

## Respuestas a tus 7 puntos

### 1. ¿POST /api/upload/confirm inserta una fila en media_files?

- **Si la API responde 200**: sí, el insert en `media_files` se hizo correctamente.
- **Si responde 400**: no. El cuerpo de la respuesta incluye `error`, `code`, `details`, `hint` (error de Supabase) o `error: 'storageKey required'` y `receivedKeys` si faltaba el body/parseo.

**Cómo comprobarlo**: Revisar en Supabase la tabla `media_files` después de subir una imagen. Si no aparece una fila nueva con ese `storage_key`, confirm está fallando (400).

### 2. Si no inserta, ¿cuál es el error exacto?

Está en el **cuerpo de la respuesta 400** del POST a `/api/upload/confirm`:

- En la pestaña Red (Network) del navegador, inspeccionar la petición a `.../api/upload/confirm` y ver el **Response** (JSON). Ahí viene `error`, y si es fallo de Supabase también `code`, `details`, `hint`.

### 3. Si sí inserta, ¿por qué esa imagen no se agrega al clasificado?

Si confirm inserta en `media_files` y devuelve 200:

- `uploadFile` devuelve `path: storageKey`.
- `uploadPhoto` devuelve `path: storageKey`, `error: null`.
- En el formulario se hace `photoPaths.push(path)`, así que `photoPaths` tiene al menos un elemento.
- `create()` recibe `photoPaths` con ese path y debería insertar en `ad_images`.

En ese caso, el fallo sería en el **insert en `ad_images`** (p. ej. RLS o constraint). Desde el último cambio, si ese insert falla, `create()` lanza y el front muestra "Error al publicar el aviso" y el error queda en `createError`.

### 4. ¿photoPaths queda vacío?

Sí queda vacío cuando:

- **confirm devuelve 400** → `confirmUpload` lanza → `uploadPhoto` devuelve `{ path: null, error }` → no se hace `photoPaths.push(path)`.
- O si falla `getSignedUrl` o `uploadToR2` (en tu caso la subida a R2 va bien, así que el candidato es confirm).

Mientras confirm falle, **siempre** tendrás `photoPaths = []` al final del bucle de fotos.

### 5. ¿create() está recibiendo la imagen?

Sí, **si y solo si** `photoPaths` tiene elementos. Se llama:

```js
await adService.create({
  userId: user?.id || null,
  formData: enrichedFormData,
  photoPaths,   // mismo array que se fue llenando con push(path)
  guestInfo,
  ipAddress,
});
```

Si `photoPaths` está vacío porque confirm falló, `create()` recibe `photoPaths = []` y no inserta nada en `ad_images`.

### 6. ¿Se insertan filas en ad_images?

Solo si `photoPaths?.length > 0`. El código hace:

```js
if (photoPaths?.length > 0) {
  const imageInserts = photoPaths.map((path, index) => ({
    ad_id: ad?.id,
    storage_path: path,
    is_primary: index === 0,
    sort_order: index,
  }));
  const { error: imagesError } = await supabase.from('ad_images').insert(imageInserts).select();
  if (imagesError) throw imagesError;
}
```

- Si `photoPaths` está vacío → no se entra al `if` → **no se inserta nada en `ad_images`**.
- Si `photoPaths` tiene paths pero el insert en `ad_images` falla → ahora se lanza `imagesError` y el usuario ve error al publicar.

### 7. ¿En qué paso exacto se pierde la referencia?

**Punto exacto donde se pierde hoy:**

- **Confirm devuelve 400** (no se inserta en `media_files`).
- `confirmUpload()` hace **throw** con el mensaje del 400.
- `uploadPhoto()` captura y devuelve **path: null**.
- En el formulario **no se hace** `photoPaths.push(path)` porque `path` es null.
- `photoPaths` sigue vacío.
- `create(photoPaths)` se ejecuta con **photoPaths = []**.
- No se inserta ninguna fila en **ad_images**.
- El clasificado se crea pero **sin relación con la imagen**; la imagen está en R2 pero no hay fila en `ad_images` con ese `storage_path`.

Resumen: la referencia se pierde **entre el confirm (400) y el uso de `path` en el front**: al fallar confirm, `path` nunca se asigna y nunca se agrega a `photoPaths`, por eso el clasificado queda sin imagen.

---

## Qué hacer para confirmar en tu entorno

1. **Reproducir** subiendo una foto y publicando un clasificado.
2. **Red (Network)**:
   - Buscar la petición **POST** a `/api/upload/confirm`.
   - Si el status es **400**: abrir la respuesta y anotar `error`, `code`, `details`, `hint`. Ese es el motivo por el que no se inserta en `media_files`.
   - Si el status es **200**: entonces el fallo sería en el insert de `ad_images` (verías "Error al publicar el aviso" y el error en consola/createError).
3. **Supabase**:
   - Tabla `media_files`: ver si aparece una fila nueva con el `storage_key` de la foto (solo si confirm fue 200).
   - Tabla `ad_images`: ver si hay filas con el `ad_id` del clasificado recién creado (solo si `photoPaths` tenía al menos un path y el insert no falló).

Con eso se sabe con exactitud si el fallo es solo confirm (media_files) o también el insert en ad_images.
