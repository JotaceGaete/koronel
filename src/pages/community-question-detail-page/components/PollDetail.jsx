import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import Icon from 'components/AppIcon';
import PollOptionButton from 'components/community/PollOptionButton';
import PollResultsBar from 'components/community/PollResultsBar';
import PollCountdown from 'components/community/PollCountdown';
import PollStatusBadge from 'components/community/PollStatusBadge';
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

export default function PollDetail({ post, user, userVote, onVoted }) {
  const poll = post?.poll;
  const [localVote, setLocalVote] = useState(userVote || null);
  const [optimisticOptions, setOptimisticOptions] = useState(null);
  const [changingVote, setChangingVote] = useState(false);
  const [voting, setVoting] = useState(false);
  const [voteError, setVoteError] = useState(null);

  // userVote is fetched by the page after the poll itself, so it can arrive a render or two
  // after this component first mounts.
  useEffect(() => { setLocalVote(userVote || null); }, [userVote]);

  if (!post || !poll) return null;

  const sectorStyle = SECTOR_COLORS?.[post?.sector] || { bg: '#f3f4f6', color: '#374151' };
  const options = optimisticOptions || poll?.options || [];
  const isClosed = communityService?.isPollClosed(poll);
  const totalVotes = options?.reduce((sum, o) => sum + (o?.vote_count || 0), 0);
  const maxVotes = options?.reduce((max, o) => Math.max(max, o?.vote_count || 0), 0);
  const winningOptionId = totalVotes > 0 ? options?.find(o => (o?.vote_count || 0) === maxVotes)?.id : null;
  const showVotable = !isClosed && (!localVote || changingVote);

  const handleSelect = async (optionId) => {
    if (!user || voting) return;
    setVoting(true);
    setVoteError(null);
    const { data, error } = await communityService?.castPollVote({ pollId: poll?.id, optionId });
    if (error) {
      setVoteError(error?.message || 'No se pudo registrar tu voto. Intenta de nuevo.');
    } else {
      setOptimisticOptions(data);
      setLocalVote(optionId);
      setChangingVote(false);
      onVoted?.(poll?.id, optionId);
    }
    setVoting(false);
  };

  return (
    <div className="bg-card border border-border rounded-xl p-5 md:p-6">
      {/* Sector + Meta */}
      <div className="flex items-center gap-2 mb-3 flex-wrap">
        <span className="inline-flex items-center gap-1 text-xs font-semibold" style={{ color: 'var(--color-primary)' }}>
          <Icon name="BarChart3" size={13} color="currentColor" />
          Encuesta
        </span>
        <span
          className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-medium"
          style={{ background: sectorStyle?.bg, color: sectorStyle?.color }}
        >
          <Icon name="MapPin" size={13} color="currentColor" />
          {post?.sector}
        </span>
        <PollStatusBadge isClosed={isClosed} />
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

      {/* Description (optional for a poll) */}
      {post?.body && (
        <p className="text-foreground text-sm leading-relaxed whitespace-pre-wrap mb-4">{post?.body}</p>
      )}

      {/* Options or results */}
      <div className="mb-4">
        {showVotable ? (
          !user ? (
            <p className="text-sm text-muted-foreground">
              <Link
                to="/login"
                state={{ from: `/comunidad/${post?.id}` }}
                className="font-medium hover:underline"
                style={{ color: 'var(--color-primary)' }}
              >
                Inicia sesión
              </Link>{' '}para votar
            </p>
          ) : (
            <div className="space-y-2">
              {options?.map(opt => (
                <PollOptionButton key={opt?.id} option={opt} disabled={voting} onSelect={handleSelect} />
              ))}
              {changingVote && (
                <button
                  type="button"
                  onClick={() => setChangingVote(false)}
                  className="text-xs text-muted-foreground hover:underline"
                >
                  Cancelar
                </button>
              )}
            </div>
          )
        ) : (
          <div className="space-y-2.5">
            {options?.map(opt => (
              <PollResultsBar
                key={opt?.id}
                option={opt}
                totalVotes={totalVotes}
                isSelected={opt?.id === localVote}
                isWinner={opt?.id === winningOptionId}
              />
            ))}
            {!isClosed && localVote && (
              <button
                type="button"
                onClick={() => setChangingVote(true)}
                className="text-xs font-medium"
                style={{ color: 'var(--color-primary)' }}
              >
                Cambiar voto
              </button>
            )}
          </div>
        )}
        {voteError && <p className="text-xs mt-1.5" style={{ color: 'var(--color-error)' }}>{voteError}</p>}
      </div>

      {/* Footer: author + votes + closing */}
      <div className="flex items-center justify-between gap-3 pt-4 border-t border-border flex-wrap">
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
        <div className="flex items-center gap-3">
          <span className="text-sm text-muted-foreground">{totalVotes} voto{totalVotes !== 1 ? 's' : ''}</span>
          <PollCountdown closesAt={poll?.closes_at} isClosed={isClosed} />
        </div>
      </div>
    </div>
  );
}
