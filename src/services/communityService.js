import { supabase } from '../lib/supabase';

export const COMMUNITY_SECTORS = ['Centro', 'Lagunillas', 'Schwager', 'Puchoco', 'Las Higueras', 'Punta de Parra', 'Otro'];

const STOPWORDS = new Set([
  'que', 'para', 'con', 'las', 'los', 'una', 'uno', 'del', 'por', 'como', 'donde', 'dónde',
  'que?', 'cual', 'cuál', 'este', 'esta', 'esto', 'sobre', 'hay', 'alguien', 'algun', 'alguna',
  'sabe', 'saben', 'buen', 'buena', 'buenos', 'buenas', 'recomiendan', 'recomienda', 'mejor',
  'todo', 'toda', 'muy', 'mas', 'más', 'pero', 'sus', 'tiene', 'tienen', 'desde', 'hasta',
]);

// Attaches reply_count and last_activity_at to a page of posts using a single
// bounded query over their replies — no schema change, cheap at page size.
async function attachReplyStats(posts) {
  const postIds = (posts || [])?.map(p => p?.id);
  if (!postIds?.length) return posts || [];

  const { data: replyData } = await supabase
    ?.from('community_replies')
    ?.select('post_id, created_at')
    ?.in('post_id', postIds)
    ?.eq('status', 'active');

  const counts = {};
  const lastReplyAt = {};
  (replyData || [])?.forEach(r => {
    counts[r?.post_id] = (counts?.[r?.post_id] || 0) + 1;
    if (!lastReplyAt?.[r?.post_id] || r?.created_at > lastReplyAt?.[r?.post_id]) {
      lastReplyAt[r.post_id] = r?.created_at;
    }
  });

  return (posts || [])?.map(p => ({
    ...p,
    reply_count: counts?.[p?.id] || 0,
    last_activity_at: lastReplyAt?.[p?.id] || p?.created_at,
  }));
}

export const communityService = {
  // ─── POSTS ───────────────────────────────────────────────────────────────

  async getPosts({ sector = '', search = '', sort = 'recent', page = 1, pageSize = 12 } = {}) {
    try {
      // "unanswered" can't be expressed as a single indexed query without a
      // reply_count column, so it fetches a bounded recent window, filters
      // client-side, then paginates the filtered set in memory. Correct for
      // the realistic "browse recent unanswered questions" use case; if the
      // feed grows enough that 200 recent posts isn't representative, this
      // needs a real reply_count column (schema change, not in scope here).
      if (sort === 'unanswered') {
        const WINDOW = 200;
        let windowQuery = supabase
          ?.from('community_posts')
          ?.select('*, author:user_profiles(id, full_name, avatar_url)')
          ?.eq('status', 'active')
          ?.order('created_at', { ascending: false })
          ?.limit(WINDOW);
        if (sector && sector !== 'all') windowQuery = windowQuery?.eq('sector', sector);
        if (search?.trim()) windowQuery = windowQuery?.or(`title.ilike.%${search}%,body.ilike.%${search}%`);

        const { data, error } = await windowQuery;
        if (error) throw error;

        const enriched = await attachReplyStats(data);
        const unanswered = enriched?.filter(p => !p?.reply_count);

        const from = (page - 1) * pageSize;
        const pageData = unanswered?.slice(from, from + pageSize);
        return { data: pageData, count: unanswered?.length || 0, error: null };
      }

      let query = supabase
        ?.from('community_posts')
        ?.select('*, author:user_profiles(id, full_name, avatar_url)', { count: 'exact' })
        ?.eq('status', 'active');

      if (sector && sector !== 'all') {
        query = query?.eq('sector', sector);
      }
      if (search?.trim()) {
        query = query?.or(`title.ilike.%${search}%,body.ilike.%${search}%`);
      }
      if (sort === 'votes') {
        query = query?.order('upvote_count', { ascending: false });
      } else {
        query = query?.order('created_at', { ascending: false });
      }

      const from = (page - 1) * pageSize;
      const to = from + pageSize - 1;
      query = query?.range(from, to);

      const { data, error, count } = await query;
      if (error) throw error;

      const enriched = await attachReplyStats(data);
      return { data: enriched, count: count || 0, error: null };
    } catch (error) {
      console.error('communityService.getPosts error:', error);
      return { data: [], count: 0, error };
    }
  },

  // Real per-sector counts (active posts only) — one indexed count query per
  // sector, same pattern as homepage/StatsBar.jsx.
  async getSectorCounts() {
    try {
      const results = await Promise.all(
        COMMUNITY_SECTORS?.map(sector =>
          supabase
            ?.from('community_posts')
            ?.select('id', { count: 'exact', head: true })
            ?.eq('status', 'active')
            ?.eq('sector', sector)
        )
      );
      const counts = {};
      COMMUNITY_SECTORS?.forEach((sector, i) => { counts[sector] = results?.[i]?.count || 0; });
      return { data: counts, error: null };
    } catch (error) {
      return { data: {}, error };
    }
  },

  // Shared by getActiveMembers() and getCommunityStats(): {user_id: count}
  // of posts+replies in the last `days`, bounded/indexed by created_at.
  async _getRecentActivityMap({ days = 30 } = {}) {
    const since = new Date(Date.now() - days * 86400000)?.toISOString();
    const [{ data: posts }, { data: replies }] = await Promise.all([
      supabase?.from('community_posts')?.select('user_id')?.eq('status', 'active')?.gte('created_at', since),
      supabase?.from('community_replies')?.select('user_id')?.eq('status', 'active')?.gte('created_at', since),
    ]);
    const activity = {};
    (posts || [])?.forEach(p => { if (p?.user_id) activity[p.user_id] = (activity?.[p.user_id] || 0) + 1; });
    (replies || [])?.forEach(r => { if (r?.user_id) activity[r.user_id] = (activity?.[r.user_id] || 0) + 1; });
    return activity;
  },

  // Top authors by (posts + replies) in the last `days`.
  async getActiveMembers({ days = 30, limit = 5 } = {}) {
    try {
      const activity = await communityService?._getRecentActivityMap({ days });
      const topIds = Object.entries(activity)
        ?.sort((a, b) => b?.[1] - a?.[1])
        ?.slice(0, limit)
        ?.map(([id]) => id);
      if (!topIds?.length) return { data: [], error: null };

      const { data: profiles } = await supabase
        ?.from('user_profiles')
        ?.select('id, full_name, avatar_url')
        ?.in('id', topIds);

      const byId = {};
      (profiles || [])?.forEach(p => { byId[p?.id] = p; });

      const ranked = topIds
        ?.map(id => ({ ...byId?.[id], id, activity_count: activity?.[id] }))
        ?.filter(m => m?.full_name);
      return { data: ranked, error: null };
    } catch (error) {
      return { data: [], error };
    }
  },

  // Headline numbers for the stats strip — every field is a single indexed
  // count query, cheap regardless of table size.
  async getCommunityStats() {
    try {
      const startOfDay = new Date(); startOfDay.setHours(0, 0, 0, 0);
      const startOfMonth = new Date(); startOfMonth.setDate(1); startOfMonth.setHours(0, 0, 0, 0);

      const [totalQuestions, repliesToday, repliesThisMonth, activityMap] = await Promise.all([
        supabase?.from('community_posts')?.select('id', { count: 'exact', head: true })?.eq('status', 'active'),
        supabase?.from('community_replies')?.select('id', { count: 'exact', head: true })?.eq('status', 'active')?.gte('created_at', startOfDay?.toISOString()),
        supabase?.from('community_replies')?.select('id', { count: 'exact', head: true })?.eq('status', 'active')?.gte('created_at', startOfMonth?.toISOString()),
        communityService?._getRecentActivityMap({ days: 30 }),
      ]);

      return {
        data: {
          totalQuestions: totalQuestions?.count || 0,
          repliesToday: repliesToday?.count || 0,
          repliesThisMonth: repliesThisMonth?.count || 0,
          activeMembers: Object.keys(activityMap || {})?.length,
        },
        error: null,
      };
    } catch (error) {
      return { data: { totalQuestions: 0, repliesToday: 0, repliesThisMonth: 0, activeMembers: 0 }, error };
    }
  },

  // Lightweight word-frequency heuristic over recent titles — not a real tag
  // system, just enough to show "lo que se está preguntando esta semana".
  extractTrendingWords(titles, limit = 6) {
    const freq = {};
    (titles || [])?.forEach(title => {
      const words = title
        ?.toLowerCase()
        ?.normalize('NFD')?.replace(/\p{Diacritic}/gu, '')
        ?.replace(/[^a-z0-9ñ\s]/g, '')
        ?.split(/\s+/)
        ?.filter(w => w?.length > 3 && !STOPWORDS?.has(w));
      words?.forEach(w => { freq[w] = (freq?.[w] || 0) + 1; });
    });
    return Object.entries(freq)
      ?.filter(([, count]) => count > 1)
      ?.sort((a, b) => b?.[1] - a?.[1])
      ?.slice(0, limit)
      ?.map(([word, count]) => ({ word, count }));
  },

  async getTrendingWords({ days = 7, limit = 6 } = {}) {
    try {
      const since = new Date(Date.now() - days * 86400000)?.toISOString();
      const { data, error } = await supabase
        ?.from('community_posts')
        ?.select('title')
        ?.eq('status', 'active')
        ?.gte('created_at', since)
        ?.order('created_at', { ascending: false })
        ?.limit(100);
      if (error) throw error;
      return { data: communityService?.extractTrendingWords(data?.map(p => p?.title), limit), error: null };
    } catch (error) {
      return { data: [], error };
    }
  },

  async getPostById(id) {
    try {
      const { data, error } = await supabase
        ?.from('community_posts')
        ?.select('*, author:user_profiles(id, full_name, avatar_url)')
        ?.eq('id', id)
        ?.single();
      if (error) throw error;
      return { data, error: null };
    } catch (error) {
      return { data: null, error };
    }
  },

  async createPost({ title, body, sector, lat, lng, userId }) {
    try {
      const { data, error } = await supabase
        ?.from('community_posts')
        ?.insert({
          title,
          body,
          sector,
          lat: lat || null,
          lng: lng || null,
          user_id: userId,
          status: 'active',
        })
        ?.select()
        ?.single();
      if (error) throw error;
      return { data, error: null };
    } catch (error) {
      return { data: null, error };
    }
  },

  async getCommunityPostsForMap() {
    try {
      const { data, error } = await supabase
        ?.from('community_posts')
        ?.select('id, title, sector, lat, lng, upvote_count')
        ?.eq('status', 'active')
        ?.not('lat', 'is', null)
        ?.not('lng', 'is', null);
      if (error) throw error;
      return { data: data || [], error: null };
    } catch (error) {
      return { data: [], error };
    }
  },

  // ─── REPLIES ─────────────────────────────────────────────────────────────

  async getRepliesByPostId(postId) {
    try {
      const { data, error } = await supabase
        ?.from('community_replies')
        ?.select('*, author:user_profiles(id, full_name, avatar_url), linked_business:businesses(id, name, category, address)')
        ?.eq('post_id', postId)
        ?.eq('status', 'active')
        ?.order('upvote_count', { ascending: false });
      if (error) throw error;
      return { data: data || [], error: null };
    } catch (error) {
      return { data: [], error };
    }
  },

  async createReply({ postId, body, userId, linkedBusinessId }) {
    try {
      const { data, error } = await supabase
        ?.from('community_replies')
        ?.insert({
          post_id: postId,
          body,
          user_id: userId,
          linked_business_id: linkedBusinessId || null,
          status: 'active',
        })
        ?.select('*, author:user_profiles(id, full_name, avatar_url), linked_business:businesses(id, name, category, address)')
        ?.single();
      if (error) throw error;
      return { data, error: null };
    } catch (error) {
      return { data: null, error };
    }
  },

  // ─── VOTES ───────────────────────────────────────────────────────────────

  async getUserVotes(userId, targetIds, targetType) {
    if (!userId || !targetIds?.length) return { data: [], error: null };
    try {
      const { data, error } = await supabase
        ?.from('community_votes')
        ?.select('target_id')
        ?.eq('user_id', userId)
        ?.eq('target_type', targetType)
        ?.in('target_id', targetIds);
      if (error) throw error;
      return { data: data || [], error: null };
    } catch (error) {
      return { data: [], error };
    }
  },

  async toggleVote({ userId, targetType, targetId, currentCount, hasVoted }) {
    try {
      if (hasVoted) {
        // Remove vote
        const { error: delError } = await supabase
          ?.from('community_votes')
          ?.delete()
          ?.eq('user_id', userId)
          ?.eq('target_type', targetType)
          ?.eq('target_id', targetId);
        if (delError) throw delError;

        // Decrement count
        const table = targetType === 'post' ? 'community_posts' : 'community_replies';
        await supabase?.from(table)?.update({ upvote_count: Math.max(0, currentCount - 1) })?.eq('id', targetId);
        return { voted: false, newCount: Math.max(0, currentCount - 1), error: null };
      } else {
        // Add vote
        const { error: insError } = await supabase
          ?.from('community_votes')
          ?.insert({ user_id: userId, target_type: targetType, target_id: targetId });
        if (insError) throw insError;

        // Increment count
        const table = targetType === 'post' ? 'community_posts' : 'community_replies';
        await supabase?.from(table)?.update({ upvote_count: currentCount + 1 })?.eq('id', targetId);
        return { voted: true, newCount: currentCount + 1, error: null };
      }
    } catch (error) {
      return { voted: hasVoted, newCount: currentCount, error };
    }
  },

  // ─── SUGGESTED BUSINESSES ────────────────────────────────────────────────

  async createSuggestedBusiness({ replyId, businessName, category, phone, address, suggestedBy }) {
    try {
      const { data, error } = await supabase
        ?.from('suggested_businesses')
        ?.insert({
          reply_id: replyId || null,
          business_name: businessName,
          category,
          phone: phone || null,
          address: address || null,
          suggested_by: suggestedBy,
          status: 'pending',
        })
        ?.select()
        ?.single();
      if (error) throw error;
      return { data, error: null };
    } catch (error) {
      return { data: null, error };
    }
  },

  // ─── ADMIN ───────────────────────────────────────────────────────────────

  async adminGetPosts({ status, search } = {}) {
    try {
      let query = supabase
        ?.from('community_posts')
        ?.select('*, author:user_profiles(id, full_name, email)')
        ?.order('created_at', { ascending: false });
      if (status && status !== 'all') query = query?.eq('status', status);
      if (search?.trim()) query = query?.or(`title.ilike.%${search}%,body.ilike.%${search}%`);
      const { data, error } = await query;
      if (error) throw error;
      return { data: data || [], error: null };
    } catch (error) {
      return { data: [], error };
    }
  },

  async adminUpdatePostStatus(id, status) {
    try {
      const { error } = await supabase?.from('community_posts')?.update({ status })?.eq('id', id);
      if (error) throw error;
      return { error: null };
    } catch (error) {
      return { error };
    }
  },

  async adminDeletePost(id) {
    try {
      const { error } = await supabase?.from('community_posts')?.delete()?.eq('id', id);
      if (error) throw error;
      return { error: null };
    } catch (error) {
      return { error };
    }
  },

  async adminGetSuggestedBusinesses({ status, search } = {}) {
    try {
      let query = supabase
        ?.from('suggested_businesses')
        ?.select('*, suggester:user_profiles(id, full_name, email)')
        ?.order('created_at', { ascending: false });
      if (status && status !== 'all') query = query?.eq('status', status);
      if (search?.trim()) query = query?.ilike('business_name', `%${search}%`);
      const { data, error } = await query;
      if (error) throw error;
      return { data: data || [], error: null };
    } catch (error) {
      return { data: [], error };
    }
  },

  async adminUpdateSuggestedBusiness(id, updates) {
    try {
      const { error } = await supabase?.from('suggested_businesses')?.update(updates)?.eq('id', id);
      if (error) throw error;
      return { error: null };
    } catch (error) {
      return { error };
    }
  },

  async adminDeleteSuggestedBusiness(id) {
    try {
      const { error } = await supabase?.from('suggested_businesses')?.delete()?.eq('id', id);
      if (error) throw error;
      return { error: null };
    } catch (error) {
      return { error };
    }
  },

  // ─── IMAGES ──────────────────────────────────────────────────────────────

  async uploadQuestionImages(questionId, files) {
    const { uploadFile } = await import('./uploadService');
    const results = [];
    for (const file of files) {
      try {
        const { url, error: uploadError } = await uploadFile(file, {
          entityType: 'community_question_image',
          entityId: questionId,
        });
        if (uploadError) throw uploadError;
        const { data, error: dbError } = await supabase?.from('community_question_images')?.insert({
          question_id: questionId,
          storage_path: url,
          public_url: url,
        })?.select()?.single();
        if (dbError) throw dbError;
        results?.push({ data, error: null });
      } catch (error) {
        results?.push({ data: null, error });
      }
    }
    return results;
  },

  async getQuestionImages(questionId) {
    try {
      const { data, error } = await supabase?.from('community_question_images')?.select('*')?.eq('question_id', questionId)?.order('created_at', { ascending: true });
      if (error) throw error;
      return { data: data || [], error: null };
    } catch (error) {
      return { data: [], error };
    }
  },

  async deleteQuestionImage(imageId, storagePath) {
    try {
      const { error } = await supabase?.from('community_question_images')?.delete()?.eq('id', imageId);
      if (error) throw error;
      return { error: null };
    } catch (error) {
      return { error };
    }
  },

  async getPostsWithImages(postIds) {
    if (!postIds?.length) return {};
    try {
      const { data, error } = await supabase?.from('community_question_images')?.select('question_id, public_url')?.in('question_id', postIds)?.order('created_at', { ascending: true });
      if (error) throw error;
      const map = {};
      (data || [])?.forEach(img => {
        if (!map?.[img?.question_id]) map[img.question_id] = img?.public_url;
      });
      return map;
    } catch {
      return {};
    }
  },
};
