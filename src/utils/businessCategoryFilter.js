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

export function normalizeSearchText(value) {
  return String(value || '')
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, ' ');
}

export const normalizeBusinessFilterText = normalizeSearchText;

export function normalizeBusinessCategoryFilter(category) {
  const normalized = normalizeSearchText(category);
  if (!normalized || normalized === 'all') return null;

  const categoryKey = BUSINESS_CATEGORY_ALIASES?.[normalized] || normalized;
  const keys = BUSINESS_CATEGORY_CHILDREN?.[categoryKey] || [categoryKey];

  return [...new Set(keys?.map(normalizeSearchText)?.filter(Boolean))];
}

export function getBusinessCategoryKeys(business) {
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
    const normalized = normalizeSearchText(value);
    if (!normalized) return [];
    return [normalized, BUSINESS_CATEGORY_ALIASES?.[normalized]]?.filter(Boolean);
  });
}

export function getBusinessCategoryKey(business) {
  const keys = getBusinessCategoryKeys(business);
  return keys?.[1] || keys?.[0] || null;
}

export function businessMatchesCategoryFilter(business, category) {
  const filterKeys = normalizeBusinessCategoryFilter(category);
  if (!filterKeys) return true;

  const businessKeys = getBusinessCategoryKeys(business);
  return filterKeys?.some(key => businessKeys?.includes(key));
}

export function businessMatchesSearchQuery(business, search) {
  const terms = normalizeSearchText(search)
    ?.split(/\s+/)
    ?.filter(Boolean);
  if (!terms?.length) return true;

  const searchable = [
    business?.name,
    business?.address,
    business?.category,
    business?.category_key,
    business?.description,
  ]?.map(normalizeSearchText)?.join(' ');

  return terms?.every(term => searchable?.includes(term));
}

function inferItemType(item) {
  if (item?.type) return item.type;
  if (item?.title && item?.sector) return 'community';
  if (item?.title && (item?.start_datetime || item?.venue_name || item?.organizer_business_id)) return 'event';
  return 'business';
}

function itemMatchesSearch(item, searchTerm, type) {
  const terms = normalizeSearchText(searchTerm)
    ?.split(/\s+/)
    ?.filter(Boolean);
  if (!terms?.length) return true;
  if (type === 'business') return businessMatchesSearchQuery(item, searchTerm);

  const searchable = [
    item?.title,
    item?.name,
    item?.description,
    item?.body,
    item?.address,
    item?.address_text,
    item?.venue_name,
    item?.sector,
    item?.category,
  ]?.map(normalizeSearchText)?.join(' ');

  return terms?.every(term => searchable?.includes(term));
}

function itemMatchesCategory(item, activeCategory, type) {
  if (!activeCategory || activeCategory === 'all') return true;
  if (type === 'business') return businessMatchesCategoryFilter(item, activeCategory);
  if (type === 'event') return normalizeSearchText(item?.category) === normalizeSearchText(activeCategory);
  return true;
}

function buildDebugStats(items, visibleItems, filters) {
  const businessItems = items?.filter(item => inferItemType(item) === 'business') || [];
  const categoryCounts = businessItems?.reduce((acc, business) => {
    const key = getBusinessCategoryKey(business) || '(sin categoria)';
    acc[key] = (acc?.[key] || 0) + 1;
    return acc;
  }, {});

  const categoriesWithoutBusinesses = flattenBusinessCategoryTree()
    ?.filter(category => !businessItems?.some(business => businessMatchesCategoryFilter(business, category?.name_key)))
    ?.map(category => category?.name_key);

  return {
    activeType: filters?.activeType || 'all',
    activeCategory: filters?.activeCategory || 'all',
    searchTerm: filters?.searchTerm || '',
    total: items?.length || 0,
    visible: visibleItems?.length || 0,
    businessTotal: businessItems?.length || 0,
    categoryCounts,
    categoriesWithoutBusinesses,
    businessesWithoutCategory: businessItems
      ?.filter(business => !getBusinessCategoryKey(business))
      ?.map(business => ({ id: business?.id, name: business?.name })),
  };
}

export function filterMapItems(items = [], filters = {}) {
  const activeType = filters?.activeType || 'all';
  const visible = (items || [])?.filter(item => {
    const type = inferItemType(item);
    if (activeType !== 'all' && type !== activeType) return false;
    if (!itemMatchesCategory(item, filters?.activeCategory, type)) return false;
    return itemMatchesSearch(item, filters?.searchTerm, type);
  });

  return {
    items: visible,
    debugStats: buildDebugStats(items || [], visible, filters),
  };
}
