# Despliegue en Vercel (staging / prueba móvil)

Este proyecto está listo para desplegarse en **Vercel** como entorno de prueba (por ejemplo en **beta.midominio.cl**), sin integración de pagos ni login social.

## Requisitos

- Cuenta en [Vercel](https://vercel.com)
- Proyecto de Supabase (URL y anon key)
- Repositorio Git (GitHub, GitLab o Bitbucket) opcional; también se puede desplegar con `vercel` CLI

## 1. Variables de entorno

En **Vercel** → tu proyecto → **Settings** → **Environment Variables**, define al menos:

| Variable | Descripción | Entorno |
|----------|-------------|---------|
| `VITE_SUPABASE_URL` | URL del proyecto Supabase (ej. `https://xxx.supabase.co`) | Production, Preview |
| `VITE_SUPABASE_ANON_KEY` | Clave anónima (pública) de Supabase | Production, Preview |

Solo con estas dos el build y la app funcionan. El resto (analytics, APIs, pagos) se puede añadir después.

Para probar en local con las mismas variables, copia `.env.example` a `.env` y rellena los valores. **No subas `.env`** (está en `.gitignore`).

## 2. Conectar el repositorio a Vercel

1. Entra en [vercel.com](https://vercel.com) e **Import** tu repositorio.
2. **Framework Preset**: Vite (Vercel lo detecta si existe `vite.config.*`).
3. **Build Command**: `npm run build` (por defecto).
4. **Output Directory**: `build` (el proyecto usa `build`, no `dist`).
5. **Install Command**: `npm install`.
6. Añade las variables de entorno anteriores y haz **Deploy**.

Si usas el archivo `vercel.json` del repo, Vercel ya tiene `outputDirectory: "build"` y `framework: "vite"`, así que no hace falta cambiar nada en la pantalla salvo las env vars.

## 3. Dominio de staging (beta.midominio.cl)

1. En Vercel: **Project** → **Settings** → **Domains**.
2. Añade el dominio: `beta.midominio.cl`.
3. En tu registrador de dominios (donde gestionas midominio.cl):
   - Crea un registro **CNAME** para `beta` apuntando a:
     - `cname.vercel-dns.com`  
     o el valor que Vercel te indique (ej. `xxx.vercel.app`).
4. Espera a que el DNS propague (minutos u horas). Vercel mostrará el estado del dominio.

Si prefieres usar solo la URL que Vercel asigna (`tu-proyecto.vercel.app`), no hace falta configurar dominio.

## 4. Comprobar el build en local

```bash
npm install
npm run build
```

La salida queda en la carpeta `build/`. Para probar en local el resultado de producción:

```bash
npm run serve
```

## 5. Rutas (SPA)

El `vercel.json` incluye **rewrites** para que todas las rutas sirvan `index.html` y React Router funcione bien. Así, al recargar o entrar directo a una URL (por ejemplo `beta.midominio.cl/directorio-negocios`), no aparecerá 404.

## Resumen

- **Build**: `npm run build` → salida en `build/`
- **Variables obligatorias**: `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`
- **Dominio staging**: añadir en Vercel → Domains y configurar CNAME en tu DNS
- Sin pagos ni login social en este flujo; despliegue listo para pruebas en móvil.
