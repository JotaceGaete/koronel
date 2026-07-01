import React from 'react';
import { Link } from 'react-router-dom';
import Icon from 'components/AppIcon';

function formatRelativeDate(dateStr) {
  if (!dateStr) return '';
  try {
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'ahora';
    if (mins < 60) return `hace ${mins}m`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `hace ${hrs}h`;
    const days = Math.floor(hrs / 24);
    if (days < 7) return `hace ${days}d`;
    return new Date(dateStr).toLocaleDateString('es-CL', { day: 'numeric', month: 'short' });
  } catch { return ''; }
}

export default function QuestionRow({ post, coverImage }) {
  if (!post) return null;

  return (
    <Link
      to={`/comunidad/${post.id}`}
      className="flex items-center gap-3 px-4 py-3 hover:bg-muted/50 transition-colors border-b border-border last:border-b-0 group"
      style={{ minHeight: '64px' }}
    >
      {coverImage && (
        <img
          src={coverImage}
          alt=""
          aria-hidden="true"
          className="w-12 h-12 rounded-md object-cover flex-shrink-0"
        />
      )}

      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-foreground line-clamp-1 group-hover:text-primary transition-colors leading-snug">
          {post.title}
        </p>
        <div className="flex items-center gap-2.5 mt-0.5 flex-wrap">
          {post.sector && (
            <span className="flex items-center gap-0.5 text-xs text-muted-foreground">
              <Icon name="MapPin" size={10} color="currentColor" />
              {post.sector}
            </span>
          )}
          <span className="text-xs text-muted-foreground">{formatRelativeDate(post.created_at)}</span>
          <span className="flex items-center gap-0.5 text-xs text-muted-foreground">
            <Icon name="MessageSquare" size={10} color="currentColor" />
            {post.reply_count ?? 0} {(post.reply_count ?? 0) === 1 ? 'resp' : 'resp'}
          </span>
        </div>
      </div>

      {post.upvote_count > 0 && (
        <div className="flex-shrink-0 flex items-center gap-1 text-xs text-muted-foreground">
          <Icon name="ThumbsUp" size={11} color="currentColor" />
          {post.upvote_count}
        </div>
      )}
    </Link>
  );
}
