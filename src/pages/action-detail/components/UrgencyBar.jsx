import React, { useState, useEffect } from 'react';
import Icon from 'components/AppIcon';

function useCountdown(endsAt) {
  const [parts, setParts] = useState(null);
  useEffect(() => {
    function tick() {
      const ms = new Date(endsAt) - Date.now();
      if (ms <= 0) { setParts(null); return; }
      const d = Math.floor(ms / 86400000);
      const h = Math.floor((ms % 86400000) / 3600000);
      const m = Math.floor((ms % 3600000) / 60000);
      const s = Math.floor((ms % 60000) / 1000);
      setParts({ d, h: String(h).padStart(2, '0'), m: String(m).padStart(2, '0'), s: String(s).padStart(2, '0') });
    }
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [endsAt]);
  return parts;
}

export default function UrgencyBar({ endsAt, showCountdown }) {
  const parts = useCountdown(endsAt);
  if (!parts || !showCountdown) return null;

  const isVeryUrgent = (new Date(endsAt) - Date.now()) < 6 * 3600000;
  const isUrgent = (new Date(endsAt) - Date.now()) < 48 * 3600000;

  if (!isUrgent) return null;

  return (
    <div
      className="flex items-center justify-between gap-4 px-4 py-3"
      style={{ background: isVeryUrgent ? '#ef4444' : '#f97316' }}
    >
      <div className="flex items-center gap-2 text-white">
        <Icon name="Clock" size={16} color="white" />
        <span className="text-sm font-caption font-semibold">
          {parts.d > 0 ? `Termina en ${parts.d}d ${parts.h}h` : 'Termina en'}
        </span>
      </div>
      {parts.d === 0 && (
        <div className="flex items-center gap-1 text-white font-data font-bold text-lg tabular-nums">
          <span>{parts.h}</span>
          <span className="opacity-60">:</span>
          <span>{parts.m}</span>
          <span className="opacity-60">:</span>
          <span>{parts.s}</span>
        </div>
      )}
    </div>
  );
}
