import React from 'react';

export default function PollOptionButton({ option, disabled, onSelect }) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={() => onSelect?.(option?.id)}
      className="w-full text-left px-3 py-2 text-sm border rounded-lg transition-colors hover:bg-muted disabled:opacity-50 disabled:cursor-not-allowed"
      style={{ borderColor: 'var(--color-border)', color: 'var(--color-foreground)' }}
    >
      {option?.label}
    </button>
  );
}
