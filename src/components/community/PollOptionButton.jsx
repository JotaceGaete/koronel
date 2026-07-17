import React from 'react';

export default function PollOptionButton({ option, isSelected, disabled, onSelect }) {
  return (
    <button
      type="button"
      disabled={disabled}
      aria-pressed={!!isSelected}
      onClick={() => onSelect?.(option?.id)}
      className="w-full flex items-center gap-3 text-left px-4 py-3 text-sm rounded-xl border-2 transition-all duration-150 hover:bg-muted disabled:opacity-50 disabled:cursor-not-allowed"
      style={{ borderColor: isSelected ? 'var(--color-primary)' : 'var(--color-border)' }}
    >
      <span
        className="shrink-0 w-5 h-5 rounded-full border-2 flex items-center justify-center"
        style={{ borderColor: isSelected ? 'var(--color-primary)' : 'var(--color-border)' }}
      >
        {isSelected && <span className="w-2.5 h-2.5 rounded-full" style={{ background: 'var(--color-primary)' }} />}
      </span>
      <span className="font-medium text-foreground">{option?.label}</span>
    </button>
  );
}
