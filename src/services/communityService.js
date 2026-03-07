import { supabase } from '../lib/supabase';

export const communityService = {
  // ─── POSTS ───────────────────────────────────────────────────────────────

  async getPosts({ sector = '', search = '', sort = 'recent', page = 1, pageSize = 12 } = {}) {
    try {
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
      } else if (sort === 'unanswered') {
        // We'll filter client-side for unanswered
        query = query?.order('created_at', { ascending: false });
      } else {
        query = query?.order('created_at', { ascending: false });
      }

      const from = (page - 1) * pageSize;
      const to = from + pageSize - 1;
      query = query?.range(from, to);

      const { data, error, count } = await query;
      if (error) throw error;

      // Get reply counts
      const postIds = (data || [])?.map(p => p?.id);
      let replyCounts = {};
      if (postIds?.length > 0) {
        const { data: replyData } = await supabase
          ?.from('community_replies')
          ?.select('post_id')
          ?.in('post_id', postIds)
          ?.eq('status', 'active');
        (replyData || [])?.forEach(r => {
          replyCounts[r?.post_id] = (replyCounts?.[r?.post_id] || 0) + 1;
        });
      }

      const enriched = (data || [])?.map(p => ({
        ...p,
        reply_count: replyCounts?.[p?.id] || 0,
      }));

      return { data: enriched, count: count || 0, error: null };
    } catch (error) {
      console.error('communityService.getPosts error:', error);
      return { data: [], count: 0, error };
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
    const results = [];
    for (const file of files) {
      try {
        const ext = file?.name?.split('.')?.pop();
        const storagePath = `${questionId}/${Date.now()}-${Math.random()?.toString(36)?.slice(2)}.${ext}`;
        const { error: uploadError } = await supabase?.storage?.from('community-images')?.upload(storagePath, file, { cacheControl: '3600', upsert: false });
        if (uploadError) throw uploadError;

        const { data: urlData } = supabase?.storage?.from('community-images')?.getPublicUrl(storagePath);

        const publicUrl = urlData?.publicUrl;

        const { data, error: dbError } = await supabase?.from('community_question_images')?.insert({ question_id: questionId, storage_path: storagePath, public_url: publicUrl })?.select()?.single();
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
      await supabase?.storage?.from('community-images')?.remove([storagePath]);
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
