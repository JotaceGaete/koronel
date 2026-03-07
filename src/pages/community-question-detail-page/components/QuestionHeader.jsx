import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import Icon from 'components/AppIcon';
import { communityService } from '../../../services/communityService';

const SECTOR_COLORS = {
  Centro: { bg: '#dbeafe', color: '#1d4ed8' },
  Lagunillas: { bg: '#d1fae5', color: '#065f46' },
  Schwager: { bg: '#fef3c7', color: '#92400e' },
  Puchoco: { bg: '#f3e8ff', color: '#6b21a8' },
  'Las Higueras': { bg: '#fee2e2', color: '#991b1b' },
  'Punta de Parra': { bg: '#e0f2fe', color: '#0369a1' },
  Otro: { bg: '#f3f4f6', color: '#374151' },
};

function formatDate(dateStr) {
  if (!dateStr) return '';
  try {
    return new Date(dateStr)?.toLocaleDateString('es-CL', {
      day: 'numeric', month: 'long', year: 'numeric',
    });
  } catch { return ''; }
}

export default function QuestionHeader({ post, hasVoted, onVote, voteLoading, user }) {
  const [images, setImages] = useState([]);
  const [lightboxIdx, setLightboxIdx] = useState(null);

  useEffect(() => {
    if (!post?.id) return;
    communityService?.getQuestionImages(post?.id)?.then(({ data }) => {
      setImages(data || []);
    });
  }, [post?.id]);

  if (!post) return null;
  const sectorStyle = SECTOR_COLORS?.[post?.sector] || { bg: '#f3f4f6', color: '#374151' };

  return (
    <div className="bg-card border border-border rounded-xl p-5 md:p-6">
      {/* Sector + Meta */}
      <div className="flex items-center gap-2 mb-3 flex-wrap">
        <span
          className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-medium"
          style={{ background: sectorStyle?.bg, color: sectorStyle?.color }}
        >
          <Icon name="MapPin" size={13} color="currentColor" />
          {post?.sector}
        </span>
        {post?.lat && post?.lng && (
          <Link
            to={`/mapa?sector=${encodeURIComponent(post?.sector)}`}
            className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-medium border border-border hover:bg-muted transition-colors"
            style={{ color: 'var(--color-primary)' }}
          >
            <Icon name="Map" size={13} color="currentColor" />
            Ver negocios y eventos cercanos
          </Link>
        )}
      </div>
      {/* Title */}
      <h1 className="text-xl md:text-2xl font-heading font-bold text-foreground mb-3 leading-snug">
        {post?.title}
      </h1>
      {/* Body */}
      <p className="text-foreground text-sm leading-relaxed whitespace-pre-wrap mb-4">{post?.body}</p>
      {/* Image Gallery */}
      {images?.length > 0 && (
        <div className="mb-5">
          <div className={`grid gap-2 ${
            images?.length === 1 ? 'grid-cols-1' :
            images?.length === 2 ? 'grid-cols-2': 'grid-cols-3'
          }`}>
            {images?.map((img, idx) => (
              <button
                key={img?.id}
                type="button"
                onClick={() => setLightboxIdx(idx)}
                className="relative overflow-hidden rounded-lg border border-border focus:outline-none focus:ring-2 focus:ring-ring"
                style={{ aspectRatio: images?.length === 1 ? '16/7' : '1/1' }}
              >
                <img
                  src={img?.public_url}
                  alt={`Imagen ${idx + 1} de la pregunta`}
                  className="w-full h-full object-cover hover:scale-105 transition-transform duration-300"
                />
                <div className="absolute inset-0 bg-black/0 hover:bg-black/10 transition-colors flex items-center justify-center">
                  <Icon name="ZoomIn" size={20} color="white" className="opacity-0 hover:opacity-100" />
                </div>
              </button>
            ))}
          </div>
        </div>
      )}
      {/* Footer: author + vote */}
      <div className="flex items-center justify-between gap-3 pt-4 border-t border-border">
        <div className="flex items-center gap-2">
          <div
            className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold text-white"
            style={{ background: 'var(--color-primary)' }}
          >
            {post?.author?.full_name?.charAt(0)?.toUpperCase() || 'U'}
          </div>
          <div>
            <p className="text-sm font-medium text-foreground">{post?.author?.full_name || 'Usuario'}</p>
            <p className="text-xs text-muted-foreground">{formatDate(post?.created_at)}</p>
          </div>
        </div>

        {/* Upvote */}
        <button
          onClick={onVote}
          disabled={!user || voteLoading}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium border transition-all duration-150 ${
            hasVoted
              ? 'text-white border-transparent' : 'border-border text-muted-foreground hover:bg-muted disabled:opacity-50 disabled:cursor-not-allowed'
          }`}
          style={hasVoted ? { background: 'var(--color-primary)', borderColor: 'var(--color-primary)' } : {}}
          title={!user ? 'Inicia sesión para votar' : hasVoted ? 'Quitar voto' : 'Votar'}
        >
          <Icon name="ThumbsUp" size={15} color="currentColor" />
          <span>{post?.upvote_count || 0}</span>
        </button>
      </div>
      {/* Lightbox */}
      {lightboxIdx !== null && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: 'rgba(0,0,0,0.85)' }}
          onClick={() => setLightboxIdx(null)}
        >
          <div className="relative max-w-3xl w-full" onClick={e => e?.stopPropagation()}>
            <img
              src={images?.[lightboxIdx]?.public_url}
              alt={`Imagen ${lightboxIdx + 1}`}
              className="w-full max-h-[80vh] object-contain rounded-lg"
            />
            <button
              onClick={() => setLightboxIdx(null)}
              className="absolute top-2 right-2 w-8 h-8 rounded-full flex items-center justify-center"
              style={{ background: 'rgba(0,0,0,0.6)' }}
            >
              <Icon name="X" size={16} color="white" />
            </button>
            {images?.length > 1 && (
              <>
                <button
                  onClick={() => setLightboxIdx(i => (i - 1 + images?.length) % images?.length)}
                  className="absolute left-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full flex items-center justify-center"
                  style={{ background: 'rgba(0,0,0,0.6)' }}
                >
                  <Icon name="ChevronLeft" size={18} color="white" />
                </button>
                <button
                  onClick={() => setLightboxIdx(i => (i + 1) % images?.length)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full flex items-center justify-center"
                  style={{ background: 'rgba(0,0,0,0.6)' }}
                >
                  <Icon name="ChevronRight" size={18} color="white" />
                </button>
              </>
            )}
            <p className="text-center text-white text-sm mt-2 opacity-70">{lightboxIdx + 1} / {images?.length}</p>
          </div>
        </div>
      )}
    </div>
  );
}
