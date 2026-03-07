import React from 'react';
import { Link } from 'react-router-dom';
import Icon from 'components/AppIcon';
import { communityService } from '../../../services/communityService';

export default function ReplyCard({ reply, userId, hasVoted, onVote }) {
  const authorName = reply?.user?.full_name || 'Usuario';
  const initials = authorName?.split(' ')?.map(n => n?.[0])?.slice(0, 2)?.join('')?.toUpperCase();

  return (
    <div className="bg-card border border-border rounded-xl p-5">
      {/* Author + time */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div
            className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white flex-shrink-0"
            style={{ background: 'var(--color-accent)' }}
          >
            {reply?.user?.avatar_url ? (
              <img src={reply?.user?.avatar_url} alt={authorName} className="w-full h-full rounded-full object-cover" />
            ) : initials}
          </div>
          <div>
            <p className="text-sm font-medium text-foreground">{authorName}</p>
            <p className="text-xs text-muted-foreground">{communityService?.formatRelativeDate(reply?.created_at)}</p>
          </div>
        </div>

        {/* Upvote */}
        <button
          onClick={() => onVote?.(reply?.id, hasVoted)}
          disabled={!userId}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border transition-all ${
            hasVoted
              ? 'text-white border-transparent' :'border-border text-muted-foreground hover:border-primary hover:text-primary'
          } disabled:opacity-50 disabled:cursor-not-allowed`}
          style={hasVoted ? { background: 'var(--color-primary)' } : {}}
          title={!userId ? 'Inicia sesión para votar' : ''}
        >
          <Icon name="ThumbsUp" size={13} color="currentColor" />
          {reply?.upvote_count || 0}
        </button>
      </div>

      {/* Body */}
      <p className="text-sm text-foreground leading-relaxed mb-3">{reply?.body}</p>

      {/* Linked business */}
      {reply?.linked_business && (
        <div className="mt-3 p-3 rounded-lg border border-border bg-muted/30 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div
              className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
              style={{ background: 'var(--color-primary)' }}
            >
              <Icon name="Building2" size={15} color="white" />
            </div>
            <div>
              <p className="text-sm font-medium text-foreground">{reply?.linked_business?.name}</p>
              <p className="text-xs text-muted-foreground">{reply?.linked_business?.category} · {reply?.linked_business?.address}</p>
            </div>
          </div>
          <Link
            to={`/business-profile-page?id=${reply?.linked_business?.id}`}
            className="text-xs font-medium transition-colors hover:opacity-80 flex-shrink-0 ml-2"
            style={{ color: 'var(--color-primary)' }}
          >
            Ver perfil
          </Link>
        </div>
      )}
    </div>
  );
}
