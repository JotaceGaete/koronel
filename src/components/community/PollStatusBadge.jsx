import React from 'react';

export default function PollStatusBadge({ isClosed }) {
  // "Abierta" is the implicit default and isn't labeled; only the exceptional state is.
  if (!isClosed) return null;
  return (
    <span
      className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold"
      style={{ background: '#f3f4f6', color: '#6b7280' }}
    >
      Cerrada
    </span>
  );
}
