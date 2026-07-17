import { supabase } from '../lib/supabase';

// Embed used everywhere a publication needs to reveal whether it's a poll. For a Pregunta,
// `poll` resolves to null — the type is derived from presence/absence, community_posts is
// never touched. Fetched via Supabase's FK-based embedding, so listing N posts still costs a
// single request/query, not N+1.
const POLL_EMBED = 'poll:community_polls(id, closes_at, status, results_visibility, created_at, options:community_poll_options(id, label, position, vote_count))';

function withSortedPollOptions(post) {
  if (!post?.poll?.options?.length) return post;
  return {
    ...post,
    poll: {
      ...post?.poll,
      options: [...post?.poll?.options]?.sort((a, b) => a?.position - b?.position),
    },
  };
}

export const communityService = {
  // ─── POSTS ───────────────────────────────────────────────────────────────

  async getPosts({ sector = '', search = '', sort = 'recent', page = 1, pageSize = 12 } = {}) {
    try {
      let query = supabase
        ?.from('community_posts')
        ?.select(`*, author:user_profiles(id, full_name, avatar_url), ${POLL_EMBED}`, { count: 'exact' })
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
        ...withSortedPollOptions(p),
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
        ?.select(`*, author:user_profiles(id, full_name, avatar_url), ${POLL_EMBED}`)
        ?.eq('id', id)
        ?.single();
      if (error) throw error;
      return { data: withSortedPollOptions(data), error: null };
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

  // ─── POLLS ───────────────────────────────────────────────────────────────
  // Poll option voting is a separate concept from the upvotes above: `community_votes`
  // stays exactly as-is and keeps meaning "me interesa esta publicación". A poll vote is an
  // exclusive choice among 2-6 options, stored in community_poll_votes, and it is never
  // written directly from here — every vote goes through the cast_poll_vote RPC (see the
  // migration) so the database enforces atomicity and the closes_at/open check server-side.

  async createPoll({ title, body, sector, lat, lng, userId, options, closesAt }) {
    const trimmedOptions = (options || [])
      ?.map(opt => opt?.trim())
      ?.filter(Boolean);

    if (trimmedOptions?.length < 2) {
      return { data: null, error: new Error('La encuesta necesita al menos 2 opciones') };
    }
    if (trimmedOptions?.length > 6) {
      return { data: null, error: new Error('La encuesta admite un máximo de 6 opciones') };
    }

    const { data: post, error: postError } = await this.createPost({
      title,
      body: body?.trim() || '',
      sector,
      lat,
      lng,
      userId,
    });
    if (postError) return { data: null, error: postError };

    try {
      const { data: poll, error: pollError } = await supabase
        ?.from('community_polls')
        ?.insert({ post_id: post?.id, closes_at: closesAt || null })
        ?.select()
        ?.single();
      if (pollError) throw pollError;

      const { data: insertedOptions, error: optionsError } = await supabase
        ?.from('community_poll_options')
        ?.insert(trimmedOptions?.map((label, position) => ({ poll_id: poll?.id, label, position })))
        ?.select();
      if (optionsError) throw optionsError;

      return {
        data: {
          ...post,
          poll: {
            ...poll,
            options: (insertedOptions || [])?.sort((a, b) => a?.position - b?.position),
          },
        },
        error: null,
      };
    } catch (error) {
      // Best-effort cleanup: cascade delete takes care of any poll/options row that did
      // get created before the failure, so we never leave an orphaned "encuesta" post.
      await supabase?.from('community_posts')?.delete()?.eq('id', post?.id);
      return { data: null, error };
    }
  },

  async getUserPollVote(userId, pollId) {
    if (!userId || !pollId) return { data: null, error: null };
    try {
      const { data, error } = await supabase
        ?.from('community_poll_votes')
        ?.select('option_id')
        ?.eq('user_id', userId)
        ?.eq('poll_id', pollId)
        ?.maybeSingle();
      if (error) throw error;
      return { data: data || null, error: null };
    } catch (error) {
      return { data: null, error };
    }
  },

  async getUserPollVotesForPosts(userId, pollIds) {
    if (!userId || !pollIds?.length) return { data: [], error: null };
    try {
      const { data, error } = await supabase
        ?.from('community_poll_votes')
        ?.select('poll_id, option_id')
        ?.eq('user_id', userId)
        ?.in('poll_id', pollIds);
      if (error) throw error;
      return { data: data || [], error: null };
    } catch (error) {
      return { data: [], error };
    }
  },

  // Only path that ever writes to community_poll_votes / adjusts vote_count. See
  // cast_poll_vote() in the migration for the atomicity and closed-poll guarantees.
  async castPollVote({ pollId, optionId }) {
    try {
      const { data, error } = await supabase?.rpc('cast_poll_vote', {
        p_poll_id: pollId,
        p_option_id: optionId,
      });
      if (error) throw error;
      return { data: (data || [])?.sort((a, b) => a?.position - b?.position), error: null };
    } catch (error) {
      return { data: null, error };
    }
  },

  isPollClosed(poll) {
    if (!poll) return false;
    if (poll?.status === 'closed') return true;
    if (poll?.closes_at && new Date(poll?.closes_at)?.getTime() <= Date.now()) return true;
    return false;
  },

  async adminClosePoll(pollId) {
    try {
      const { error } = await supabase?.from('community_polls')?.update({ status: 'closed' })?.eq('id', pollId);
      if (error) throw error;
      return { error: null };
    } catch (error) {
      return { error };
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
      const posts = data || [];

      // Fetched as a second, independent query on purpose: a broken/out-of-sync
      // community_polls relation (missing column, RLS issue, etc.) must never take the
      // whole moderation queue down with it. Worst case, polls just render as "Pregunta".
      const postIds = posts?.map(p => p?.id)?.filter(Boolean);
      let pollsByPostId = {};
      if (postIds?.length) {
        try {
          const { data: polls, error: pollsError } = await supabase
            ?.from('community_polls')
            ?.select('id, post_id, status, closes_at')
            ?.in('post_id', postIds);
          if (pollsError) throw pollsError;
          pollsByPostId = (polls || [])?.reduce((acc, poll) => {
            acc[poll?.post_id] = poll;
            return acc;
          }, {});
        } catch (pollsError) {
          console.error('adminGetPosts: no se pudieron cargar las encuestas asociadas', pollsError);
        }
      }

      return {
        data: posts?.map(post => ({ ...post, poll: pollsByPostId?.[post?.id] || null })),
        error: null,
      };
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
