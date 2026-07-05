const GENERIC_CATEGORY_KEYS = new Set(['establishment', 'point-of-interest']);

const CATEGORY_ALIASES = {
  iglesia: 'iglesias-templos',
  iglesias: 'iglesias-templos',
  church: 'iglesias-templos',

  farmacia: 'salud-farmacia',
  farmacias: 'salud-farmacia',
  pharmacia: 'salud-farmacia',
  botica: 'salud-farmacia',

  veterinaria: 'salud-veterinaria',
  veterinarias: 'salud-veterinaria',

  restaurante: 'restaurantes',
  restaurantes: 'restaurantes',
  restaurant: 'restaurantes',
  restaurants: 'restaurantes',
  restobar: 'restaurantes',
  pub: 'restaurantes',
  bar: 'restaurantes',
  sushi: 'restaurantes',
  'comida-para-llevar': 'restaurantes',
  'comida-peruana': 'restaurantes',

  supermercado: 'supermercados',
  supermercados: 'supermercados',
  supermarket: 'supermercados',
  supermarkets: 'supermercados',
  grocery_or_supermarket: 'supermercados',

  mecanico: 'automotriz-mecanica',
  mecanicos: 'automotriz-mecanica',
  mecanica: 'automotriz-mecanica',

  'ropa-segunda-seleccion': 'ropa-segunda-seleccion',
  'clothing-store': 'ropa-segunda-seleccion',
  clothing_store: 'ropa-segunda-seleccion',
};

const CATEGORY_GROUPS = {
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
  'salud-farmacia': ['salud-farmacia', 'farmacia', 'farmacias', 'botica'],
  'salud-veterinaria': ['salud-veterinaria', 'veterinaria', 'veterinarias'],
  supermercados: ['supermercados', 'supermercado', 'supermarket', 'supermarkets', 'grocery_or_supermarket'],
  'iglesias-templos': ['iglesias-templos', 'iglesia', 'iglesias', 'church'],
  'automotriz-mecanica': ['automotriz-mecanica', 'mecanico', 'mecanicos', 'mecanica'],
  'ropa-segunda-seleccion': ['ropa-segunda-seleccion', 'clothing-store', 'clothing_store'],
};

const CATEGORY_LABELS = {
  restaurantes: 'Restaurantes',
  'salud-farmacia': 'Farmacias',
  'salud-veterinaria': 'Veterinarias',
  supermercados: 'Supermercados',
  'iglesias-templos': 'Iglesias',
  ferreterias: 'Ferreterias',
  'automotriz-mecanica': 'Mecanicos',
  'ropa-segunda-seleccion': 'Ropa Segunda Seleccion',
  envases: 'Envases',
};

export const FALLBACK_BUSINESS_CATEGORY_TREE = [
  { id: 'virtual:restaurantes', name: 'Restaurantes', name_key: 'restaurantes', icon: 'UtensilsCrossed', sort_order: 1, is_active: true, virtual: true },
  {
    id: 'virtual:salud',
    name: 'Salud',
    name_key: 'salud',
    icon: 'Heart',
    sort_order: 2,
    is_active: true,
    virtual: true,
    subcategories: [
      { id: 'virtual:salud-farmacia', name: 'Farmacias', name_key: 'salud-farmacia', parent_id: 'virtual:salud', icon: 'Heart', sort_order: 3, is_active: true, virtual: true },
      { id: 'virtual:salud-veterinaria', name: 'Veterinarias', name_key: 'salud-veterinaria', parent_id: 'virtual:salud', icon: 'Heart', sort_order: 7, is_active: true, virtual: true },
    ],
  },
  { id: 'virtual:automotriz', name: 'Automotriz', name_key: 'automotriz', icon: 'Car', sort_order: 4, is_active: true, virtual: true },
  { id: 'virtual:ferreterias', name: 'Ferreterias', name_key: 'ferreterias', icon: 'Wrench', sort_order: 5, is_active: true, virtual: true },
  { id: 'virtual:supermercados', name: 'Supermercados', name_key: 'supermercados', icon: 'ShoppingCart', sort_order: 6, is_active: true, virtual: true },
  { id: 'virtual:belleza', name: 'Belleza', name_key: 'belleza', icon: 'Sparkles', sort_order: 7, is_active: true, virtual: true },
  { id: 'virtual:servicios-negocio', name: 'Servicios', name_key: 'servicios-negocio', icon: 'Briefcase', sort_order: 8, is_active: true, virtual: true },
  { id: 'virtual:tecnologia-negocio', name: 'Tecnologia', name_key: 'tecnologia-negocio', icon: 'Monitor', sort_order: 9, is_active: true, virtual: true },
  { id: 'virtual:iglesias-templos', name: 'Iglesias y Templos', name_key: 'iglesias-templos', icon: 'Church', sort_order: 10, is_active: true, virtual: true },
];

export function normalizeText(value) {
  return String(value || '')
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9_\s-]/g, '')
    .replace(/\s+/g, ' ');
}

export const normalizeSearchText = normalizeText;
export const normalizeBusinessFilterText = normalizeText;

function toKey(value) {
  return normalizeText(value)?.replace(/\s+/g, '-');
}

function humanizeKey(value) {
  return String(value || '')
    .replace(/[-_]/g, ' ')
    .replace(/\b\w/g, letter => letter.toUpperCase());
}

export function normalizeCategoryKey(value) {
  const key = toKey(value);
  if (!key || key === 'all') return key;
  return CATEGORY_ALIASES?.[key] || key;
}

export function flattenBusinessCategoryTree(tree = FALLBACK_BUSINESS_CATEGORY_TREE) {
  return tree?.flatMap(category => [
    category,
    ...(category?.subcategories || []),
  ]);
}

export function normalizeBusinessCategoryFilter(category) {
  const normalized = normalizeCategoryKey(category);
  if (!normalized || normalized === 'all') return null;
  const keys = CATEGORY_GROUPS?.[normalized] || [normalized];
  return [...new Set(keys?.map(normalizeCategoryKey)?.filter(Boolean))];
}

export function getBusinessCategoryCandidates(business) {
  const values = [
    business?.category_key,
    typeof business?.category === 'string' ? business?.category : null,
    business?.category?.name_key,
    business?.category?.slug,
    business?.category?.key,
    business?.category?.name,
    business?.category_name,
    business?.category_slug,
    business?.name_key,
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
    if (!Array.isArray(items)) return;
    items?.forEach(item => {
      if (typeof item === 'string') {
        values?.push(item);
        return;
      }
      values?.push(
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
  });

  return [...new Set(values?.flatMap(value => {
    const rawKey = toKey(value);
    if (!rawKey) return [];
    return [normalizeCategoryKey(rawKey), rawKey]?.filter(Boolean);
  }))];
}

export const getBusinessCategoryKeys = getBusinessCategoryCandidates;

export function getBusinessCategoryKey(business) {
  const candidates = getBusinessCategoryCandidates(business);
  return candidates?.find(key => key && !GENERIC_CATEGORY_KEYS.has(key)) || null;
}

export function businessMatchesCategoryFilter(business, category) {
  const filterKeys = normalizeBusinessCategoryFilter(category);
  if (!filterKeys) return true;
  const businessKeys = getBusinessCategoryCandidates(business);
  return filterKeys?.some(key => businessKeys?.includes(key));
}

export function getBusinessSearchText(business) {
  const categoryCandidates = getBusinessCategoryCandidates(business);
  const categoryLabels = categoryCandidates?.map(key => CATEGORY_LABELS?.[key] || key);
  return [
    business?.name,
    business?.address,
    business?.category,
    business?.category_key,
    business?.description,
    ...categoryCandidates,
    ...categoryLabels,
  ]?.map(normalizeText)?.join(' ');
}

export function businessMatchesSearchQuery(business, search) {
  const terms = normalizeText(search)?.split(/\s+/)?.filter(Boolean);
  if (!terms?.length) return true;
  const searchable = getBusinessSearchText(business);
  return terms?.every(term => searchable?.includes(term));
}

export function buildCategoryFacets(businesses = []) {
  const facetMap = new Map();
  const nonNormalizedMap = new Map();

  (businesses || [])?.forEach(business => {
    const key = getBusinessCategoryKey(business);
    if (!key || GENERIC_CATEGORY_KEYS.has(key)) {
      const raw = toKey(business?.category || business?.category_key);
      if (raw) nonNormalizedMap.set(raw, (nonNormalizedMap.get(raw) || 0) + 1);
      return;
    }

    const facet = facetMap.get(key) || {
      key,
      label: CATEGORY_LABELS?.[key] || humanizeKey(key),
      count: 0,
      aliases: new Set(),
      source: 'businesses',
    };
    facet.count += 1;
    getBusinessCategoryCandidates(business)?.forEach(candidate => facet.aliases.add(candidate));
    facetMap.set(key, facet);
  });

  return {
    facets: [...facetMap.values()]
      ?.map(facet => ({ ...facet, aliases: [...facet.aliases]?.sort() }))
      ?.sort((a, b) => b.count - a.count || a.label.localeCompare(b.label)),
    nonNormalizedCategories: [...nonNormalizedMap.entries()]
      ?.map(([key, count]) => ({ key, label: humanizeKey(key), count }))
      ?.sort((a, b) => b.count - a.count || a.label.localeCompare(b.label)),
  };
}

export function filterMapBusinesses(businesses = [], { activeCategory = 'all', searchTerm = '' } = {}) {
  const items = (businesses || [])
    ?.filter(business => businessMatchesCategoryFilter(business, activeCategory))
    ?.filter(business => businessMatchesSearchQuery(business, searchTerm));
  const { facets, nonNormalizedCategories } = buildCategoryFacets(businesses);
  const activeCategoryTotal = !activeCategory || activeCategory === 'all'
    ? businesses?.length || 0
    : (businesses || [])?.filter(business => businessMatchesCategoryFilter(business, activeCategory))?.length;

  return {
    items,
    debugStats: {
      activeCategory,
      searchTerm,
      total: businesses?.length || 0,
      visible: items?.length || 0,
      businessTotal: businesses?.length || 0,
      activeCategoryTotal,
      categoryFacets: facets,
      categoryCounts: Object.fromEntries(facets?.map(facet => [facet.key, facet.count])),
      nonNormalizedCategories,
      chipsWithoutResults: facets?.filter(facet => facet.count === 0)?.map(facet => facet.key),
      businessesWithoutCategory: (businesses || [])
        ?.filter(business => !getBusinessCategoryKey(business))
        ?.map(business => ({ id: business?.id, name: business?.name })),
    },
  };
}

function inferItemType(item) {
  if (item?.type) return item.type;
  if (item?.title && item?.sector) return 'community';
  if (item?.title && (item?.start_datetime || item?.venue_name || item?.organizer_business_id)) return 'event';
  return 'business';
}

function itemMatchesSearch(item, searchTerm, type) {
  const terms = normalizeText(searchTerm)?.split(/\s+/)?.filter(Boolean);
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
  ]?.map(normalizeText)?.join(' ');
  return terms?.every(term => searchable?.includes(term));
}

function itemMatchesCategory(item, activeCategory, type) {
  if (!activeCategory || activeCategory === 'all') return true;
  if (type === 'business') return businessMatchesCategoryFilter(item, activeCategory);
  if (type === 'event') return normalizeCategoryKey(item?.category) === normalizeCategoryKey(activeCategory);
  return true;
}

export function filterMapItems(items = [], filters = {}) {
  const activeType = filters?.activeType || 'all';
  const visible = (items || [])?.filter(item => {
    const type = inferItemType(item);
    if (activeType !== 'all' && type !== activeType) return false;
    if (!itemMatchesCategory(item, filters?.activeCategory, type)) return false;
    return itemMatchesSearch(item, filters?.searchTerm, type);
  });

  const businessItems = (items || [])?.filter(item => inferItemType(item) === 'business');
  const businessStats = filterMapBusinesses(businessItems, {
    activeCategory: filters?.activeCategory,
    searchTerm: filters?.searchTerm,
  })?.debugStats;

  return {
    items: visible,
    debugStats: {
      ...businessStats,
      activeType,
      activeCategory: filters?.activeCategory || 'all',
      searchTerm: filters?.searchTerm || '',
      total: items?.length || 0,
      visible: visible?.length || 0,
    },
  };
}
