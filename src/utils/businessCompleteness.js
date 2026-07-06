/** Perfil de negocio: checklist de completitud (Fase 1 del Centro de Crecimiento).
 * Ponderación simple y equitativa a propósito — nada aquí se guarda en DB,
 * se recalcula siempre desde los datos reales del negocio para no quedar
 * desincronizado (el mismo problema que arrastran profile_visits/contacts_count).
 */

export const COMPLETENESS_FIELDS = [
  { key: 'logo', label: 'Logo', check: (b) => Boolean(b?.logo_url) },
  {
    key: 'cover',
    label: 'Portada o foto principal',
    check: (b) => Array.isArray(b?.business_images) && b.business_images.some((img) => img?.is_primary),
  },
  {
    key: 'address',
    label: 'Dirección',
    check: (b) => Boolean((b?.address_text || b?.address)?.trim?.()),
  },
  { key: 'whatsapp', label: 'WhatsApp', check: (b) => Boolean(b?.whatsapp?.trim?.()) },
  { key: 'hours', label: 'Horarios', check: (b) => Boolean(b?.opening_hours) },
  {
    key: 'description',
    label: 'Descripción',
    check: (b) => Boolean(b?.description?.trim?.()?.length >= 40),
  },
  {
    key: 'category',
    label: 'Categoría',
    check: (b) => Boolean(b?.category_key || b?.category_id || b?.category),
  },
  {
    key: 'social',
    label: 'Redes sociales o sitio web',
    check: (b) => Boolean(b?.website?.trim?.() || (Array.isArray(b?.social_links) && b.social_links.length > 0)),
  },
];

/** @returns {{ percent: number, items: {key:string,label:string,done:boolean}[], missing: {key:string,label:string,done:boolean}[] }} */
export function getBusinessCompleteness(business) {
  const items = COMPLETENESS_FIELDS.map(({ key, label, check }) => ({
    key,
    label,
    done: check(business || {}),
  }));
  const doneCount = items.filter((i) => i.done).length;
  const percent = items.length ? Math.round((doneCount / items.length) * 100) : 0;
  return { percent, items, missing: items.filter((i) => !i.done) };
}
