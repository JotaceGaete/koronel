import { describe, expect, it, vi } from 'vitest';
import {
  businessMatchesCategoryFilter,
  businessMatchesSearchQuery,
  normalizeBusinessCategoryFilter,
} from '../utils/businessCategoryFilter';

vi.mock('../lib/supabase', () => ({
  supabase: {},
}));

describe('mapService category filtering', () => {
  it('does not filter when category is all', () => {
    expect(normalizeBusinessCategoryFilter('all')).toBeNull();
    expect(businessMatchesCategoryFilter({ category_key: 'salud-farmacia' }, 'all')).toBe(true);
  });

  it('normalizes Farmacias aliases to the real business category key', () => {
    expect(normalizeBusinessCategoryFilter('farmacias')).toEqual(['salud-farmacia']);
    expect(businessMatchesCategoryFilter({ category_key: 'salud-farmacia' }, 'farmacias')).toBe(true);
    expect(businessMatchesCategoryFilter({ category_key: 'farmacia' }, 'salud-farmacia')).toBe(true);
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
});
