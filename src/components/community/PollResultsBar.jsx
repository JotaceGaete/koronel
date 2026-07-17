import React, { useState, useEffect } from 'react';
import Icon from 'components/AppIcon';

export default function PollResultsBar({ option, totalVotes, isSelected, isWinner }) {
  const votes = option?.vote_count || 0;
  const pct = totalVotes > 0 ? Math.round((votes / totalVotes) * 100) : 0;

  // Bars grow in from 0 on mount/update rather than snapping straight to their final width —
  // rendering at 0 first, then flipping to the real percentage a frame later, is what gives the
  // CSS transition below something to animate from.
  const [displayPct, setDisplayPct] = useState(0);
  useEffect(() => {
    const raf = requestAnimationFrame(() => setDisplayPct(pct));
    return () => cancelAnimationFrame(raf);
  }, [pct]);

  return (
    <div>
      <div className="flex items-center justify-between gap-2 mb-1">
        <span className="flex items-center gap-1.5 text-sm text-foreground truncate min-w-0">
          {isSelected && <Icon name="CheckCircle2" size={13} color="var(--color-primary)" className="flex-shrink-0" />}
          <span className={`truncate ${isWinner ? 'font-semibold' : ''}`}>{option?.label}</span>
        </span>
        <span className="text-sm font-bold flex-shrink-0" style={{ color: isWinner ? 'var(--color-primary)' : 'var(--color-foreground)' }}>
          {pct}%
        </span>
      </div>
      <div className="h-3 rounded-full overflow-hidden" style={{ background: 'var(--color-muted)' }}>
        <div
          className="h-full rounded-full transition-all duration-700 ease-out"
          style={{
            width: `${displayPct}%`,
            background: isWinner
              ? 'linear-gradient(90deg, var(--color-primary), var(--color-accent))'
              : 'var(--color-accent)',
          }}
        />
      </div>
      <p className="text-xs text-muted-foreground mt-1">{votes} voto{votes !== 1 ? 's' : ''}</p>
    </div>
  );
}
