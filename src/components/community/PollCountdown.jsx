import React from 'react';

function formatCountdown(closesAt) {
  if (!closesAt) return null;
  const diffMs = new Date(closesAt)?.getTime() - Date.now();
  if (diffMs <= 0) return null;

  const mins = Math.round(diffMs / 60000);
  if (mins < 60) return `Cierra en ${mins} min`;

  const hours = Math.round(mins / 60);
  if (hours < 24) return hours === 1 ? 'Cierra en 1 hora' : `Cierra en ${hours} horas`;

  const days = Math.round(hours / 24);
  if (days === 1) return 'Cierra mañana';
  return `Cierra en ${days} días`;
}

export default function PollCountdown({ closesAt, isClosed }) {
  // A closed poll is already communicated by PollStatusBadge; avoid saying both.
  if (isClosed) return null;
  const text = formatCountdown(closesAt);
  if (!text) return null;
  return <span className="text-xs text-muted-foreground">{text}</span>;
}
