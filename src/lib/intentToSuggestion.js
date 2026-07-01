// Maps trigger_intent + category_key → ordered list of action_type suggestions
// Each entry: { type, label, tagline, hint }
// Fase 1: pure rule-based. Fase 3+: replaced by AI using ai_context_snapshot.

const DEFAULT_SUGGESTIONS = {
  low_sales: [
    { type: 'offer',      label: 'Oferta de precio',    tagline: 'Descuento por tiempo limitado',      hint: 'Genera urgencia inmediata' },
    { type: 'happy_hour', label: 'Happy Hour',           tagline: 'Promoción en horario específico',    hint: 'Ideal para días de baja demanda' },
    { type: 'offer',      label: 'Promoción 2x1',        tagline: '2 por el precio de 1',              hint: 'Mueve volumen rápidamente' },
  ],
  new_customers: [
    { type: 'offer',      label: 'Descuento de bienvenida', tagline: 'Primera compra con descuento',   hint: 'Reduce la barrera de entrada' },
    { type: 'launch',     label: 'Presentación del negocio', tagline: 'Cuéntale a Coronel quién eres', hint: 'Ideal si eres nuevo o relanzas' },
    { type: 'offer',      label: 'Oferta especial',      tagline: 'Promoción limitada para nuevos clientes', hint: 'Atrae y fideliza en un paso' },
  ],
  excess_stock: [
    { type: 'liquidation', label: 'Liquidación de stock', tagline: 'Precios especiales para vaciar bodega', hint: 'Libera capital rápido' },
    { type: 'offer',       label: 'Descuento por volumen', tagline: 'Compra más, ahorra más',           hint: 'Mueve unidades rápidamente' },
    { type: 'offer',       label: 'Precio de salida',      tagline: 'Últimas unidades disponibles',     hint: 'Urgencia real de stock limitado' },
  ],
  new_product: [
    { type: 'launch',      label: 'Lanzamiento de producto', tagline: 'Presenta tu novedad',           hint: 'Genera expectativa y primeras ventas' },
    { type: 'new_product', label: 'Producto nuevo',          tagline: 'Recién llegado a tu negocio',   hint: 'Informa y atrae curiosidad' },
    { type: 'offer',       label: 'Precio de lanzamiento',   tagline: 'Descuento por ser de los primeros', hint: 'Incentiva la primera compra' },
  ],
  event: [
    { type: 'event',       label: 'Evento o actividad',      tagline: 'Invita a la comunidad',         hint: 'Genera tráfico y visibilidad' },
    { type: 'anniversary', label: 'Aniversario',             tagline: 'Celebra con tus clientes',      hint: 'Fortalece el vínculo con el barrio' },
    { type: 'season',      label: 'Temporada especial',      tagline: 'Aprovecha la fecha',            hint: 'Conecta con el calendario' },
  ],
  free_publish: [
    { type: 'offer',       label: 'Oferta',                  tagline: 'Descuento o promoción',         hint: '' },
    { type: 'new_product', label: 'Novedad',                 tagline: 'Producto o servicio nuevo',     hint: '' },
    { type: 'event',       label: 'Evento',                  tagline: 'Actividad o lanzamiento',       hint: '' },
    { type: 'launch',      label: 'Lanzamiento',             tagline: 'Presenta algo nuevo',           hint: '' },
  ],
};

// Category-specific overrides — supplement the default with rubro-aware hints
const CATEGORY_OVERRIDES = {
  gastronomia: {
    low_sales: [
      { type: 'happy_hour', label: 'Happy Hour',       tagline: 'Bebidas o menú especial por horario',  hint: 'El happy hour funciona muy bien en gastronomía' },
      { type: 'offer',      label: 'Menú del día',     tagline: 'Precio especial solo hoy',             hint: 'Genera urgencia para el almuerzo' },
      { type: 'offer',      label: 'Promoción 2x1',    tagline: '2 platos por el precio de 1',          hint: 'Ideal para llenar mesas vacías' },
    ],
  },
  mascotas: {
    new_customers: [
      { type: 'offer',  label: 'Descuento primera visita', tagline: 'Primera atención con descuento',   hint: 'Las mascotas generan clientes recurrentes' },
      { type: 'launch', label: 'Presentación del servicio', tagline: 'Cuéntale a Coronel sobre tu negocio', hint: '' },
      { type: 'offer',  label: 'Pack bienvenida',           tagline: 'Pack especial para nuevos clientes', hint: '' },
    ],
  },
  ropa: {
    excess_stock: [
      { type: 'liquidation', label: 'Liquidación de temporada', tagline: 'Precios especiales para vaciar bodega', hint: 'Muy efectivo en ropa de temporada pasada' },
      { type: 'offer',       label: 'Descuentos por talla',     tagline: 'Descuentos en tallas con más stock',   hint: '' },
      { type: 'season',      label: 'Cambio de temporada',      tagline: 'Llega la nueva colección',             hint: '' },
    ],
  },
};

export function getSuggestionsForIntent(intent, categoryKey) {
  const categoryOverride = categoryKey && CATEGORY_OVERRIDES[categoryKey]?.[intent];
  return categoryOverride || DEFAULT_SUGGESTIONS[intent] || DEFAULT_SUGGESTIONS.free_publish;
}

export const INTENT_OPTIONS = [
  { key: 'low_sales',      icon: 'TrendingDown', label: 'Hoy tengo pocas ventas',           color: '#ef4444' },
  { key: 'new_customers',  icon: 'Users',        label: 'Quiero atraer clientes nuevos',     color: '#3b82f6' },
  { key: 'excess_stock',   icon: 'Package',      label: 'Tengo demasiado stock',             color: '#f59e0b' },
  { key: 'new_product',    icon: 'Sparkles',     label: 'Quiero promocionar algo nuevo',     color: '#8b5cf6' },
  { key: 'event',          icon: 'Calendar',     label: 'Tengo un evento o lanzamiento',     color: '#059669' },
  { key: 'free_publish',   icon: 'Edit3',        label: 'Solo quiero publicar algo',         color: '#6b7280' },
];

export const ACTION_TYPE_LABELS = {
  offer:       'Oferta',
  liquidation: 'Liquidación',
  launch:      'Lanzamiento',
  event:       'Evento',
  happy_hour:  'Happy Hour',
  season:      'Temporada',
  anniversary: 'Aniversario',
  new_product: 'Producto nuevo',
};
