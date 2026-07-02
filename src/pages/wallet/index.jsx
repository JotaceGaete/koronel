// Route: /billetera — Billetera del comerciante (protected)
import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import Icon from 'components/AppIcon';
import PageMeta from 'components/PageMeta';
import { useAuth } from '../../contexts/AuthContext';
import { accountService } from '../../services/accountService';
import { walletService } from '../../services/walletService';

const TYPE_LABELS = {
  credit_purchase: { icon: 'Plus',        color: '#22c55e' },
  plan_benefit:    { icon: 'Gift',         color: '#22c55e' },
  bonus_grant:     { icon: 'Sparkles',     color: '#22c55e' },
  gamification:    { icon: 'Trophy',       color: '#22c55e' },
  consume:         { icon: 'Minus',        color: 'var(--color-muted-foreground)' },
  refund:          { icon: 'RotateCcw',    color: '#22c55e' },
  expiry:          { icon: 'Clock',        color: '#ef4444' },
  adjustment:      { icon: 'SlidersHorizontal', color: 'var(--color-muted-foreground)' },
};

function formatDate(iso) {
  const d = new Date(iso);
  const now = new Date();
  const diffDays = Math.floor((now - d) / 86400000);
  if (diffDays === 0) return 'Hoy';
  if (diffDays === 1) return 'Ayer';
  if (diffDays < 7)  return `Hace ${diffDays} días`;
  return d.toLocaleDateString('es-CL', { day: 'numeric', month: 'short' });
}

function formatCLP(n) {
  return '$' + n.toLocaleString('es-CL');
}

export default function WalletPage() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [accountId, setAccountId]   = useState(null);
  const [balance, setBalance]       = useState(null);
  const [transactions, setTx]       = useState([]);
  const [packages, setPackages]     = useState([]);
  const [estimate, setEstimate]     = useState([]);
  const [loading, setLoading]       = useState(true);
  const [activeTab, setActiveTab]   = useState('balance'); // 'balance' | 'history' | 'buy'

  useEffect(() => {
    if (!user) { navigate('/login', { state: { from: '/billetera' } }); return; }
    async function load() {
      const { data: acctId } = await accountService.getPrimaryAccountId(user.id);
      if (!acctId) { navigate('/crecer'); return; }
      setAccountId(acctId);

      const [balRes, txRes, pkgRes] = await Promise.all([
        walletService.getBalance(acctId),
        walletService.getTransactions(acctId, { limit: 40 }),
        walletService.getPackages(),
      ]);

      const bal = balRes.data;
      setBalance(bal);
      setTx(txRes.data || []);
      setPackages(pkgRes.data || []);

      if (bal?.available > 0) {
        const { data: est } = await walletService.getCapacityEstimate(bal.available);
        setEstimate(est || []);
      }
      setLoading(false);
    }
    load();
  }, [user]);

  const available = balance ? (balance.balance_total - balance.reserved_total) : 0;

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--color-background)' }}>
        <div className="w-8 h-8 border-2 border-t-transparent rounded-full animate-spin"
          style={{ borderColor: 'var(--color-primary)', borderTopColor: 'transparent' }} />
      </div>
    );
  }

  return (
    <div className="min-h-screen" style={{ background: 'var(--color-background)' }}>
      <PageMeta title="Mis créditos" path="/billetera" />

      {/* Header */}
      <div className="fixed top-0 left-0 right-0 z-40 flex items-center h-14 px-4 gap-3 border-b border-border"
        style={{ background: 'var(--color-background)' }}>
        <button onClick={() => navigate(-1)}
          className="w-9 h-9 flex items-center justify-center rounded-full hover:bg-muted transition-colors">
          <Icon name="ArrowLeft" size={18} color="var(--color-foreground)" />
        </button>
        <h1 className="font-heading font-bold text-base text-foreground flex-1">Mis créditos</h1>
      </div>

      <div style={{ paddingTop: '56px' }} className="max-w-lg mx-auto px-4 py-6 space-y-6">

        {/* Saldo principal */}
        <div className="bg-card border border-border rounded-2xl p-5">
          <p className="text-xs font-caption text-muted-foreground uppercase tracking-wide font-semibold mb-3">
            Créditos disponibles
          </p>
          <div className="flex items-end gap-3 mb-4">
            <span className="text-4xl leading-none">🪙</span>
            <span className="font-heading font-bold text-4xl text-foreground leading-none">{available}</span>
          </div>

          {/* Desglose por bolsa */}
          <div className="space-y-2 mb-4">
            {balance?.balance_plan > 0 && (
              <BolsaRow label="Plan mensual" value={balance.balance_plan}
                note={balance.plan_credits_at ? `desde ${formatDate(balance.plan_credits_at)}` : null}
                color="#6366f1" />
            )}
            {balance?.balance_purchased > 0 && (
              <BolsaRow label="Comprados" value={balance.balance_purchased}
                note="sin vencimiento" color="var(--color-primary)" />
            )}
            {balance?.balance_bonus > 0 && (
              <BolsaRow label="Bonos" value={balance.balance_bonus}
                note="pueden vencer" color="#f59e0b" />
            )}
            {available === 0 && (
              <p className="text-sm font-caption text-muted-foreground">
                No tienes créditos disponibles.
              </p>
            )}
          </div>

          {/* Capacidad estimada */}
          {estimate.length > 0 && (
            <div className="border-t border-border pt-3">
              <p className="text-xs font-caption text-muted-foreground mb-2">Con estos créditos puedes:</p>
              <div className="space-y-1">
                {estimate.map(e => (
                  <p key={e.action_key} className="text-xs font-caption text-foreground">
                    · <span className="font-semibold">{e.count}</span> {e.label}
                  </p>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Tab selector */}
        <div className="flex gap-1 p-1 bg-muted rounded-xl">
          {[
            { key: 'buy',     label: 'Recargar'  },
            { key: 'history', label: 'Historial' },
          ].map(tab => (
            <button key={tab.key} onClick={() => setActiveTab(tab.key)}
              className={`flex-1 py-2 rounded-lg text-sm font-semibold font-caption transition-all ${
                activeTab === tab.key
                  ? 'bg-card text-foreground shadow-sm'
                  : 'text-muted-foreground'
              }`}>
              {tab.label}
            </button>
          ))}
        </div>

        {/* Recargar */}
        {activeTab === 'buy' && (
          <div className="space-y-3">
            {packages.map(pkg => (
              <PackageCard key={pkg.id} pkg={pkg} />
            ))}
            <p className="text-xs font-caption text-muted-foreground text-center pt-2">
              Los créditos comprados no vencen.
            </p>
          </div>
        )}

        {/* Historial */}
        {activeTab === 'history' && (
          <div className="space-y-1">
            {transactions.length === 0 ? (
              <div className="text-center py-10">
                <p className="text-muted-foreground text-sm font-caption">Aún no hay movimientos.</p>
              </div>
            ) : (
              transactions.map(tx => (
                <TransactionRow key={tx.id} tx={tx} />
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function BolsaRow({ label, value, note, color }) {
  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-2">
        <span className="w-2 h-2 rounded-full shrink-0" style={{ background: color }} />
        <span className="text-sm font-caption text-foreground">{label}</span>
        {note && <span className="text-xs font-caption text-muted-foreground">· {note}</span>}
      </div>
      <span className="text-sm font-semibold font-caption text-foreground">{value}</span>
    </div>
  );
}

function PackageCard({ pkg }) {
  const total = pkg.credits + pkg.bonus_credits;
  return (
    <div className={`relative rounded-2xl border p-4 ${pkg.is_featured ? 'border-primary bg-primary/5' : 'border-border bg-card'}`}>
      {pkg.is_featured && (
        <span className="absolute top-3 right-3 text-xs font-caption font-semibold px-2 py-0.5 rounded-full bg-primary text-primary-foreground">
          Popular
        </span>
      )}
      <p className="font-heading font-bold text-base text-foreground mb-0.5">{pkg.name}</p>
      {pkg.tagline && (
        <p className="text-xs font-caption text-muted-foreground mb-3 leading-snug pr-16">{pkg.tagline}</p>
      )}
      <div className="flex items-end justify-between">
        <div>
          <span className="font-heading font-bold text-2xl text-foreground">{pkg.credits}</span>
          {pkg.bonus_credits > 0 && (
            <span className="text-sm font-caption text-primary font-semibold ml-1">
              + {pkg.bonus_credits} de regalo
            </span>
          )}
          <p className="text-xs font-caption text-muted-foreground mt-0.5">
            {total} créditos en total
          </p>
        </div>
        <button
          className="px-4 py-2 rounded-xl text-sm font-semibold font-caption text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-40"
          style={{ background: 'var(--color-primary)' }}
          disabled
          title="Próximamente"
        >
          {formatCLP(pkg.price_clp)}
        </button>
      </div>
    </div>
  );
}

function TransactionRow({ tx }) {
  const isPositive = tx.amount > 0;
  const cfg = TYPE_LABELS[tx.type] || { icon: 'Circle', color: 'var(--color-muted-foreground)' };

  return (
    <div className="flex items-center gap-3 py-3 border-b border-border last:border-0">
      <div className="w-8 h-8 rounded-full flex items-center justify-center shrink-0"
        style={{ background: cfg.color + '18' }}>
        <Icon name={cfg.icon} size={15} color={cfg.color} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-caption text-foreground leading-tight truncate">{tx.display_label}</p>
        <p className="text-xs font-caption text-muted-foreground mt-0.5">{formatDate(tx.created_at)}</p>
      </div>
      {tx.amount !== 0 && (
        <span className={`text-sm font-semibold font-caption shrink-0 ${isPositive ? 'text-green-600' : 'text-foreground'}`}>
          {isPositive ? '+' : ''}{tx.amount}
        </span>
      )}
    </div>
  );
}
