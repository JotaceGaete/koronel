import { supabase } from '../lib/supabase';

export const cityAdminService = {
  async getAll() {
    const { data: communityCities, error: communityError } = await supabase
      ?.from('community_cities')
      ?.select('id, slug, name, status')
      ?.order('name', { ascending: true });
    if (communityError) throw communityError;

    const { data: citiesRows, error: citiesError } = await supabase
      ?.from('cities')
      ?.select('community_city_id, domains');
    if (citiesError) throw citiesError;

    const domainsByCommunityCityId = new Map(
      (citiesRows || [])
        ?.filter((c) => c?.community_city_id)
        ?.map((c) => [c?.community_city_id, c?.domains || []])
    );

    return (communityCities || [])?.map((cc) => ({
      communityCityId: cc?.id,
      nombre: cc?.name,
      slug: cc?.slug,
      estado: cc?.status,
      domains: domainsByCommunityCityId?.get(cc?.id) || [],
      isLinked: domainsByCommunityCityId?.has(cc?.id),
    }));
  },

  // Lee únicamente community_cities: gracias al guardado dual de
  // admin_update_city_config (Bloque 1), esta tabla ya tiene el valor
  // vigente de los 11 campos del formulario — no hace falta una segunda
  // consulta a cities para leer.
  async getById(communityCityId) {
    const { data, error } = await supabase
      ?.from('community_cities')
      ?.select('id, name, site_name, country, region, logo_url, site_description, theme')
      ?.eq('id', communityCityId)
      ?.single();
    if (error) throw error;

    const theme = data?.theme || {};
    return {
      communityCityId: data?.id,
      cityName: data?.name || '',
      brandName: data?.site_name || '',
      countryName: data?.country || '',
      region: data?.region || '',
      logoUrl: data?.logo_url || '',
      colorPrimary: theme?.colors?.primary || '',
      seoDescription: data?.site_description || '',
      heroTitle: theme?.texts?.heroTitle || '',
      heroSubtitle: theme?.texts?.heroSubtitle || '',
      searchPlaceholder: theme?.texts?.searchPlaceholder || '',
      footerText: theme?.texts?.footerText || '',
    };
  },

  // Único camino de escritura: llama exclusivamente a la RPC
  // admin_update_city_config (Bloque 1) — nunca escribe directamente en
  // cities ni community_cities.
  async update(communityCityId, payload) {
    const { data, error } = await supabase?.rpc('admin_update_city_config', {
      p_community_city_id: communityCityId,
      p_city_name: payload?.cityName ?? null,
      p_brand_name: payload?.brandName ?? null,
      p_country_name: payload?.countryName ?? null,
      p_region: payload?.region ?? null,
      p_logo_url: payload?.logoUrl ?? null,
      p_seo_description: payload?.seoDescription ?? null,
      p_hero_title: payload?.heroTitle ?? null,
      p_hero_subtitle: payload?.heroSubtitle ?? null,
      p_search_placeholder: payload?.searchPlaceholder ?? null,
      p_footer_text: payload?.footerText ?? null,
      p_color_primary: payload?.colorPrimary ?? null,
    });
    if (error) throw error;
    return data;
  },
};
