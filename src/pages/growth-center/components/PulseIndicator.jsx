import React from 'react';
import Icon from 'components/AppIcon';
import { PULSE_CONFIG } from '../../../lib/pulseRules';

export default function PulseIndicator({ pulse, reason, cta, onCta }) {
  const cfg = PULSE_CONFIG[pulse] || PULSE_CONFIG.green;

  return (
    <div
      className="rounded-2xl p-4 flex items-start gap-3 border"
      style={{ background: cfg.bg, borderColor: cfg.color + '33' }}
    >
      <div className="shrink-0 mt-0.5">
        <Icon name={cfg.icon} size={20} color={cfg.color} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold font-heading" style={{ color: cfg.color }}>
          {cfg.label}
        </p>
        {reason && (
          <p className="text-sm text-foreground/80 mt-0.5 font-caption">{reason}</p>
        )}
        {cta && onCta && (
          <button
            onClick={onCta}
            className="mt-2 text-sm font-semibold font-caption underline"
            style={{ color: cfg.color }}
          >
            {cta} →
          </button>
        )}
      </div>
    </div>
  );
}
