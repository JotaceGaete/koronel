import { supabase } from '../lib/supabase';
import { computePulse } from '../lib/pulseRules';
import { logger } from '../lib/logger';

export const pulseService = {
  async getBusinessPulse(businessId) {
    try {
      const now = new Date();
      const sevenDaysAgo = new Date(now - 7 * 86400000).toISOString();
      const fourteenDaysAgo = new Date(now - 14 * 86400000).toISOString();

      const [lastActionRes, activeCountRes, followersRes, viewsRes] = await Promise.all([
        supabase
          ?.from('commercial_actions')
          ?.select('published_at')
          ?.eq('business_id', businessId)
          ?.eq('status', 'active')
          ?.order('published_at', { ascending: false })
          ?.limit(1),

        supabase
          ?.from('commercial_actions')
          ?.select('id', { count: 'exact', head: true })
          ?.eq('business_id', businessId)
          ?.eq('status', 'active')
          ?.gte('ends_at', now.toISOString()),

        supabase
          ?.from('business_followers')
          ?.select('id', { count: 'exact', head: true })
          ?.eq('business_id', businessId),

        supabase
          ?.from('commercial_actions')
          ?.select('views, created_at')
          ?.eq('business_id', businessId)
          ?.gte('created_at', fourteenDaysAgo),
      ]);

      const lastPublished = lastActionRes?.data?.[0]?.published_at;
      const daysSinceLastAction = lastPublished
        ? Math.floor((now - new Date(lastPublished)) / 86400000)
        : 999;

      const activeActionsCount = activeCountRes?.count || 0;
      const followers = followersRes?.count || 0;

      const actions = viewsRes?.data || [];
      const viewsLast7d  = actions.filter(a => new Date(a.created_at) >= new Date(sevenDaysAgo)).reduce((s, a) => s + (a.views || 0), 0);
      const viewsPrev7d  = actions.filter(a => new Date(a.created_at) < new Date(sevenDaysAgo)).reduce((s, a) => s + (a.views || 0), 0);

      const result = computePulse({ daysSinceLastAction, viewsLast7d, viewsPrev7d, activeActionsCount });

      // Record pulse snapshot (fire-and-forget)
      supabase?.from('business_pulse_history')?.insert({
        business_id:    businessId,
        pulse:          result.pulse,
        pulse_reason:   result.reason,
        views_7d:       viewsLast7d,
        actions_active: activeActionsCount,
        followers,
      }).then(() => {}).catch(() => {});

      return {
        ...result,
        daysSinceLastAction,
        activeActionsCount,
        followers,
        viewsLast7d,
        viewsPrev7d,
      };
    } catch (error) {
      logger.error('pulseService.getBusinessPulse error:', error);
      return { pulse: 'green', reason: '', cta: null, daysSinceLastAction: 0, activeActionsCount: 0, followers: 0, viewsLast7d: 0 };
    }
  },

  async getWeeklyStats(businessId) {
    try {
      const sevenDaysAgo = new Date(Date.now() - 7 * 86400000).toISOString();
      const { data, error } = await supabase
        ?.from('commercial_actions')
        ?.select('views, whatsapp_clicks, catalog_clicks, share_count')
        ?.eq('business_id', businessId)
        ?.gte('created_at', sevenDaysAgo);
      if (error) throw error;
      const stats = (data || []).reduce((acc, a) => ({
        views:          acc.views          + (a.views          || 0),
        whatsapp_clicks: acc.whatsapp_clicks + (a.whatsapp_clicks || 0),
        catalog_clicks: acc.catalog_clicks + (a.catalog_clicks || 0),
        share_count:    acc.share_count    + (a.share_count    || 0),
      }), { views: 0, whatsapp_clicks: 0, catalog_clicks: 0, share_count: 0 });
      return { data: stats, error: null };
    } catch (error) {
      return { data: { views: 0, whatsapp_clicks: 0, catalog_clicks: 0, share_count: 0 }, error };
    }
  },
};
