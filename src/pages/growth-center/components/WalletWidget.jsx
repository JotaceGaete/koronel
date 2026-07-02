import React from 'react';
import { Link } from 'react-router-dom';
import Icon from 'components/AppIcon';

export default function WalletWidget({ balance, loading }) {
  const available = balance ? (balance.balance_total - balance.reserved_total) : 0;

  if (loading) {
    return (
      <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl border border-border bg-card animate-pulse">
        <div className="w-3 h-3 rounded-full bg-muted" />
        <div className="w-12 h-3 rounded bg-muted" />
      </div>
    );
  }

  return (
    <Link
      to="/billetera"
      className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-border bg-card hover:border-primary/40 transition-colors"
    >
      <span className="text-sm leading-none">🪙</span>
      <span className="text-sm font-semibold font-caption text-foreground">{available}</span>
      <Icon name="ChevronRight" size={12} color="var(--color-muted-foreground)" />
    </Link>
  );
}
