import React, { useState, useEffect, useCallback } from 'react';
import Icon from 'components/AppIcon';
import { supabase } from '../../../lib/supabase';
import { messageService } from '../../../services/messageService';
import { useAuth } from '../../../contexts/AuthContext';

function ConversationItem({ conv, isActive, onClick }) {
  return (
    <button
      onClick={onClick}
      className={`w-full flex items-start gap-3 p-3 rounded-xl text-left transition-colors ${
        isActive ? 'border' : 'hover:bg-muted'
      }`}
      style={isActive ? { background: 'var(--color-primary)' + '15', borderColor: 'var(--color-primary)' } : {}}
    >
      <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center flex-shrink-0 overflow-hidden">
        {conv?.otherUserAvatar ? (
          <img src={conv?.otherUserAvatar} alt={conv?.otherUserName} className="w-full h-full object-cover" />
        ) : (
          <Icon name="User" size={18} color="var(--color-muted-foreground)" />
        )}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-1">
          <span className="font-medium text-sm text-foreground truncate">{conv?.otherUserName}</span>
          <span className="text-xs text-muted-foreground flex-shrink-0">{messageService?.formatTimeAgo(conv?.lastMessageAt)}</span>
        </div>
        <p className="text-xs text-muted-foreground truncate mt-0.5">{conv?.adTitle}</p>
        <p className="text-xs text-muted-foreground truncate">{conv?.lastMessage}</p>
      </div>
      {conv?.unreadCount > 0 && (
        <span className="flex-shrink-0 w-5 h-5 rounded-full text-white text-xs flex items-center justify-center font-bold" style={{ background: 'var(--color-primary)' }}>
          {conv?.unreadCount}
        </span>
      )}
    </button>
  );
}

export default function MessagesTab() {
  const { user } = useAuth();
  const [conversations, setConversations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeConv, setActiveConv] = useState(null);
  const [thread, setThread] = useState([]);
  const [threadLoading, setThreadLoading] = useState(false);
  const [replyText, setReplyText] = useState('');
  const [sending, setSending] = useState(false);

  const loadConversations = useCallback(async () => {
    if (!user?.id) return;
    setLoading(true);
    // Fetch messages where the owner is the receiver (messages from customers)
    const { data, error } = await supabase
      ?.from('ad_messages')
      ?.select(`
        id, ad_id, sender_id, receiver_id, body, is_read, created_at, parent_id,
        classified_ads!ad_messages_ad_id_fkey(id, title, user_id),
        sender:user_profiles!ad_messages_sender_id_fkey(id, full_name, avatar_url)
      `)
      ?.eq('receiver_id', user?.id)
      ?.is('parent_id', null)
      ?.order('created_at', { ascending: false });

    if (!error && data) {
      const convMap = {};
      data?.forEach(msg => {
        const key = `${msg?.ad_id}_${msg?.sender_id}`;
        if (!convMap?.[key]) {
          convMap[key] = {
            adId: msg?.ad_id,
            adTitle: msg?.classified_ads?.title || 'Aviso eliminado',
            otherUserId: msg?.sender_id,
            otherUserName: msg?.sender?.full_name || 'Usuario',
            otherUserAvatar: msg?.sender?.avatar_url,
            lastMessage: msg?.body,
            lastMessageAt: msg?.created_at,
            unreadCount: 0,
          };
        }
        if (!msg?.is_read) convMap[key].unreadCount++;
      });
      setConversations(Object.values(convMap));
    }
    setLoading(false);
  }, [user?.id]);

  useEffect(() => { loadConversations(); }, [loadConversations]);

  const openConversation = async (conv) => {
    setActiveConv(conv);
    setThreadLoading(true);
    const { data } = await messageService?.getThread({
      adId: conv?.adId,
      userId: user?.id,
      otherUserId: conv?.otherUserId,
    });
    setThread(data || []);
    setThreadLoading(false);
    // Mark as read
    await messageService?.markAsRead({ adId: conv?.adId, receiverId: user?.id, senderId: conv?.otherUserId });
    setConversations(prev => prev?.map(c =>
      c?.adId === conv?.adId && c?.otherUserId === conv?.otherUserId
        ? { ...c, unreadCount: 0 }
        : c
    ));
  };

  const handleSendReply = async () => {
    if (!replyText?.trim() || !activeConv) return;
    setSending(true);
    const { data, error } = await messageService?.sendMessage({
      adId: activeConv?.adId,
      senderId: user?.id,
      receiverId: activeConv?.otherUserId,
      body: replyText?.trim(),
    });
    if (!error && data) {
      setThread(prev => [...prev, { ...data, sender: { id: user?.id, full_name: 'Tú', avatar_url: null } }]);
      setReplyText('');
    }
    setSending(false);
  };

  if (loading) return (
    <div className="py-16 text-center">
      <div className="w-8 h-8 border-2 border-t-transparent rounded-full animate-spin mx-auto mb-3" style={{ borderColor: 'var(--color-primary)', borderTopColor: 'transparent' }} />
      <p className="text-sm text-muted-foreground">Cargando mensajes...</p>
    </div>
  );

  if (!conversations?.length) return (
    <div className="py-16 text-center">
      <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4" style={{ background: 'var(--color-muted)' }}>
        <Icon name="MessageSquare" size={32} color="var(--color-muted-foreground)" />
      </div>
      <h3 className="font-heading font-semibold text-foreground mb-2">No tienes mensajes de clientes aún</h3>
      <p className="text-sm text-muted-foreground">Cuando alguien te contacte a través de un aviso, aparecerá aquí.</p>
    </div>
  );

  return (
    <div className="flex gap-4 h-[600px]">
      {/* Conversation List */}
      <div className={`flex flex-col gap-1 overflow-y-auto ${activeConv ? 'hidden md:flex w-72 flex-shrink-0' : 'w-full'}`}>
        {conversations?.map(conv => (
          <ConversationItem
            key={`${conv?.adId}_${conv?.otherUserId}`}
            conv={conv}
            isActive={activeConv?.adId === conv?.adId && activeConv?.otherUserId === conv?.otherUserId}
            onClick={() => openConversation(conv)}
          />
        ))}
      </div>

      {/* Thread View */}
      {activeConv && (
        <div className="flex-1 flex flex-col border border-border rounded-xl overflow-hidden">
          {/* Thread Header */}
          <div className="flex items-center gap-3 px-4 py-3 border-b border-border bg-card">
            <button
              onClick={() => setActiveConv(null)}
              className="md:hidden p-1 rounded hover:bg-muted transition-colors"
            >
              <Icon name="ArrowLeft" size={18} color="currentColor" />
            </button>
            <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center overflow-hidden">
              {activeConv?.otherUserAvatar ? (
                <img src={activeConv?.otherUserAvatar} alt={activeConv?.otherUserName} className="w-full h-full object-cover" />
              ) : (
                <Icon name="User" size={14} color="var(--color-muted-foreground)" />
              )}
            </div>
            <div>
              <p className="font-medium text-sm text-foreground">{activeConv?.otherUserName}</p>
              <p className="text-xs text-muted-foreground">{activeConv?.adTitle}</p>
            </div>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {threadLoading ? (
              <div className="py-8 text-center">
                <div className="w-6 h-6 border-2 border-t-transparent rounded-full animate-spin mx-auto" style={{ borderColor: 'var(--color-primary)', borderTopColor: 'transparent' }} />
              </div>
            ) : thread?.map(msg => {
              const isOwn = msg?.sender_id === user?.id;
              return (
                <div key={msg?.id} className={`flex ${isOwn ? 'justify-end' : 'justify-start'}`}>
                  <div
                    className={`max-w-[75%] px-3 py-2 rounded-xl text-sm ${
                      isOwn ? 'text-white rounded-br-sm' : 'bg-muted text-foreground rounded-bl-sm'
                    }`}
                    style={isOwn ? { background: 'var(--color-primary)' } : {}}
                  >
                    <p>{msg?.body}</p>
                    <p className={`text-xs mt-1 ${isOwn ? 'text-white/70' : 'text-muted-foreground'}`}>
                      {messageService?.formatTimeAgo(msg?.created_at)}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Reply Input */}
          <div className="p-3 border-t border-border flex gap-2">
            <input
              type="text"
              value={replyText}
              onChange={e => setReplyText(e?.target?.value)}
              onKeyDown={e => e?.key === 'Enter' && !e?.shiftKey && handleSendReply()}
              placeholder="Escribe una respuesta..."
              className="flex-1 px-3 py-2 text-sm border border-border rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            />
            <button
              onClick={handleSendReply}
              disabled={sending || !replyText?.trim()}
              className="px-3 py-2 rounded-lg text-white transition-colors disabled:opacity-50"
              style={{ background: 'var(--color-primary)' }}
            >
              <Icon name="Send" size={16} color="white" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
