import React from 'react';
import Icon from 'components/AppIcon';

export default function JobDetailInfo({ job }) {
  return (
    <>
      {/* Description */}
      <div
        className="rounded-xl p-6"
        style={{ background: 'var(--color-card)', border: '1px solid var(--color-border)' }}
      >
        <h2 className="text-base font-heading font-semibold mb-4 flex items-center gap-2" style={{ color: 'var(--color-foreground)' }}>
          <Icon name="FileText" size={18} color="var(--color-primary)" />
          Descripción del puesto
        </h2>
        <div
          className="text-sm leading-relaxed whitespace-pre-wrap"
          style={{ color: 'var(--color-foreground)' }}
        >
          {job?.description}
        </div>
      </div>

      {/* Requirements */}
      {job?.requirements && (
        <div
          className="rounded-xl p-6"
          style={{ background: 'var(--color-card)', border: '1px solid var(--color-border)' }}
        >
          <h2 className="text-base font-heading font-semibold mb-4 flex items-center gap-2" style={{ color: 'var(--color-foreground)' }}>
            <Icon name="CheckSquare" size={18} color="var(--color-primary)" />
            Requisitos
          </h2>
          <div
            className="text-sm leading-relaxed whitespace-pre-wrap"
            style={{ color: 'var(--color-foreground)' }}
          >
            {job?.requirements}
          </div>
        </div>
      )}
    </>
  );
}
