const BUSINESS_CATEGORY_ALIASES = {
  farmacias: 'salud-farmacia',
  farmacia: 'salud-farmacia',
  pharmacia: 'salud-farmacia',
  botica: 'salud-farmacia',
  restaurante: 'restaurantes',
  restaurant: 'restaurantes',
  restaurants: 'restaurantes',
  restobar: 'restaurantes',
  pub: 'restaurantes',
  bar: 'restaurantes',
  sushi: 'restaurantes',
  'comida-para-llevar': 'restaurantes',
  'comida peruana': 'restaurantes',
  'comida-peruana': 'restaurantes',
  supermercado: 'supermercados',
  supermarkets: 'supermercados',
  supermarket: 'supermercados',
  grocery_or_supermarket: 'supermercados',
};

const BUSINESS_CATEGORY_CHILDREN = {
  restaurantes: [
    'restaurantes',
    'restaurante',
    'restaurant',
    'restaurants',
    'restobar',
    'pub',
    'bar',
    'sushi',
    'comida-para-llevar',
    'comida-peruana',
    'restaurantes-chilena',
    'restaurantes-pizzeria',
    'restaurantes-mariscos',
    'restaurantes-rapida',
    'restaurantes-cafe',
    'restaurantes-panaderia',
  ],
  salud: [
    'salud',
    'salud-dentistas',
    'salud-medicos',
    'salud-farmacia',
    'salud-optica',
    'salud-psicologia',
    'salud-kinesiologia',
    'salud-veterinaria',
  ],
  automotriz: [
    'automotriz',
    'mecanicos',
    'automotriz-mecanica',
    'automotriz-lubricentro',
    'automotriz-electrico',
    'automotriz-lavado',
    'automotriz-repuestos',
  ],
  belleza: [
    'belleza',
    'belleza-peluqueria',
    'belleza-barberia',
    'belleza-manicure',
    'belleza-estetica',
  ],
  'servicios-negocio': [
    'servicios-negocio',
    'servicios-gasfiteria',
    'servicios-electricidad',
    'servicios-construccion',
    'servicios-jardineria',
    'servicios-mudanzas',
    'servicios-seguridad',
  ],
  'tecnologia-negocio': [
    'tecnologia-negocio',
    'tecnologia-reparacion-pc',
    'tecnologia-celulares',
    'tecnologia-redes',
    'tecnologia-diseno-web',
  ],
};

export const FALLBACK_BUSINESS_CATEGORY_TREE = [
  {
    id: 'restaurantes',
    name: 'Restaurantes',
    name_key: 'restaurantes',
    icon: 'UtensilsCrossed',
    sort_order: 1,
    is_active: true,
  },
  {
    id: 'salud',
    name: 'Salud',
    name_key: 'salud',
    icon: 'Heart',
    sort_order: 2,
    is_active: true,
    subcategories: [
      { id: 'salud-farmacia', name: 'Farmacias', name_key: 'salud-farmacia', parent_id: 'salud', icon: 'Heart', sort_order: 3, is_active: true },
    ],
  },
  {
    id: 'automotriz',
    name: 'Automotriz',
    name_key: 'automotriz',
    icon: 'Car',
    sort_order: 4,
    is_active: true,
  },
  {
    id: 'ferreterias',
    name: 'Ferreterías',
    name_key: 'ferreterias',
    icon: 'Wrench',
    sort_order: 5,
    is_active: true,
  },
  {
    id: 'supermercados',
    name: 'Supermercados',
    name_key: 'supermercados',
    icon: 'ShoppingCart',
    sort_order: 6,
    is_active: true,
  },
  {
    id: 'belleza',
    name: 'Belleza',
    name_key: 'belleza',
    icon: 'Sparkles',
    sort_order: 7,
    is_active: true,
  },
  {
    id: 'servicios-negocio',
    name: 'Servicios',
    name_key: 'servicios-negocio',
    icon: 'Briefcase',
    sort_order: 8,
    is_active: true,
  },
  {
    id: 'tecnologia-negocio',
    name: 'Tecnología',
    name_key: 'tecnologia-negocio',
    icon: 'Monitor',
    sort_order: 9,
    is_active: true,
  },
  {
    id: 'iglesias-templos',
    name: 'Iglesias y Templos',
    name_key: 'iglesias-templos',
    icon: 'Church',
    sort_order: 10,
    is_active: true,
  },
];

export function flattenBusinessCategoryTree(tree = FALLBACK_BUSINESS_CATEGORY_TREE) {
  return tree?.flatMap(category => [
    category,
    ...(category?.subcategories || []),
  ]);
}

export function normalizeBusinessFilterText(value) {
  return String(value || '')
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

export function normalizeBusinessCategoryFilter(category) {
  const normalized = normalizeBusinessFilterText(category);
  if (!normalized || normalized === 'all') return null;

  const categoryKey = BUSINESS_CATEGORY_ALIASES?.[normalized] || normalized;
  const keys = BUSINESS_CATEGORY_CHILDREN?.[categoryKey] || [categoryKey];

  return [...new Set(keys?.filter(Boolean))];
}

function collectBusinessCategoryKeys(business) {
  const categoryValues = [
    business?.category_key,
    typeof business?.category === 'string' ? business?.category : null,
    business?.category?.name_key,
    business?.category?.slug,
    business?.category?.key,
    business?.category?.name,
    typeof business?.rubro === 'string' ? business?.rubro : null,
    business?.rubro?.name_key,
    business?.rubro?.slug,
    business?.rubro?.key,
    business?.rubro?.name,
  ];

  [
    business?.categories,
    business?.rubros,
    business?.wa_rubros,
    business?.business_categories,
  ]?.forEach(items => {
    if (Array.isArray(items)) {
      items?.forEach(item => {
        if (typeof item === 'string') {
          categoryValues?.push(item);
          return;
        }
        categoryValues?.push(
          item?.category_key,
          item?.name_key,
          item?.slug,
          item?.key,
          item?.name,
          item?.category?.category_key,
          item?.category?.name_key,
          item?.category?.slug,
          item?.category?.key,
          item?.category?.name
        );
      });
    }
  });

  return categoryValues?.flatMap(value => {
    const normalized = normalizeBusinessFilterText(value);
    if (!normalized) return [];
    return [normalized, BUSINESS_CATEGORY_ALIASES?.[normalized]]?.filter(Boolean);
  });
}

export function businessMatchesCategoryFilter(business, category) {
  const filterKeys = normalizeBusinessCategoryFilter(category);
  if (!filterKeys) return true;

  const businessKeys = collectBusinessCategoryKeys(business);
  return filterKeys?.some(key => businessKeys?.includes(key));
}

export function businessMatchesSearchQuery(business, search) {
  const terms = normalizeBusinessFilterText(search)
    ?.split(/\s+/)
    ?.filter(Boolean);
  if (!terms?.length) return true;

  const searchable = [
    business?.name,
    business?.address,
    business?.category,
    business?.category_key,
    business?.description,
  ]?.map(normalizeBusinessFilterText)?.join(' ');

  return terms?.every(term => searchable?.includes(term));
}
