import React, { useState, useEffect, useCallback } from 'react';
import Icon from 'components/AppIcon';
import { useAuth } from '../../../contexts/AuthContext';
import { businessService } from '../../../services/businessService';

function StarRating({ rating, size = 14 }) {
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5]?.map((s) => (
        <Icon key={s} name="Star" size={size} color={s <= rating ? 'var(--color-accent)' : 'var(--color-border)'} />
      ))}
    </div>
  );
}

function StarInput({ value, onChange, size = 22 }) {
  const [hovered, setHovered] = useState(0);
  return (
    <div className="flex items-center gap-1">
      {[1, 2, 3, 4, 5]?.map((s) => (
        <button
          key={s}
          type="button"
          onClick={() => onChange(s)}
          onMouseEnter={() => setHovered(s)}
          onMouseLeave={() => setHovered(0)}
          className="focus:outline-none transition-transform duration-100 hover:scale-110"
          aria-label={`${s} estrella${s > 1 ? 's' : ''}`}
        >
          <Icon
            name="Star"
            size={size}
            color={s <= (hovered || value) ? 'var(--color-accent)' : 'var(--color-border)'}
          />
        </button>
      ))}
    </div>
  );
}

function ReviewForm({ businessId, existingReview, onSuccess, onCancel }) {
  const { user } = useAuth();
  const [rating, setRating] = useState(existingReview?.rating || 0);
  const [comment, setComment] = useState(existingReview?.comment || '');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const isEdit = !!existingReview;

  const handleSubmit = async (e) => {
    e?.preventDefault();
    setError('');

    if (!rating) { setError('Por favor selecciona una calificación.'); return; }
    if (comment?.trim()?.length < 20) { setError('La reseña debe tener al menos 20 caracteres.'); return; }

    setSubmitting(true);
    try {
      if (isEdit) {
        const { data, error: err } = await businessService?.updateReview(existingReview?.id, { rating, comment: comment?.trim() });
        if (err) throw err;
        onSuccess(data);
      } else {
        // Check daily limit
        const { allowed, error: limitErr } = await businessService?.checkDailyReviewLimit(user?.id);
        if (limitErr) throw limitErr;
        if (!allowed) { setError('Has alcanzado el límite de 5 reseñas por día.'); setSubmitting(false); return; }

        const { data, error: err } = await businessService?.submitReview({
          businessId,
          userId: user?.id,
          rating,
          comment: comment?.trim(),
        });
        if (err) {
          if (err?.code === '23505') { setError('Ya escribiste una reseña para este negocio.'); }
          else { throw err; }
          setSubmitting(false);
          return;
        }
        onSuccess(data);
      }
    } catch (err) {
      setError('Ocurrió un error. Por favor intenta de nuevo.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="bg-muted/40 border border-border rounded-lg p-4 space-y-3">
      <h4 className="font-heading font-semibold text-sm text-foreground">
        {isEdit ? 'Editar tu reseña' : 'Escribe una reseña'}
      </h4>
      <div>
        <label className="text-xs font-caption text-muted-foreground mb-1.5 block">Calificación *</label>
        <StarInput value={rating} onChange={setRating} />
      </div>
      <div>
        <label className="text-xs font-caption text-muted-foreground mb-1.5 block">
          Comentario * <span className="text-muted-foreground/60">({comment?.length}/20 mín.)</span>
        </label>
        <textarea
          value={comment}
          onChange={(e) => setComment(e?.target?.value)}
          rows={3}
          maxLength={1000}
          placeholder="Comparte tu experiencia con este negocio..."
          className="w-full px-3 py-2 text-sm font-body bg-background border border-border rounded-md resize-none focus:outline-none focus:ring-2 focus:ring-ring text-foreground placeholder:text-muted-foreground"
        />
      </div>
      {error && (
        <p className="text-xs font-caption text-destructive flex items-center gap-1">
          <Icon name="AlertCircle" size={13} color="currentColor" />
          {error}
        </p>
      )}
      <div className="flex items-center gap-2 justify-end">
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="px-3 py-1.5 text-xs font-caption text-muted-foreground hover:text-foreground border border-border rounded-md transition-colors duration-150"
          >
            Cancelar
          </button>
        )}
        <button
          type="submit"
          disabled={submitting}
          className="px-4 py-1.5 text-xs font-caption font-medium text-white rounded-md transition-all duration-150 disabled:opacity-60"
          style={{ background: 'var(--color-primary)' }}
        >
          {submitting ? 'Enviando...' : isEdit ? 'Guardar cambios' : 'Publicar reseña'}
        </button>
      </div>
    </form>
  );
}

function OwnerReplyForm({ reviewId, existingReply, onSuccess, onCancel }) {
  const [reply, setReply] = useState(existingReply || '');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e?.preventDefault();
    if (!reply?.trim()) { setError('La respuesta no puede estar vacía.'); return; }
    setSubmitting(true);
    try {
      const { data, error: err } = await businessService?.submitOwnerReply(reviewId, reply?.trim());
      if (err) throw err;
      onSuccess(data);
    } catch {
      setError('Error al enviar la respuesta.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="mt-3 ml-4 pl-3 border-l-2 border-primary/30 space-y-2">
      <label className="text-xs font-caption text-muted-foreground block">Respuesta del propietario</label>
      <textarea
        value={reply}
        onChange={(e) => setReply(e?.target?.value)}
        rows={2}
        maxLength={500}
        placeholder="Responde a esta reseña..."
        className="w-full px-3 py-2 text-sm font-body bg-background border border-border rounded-md resize-none focus:outline-none focus:ring-2 focus:ring-ring text-foreground placeholder:text-muted-foreground"
      />
      {error && <p className="text-xs text-destructive">{error}</p>}
      <div className="flex gap-2 justify-end">
        <button type="button" onClick={onCancel} className="px-3 py-1 text-xs font-caption text-muted-foreground border border-border rounded-md hover:text-foreground transition-colors">
          Cancelar
        </button>
        <button
          type="submit"
          disabled={submitting}
          className="px-3 py-1 text-xs font-caption font-medium text-white rounded-md disabled:opacity-60"
          style={{ background: 'var(--color-primary)' }}
        >
          {submitting ? 'Enviando...' : 'Responder'}
        </button>
      </div>
    </form>
  );
}

export default function ReviewsSection({ businessId, ownerId }) {
  const { user, isAuthenticated } = useAuth();
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAll, setShowAll] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editingReview, setEditingReview] = useState(null);
  const [replyingTo, setReplyingTo] = useState(null);

  const isOwner = isAuthenticated && ownerId && user?.id === ownerId;
  const userReview = reviews?.find((r) => r?.user_id === user?.id);
  const averageRating = reviews?.length
    ? parseFloat((reviews?.reduce((sum, r) => sum + r?.rating, 0) / reviews?.length)?.toFixed(1))
    : 0;
  const reviewCount = reviews?.length;

  const ratingDist = [5, 4, 3, 2, 1]?.map((r) => ({
    star: r,
    count: reviews?.filter((rv) => rv?.rating === r)?.length,
    pct: reviews?.length ? Math.round((reviews?.filter((rv) => rv?.rating === r)?.length / reviews?.length) * 100) : 0,
  }));

  const displayed = showAll ? reviews : reviews?.slice(0, 3);

  const loadReviews = useCallback(async () => {
    if (!businessId) return;
    setLoading(true);
    const { data } = await businessService?.getReviews(businessId);
    setReviews(data || []);
    setLoading(false);
  }, [businessId]);

  useEffect(() => { loadReviews(); }, [loadReviews]);

  const handleReviewSuccess = (newReview) => {
    setReviews((prev) => {
      const exists = prev?.find((r) => r?.id === newReview?.id);
      if (exists) return prev?.map((r) => r?.id === newReview?.id ? newReview : r);
      return [newReview, ...prev];
    });
    setShowForm(false);
    setEditingReview(null);
  };

  const handleReplySuccess = (updatedReview) => {
    setReviews((prev) => prev?.map((r) => r?.id === updatedReview?.id ? updatedReview : r));
    setReplyingTo(null);
  };

  const handleDeleteReview = async (reviewId) => {
    if (!window.confirm('¿Eliminar tu reseña?')) return;
    const { error } = await businessService?.deleteReview(reviewId);
    if (!error) setReviews((prev) => prev?.filter((r) => r?.id !== reviewId));
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '';
    return new Date(dateStr)?.toLocaleDateString('es-CL', { day: '2-digit', month: '2-digit', year: 'numeric' });
  };

  const getInitials = (name) => name?.split(' ')?.map((n) => n?.[0])?.slice(0, 2)?.join('')?.toUpperCase() || '?';

  return (
    <div className="bg-card border border-border rounded-lg p-4 md:p-5">
      <div className="flex items-center gap-2 mb-5">
        <Icon name="Star" size={18} color="var(--color-accent)" />
        <h3 className="font-heading font-semibold text-base text-foreground">Reseñas de clientes</h3>
      </div>

      {/* Summary */}
      {reviewCount > 0 && (
        <div className="flex flex-col sm:flex-row gap-6 mb-6 pb-6 border-b border-border">
          <div className="flex flex-col items-center justify-center shrink-0">
            <span className="font-heading font-bold text-4xl text-foreground">{averageRating?.toFixed(1)}</span>
            <StarRating rating={Math.round(averageRating)} size={16} />
            <span className="text-xs font-caption text-muted-foreground mt-1">{reviewCount} reseña{reviewCount !== 1 ? 's' : ''}</span>
          </div>
          <div className="flex-1 space-y-1.5">
            {ratingDist?.map(({ star, count, pct }) => (
              <div key={star} className="flex items-center gap-2">
                <span className="text-xs font-data text-muted-foreground w-4 shrink-0">{star}</span>
                <Icon name="Star" size={12} color="var(--color-accent)" />
                <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-500"
                    style={{ width: `${pct}%`, background: 'var(--color-accent)' }}
                  />
                </div>
                <span className="text-xs font-data text-muted-foreground w-6 shrink-0 text-right">{count}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Write Review CTA */}
      {isAuthenticated && !userReview && !showForm && (
        <button
          onClick={() => setShowForm(true)}
          className="w-full mb-5 py-2.5 flex items-center justify-center gap-2 text-sm font-caption font-medium border border-dashed border-primary/40 rounded-md text-primary hover:bg-primary/5 transition-all duration-200"
        >
          <Icon name="PenLine" size={15} color="currentColor" />
          Escribe una reseña
        </button>
      )}

      {/* Not authenticated prompt */}
      {!isAuthenticated && (
        <div className="mb-5 py-3 px-4 bg-muted/40 border border-border rounded-md flex items-center gap-2 text-sm font-caption text-muted-foreground">
          <Icon name="LogIn" size={15} color="currentColor" />
          <span>Inicia sesión para escribir una reseña</span>
        </div>
      )}

      {/* New Review Form */}
      {showForm && !editingReview && (
        <div className="mb-5">
          <ReviewForm
            businessId={businessId}
            onSuccess={handleReviewSuccess}
            onCancel={() => setShowForm(false)}
          />
        </div>
      )}

      {/* Reviews List */}
      {loading ? (
        <div className="space-y-4">
          {[1, 2, 3]?.map((i) => (
            <div key={i} className="flex gap-3 animate-pulse">
              <div className="w-9 h-9 rounded-full bg-muted shrink-0" />
              <div className="flex-1 space-y-2">
                <div className="h-3 bg-muted rounded w-1/3" />
                <div className="h-3 bg-muted rounded w-full" />
                <div className="h-3 bg-muted rounded w-2/3" />
              </div>
            </div>
          ))}
        </div>
      ) : reviews?.length === 0 ? (
        <div className="text-center py-8">
          <Icon name="MessageSquare" size={32} color="var(--color-muted-foreground)" className="mx-auto mb-2" />
          <p className="text-sm font-caption text-muted-foreground">Aún no hay reseñas. ¡Sé el primero!</p>
        </div>
      ) : (
        <div className="space-y-5">
          {displayed?.map((review) => {
            const isOwnReview = user?.id === review?.user_id;
            const authorName = review?.user_profiles?.full_name || 'Usuario';
            const isEditing = editingReview?.id === review?.id;
            const isReplying = replyingTo === review?.id;

            return (
              <div key={review?.id} className="">
                <div className="flex gap-3">
                  {/* Avatar */}
                  <div className="w-9 h-9 rounded-full overflow-hidden shrink-0 bg-primary/10 flex items-center justify-center">
                    {review?.user_profiles?.avatar_url ? (
                      <img src={review?.user_profiles?.avatar_url} alt={authorName} className="w-full h-full object-cover" />
                    ) : (
                      <span className="text-xs font-caption font-bold" style={{ color: 'var(--color-primary)' }}>
                        {getInitials(authorName)}
                      </span>
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2 mb-1">
                      <span className="text-sm font-caption font-semibold text-foreground">{authorName}</span>
                      <StarRating rating={review?.rating} size={12} />
                      <span className="text-xs font-caption text-muted-foreground">{formatDate(review?.created_at)}</span>
                      {isOwnReview && (
                        <span className="text-xs font-caption px-1.5 py-0.5 rounded-full bg-primary/10 text-primary">Tu reseña</span>
                      )}
                    </div>

                    {/* Edit form inline */}
                    {isEditing ? (
                      <ReviewForm
                        businessId={businessId}
                        existingReview={editingReview}
                        onSuccess={handleReviewSuccess}
                        onCancel={() => setEditingReview(null)}
                      />
                    ) : (
                      <p className="text-sm font-body text-card-foreground leading-relaxed">{review?.comment}</p>
                    )}

                    {/* Action buttons */}
                    {!isEditing && (
                      <div className="flex items-center gap-3 mt-1.5">
                        {isOwnReview && (
                          <>
                            <button
                              onClick={() => setEditingReview(review)}
                              className="text-xs font-caption text-muted-foreground hover:text-primary transition-colors flex items-center gap-1"
                            >
                              <Icon name="Pencil" size={11} color="currentColor" /> Editar
                            </button>
                            <button
                              onClick={() => handleDeleteReview(review?.id)}
                              className="text-xs font-caption text-muted-foreground hover:text-destructive transition-colors flex items-center gap-1"
                            >
                              <Icon name="Trash2" size={11} color="currentColor" /> Eliminar
                            </button>
                          </>
                        )}
                        {isOwner && !isOwnReview && (
                          <button
                            onClick={() => setReplyingTo(isReplying ? null : review?.id)}
                            className="text-xs font-caption text-muted-foreground hover:text-primary transition-colors flex items-center gap-1"
                          >
                            <Icon name="Reply" size={11} color="currentColor" />
                            {review?.owner_reply ? 'Editar respuesta' : 'Responder'}
                          </button>
                        )}
                      </div>
                    )}

                    {/* Existing owner reply */}
                    {review?.owner_reply && !isReplying && (
                      <div className="mt-3 ml-2 pl-3 border-l-2 border-primary/30">
                        <div className="flex items-center gap-1.5 mb-1">
                          <Icon name="Building2" size={12} color="var(--color-primary)" />
                          <span className="text-xs font-caption font-semibold text-primary">Respuesta del propietario</span>
                          <span className="text-xs font-caption text-muted-foreground">{formatDate(review?.owner_replied_at)}</span>
                        </div>
                        <p className="text-sm font-body text-card-foreground leading-relaxed">{review?.owner_reply}</p>
                      </div>
                    )}

                    {/* Owner reply form */}
                    {isReplying && (
                      <OwnerReplyForm
                        reviewId={review?.id}
                        existingReply={review?.owner_reply}
                        onSuccess={handleReplySuccess}
                        onCancel={() => setReplyingTo(null)}
                      />
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {reviews?.length > 3 && (
        <button
          onClick={() => setShowAll((v) => !v)}
          className="mt-5 w-full py-2.5 text-sm font-caption font-medium text-primary border border-primary/30 rounded-md hover:bg-primary/5 transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          {showAll ? 'Ver menos reseñas' : `Ver todas las reseñas (${reviews?.length})`}
        </button>
      )}
    </div>
  );
}