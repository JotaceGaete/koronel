import React from 'react';
import { Link } from 'react-router-dom';
import Icon from 'components/AppIcon';
import PollCountdown from 'components/community/PollCountdown';
import { communityService } from '../../../services/communityService';

// Deliberately a teaser, not a mini voting form: showing every option and letting people vote
// straight from the feed used to be the whole point of this card (Fase 3, "un clic para
// votar"), but that duplicated the ballot/results logic in two places and buried the "primera
// acción = votar" moment under a wall of options for every poll in the list. The feed's job is
// now just to make a poll unmistakably recognizable and worth a click — voting itself always
// happens on the dedicated detail page.
export default function PollCard({ post }) {
  const poll = post?.poll;
  const isClosed = communityService?.isPollClosed(poll);
  const totalVotes = (poll?.options || [])?.reduce((sum, o) => sum + (o?.vote_count || 0), 0);

  return (
    <Link
      to={`/comunidad/${post?.id}`}
      className="bg-card border-2 rounded-xl hover:shadow-md transition-all duration-200 hover:-translate-y-0.5 flex flex-col overflow-hidden"
      style={{ borderColor: 'var(--color-primary)' }}
    >
      <div className="p-5 flex flex-col gap-3 flex-1">
        <div className="flex items-center gap-2 flex-wrap">
          <span
            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold text-white"
            style={{ background: 'var(--color-primary)' }}
          >
            <Icon name="BarChart3" size={12} color="currentColor" />
            Encuesta
          </span>
          <span className="text-xs font-medium" style={{ color: isClosed ? 'var(--color-muted-foreground)' : 'var(--color-success)' }}>
            {isClosed ? 'Finalizada' : 'Abierta'}
          </span>
        </div>

        <h3 className="font-heading font-semibold text-foreground text-base leading-snug line-clamp-2">
          {post?.title}
        </h3>

        <div className="flex items-center justify-between gap-2 pt-1 mt-auto border-t border-border">
          <span className="text-sm text-muted-foreground">
            {totalVotes} voto{totalVotes !== 1 ? 's' : ''}
          </span>
          {isClosed ? null : <PollCountdown closesAt={poll?.closes_at} isClosed={false} />}
        </div>

        <span className="inline-flex items-center gap-1 text-xs font-medium" style={{ color: 'var(--color-primary)' }}>
          Ver encuesta
          <Icon name="ArrowRight" size={12} color="currentColor" />
        </span>
      </div>
    </Link>
  );
}
