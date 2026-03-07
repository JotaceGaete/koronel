import React from 'react';
import { Link } from 'react-router-dom';
import Icon from 'components/AppIcon';

function formatDate(dateStr) {
  if (!dateStr) return '';
  try {
    return new Date(dateStr)?.toLocaleDateString('es-CL', { day: 'numeric', month: 'short', year: 'numeric' });
  } catch { return ''; }
}

export default function ReplyCard({ reply, hasVoted, onVote, voteLoading, user }) {
  if (!reply) return null;

  return (
    <div className="bg-card border border-border rounded-xl p-4 md:p-5">
      {/* Body */}
      <p className="text-sm text-foreground leading-relaxed whitespace-pre-wrap mb-4">{reply?.body}</p>

      {/* Linked Business Card */}
      {reply?.linked_business && (
        <div className="mb-4 p-3 rounded-lg border" style={{ background: 'var(--color-muted)', borderColor: 'var(--color-border)' }}>
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5 mb-1">
                <Icon name="Building2" size={13} color="var(--color-primary)" />
                <span className="text-xs font-medium" style={{ color: 'var(--color-primary)' }}>Negocio vinculado</span>
              </div>
              <p className="text-sm font-semibold text-foreground">{reply?.linked_business?.name}</p>
              {reply?.linked_business?.category && (
                <p className="text-xs text-muted-foreground">{reply?.linked_business?.category}</p>
              )}
              {reply?.linked_business?.address && (
                <div className="flex items-center gap-1 mt-1">
                  <Icon name="MapPin" size={11} color="currentColor" className="text-muted-foreground" />
                  <p className="text-xs text-muted-foreground">{reply?.linked_business?.address}</p>
                </div>
              )}
            </div>
            <Link
              to={`/negocios/${reply?.linked_business?.id}`}
              className="flex-shrink-0 flex items-center gap-1 px-2.5 py-1.5 rounded-md text-xs font-medium border border-border hover:bg-card transition-colors"
              style={{ color: 'var(--color-primary)' }}
            >
              <Icon name="ExternalLink" size={12} color="currentColor" />
              Ver perfil
            </Link>
          </div>
        </div>
      )}

      {/* Footer */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <div
            className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold text-white"
            style={{ background: 'var(--color-accent)' }}
          >
            {reply?.author?.full_name?.charAt(0)?.toUpperCase() || 'U'}
          </div>
          <div>
            <p className="text-xs font-medium text-foreground">{reply?.author?.full_name || 'Usuario'}</p>
            <p className="text-xs text-muted-foreground">{formatDate(reply?.created_at)}</p>
          </div>
        </div>

        <button
          onClick={onVote}
          disabled={!user || voteLoading}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-all duration-150 ${
            hasVoted
              ? 'text-white border-transparent' :'border-border text-muted-foreground hover:bg-muted disabled:opacity-50 disabled:cursor-not-allowed'
          }`}
          style={hasVoted ? { background: 'var(--color-primary)', borderColor: 'var(--color-primary)' } : {}}
          title={!user ? 'Inicia sesión para votar' : hasVoted ? 'Quitar voto' : 'Votar'}
        >
          <Icon name="ThumbsUp" size={13} color="currentColor" />
          <span>{reply?.upvote_count || 0}</span>
        </button>
      </div>
    </div>
  );
}
