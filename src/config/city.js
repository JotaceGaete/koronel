// CoronelLocal es hoy una app de una sola ciudad, pero el contenido generado por usuarios
// (community_posts.city_id, ver supabase/migrations/20260717000000_community_posts_city_id.sql)
// ya está modelado por ciudad. Este módulo es el único lugar que sabe cuál es la ciudad activa
// — createPost() y getPosts() en communityService.js la consultan de aquí, nunca repiten el
// literal. El día que haya más de una ciudad activa a la vez, este es el único archivo a tocar
// para resolverla dinámicamente (por dominio, sesión, etc.) en vez de una constante.
//
// El ID por defecto es el de Coronel, el mismo que ya existe en las filas históricas de
// community_posts — no se debe generar un ID nuevo para la misma ciudad.
const DEFAULT_CITY_ID = '8aa2d628-719d-4810-9ee3-8efd230ab000';

export function getActiveCityId() {
  return import.meta.env?.VITE_ACTIVE_CITY_ID || DEFAULT_CITY_ID;
}
