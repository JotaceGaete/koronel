import { describe, expect, it, vi } from 'vitest';
import {
  buildCategoryFacets,
  businessMatchesCategoryFilter,
  businessMatchesSearchQuery,
  filterMapItems,
  filterMapBusinesses,
  getBusinessCategoryCandidates,
  getBusinessCategoryKey,
  getBusinessSearchText,
  normalizeCategoryKey,
  normalizeBusinessCategoryFilter,
  normalizeSearchText,
} from '../utils/businessCategoryFilter';

vi.mock('../lib/supabase', () => ({
  supabase: {},
}));

describe('mapService category filtering', () => {
  it('normalizes search text accents, case, trim, and spaces', () => {
    expect(normalizeSearchText('  Restaurante   Peruano Mágico  ')).toBe('restaurante peruano magico');
  });

  it('does not filter when category is all', () => {
    expect(normalizeBusinessCategoryFilter('all')).toBeNull();
    expect(businessMatchesCategoryFilter({ category_key: 'salud-farmacia' }, 'all')).toBe(true);
    const { items } = filterMapItems([
      { name: 'Farmacia Generica', category_key: 'farmacia' },
      { name: 'La Casona de Mirla', category_key: 'restaurantes' },
    ], { activeType: 'business', activeCategory: 'all' });
    expect(items).toHaveLength(2);
  });

  it('normalizes Farmacias aliases to the real business category key', () => {
    expect(normalizeBusinessCategoryFilter('farmacias')).toEqual(['salud-farmacia']);
    expect(normalizeCategoryKey('Farmacia')).toBe('salud-farmacia');
    expect(normalizeCategoryKey('Farmacias')).toBe('salud-farmacia');
    expect(businessMatchesCategoryFilter({ category_key: 'salud-farmacia' }, 'farmacias')).toBe(true);
    expect(businessMatchesCategoryFilter({ category_key: 'farmacia' }, 'salud-farmacia')).toBe(true);
    expect(getBusinessCategoryKey({ category_key: 'farmacia' })).toBe('salud-farmacia');
  });

  it('normalizes Restaurante and Restaurantes to the same business category', () => {
    expect(normalizeCategoryKey('Restaurante')).toBe('restaurantes');
    expect(normalizeCategoryKey('Restaurantes')).toBe('restaurantes');
    expect(businessMatchesCategoryFilter({ category_key: 'restaurant' }, 'restaurantes')).toBe(true);
    expect(businessMatchesCategoryFilter({ category: 'Restobar' }, 'restaurante')).toBe(true);
  });

  it('normalizes supermarket aliases and accented category labels', () => {
    expect(businessMatchesCategoryFilter({ category_key: 'supermarket' }, 'supermercados')).toBe(true);
    expect(businessMatchesCategoryFilter({ category: 'Ferreterías' }, 'ferreterias')).toBe(true);
  });

  it('matches parent business categories against known child category keys', () => {
    expect(businessMatchesCategoryFilter({ category_key: 'restaurantes-pizzeria' }, 'restaurantes')).toBe(true);
    expect(businessMatchesCategoryFilter({ category_key: 'bar' }, 'restaurantes')).toBe(true);
    expect(businessMatchesCategoryFilter({ category_key: 'sushi' }, 'restaurantes')).toBe(true);
    expect(businessMatchesCategoryFilter({ category_key: 'comida-peruana' }, 'restaurantes')).toBe(true);
    expect(businessMatchesCategoryFilter({ category: 'Restobar' }, 'restaurantes')).toBe(true);
    expect(businessMatchesCategoryFilter({ category_key: 'salud-farmacia' }, 'restaurantes')).toBe(false);
  });

  it('matches category arrays and nested category objects when present', () => {
    const business = {
      category_key: 'servicios-electricidad',
      business_categories: [
        { category: { name_key: 'salud-farmacia' } },
      ],
    };

    expect(businessMatchesCategoryFilter(business, 'salud-farmacia')).toBe(true);
  });

  it('matches search by name, address, category, and category_key', () => {
    const business = {
      name: 'Restaurante Peruano Mágico',
      address: 'Coronel centro',
      category: 'Comida peruana',
      category_key: 'comida-peruana',
    };

    expect(businessMatchesSearchQuery(business, 'rest peru')).toBe(true);
    expect(businessMatchesSearchQuery(business, 'comida')).toBe(true);
    expect(businessMatchesSearchQuery(business, 'centro')).toBe(true);
  });

  it('matches Aube by business name and ropa by normalized category aliases', () => {
    const business = {
      name: 'Aube Bonita Casualidad',
      category: 'clothing store',
      category_key: null,
    };

    expect(businessMatchesSearchQuery(business, 'Aube')).toBe(true);
    expect(businessMatchesSearchQuery(business, 'ropa')).toBe(true);
    expect(getBusinessSearchText(business)).toContain('ropa segunda seleccion');
  });

  it('detects clothing store as a non-local alias for Ropa Segunda Seleccion', () => {
    const business = { name: 'Tienda de ropa', category: 'clothing store' };
    const candidates = getBusinessCategoryCandidates(business);
    const facets = buildCategoryFacets([business]);

    expect(candidates).toContain('ropa-segunda-seleccion');
    expect(candidates).toContain('clothing-store');
    expect(facets?.[0]?.key).toBe('ropa-segunda-seleccion');
    expect(facets?.[0]?.aliases).toContain('clothing-store');
  });

  it('collapses Iglesia and Iglesias into the same category key', () => {
    expect(normalizeCategoryKey('Iglesia')).toBe('iglesias-templos');
    expect(normalizeCategoryKey('Iglesias')).toBe('iglesias-templos');
    expect(businessMatchesCategoryFilter({ category: 'Iglesia' }, 'iglesias')).toBe(true);
  });

  it('filters map businesses by specific category and exact or partial name', () => {
    const items = [
      { name: 'Restaurante Peruano Magico', category_key: null, category: 'establishment' },
      { name: 'Rincon Minero Restobar', category: 'bar' },
      { name: 'Farmacia Generica', category_key: 'farmacia' },
    ];

    expect(filterMapItems(items, {
      activeType: 'business',
      activeCategory: 'restaurantes',
      searchTerm: '',
    }).items).toHaveLength(1);

    expect(filterMapItems(items, {
      activeType: 'business',
      activeCategory: 'all',
      searchTerm: 'Farmacia Generica',
    }).items?.[0]?.name).toBe('Farmacia Generica');

    expect(filterMapItems(items, {
      activeType: 'business',
      activeCategory: 'all',
      searchTerm: 'resto',
    }).items?.[0]?.name).toBe('Rincon Minero Restobar');
  });

  it('does not break event and community filters', () => {
    const items = [
      { type: 'event', title: 'Curso de verano', category: 'courses' },
      { type: 'community', title: 'Pregunta de barrio', sector: 'Centro' },
      { type: 'business', name: 'Farmacia Generica', category_key: 'farmacia' },
    ];

    expect(filterMapItems(items, { activeType: 'event', activeCategory: 'courses' }).items).toHaveLength(1);
    expect(filterMapItems(items, { activeType: 'community', activeCategory: 'restaurantes' }).items).toHaveLength(1);
  });

  it('returns empty items for nonexistent categories', () => {
    const result = filterMapItems([
      { name: 'Farmacia Generica', category_key: 'farmacia' },
    ], {
      activeType: 'business',
      activeCategory: 'no-existe',
    });

    expect(result.items).toEqual([]);
    expect(result.categoryFacets?.[0]?.key).toBe('salud-farmacia');
  });

  it('returns empty businesses for nonexistent business categories', () => {
    const result = filterMapBusinesses([
      { name: 'Farmacia Generica', category_key: 'farmacia' },
    ], {
      activeCategory: 'no-existe',
    });

    expect(result.items).toEqual([]);
    expect(result.categoryFacets?.[0]?.key).toBe('salud-farmacia');
  });
});
