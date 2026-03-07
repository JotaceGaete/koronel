import { supabase } from '../lib/supabase';

export const messageService = {
  // Send a message to an ad owner (or reply to a thread)
  async sendMessage({ adId, senderId, receiverId, body, parentId = null }) {
    try {
      const { data, error } = await supabase
        ?.from('ad_messages')
        ?.insert({
          ad_id: adId,
          sender_id: senderId,
          receiver_id: receiverId,
          body: body?.trim(),
          parent_id: parentId || null,
          is_read: false
        })
        ?.select()
        ?.single();
      if (error) throw error;
      return { data, error: null };
    } catch (error) {
      console.error('messageService.sendMessage error:', error);
      return { data: null, error };
    }
  },

  // Get all conversations for a user (grouped by ad + other party)
  async getConversations(userId) {
    try {
      const { data, error } = await supabase
        ?.from('ad_messages')
        ?.select(`
          id,
          ad_id,
          sender_id,
          receiver_id,
          body,
          is_read,
          created_at,
          parent_id,
          classified_ads!ad_messages_ad_id_fkey(id, title),
          sender:user_profiles!ad_messages_sender_id_fkey(id, full_name, avatar_url),
          receiver:user_profiles!ad_messages_receiver_id_fkey(id, full_name, avatar_url)
        `)
        ?.or(`sender_id.eq.${userId},receiver_id.eq.${userId}`)
        ?.is('parent_id', null)
        ?.order('created_at', { ascending: false });
      if (error) throw error;

      // Group by ad_id + other party
      const conversationMap = {};
      (data || [])?.forEach(msg => {
        const otherId = msg?.sender_id === userId ? msg?.receiver_id : msg?.sender_id;
        const key = `${msg?.ad_id}_${otherId}`;
        if (!conversationMap?.[key]) {
          conversationMap[key] = {
            adId: msg?.ad_id,
            adTitle: msg?.classified_ads?.title || 'Aviso eliminado',
            otherUserId: otherId,
            otherUserName: msg?.sender_id === userId
              ? (msg?.receiver?.full_name || 'Usuario')
              : (msg?.sender?.full_name || 'Usuario'),
            otherUserAvatar: msg?.sender_id === userId
              ? msg?.receiver?.avatar_url
              : msg?.sender?.avatar_url,
            lastMessage: msg?.body,
            lastMessageAt: msg?.created_at,
            unreadCount: 0,
            messages: []
          };
        }
        if (!msg?.is_read && msg?.receiver_id === userId) {
          conversationMap[key].unreadCount++;
        }
      });

      return { data: Object.values(conversationMap), error: null };
    } catch (error) {
      console.error('messageService.getConversations error:', error);
      return { data: [], error };
    }
  },

  // Get full thread for a specific ad + other user
  async getThread({ adId, userId, otherUserId }) {
    try {
      const { data, error } = await supabase
        ?.from('ad_messages')
        ?.select(`
          id,
          ad_id,
          sender_id,
          receiver_id,
          body,
          is_read,
          created_at,
          parent_id,
          sender:user_profiles!ad_messages_sender_id_fkey(id, full_name, avatar_url),
          receiver:user_profiles!ad_messages_receiver_id_fkey(id, full_name, avatar_url)
        `)
        ?.eq('ad_id', adId)
        ?.or(`and(sender_id.eq.${userId},receiver_id.eq.${otherUserId}),and(sender_id.eq.${otherUserId},receiver_id.eq.${userId})`)
        ?.order('created_at', { ascending: true });
      if (error) throw error;
      return { data: data || [], error: null };
    } catch (error) {
      console.error('messageService.getThread error:', error);
      return { data: [], error };
    }
  },

  // Mark messages as read
  async markAsRead({ adId, receiverId, senderId }) {
    try {
      const { error } = await supabase
        ?.from('ad_messages')
        ?.update({ is_read: true })
        ?.eq('ad_id', adId)
        ?.eq('receiver_id', receiverId)
        ?.eq('sender_id', senderId)
        ?.eq('is_read', false);
      if (error) throw error;
      return { error: null };
    } catch (error) {
      return { error };
    }
  },

  // Get unread message count for a user
  async getUnreadCount(userId) {
    try {
      const { count, error } = await supabase
        ?.from('ad_messages')
        ?.select('*', { count: 'exact', head: true })
        ?.eq('receiver_id', userId)
        ?.eq('is_read', false);
      if (error) throw error;
      return { count: count || 0, error: null };
    } catch (error) {
      return { count: 0, error };
    }
  },

  // Get ad owner user_id for a given ad
  async getAdOwner(adId) {
    try {
      const { data, error } = await supabase
        ?.from('classified_ads')
        ?.select('user_id, title, user_profiles!classified_ads_user_id_fkey(id, full_name, avatar_url, updated_at)')
        ?.eq('id', adId)
        ?.single();
      if (error) throw error;
      return { data, error: null };
    } catch (error) {
      return { data: null, error };
    }
  },

  formatTimeAgo(dateStr) {
    if (!dateStr) return '';
    const now = Date.now();
    const date = new Date(dateStr);
    const diffMs = now - date?.getTime();
    const diffMin = Math.floor(diffMs / 60000);
    const diffH = Math.floor(diffMs / 3600000);
    const diffD = Math.floor(diffMs / 86400000);
    if (diffMin < 1) return 'Ahora';
    if (diffMin < 60) return `Hace ${diffMin} min`;
    if (diffH < 24) return `Hace ${diffH} hora${diffH > 1 ? 's' : ''}`;
    if (diffD === 1) return 'Ayer';
    if (diffD < 7) return `Hace ${diffD} días`;
    return date?.toLocaleDateString('es-CL', { day: '2-digit', month: 'short' });
  },

  formatLastSeen(dateStr) {
    if (!dateStr) return null;
    const now = Date.now();
    const date = new Date(dateStr);
    const diffMs = now - date?.getTime();
    const diffMin = Math.floor(diffMs / 60000);
    const diffH = Math.floor(diffMs / 3600000);
    const diffD = Math.floor(diffMs / 86400000);
    if (diffMin < 60) return 'Hoy';
    if (diffH < 24) return `Hace ${diffH} hora${diffH > 1 ? 's' : ''}`;
    if (diffD === 1) return 'Ayer';
    if (diffD < 7) return `Hace ${diffD} días`;
    return date?.toLocaleDateString('es-CL', { day: '2-digit', month: 'short', year: 'numeric' });
  },

  // Subscribe to new incoming messages for a user (real-time)
  subscribeToNewMessages(userId, onNewMessage) {
    const channel = supabase
      ?.channel(`new_messages_${userId}`)
      ?.on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'ad_messages',
          filter: `receiver_id=eq.${userId}`
        },
        (payload) => {
          if (payload?.new) onNewMessage(payload?.new);
        }
      )
      ?.subscribe();
    return channel;
  },

  unsubscribeFromMessages(channel) {
    if (channel) supabase?.removeChannel(channel);
  }
};
