import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import Icon from 'components/AppIcon';
import { ACTION_TYPE_LABELS } from '../../../lib/intentToSuggestion';
import BoostModal from 'components/BoostModal';
import { actionService } from '../../../services/actionService';
import { walletService } from '../../../services/walletService';

function countdown(endsAt) {
  const ms = new Date(endsAt) - Date.now();
  if (ms <= 0) return 'Expirada';
  const d = Math.floor(ms / 86400000);
  if (d >= 2) return `${d} días`;
  const h = Math.floor(ms / 3600000);
  if (h >= 1) return `${h}h`;
  const m = Math.floor(ms / 60000);
  return `${m}m`;
}

function ActionRow({ action, accountId, userId, onBoosted }) {
  const [showModal, setShowModal] = useState(false);
  const [balance, setBalance] = useState(null);
  const [boostCost, setBoostCost] = useState(1);

  const timeLeft  = countdown(action?.ends_at);
  const isUrgent  = new Date(action?.ends_at) - Date.now() < 48 * 3600000;
  const typeLabel = ACTION_TYPE_LABELS[action?.action_type] || action?.action_type;
  const isBoosted = !!action?.boosted_at;

  async function openModal() {
    const [balRes, costRes] = await Promise.all([
      walletService.getBalance(accountId),
      walletService.getRuleCost('PROMOTION_BOOST'),
    ]);
    setBalance(balRes.data?.available ?? 0);
    setBoostCost(costRes.data?.credits_cost ?? 1);
    setShowModal(true);
  }

  async function handleBoost() {
    const result = await actionService.boostAction({
      actionId:  action.id,
      accountId,
      userId,
    });
    if (result.ok) onBoosted?.(action.id);
    return result;
  }

  return (
    <>
      <div className="flex items-center gap-3 py-3 border-b border-border last:border-0">
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold font-heading text-foreground line-clamp-1">{action?.title}</p>
          <div className="flex items-center gap-2 mt-0.5">
            <p className="text-xs font-caption text-muted-foreground">{typeLabel}</p>
            {isBoosted && (
              <span className="flex items-center gap-0.5 text-xs font-caption font-semibold text-primary">
                <Icon name="Zap" size={10} color="var(--color-primary)" />
                Impulsada
              </span>
            )}
          </div>
        </div>

        <div className="shrink-0 flex items-center gap-2">
          {/* CTA de impulso — solo si no está ya impulsada */}
          {!isBoosted && accountId && (
            <button
              onClick={openModal}
              className="flex items-center gap-1 px-2.5 py-1 rounded-lg border border-primary/30 bg-primary/5 text-xs font-semibold font-caption text-primary hover:bg-primary/10 transition-colors"
            >
              <Icon name="Zap" size={11} color="var(--color-primary)" />
              Impulsar
            </button>
          )}

          <div className="text-right">
            <span className={`text-xs font-caption font-semibold ${isUrgent ? 'text-red-500' : 'text-muted-foreground'}`}>
              {isUrgent && <Icon name="Clock" size={10} className="inline mr-0.5" />}
              {timeLeft}
            </span>
            <p className="text-xs text-muted-foreground mt-0.5">
              {action?.views || 0} vistas
            </p>
          </div>
        </div>
      </div>

      {showModal && (
        <BoostModal
          action={action}
          balance={balance}
          cost={boostCost}
          onConfirm={handleBoost}
          onClose={() => setShowModal(false)}
        />
      )}
    </>
  );
}

export default function ActiveActionsMini({ actions, loading, accountId, userId, onBoosted }) {
  if (loading) {
    return (
      <div className="space-y-2">
        {[1, 2].map(i => <div key={i} className="h-14 rounded-lg bg-muted animate-pulse" />)}
      </div>
    );
  }

  if (!actions?.length) {
    return (
      <div className="py-6 text-center">
        <p className="text-sm font-caption text-muted-foreground">No tienes acciones activas.</p>
        <Link
          to="/crecer/nueva"
          className="mt-2 inline-flex items-center gap-1.5 text-sm font-semibold font-caption text-primary"
        >
          <Icon name="Plus" size={14} />
          Crear tu primera acción
        </Link>
      </div>
    );
  }

  return (
    <div>
      {actions.slice(0, 5).map(a => (
        <ActionRow
          key={a.id}
          action={a}
          accountId={accountId}
          userId={userId}
          onBoosted={onBoosted}
        />
      ))}
      {actions.length > 5 && (
        <Link
          to="/crecer/acciones"
          className="mt-2 flex items-center gap-1 text-xs font-caption text-primary font-semibold"
        >
          Ver todas ({actions.length}) <Icon name="ChevronRight" size={12} />
        </Link>
      )}
    </div>
  );
}
