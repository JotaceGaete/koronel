import { supabase } from '../lib/supabase';

export const WALINKA_LINK_STATUS = {
  none: 'none',
  pending: 'pending',
  connected: 'connected',
};

function normalizeLink(row) {
  if (!row) return null;
  return {
    koronelBusinessId: row?.koronel_business_id,
    walinkaBusinessId: row?.walinka_business_id,
    status: row?.connection_status || WALINKA_LINK_STATUS.pending,
    source: row?.source || 'koronel',
    connectedAt: row?.connected_at || null,
    connectedBy: row?.connected_by || null,
  };
}

export const walinkaLinkService = {
  async getLinksForBusinesses(businessIds = []) {
    const ids = [...new Set((businessIds || []).filter(Boolean))];
    if (ids.length === 0) return { data: {}, error: null };

    try {
      const { data, error } = await supabase
        ?.from('business_walinka_links')
        ?.select('koronel_business_id, walinka_business_id, connection_status, source, connected_at, connected_by')
        ?.in('koronel_business_id', ids)
        ?.in('connection_status', ['pending', 'connected']);

      if (error) throw error;

      const linksByBusinessId = {};
      (data || []).forEach((row) => {
        const current = linksByBusinessId?.[row?.koronel_business_id];
        if (!current || row?.connection_status === WALINKA_LINK_STATUS.connected) {
          linksByBusinessId[row.koronel_business_id] = normalizeLink(row);
        }
      });

      return { data: linksByBusinessId, error: null };
    } catch (error) {
      console.error('walinkaLinkService.getLinksForBusinesses error:', error);
      return { data: {}, error };
    }
  },

  async getLinkStatus(koronelBusinessId) {
    if (!koronelBusinessId) return { data: null, error: null };

    try {
      const { data, error } = await supabase
        ?.rpc('get_business_walinka_link_status', {
          p_koronel_business_id: koronelBusinessId,
        });

      if (error) throw error;
      return { data: normalizeLink(data?.[0]), error: null };
    } catch (error) {
      console.error('walinkaLinkService.getLinkStatus error:', error);
      return { data: null, error };
    }
  },

  async requestLink({ koronelBusinessId, walinkaBusinessId = null }) {
    try {
      const { data, error } = await supabase
        ?.rpc('request_business_walinka_link', {
          p_koronel_business_id: koronelBusinessId,
          p_walinka_business_id: walinkaBusinessId,
        });

      if (error) throw error;
      return { data: normalizeLink(data?.[0]), error: null };
    } catch (error) {
      console.error('walinkaLinkService.requestLink error:', error);
      return { data: null, error };
    }
  },
};
