import React from 'react';
import { COMMUNITY_SECTORS } from '../../../services/communityService';

export default function SectorChips({ sector, onChange, counts, totalCount }) {
  const isAll = !sector || sector === 'all';

  return (
    <div className="flex items-center gap-2 overflow-x-auto pb-1" style={{ scrollbarWidth: 'none' }}>
      <button
        onClick={() => onChange?.('all')}
        className={`shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border transition-all duration-150 ${
          isAll ? 'text-white border-transparent' : 'border-border text-muted-foreground bg-card hover:bg-muted'
        }`}
        style={isAll ? { background: 'var(--color-primary)' } : {}}
      >
        Todos
        <span className={isAll ? 'opacity-80' : 'text-muted-foreground/70'}>{totalCount ?? 0}</span>
      </button>
      {COMMUNITY_SECTORS?.map(s => {
        const active = sector === s;
        return (
          <button
            key={s}
            onClick={() => onChange?.(s)}
            className={`shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border transition-all duration-150 ${
              active ? 'text-white border-transparent' : 'border-border text-muted-foreground bg-card hover:bg-muted'
            }`}
            style={active ? { background: 'var(--color-primary)' } : {}}
          >
            {s}
            <span className={active ? 'opacity-80' : 'text-muted-foreground/70'}>{counts?.[s] ?? 0}</span>
          </button>
        );
      })}
    </div>
  );
}
