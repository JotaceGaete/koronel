import React from 'react';
import Icon from 'components/AppIcon';

export default function PollResultsBar({ option, totalVotes, isSelected, isWinner }) {
  const votes = option?.vote_count || 0;
  const pct = totalVotes > 0 ? Math.round((votes / totalVotes) * 100) : 0;

  return (
    <div>
      <div className="flex items-center justify-between gap-2 mb-1">
        <span className="flex items-center gap-1.5 text-sm text-foreground truncate min-w-0">
          {isSelected && <Icon name="CheckCircle2" size={13} color="var(--color-primary)" className="flex-shrink-0" />}
          <span className={`truncate ${isWinner ? 'font-semibold' : ''}`}>{option?.label}</span>
        </span>
        <span className="text-xs font-medium text-muted-foreground flex-shrink-0">{pct}%</span>
      </div>
      <div className="h-2 rounded-full overflow-hidden" style={{ background: 'var(--color-muted)' }}>
        <div
          className="h-full rounded-full transition-all duration-500"
          style={{ width: `${pct}%`, background: isWinner ? 'var(--color-primary)' : 'var(--color-accent)' }}
        />
      </div>
    </div>
  );
}
