import React from 'react';
import Icon from 'components/AppIcon';

const STATS = [
  { key: 'views',           icon: 'Eye',          label: 'vistas',       color: '#3b82f6' },
  { key: 'whatsapp_clicks', icon: 'MessageCircle', label: 'WhatsApp',    color: '#22c55e' },
  { key: 'catalog_clicks',  icon: 'BookOpen',     label: 'al catálogo',  color: '#8b5cf6' },
  { key: 'share_count',     icon: 'Share2',       label: 'compartidos',  color: '#f59e0b' },
];

export default function WeeklySummary({ stats, loading }) {
  if (loading) {
    return (
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {STATS.map(s => (
          <div key={s.key} className="h-20 rounded-xl bg-muted animate-pulse" />
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      {STATS.map(s => (
        <div key={s.key} className="bg-card border border-border rounded-xl p-3 flex flex-col gap-1">
          <div className="flex items-center gap-1.5">
            <Icon name={s.icon} size={14} color={s.color} />
            <span className="text-xs font-caption text-muted-foreground">{s.label}</span>
          </div>
          <p className="font-data font-bold text-2xl text-foreground">
            {(stats?.[s.key] || 0).toLocaleString('es-CL')}
          </p>
        </div>
      ))}
    </div>
  );
}
