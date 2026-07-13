import React from 'react';
import { Link } from 'react-router-dom';
import Icon from 'components/AppIcon';
import { formatRelativeTime } from 'utils/relativeTime';

const SECTOR_COLORS = {
  Centro: { bg: '#dbeafe', color: '#1d4ed8' },
  Lagunillas: { bg: '#dcfce7', color: '#15803d' },
  Schwager: { bg: '#fef3c7', color: '#b45309' },
  Puchoco: { bg: '#fce7f3', color: '#be185d' },
  'Las Higueras': { bg: '#ede9fe', color: '#7c3aed' },
  'Punta de Parra': { bg: '#ffedd5', color: '#c2410c' },
  Otro: { bg: '#f1f5f9', color: '#475569' },
};

export default function QuestionCard({ post, coverImage }) {
  const sectorStyle = SECTOR_COLORS?.[post?.sector] || SECTOR_COLORS?.Otro;
  const authorName = post?.author?.full_name || 'Usuario';
  const answered = (post?.reply_count || 0) > 0;

  return (
    <Link
      to={`/comunidad/${post?.id}`}
      className="group flex gap-3 md:gap-4 p-3 md:p-3.5 rounded-lg border border-border bg-card hover:border-primary/40 hover:shadow-sm transition-all duration-150"
    >
      {/* Stats rail */}
      <div className="flex flex-col items-center justify-center gap-0.5 w-12 md:w-14 shrink-0 text-center">
        <div
          className="w-full rounded-md py-1 text-sm font-bold font-data"
          style={
            answered
              ? { background: 'var(--color-success)', color: 'white' }
              : { background: 'var(--color-muted)', color: 'var(--color-muted-foreground)' }
          }
        >
          {post?.reply_count || 0}
        </div>
        <span className="text-[10px] leading-tight text-muted-foreground">
          {post?.reply_count === 1 ? 'respuesta' : 'respuestas'}
        </span>
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0 flex flex-col justify-center gap-1">
        <div className="flex items-center gap-1.5 flex-wrap">
          <span
            className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold"
            style={{ background: sectorStyle?.bg, color: sectorStyle?.color }}
          >
            {post?.sector}
          </span>
          {post?.lat && post?.lng && (
            <Icon name="Navigation" size={11} color="var(--color-muted-foreground)" />
          )}
        </div>

        <h3 className="font-heading font-semibold text-foreground text-sm md:text-[15px] leading-snug line-clamp-1 group-hover:text-primary transition-colors">
          {post?.title}
        </h3>

        <div className="flex items-center gap-2.5 text-xs text-muted-foreground flex-wrap">
          <span className="flex items-center gap-1.5 min-w-0">
            <span
              className="w-4 h-4 rounded-full flex items-center justify-center text-[9px] font-bold text-white shrink-0"
              style={{ background: 'var(--color-primary)' }}
            >
              {authorName?.charAt(0)?.toUpperCase()}
            </span>
            <span className="truncate max-w-[110px]">{authorName}</span>
          </span>
          <span>·</span>
          <span>{formatRelativeTime(post?.created_at)}</span>
          <span className="flex items-center gap-1">
            <Icon name="ThumbsUp" size={12} color="currentColor" />
            {post?.upvote_count || 0}
          </span>
          {answered && (
            <span className="hidden md:inline text-muted-foreground/80">
              · última respuesta {formatRelativeTime(post?.last_activity_at)}
            </span>
          )}
        </div>
      </div>

      {/* Cover thumbnail */}
      {coverImage && (
        <div className="hidden sm:block w-16 h-16 rounded-md overflow-hidden shrink-0 self-center">
          <img
            src={coverImage}
            alt={`Imagen de la pregunta: ${post?.title}`}
            className="w-full h-full object-cover"
          />
        </div>
      )}
    </Link>
  );
}
