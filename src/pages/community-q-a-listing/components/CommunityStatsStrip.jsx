import React, { useEffect, useState } from 'react';
import Icon from 'components/AppIcon';
import { communityService } from '../../../services/communityService';

const DEFS = [
  { key: 'totalQuestions', label: 'Preguntas', icon: 'MessageCircle', color: 'var(--color-primary)' },
  { key: 'repliesToday', label: 'Respuestas hoy', icon: 'Zap', color: 'var(--color-accent)' },
  { key: 'repliesThisMonth', label: 'Respuestas este mes', icon: 'TrendingUp', color: 'var(--color-success)' },
  { key: 'activeMembers', label: 'Miembros activos (30d)', icon: 'Users', color: 'var(--color-secondary)' },
];

export default function CommunityStatsStrip() {
  const [stats, setStats] = useState(null);

  useEffect(() => {
    let cancelled = false;
    communityService?.getCommunityStats()?.then(({ data }) => {
      if (!cancelled) setStats(data);
    });
    return () => { cancelled = true; };
  }, []);

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-2 md:gap-3">
      {DEFS?.map(def => (
        <div
          key={def?.key}
          className="flex items-center gap-2 px-3 py-2 rounded-lg border border-border bg-card"
        >
          <div
            className="w-7 h-7 rounded-md flex items-center justify-center shrink-0"
            style={{ background: `${def?.color}18` }}
          >
            <Icon name={def?.icon} size={14} color={def?.color} />
          </div>
          <div className="min-w-0">
            <p className="font-data font-bold text-sm md:text-base text-foreground leading-none">
              {stats ? (stats?.[def?.key] ?? 0)?.toLocaleString('es-CL') : '—'}
            </p>
            <p className="text-[10px] md:text-[11px] text-muted-foreground leading-tight truncate">{def?.label}</p>
          </div>
        </div>
      ))}
    </div>
  );
}
