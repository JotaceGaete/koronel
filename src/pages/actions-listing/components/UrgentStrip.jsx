import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import Image from 'components/AppImage';
import Icon from 'components/AppIcon';

function useCountdown(endsAt) {
  const [parts, setParts] = useState({ h: '00', m: '00', s: '00' });
  useEffect(() => {
    function tick() {
      const ms = new Date(endsAt) - Date.now();
      if (ms <= 0) { setParts({ h: '00', m: '00', s: '00' }); return; }
      const h = String(Math.floor(ms / 3600000)).padStart(2, '0');
      const m = String(Math.floor((ms % 3600000) / 60000)).padStart(2, '0');
      const s = String(Math.floor((ms % 60000) / 1000)).padStart(2, '0');
      setParts({ h, m, s });
    }
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [endsAt]);
  return parts;
}

function UrgentCard({ action }) {
  const { h, m, s } = useCountdown(action?.ends_at);
  const coverUrl = action?.cover_image_url;

  return (
    <Link
      to={`/acciones/${action?.slug}`}
      className="shrink-0 w-[200px] flex flex-col bg-card border border-red-100 rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition-shadow snap-start"
    >
      <div className="relative h-28 bg-muted overflow-hidden">
        {coverUrl ? (
          <Image src={coverUrl} alt={action?.title} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-muted">
            <Icon name="Zap" size={28} color="#ef4444" />
          </div>
        )}
        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 px-2 pb-1.5 pt-4">
          <div className="flex items-center gap-1 text-white">
            <Icon name="Clock" size={11} color="white" />
            <span className="text-xs font-data font-bold tabular-nums">{h}:{m}:{s}</span>
          </div>
        </div>
      </div>
      <div className="p-2.5">
        <p className="text-xs font-caption text-muted-foreground">{action?.business?.name}</p>
        <p className="text-sm font-heading font-semibold text-foreground line-clamp-2">{action?.title}</p>
      </div>
    </Link>
  );
}

export default function UrgentStrip({ actions }) {
  if (!actions?.length) return null;
  return (
    <div>
      <div className="flex items-center gap-2 mb-3">
        <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
        <h2 className="font-heading font-semibold text-sm text-foreground">Terminan pronto</h2>
      </div>
      <div
        className="flex gap-3 overflow-x-auto pb-2 -mx-4 px-4 scrollbar-hide snap-x snap-mandatory"
        style={{ WebkitOverflowScrolling: 'touch' }}
      >
        {actions.map(a => <UrgentCard key={a.id} action={a} />)}
      </div>
    </div>
  );
}
