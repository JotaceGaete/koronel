import React, { useState, useEffect, useRef } from 'react';
import Icon from 'components/AppIcon';
import { messageService } from '../../../services/messageService';
import { useAuth } from '../../../contexts/AuthContext';
import { Link } from 'react-router-dom';

export default function MyMessagesTab({ onMessagesRead }) {
  const { user, userProfile } = useAuth();
  const [conversations, setConversations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeConv, setActiveConv] = useState(null);
  const [thread, setThread] = useState([]);
  const [threadLoading, setThreadLoading] = useState(false);
  const [replyText, setReplyText] = useState('');
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState(null);
  const bottomRef = useRef(null);

  useEffect(() => {
    if (user?.id) loadConversations();
  }, [user?.id]);

  useEffect(() => {
    bottomRef?.current?.scrollIntoView({ behavior: 'smooth' });
  }, [thread]);

  const loadConversations = async () => {
    setLoading(true);
    const { data } = await messageService?.getConversations(user?.id);
    setConversations(data || []);
    setLoading(false);
  };

  const openConversation = async (conv) => {
    setActiveConv(conv);
    setThreadLoading(true);
    setReplyText('');
    setSendError(null);
    const { data } = await messageService?.getThread({
      adId: conv?.adId,
      userId: user?.id,
      otherUserId: conv?.otherUserId
    });
    setThread(data || []);
    setThreadLoading(false);
    // Mark as read
    await messageService?.markAsRead({
      adId: conv?.adId,
      receiverId: user?.id,
      senderId: conv?.otherUserId
    });
    // Update unread count locally
    setConversations(prev =>
      prev?.map(c =>
        c?.adId === conv?.adId && c?.otherUserId === conv?.otherUserId
          ? { ...c, unreadCount: 0 }
          : c
      )
    );
    // Notify parent to refresh global unread count
    onMessagesRead?.();
  };

  const handleReply = async (e) => {
    e?.preventDefault();
    if (!replyText?.trim() || !activeConv) return;
    setSending(true);
    setSendError(null);
    const { data, error } = await messageService?.sendMessage({
      adId: activeConv?.adId,
      senderId: user?.id,
      receiverId: activeConv?.otherUserId,
      body: replyText?.trim()
    });
    if (error) {
      setSendError('No se pudo enviar el mensaje. Intenta de nuevo.');
    } else {
      setReplyText('');
      // Append new message to thread
      const newMsg = {
        ...data,
        sender: { id: user?.id, full_name: userProfile?.full_name || 'Tú', avatar_url: userProfile?.avatar_url }
      };
      setThread(prev => [...(prev || []), newMsg]);
      // Update last message in conversations list
      setConversations(prev =>
        prev?.map(c =>
          c?.adId === activeConv?.adId && c?.otherUserId === activeConv?.otherUserId
            ? { ...c, lastMessage: replyText?.trim(), lastMessageAt: new Date()?.toISOString() }
            : c
        )
      );
    }
    setSending(false);
  };

  if (loading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3]?.map(i => (
          <div key={i} className="animate-pulse flex items-center gap-3 p-3 rounded-lg bg-muted">
            <div className="w-10 h-10 rounded-full bg-muted-foreground/20 shrink-0" />
            <div className="flex-1 space-y-2">
              <div className="h-3 bg-muted-foreground/20 rounded w-1/3" />
              <div className="h-3 bg-muted-foreground/20 rounded w-2/3" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (conversations?.length === 0 && !activeConv) {
    return (
      <div className="text-center py-12">
        <div className="w-14 h-14 rounded-full bg-muted flex items-center justify-center mx-auto mb-4">
          <Icon name="MessageSquare" size={24} color="var(--color-muted-foreground)" />
        </div>
        <h3 className="font-heading font-semibold text-base text-foreground mb-1">Sin mensajes</h3>
        <p className="text-sm text-muted-foreground mb-4">Cuando contactes a un anunciante, tus mensajes aparecerán aquí.</p>
        <Link
          to="/classified-ads-listing"
          className="inline-flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium text-primary-foreground"
          style={{ background: 'var(--color-primary)' }}
        >
          <Icon name="Search" size={14} color="currentColor" />
          Ver clasificados
        </Link>
      </div>
    );
  }

  return (
    <div className="flex gap-0 h-[520px] border border-border rounded-lg overflow-hidden">
      {/* Conversations list */}
      <div
        className={`flex flex-col border-r border-border ${
          activeConv ? 'hidden md:flex w-72 shrink-0' : 'flex w-full md:w-72 md:shrink-0'
        }`}
      >
        <div className="px-3 py-2.5 border-b border-border">
          <h3 className="font-heading font-semibold text-sm text-foreground">Conversaciones</h3>
        </div>
        <div className="flex-1 overflow-y-auto">
          {conversations?.map((conv, idx) => (
            <button
              key={`${conv?.adId}_${conv?.otherUserId}`}
              onClick={() => openConversation(conv)}
              className={`w-full flex items-start gap-3 px-3 py-3 text-left hover:bg-muted transition-colors border-b border-border/50 ${
                activeConv?.adId === conv?.adId && activeConv?.otherUserId === conv?.otherUserId
                  ? 'bg-muted' :''
              }`}
            >
              {/* Avatar */}
              <div className="w-9 h-9 rounded-full bg-muted flex items-center justify-center shrink-0 text-sm font-semibold" style={{ background: 'var(--color-primary)', color: 'white' }}>
                {conv?.otherUserName?.charAt(0)?.toUpperCase() || '?'}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-1">
                  <span className="text-sm font-medium text-foreground truncate">{conv?.otherUserName}</span>
                  {conv?.unreadCount > 0 && (
                    <span className="shrink-0 w-4 h-4 rounded-full text-xs flex items-center justify-center font-bold" style={{ background: 'var(--color-primary)', color: 'white' }}>
                      {conv?.unreadCount}
                    </span>
                  )}
                </div>
                <p className="text-xs text-muted-foreground truncate">{conv?.adTitle}</p>
                <p className="text-xs text-muted-foreground truncate mt-0.5">{conv?.lastMessage}</p>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Thread view */}
      {activeConv ? (
        <div className="flex flex-col flex-1 min-w-0">
          {/* Thread header */}
          <div className="flex items-center gap-2 px-3 py-2.5 border-b border-border bg-card">
            <button
              onClick={() => setActiveConv(null)}
              className="md:hidden p-1 rounded hover:bg-muted transition-colors"
            >
              <Icon name="ArrowLeft" size={16} color="var(--color-muted-foreground)" />
            </button>
            <div className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold shrink-0" style={{ background: 'var(--color-primary)', color: 'white' }}>
              {activeConv?.otherUserName?.charAt(0)?.toUpperCase()}
            </div>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-foreground truncate">{activeConv?.otherUserName}</p>
              <Link
                to={`/clasificados/${activeConv?.adId}`}
                className="text-xs text-primary hover:underline truncate block"
              >
                {activeConv?.adTitle}
              </Link>
            </div>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-3 space-y-3">
            {threadLoading ? (
              <div className="flex items-center justify-center h-full">
                <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
              </div>
            ) : thread?.length === 0 ? (
              <p className="text-center text-sm text-muted-foreground py-8">No hay mensajes en esta conversación.</p>
            ) : (
              thread?.map(msg => {
                const isOwn = msg?.sender_id === user?.id;
                return (
                  <div key={msg?.id} className={`flex ${isOwn ? 'justify-end' : 'justify-start'}`}>
                    <div
                      className={`max-w-[75%] px-3 py-2 rounded-xl text-sm leading-relaxed ${
                        isOwn
                          ? 'rounded-br-sm text-white' :'rounded-bl-sm bg-muted text-foreground'
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
              })
            )}
            <div ref={bottomRef} />
          </div>

          {/* Reply form */}
          <form onSubmit={handleReply} className="border-t border-border p-3 flex gap-2">
            <input
              type="text"
              value={replyText}
              onChange={e => setReplyText(e?.target?.value)}
              placeholder="Escribe tu respuesta..."
              className="flex-1 px-3 py-2 text-sm rounded-md border border-border bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              disabled={sending}
            />
            <button
              type="submit"
              disabled={sending || !replyText?.trim()}
              className="px-3 py-2 rounded-md text-white text-sm font-medium disabled:opacity-50 transition-opacity flex items-center gap-1"
              style={{ background: 'var(--color-primary)' }}
            >
              {sending ? (
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <Icon name="Send" size={14} color="white" />
              )}
            </button>
          </form>
          {sendError && (
            <p className="text-xs text-red-500 px-3 pb-2">{sendError}</p>
          )}
        </div>
      ) : (
        <div className="hidden md:flex flex-1 items-center justify-center">
          <div className="text-center">
            <Icon name="MessageSquare" size={32} color="var(--color-muted-foreground)" className="mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">Selecciona una conversación</p>
          </div>
        </div>
      )}
    </div>
  );
}
