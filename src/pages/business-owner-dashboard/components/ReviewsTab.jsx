import React, { useState, useEffect, useCallback } from 'react';
import Icon from 'components/AppIcon';
import { businessService } from '../../../services/businessService';
import { supabase } from '../../../lib/supabase';

function StarRating({ rating }) {
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5]?.map(star => (
        <Icon
          key={star}
          name="Star"
          size={14}
          color={star <= rating ? '#f59e0b' : '#d1d5db'}
          fill={star <= rating ? '#f59e0b' : 'none'}
        />
      ))}
    </div>
  );
}

function ReviewCard({ review, onReplySubmit }) {
  const [showReplyForm, setShowReplyForm] = useState(false);
  const [replyText, setReplyText] = useState(review?.owner_reply || '');
  const [submitting, setSubmitting] = useState(false);
  const [editingReply, setEditingReply] = useState(false);

  const authorName = review?.user_profiles?.full_name || 'Usuario';
  const authorAvatar = review?.user_profiles?.avatar_url;
  const dateStr = review?.created_at
    ? new Date(review?.created_at)?.toLocaleDateString('es-CL', { day: '2-digit', month: 'long', year: 'numeric' })
    : '';

  const handleSubmitReply = async () => {
    if (!replyText?.trim()) return;
    setSubmitting(true);
    const { data, error } = await businessService?.submitOwnerReply(review?.id, replyText?.trim());
    setSubmitting(false);
    if (!error) {
      onReplySubmit(review?.id, data);
      setShowReplyForm(false);
      setEditingReply(false);
    }
  };

  return (
    <div className="bg-card border border-border rounded-xl p-4 space-y-3">
      {/* Author + Rating */}
      <div className="flex items-start gap-3">
        <div className="w-9 h-9 rounded-full bg-muted flex items-center justify-center flex-shrink-0 overflow-hidden">
          {authorAvatar ? (
            <img src={authorAvatar} alt={authorName} className="w-full h-full object-cover" />
          ) : (
            <Icon name="User" size={16} color="var(--color-muted-foreground)" />
          )}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2">
            <span className="font-medium text-sm text-foreground">{authorName}</span>
            <span className="text-xs text-muted-foreground">{dateStr}</span>
          </div>
          <StarRating rating={review?.rating} />
        </div>
      </div>

      {/* Comment */}
      <p className="text-sm text-foreground leading-relaxed">{review?.comment}</p>

      {/* Owner Reply */}
      {review?.owner_reply && !editingReply ? (
        <div className="bg-muted rounded-lg p-3 border-l-4" style={{ borderLeftColor: 'var(--color-primary)' }}>
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs font-semibold text-primary">Tu respuesta</span>
            <button
              onClick={() => { setEditingReply(true); setReplyText(review?.owner_reply); setShowReplyForm(true); }}
              className="text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              Editar respuesta
            </button>
          </div>
          <p className="text-sm text-foreground">{review?.owner_reply}</p>
        </div>
      ) : null}

      {/* Reply Form */}
      {(showReplyForm || editingReply) ? (
        <div className="space-y-2">
          <textarea
            value={replyText}
            onChange={e => setReplyText(e?.target?.value)}
            placeholder="Escribe tu respuesta..."
            rows={3}
            className="w-full px-3 py-2 text-sm border border-border rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring resize-none"
          />
          <div className="flex gap-2">
            <button
              onClick={() => { setShowReplyForm(false); setEditingReply(false); setReplyText(review?.owner_reply || ''); }}
              className="px-3 py-1.5 text-sm border border-border rounded-lg hover:bg-muted transition-colors"
            >
              Cancelar
            </button>
            <button
              onClick={handleSubmitReply}
              disabled={submitting || !replyText?.trim()}
              className="px-3 py-1.5 text-sm text-white rounded-lg transition-colors disabled:opacity-50"
              style={{ background: 'var(--color-primary)' }}
            >
              {submitting ? 'Publicando...' : 'Publicar respuesta'}
            </button>
          </div>
        </div>
      ) : !review?.owner_reply ? (
        <button
          onClick={() => setShowReplyForm(true)}
          className="flex items-center gap-1.5 text-sm font-medium transition-colors"
          style={{ color: 'var(--color-primary)' }}
        >
          <Icon name="Reply" size={14} color="currentColor" />
          Responder
        </button>
      ) : null}
    </div>
  );
}

export default function ReviewsTab({ businesses }) {
  const [allReviews, setAllReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');

  const loadReviews = useCallback(async () => {
    if (!businesses?.length) { setLoading(false); return; }
    setLoading(true);
    const ids = businesses?.map(b => b?.id);
    const { data, error } = await supabase
      ?.from('business_reviews')
      ?.select('*, user_profiles(id, full_name, avatar_url)')
      ?.in('business_id', ids)
      ?.order('created_at', { ascending: false });
    if (!error) setAllReviews(data || []);
    setLoading(false);
  }, [businesses]);

  useEffect(() => { loadReviews(); }, [loadReviews]);

  const handleReplySubmit = (reviewId, updatedReview) => {
    setAllReviews(prev => prev?.map(r => r?.id === reviewId ? { ...r, ...updatedReview } : r));
  };

  const filtered = allReviews?.filter(r => {
    if (filter === 'unanswered') return !r?.owner_reply;
    if (filter === 'answered') return !!r?.owner_reply;
    return true;
  });

  const unansweredCount = allReviews?.filter(r => !r?.owner_reply)?.length;

  const getBusinessName = (businessId) => businesses?.find(b => b?.id === businessId)?.name || '';

  if (loading) return (
    <div className="py-16 text-center">
      <div className="w-8 h-8 border-2 border-t-transparent rounded-full animate-spin mx-auto mb-3" style={{ borderColor: 'var(--color-primary)', borderTopColor: 'transparent' }} />
      <p className="text-sm text-muted-foreground">Cargando reseñas...</p>
    </div>
  );

  return (
    <div className="space-y-4">
      {/* Filter Chips */}
      <div className="flex items-center gap-2 flex-wrap">
        {[['all', 'Todas'], ['unanswered', 'Sin responder'], ['answered', 'Respondidas']]?.map(([val, label]) => (
          <button
            key={val}
            onClick={() => setFilter(val)}
            className={`px-3 py-1.5 text-sm rounded-full font-medium transition-colors ${
              filter === val ? 'text-white' : 'bg-muted text-muted-foreground hover:bg-border'
            }`}
            style={filter === val ? { background: 'var(--color-primary)' } : {}}
          >
            {label}
            {val === 'unanswered' && unansweredCount > 0 && (
              <span className="ml-1.5 bg-white text-primary text-xs font-bold px-1.5 py-0.5 rounded-full" style={{ color: 'var(--color-primary)' }}>
                {unansweredCount}
              </span>
            )}
          </button>
        ))}
      </div>

      {filtered?.length === 0 ? (
        <div className="py-12 text-center">
          <Icon name="MessageSquare" size={40} color="var(--color-muted-foreground)" className="mx-auto mb-3" />
          <p className="text-sm text-muted-foreground">No hay reseñas {filter !== 'all' ? 'con este filtro' : 'aún'}.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {businesses?.length > 1
            ? businesses?.map(biz => {
                const bizReviews = filtered?.filter(r => r?.business_id === biz?.id);
                if (!bizReviews?.length) return null;
                return (
                  <div key={biz?.id}>
                    <h3 className="font-heading font-semibold text-sm text-muted-foreground uppercase tracking-wide mb-2">{biz?.name}</h3>
                    <div className="space-y-3">
                      {bizReviews?.map(review => (
                        <ReviewCard key={review?.id} review={review} onReplySubmit={handleReplySubmit} />
                      ))}
                    </div>
                  </div>
                );
              })
            : filtered?.map(review => (
                <ReviewCard key={review?.id} review={review} onReplySubmit={handleReplySubmit} />
              ))
          }
        </div>
      )}
    </div>
  );
}
