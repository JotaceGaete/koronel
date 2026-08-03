import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../lib/supabase', () => ({
  supabase: { from: vi.fn(), rpc: vi.fn() },
}));

import { supabase } from '../lib/supabase';
import { cityAdminService } from './cityAdminService';

// Encadenable y "thenable" — igual que el query builder real de Supabase,
// awaitable directamente sin un método terminal explícito.
function makeBuilder(result, methods = ['select', 'eq', 'order', 'single']) {
  const builder = {};
  methods?.forEach((method) => {
    builder[method] = vi.fn(() => builder);
  });
  builder.then = (resolve, reject) => Promise.resolve(result)?.then(resolve, reject);
  return builder;
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe('cityAdminService.getAll', () => {
  it('combina community_cities y cities, derivando isLinked desde cities.community_city_id', async () => {
    const communityBuilder = makeBuilder({
      data: [
        { id: 'cc-1', slug: 'coronel', name: 'Coronel', status: 'active' },
        { id: 'cc-2', slug: 'otra', name: 'Otra', status: 'onboarding' },
      ],
      error: null,
    });
    const citiesBuilder = makeBuilder(
      { data: [{ community_city_id: 'cc-1', domains: ['coronel.cl'] }], error: null },
      ['select']
    );

    supabase?.from?.mockImplementation((table) => {
      if (table === 'community_cities') return communityBuilder;
      if (table === 'cities') return citiesBuilder;
      throw new Error(`tabla inesperada: ${table}`);
    });

    const result = await cityAdminService?.getAll();

    expect(result)?.toEqual([
      { communityCityId: 'cc-1', nombre: 'Coronel', slug: 'coronel', estado: 'active', domains: ['coronel.cl'], isLinked: true },
      { communityCityId: 'cc-2', nombre: 'Otra', slug: 'otra', estado: 'onboarding', domains: [], isLinked: false },
    ]);
  });

  it('lanza si falla la consulta a community_cities', async () => {
    const err = new Error('community_cities boom');
    supabase?.from?.mockImplementation(() => makeBuilder({ data: null, error: err }));

    await expect(cityAdminService?.getAll())?.rejects?.toThrow('community_cities boom');
  });

  it('lanza si falla la consulta a cities', async () => {
    const communityBuilder = makeBuilder({ data: [{ id: 'cc-1', slug: 'coronel', name: 'Coronel', status: 'active' }], error: null });
    const err = new Error('cities boom');
    const citiesBuilder = makeBuilder({ data: null, error: err }, ['select']);

    supabase?.from?.mockImplementation((table) => (table === 'community_cities' ? communityBuilder : citiesBuilder));

    await expect(cityAdminService?.getAll())?.rejects?.toThrow('cities boom');
  });
});

describe('cityAdminService.getById', () => {
  it('aplana theme.colors y theme.texts en el objeto plano del formulario', async () => {
    const builder = makeBuilder({
      data: {
        id: 'cc-1',
        name: 'Coronel',
        site_name: 'Koronel',
        country: 'Chile',
        region: 'Biobío',
        logo_url: 'https://x/logo.png',
        site_description: 'desc',
        theme: {
          colors: { primary: '#111111' },
          texts: {
            heroTitle: 'Bienvenido',
            heroSubtitle: 'Sub',
            searchPlaceholder: 'Buscar...',
            footerText: 'Footer',
          },
        },
      },
      error: null,
    });
    supabase?.from?.mockImplementation((table) => {
      expect(table)?.toBe('community_cities');
      return builder;
    });

    const result = await cityAdminService?.getById('cc-1');

    expect(result)?.toEqual({
      communityCityId: 'cc-1',
      cityName: 'Coronel',
      brandName: 'Koronel',
      countryName: 'Chile',
      region: 'Biobío',
      logoUrl: 'https://x/logo.png',
      colorPrimary: '#111111',
      seoDescription: 'desc',
      heroTitle: 'Bienvenido',
      heroSubtitle: 'Sub',
      searchPlaceholder: 'Buscar...',
      footerText: 'Footer',
    });
  });

  it('usa strings vacíos por defecto cuando theme es null', async () => {
    const builder = makeBuilder({
      data: {
        id: 'cc-1',
        name: 'Coronel',
        site_name: null,
        country: null,
        region: null,
        logo_url: null,
        site_description: null,
        theme: null,
      },
      error: null,
    });
    supabase?.from?.mockImplementation(() => builder);

    const result = await cityAdminService?.getById('cc-1');

    expect(result?.colorPrimary)?.toBe('');
    expect(result?.heroTitle)?.toBe('');
    expect(result?.heroSubtitle)?.toBe('');
    expect(result?.searchPlaceholder)?.toBe('');
    expect(result?.footerText)?.toBe('');
  });

  it('lanza si la consulta falla', async () => {
    const err = new Error('not found');
    supabase?.from?.mockImplementation(() => makeBuilder({ data: null, error: err }));

    await expect(cityAdminService?.getById('cc-1'))?.rejects?.toThrow('not found');
  });
});

describe('cityAdminService.update', () => {
  it('llama a la RPC admin_update_city_config con los 12 parámetros nombrados', async () => {
    supabase.rpc.mockResolvedValue({ data: [{ out_cities_id: 'city-1', out_community_city_id: 'cc-1' }], error: null });

    await cityAdminService?.update('cc-1', {
      cityName: 'Coronel',
      brandName: 'Koronel',
      countryName: 'Chile',
      region: 'Biobío',
      logoUrl: 'https://x/logo.png',
      seoDescription: 'desc',
      heroTitle: 'Bienvenido',
      heroSubtitle: 'Sub',
      searchPlaceholder: 'Buscar...',
      footerText: 'Footer',
      colorPrimary: '#111111',
    });

    expect(supabase?.rpc)?.toHaveBeenCalledWith('admin_update_city_config', {
      p_community_city_id: 'cc-1',
      p_city_name: 'Coronel',
      p_brand_name: 'Koronel',
      p_country_name: 'Chile',
      p_region: 'Biobío',
      p_logo_url: 'https://x/logo.png',
      p_seo_description: 'desc',
      p_hero_title: 'Bienvenido',
      p_hero_subtitle: 'Sub',
      p_search_placeholder: 'Buscar...',
      p_footer_text: 'Footer',
      p_color_primary: '#111111',
    });
  });

  it('convierte campos ausentes del payload a null en vez de omitirlos', async () => {
    supabase.rpc.mockResolvedValue({ data: null, error: null });

    await cityAdminService?.update('cc-1', {});

    expect(supabase?.rpc)?.toHaveBeenCalledWith('admin_update_city_config', {
      p_community_city_id: 'cc-1',
      p_city_name: null,
      p_brand_name: null,
      p_country_name: null,
      p_region: null,
      p_logo_url: null,
      p_seo_description: null,
      p_hero_title: null,
      p_hero_subtitle: null,
      p_search_placeholder: null,
      p_footer_text: null,
      p_color_primary: null,
    });
  });

  it('lanza si la RPC devuelve error', async () => {
    supabase.rpc.mockResolvedValue({ data: null, error: new Error('rpc failed') });

    await expect(cityAdminService?.update('cc-1', {}))?.rejects?.toThrow('rpc failed');
  });
});
