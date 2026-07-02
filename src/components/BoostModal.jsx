import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import Icon from 'components/AppIcon';

// Modal de confirmación de impulso de promoción.
// Props:
//   action       — { id, title }
//   balance      — número de créditos disponibles
//   cost         — créditos que cuesta PROMOTION_BOOST (por defecto 1)
//   onConfirm()  — async, ejecuta el boost; debe retornar { ok, error }
//   onClose()    — cierra el modal

export default function BoostModal({ action, balance, cost = 1, onConfirm, onClose }) {
  const [state, setState] = useState('idle'); // idle | loading | success | error
  const [errorMsg, setErrorMsg] = useState('');
  const [balanceAfter, setBalanceAfter] = useState(null);

  const available = balance ?? 0;
  const remaining = available - cost;
  const canAfford = available >= cost;

  async function handleConfirm() {
    setState('loading');
    setErrorMsg('');
    const result = await onConfirm();
    if (result.ok) {
      setBalanceAfter(result.balance);
      setState('success');
    } else {
      setErrorMsg(result.error || 'Algo salió mal. Intenta de nuevo.');
      setState('error');
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={state !== 'loading' ? onClose : undefined}
      />

      {/* Sheet */}
      <div className="relative w-full sm:max-w-sm bg-card rounded-t-3xl sm:rounded-2xl border border-border p-6 shadow-xl">

        {/* ── Estado: idle / cargando / error ─────────────────────────────── */}
        {state !== 'success' && (
          <>
            <div className="flex items-start justify-between mb-5">
              <div>
                <h2 className="font-heading font-bold text-lg text-foreground">
                  Impulsar promoción
                </h2>
                <p className="text-sm font-caption text-muted-foreground mt-0.5 line-clamp-1">
                  "{action?.title}"
                </p>
              </div>
              {state !== 'loading' && (
                <button
                  onClick={onClose}
                  className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-muted transition-colors shrink-0"
                >
                  <Icon name="X" size={16} color="var(--color-muted-foreground)" />
                </button>
              )}
            </div>

            {/* Qué incluye */}
            <div className="bg-primary/5 border border-primary/20 rounded-xl p-3 mb-5 space-y-1.5">
              {[
                'Aparece primero en el listado de Koronel',
                'Badge "Destacado" visible para los clientes',
                'Prioridad en el mapa interactivo',
              ].map(line => (
                <div key={line} className="flex items-center gap-2">
                  <Icon name="Zap" size={13} color="var(--color-primary)" />
                  <p className="text-xs font-caption text-foreground">{line}</p>
                </div>
              ))}
            </div>

            {/* Resumen de créditos */}
            <div className="space-y-2 mb-5">
              <CreditRow label="Costo" value={`${cost} crédito${cost !== 1 ? 's' : ''}`} />
              <CreditRow label="Tienes" value={`${available} créditos`} />
              <div className="border-t border-border pt-2">
                <CreditRow
                  label="Quedarás con"
                  value={canAfford ? `${remaining} créditos` : '—'}
                  highlight={canAfford}
                />
              </div>
            </div>

            {/* Error de saldo insuficiente */}
            {!canAfford && (
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 mb-4">
                <p className="text-sm font-caption text-amber-800 font-semibold mb-2">
                  No tienes créditos suficientes
                </p>
                <p className="text-xs font-caption text-amber-700 mb-3">
                  Necesitas {cost - available} crédito{cost - available !== 1 ? 's' : ''} más.
                </p>
                <Link
                  to="/billetera"
                  onClick={onClose}
                  className="inline-flex items-center gap-1.5 text-sm font-semibold font-caption text-primary"
                >
                  <Icon name="Plus" size={14} />
                  Recargar créditos
                </Link>
              </div>
            )}

            {/* Error de operación */}
            {state === 'error' && errorMsg && (
              <p className="text-sm font-caption text-red-600 mb-4 text-center">{errorMsg}</p>
            )}

            {/* Botones */}
            <div className="flex gap-3">
              {state !== 'loading' && (
                <button
                  onClick={onClose}
                  className="flex-1 h-11 rounded-xl border border-border text-sm font-semibold font-caption text-foreground hover:bg-muted transition-colors"
                >
                  Cancelar
                </button>
              )}
              <button
                onClick={handleConfirm}
                disabled={!canAfford || state === 'loading'}
                className="flex-1 h-11 rounded-xl text-sm font-semibold font-caption text-primary-foreground flex items-center justify-center gap-2 transition-opacity disabled:opacity-40"
                style={{ background: 'var(--color-primary)' }}
              >
                {state === 'loading' ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Impulsando...
                  </>
                ) : (
                  <>
                    <Icon name="Zap" size={15} color="white" />
                    Impulsar ahora
                  </>
                )}
              </button>
            </div>
          </>
        )}

        {/* ── Estado: éxito ────────────────────────────────────────────────── */}
        {state === 'success' && (
          <div className="text-center py-2">
            <div className="w-14 h-14 rounded-full flex items-center justify-center mx-auto mb-4"
              style={{ background: 'var(--color-primary)/10' }}>
              <Icon name="Zap" size={28} color="var(--color-primary)" />
            </div>
            <h2 className="font-heading font-bold text-xl text-foreground mb-1">¡Promoción impulsada!</h2>
            <p className="text-sm font-caption text-muted-foreground mb-4">
              Ahora aparece primero para más clientes.
            </p>
            {balanceAfter !== null && (
              <p className="text-xs font-caption text-muted-foreground mb-5">
                🪙 Te quedan <span className="font-semibold text-foreground">{balanceAfter} créditos</span>
              </p>
            )}
            <button
              onClick={onClose}
              className="w-full h-11 rounded-xl text-sm font-semibold font-caption text-primary-foreground"
              style={{ background: 'var(--color-primary)' }}
            >
              Entendido
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function CreditRow({ label, value, highlight }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-sm font-caption text-muted-foreground">{label}</span>
      <span className={`text-sm font-semibold font-caption ${highlight ? 'text-primary' : 'text-foreground'}`}>
        {value}
      </span>
    </div>
  );
}
