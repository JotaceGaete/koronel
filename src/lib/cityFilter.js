// Fase 4 del plan de reconciliación cities/community_cities: punto único
// donde se decide si una consulta se filtra por ciudad. No conoce Supabase
// más allá de recibir un query builder con `.eq()` — no importa `supabase`,
// no arma ninguna consulta por su cuenta.
//
// Política acordada para communityCityId == null (mientras dure la
// transición, antes de que el backfill/rollout esté completo): nunca
// filtrar en falso (colección vacía) y nunca lanzar error visible — solo
// dejar trazabilidad de que esa consulta todavía no tiene ciudad resuelta.
export function applyCityFilter(query, communityCityId, { source } = {}) {
  if (communityCityId) {
    return query?.eq('city_id', communityCityId);
  }

  console.warn(
    `[city-filter] ${source || 'consulta desconocida'} sin communityCityId — consulta sin filtrar por ciudad`
  );

  return query;
}
