// Route: /crecer  — Centro de Crecimiento (protected)
import React, { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import Header from 'components/ui/Header';
import PageMeta from 'components/PageMeta';
import Icon from 'components/AppIcon';
import { useAuth } from '../../contexts/AuthContext';
import { businessService } from '../../services/businessService';
import { pulseService } from '../../services/pulseService';
import { actionService } from '../../services/actionService';
import { calendarService } from '../../services/calendarService';
import { accountService } from '../../services/accountService';
import { walletService } from '../../services/walletService';
import { INTENT_OPTIONS } from '../../lib/intentToSuggestion';
import PulseIndicator from './components/PulseIndicator';
import WeeklySummary from './components/WeeklySummary';
import AdvisorCard from './components/AdvisorCard';
import ActiveActionsMini from './components/ActiveActionsMini';
import WalletWidget from './components/WalletWidget';

export default function GrowthCenter() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [business, setBusiness] = useState(null);
  const [businesses, setBusinesses] = useState([]);
  const [loadingBusiness, setLoadingBusiness] = useState(true);

  const [pulse, setPulse] = useState(null);
  const [weeklyStats, setWeeklyStats] = useState(null);
  const [actions, setActions] = useState([]);
  const [calendarEvent, setCalendarEvent] = useState(null);
  const [advisorDismissed, setAdvisorDismissed] = useState(false);
  const [loadingData, setLoadingData] = useState(true);
  const [walletBalance, setWalletBalance] = useState(null);
  const [loadingWallet, setLoadingWallet] = useState(true);

  // Load user's businesses
  useEffect(() => {
    if (!user) {
      navigate('/login', { state: { from: '/crecer' } });
      return;
    }
    async function loadBusinesses() {
      const { data } = await businessService?.getByOwner(user?.id);
      const list = data || [];
      setBusinesses(list);
      if (list.length > 0) setBusiness(list[0]);
      setLoadingBusiness(false);
    }
    loadBusinesses();

    // Cargar wallet en paralelo (no bloquea el resto del dashboard)
    accountService.getPrimaryAccountId(user.id).then(({ data: acctId }) => {
      if (acctId) {
        walletService.getBalance(acctId).then(({ data }) => {
          setWalletBalance(data);
          setLoadingWallet(false);
        });
      } else {
        setLoadingWallet(false);
      }
    });
  }, [user]);

  // Load dashboard data once we have a business
  const loadDashboard = useCallback(async () => {
    if (!business?.id) return;
    setLoadingData(true);
    const [pulseRes, statsRes, actionsRes, calRes] = await Promise.all([
      pulseService.getBusinessPulse(business.id),
      pulseService.getWeeklyStats(business.id),
      actionService.getByUser(user?.id),
      calendarService.getUpcoming(business?.category_key, 1),
    ]);
    setPulse(pulseRes);
    setWeeklyStats(statsRes?.data);
    setActions(actionsRes?.data || []);
    setCalendarEvent(calRes?.data?.[0] || null);
    setLoadingData(false);
  }, [business, user]);

  useEffect(() => { loadDashboard(); }, [loadDashboard]);

  const activeActions = actions.filter(a => a.status === 'active' && new Date(a.ends_at) > new Date());
  const hourNow = new Date().getHours();
  const greeting = hourNow < 12 ? 'Buenos días' : hourNow < 19 ? 'Buenas tardes' : 'Buenas noches';
  const firstName = user?.user_metadata?.full_name?.split(' ')?.[0] || user?.email?.split('@')?.[0] || 'ahí';

  const handleIntent = (intentKey) => {
    navigate(`/crecer/nueva?intent=${intentKey}&bid=${business?.id}`);
  };

  if (loadingBusiness) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--color-background)' }}>
        <div className="w-8 h-8 border-2 border-t-transparent rounded-full animate-spin" style={{ borderColor: 'var(--color-primary)', borderTopColor: 'transparent' }} />
      </div>
    );
  }

  if (!loadingBusiness && businesses.length === 0) {
    return (
      <div className="min-h-screen" style={{ background: 'var(--color-background)' }}>
        <PageMeta title="Centro de Crecimiento" path="/crecer" />
        <Header />
        <div style={{ paddingTop: '64px' }} className="flex flex-col items-center justify-center min-h-[80vh] px-4 text-center">
          <div className="w-16 h-16 rounded-full flex items-center justify-center mb-4" style={{ background: 'var(--color-primary)/10' }}>
            <Icon name="Store" size={32} color="var(--color-primary)" />
          </div>
          <h1 className="font-heading font-bold text-xl text-foreground mb-2">Registra tu negocio primero</h1>
          <p className="text-sm font-caption text-muted-foreground max-w-xs mb-6">
            Para usar el Centro de Crecimiento necesitas tener al menos un negocio publicado en Koronel.
          </p>
          <Link
            to="/publicar-negocio"
            className="inline-flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-semibold font-caption text-primary-foreground transition-colors hover:opacity-90"
            style={{ background: 'var(--color-primary)' }}
          >
            <Icon name="Plus" size={16} color="white" />
            Publicar mi negocio
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen" style={{ background: 'var(--color-background)' }}>
      <PageMeta title="Centro de Crecimiento" description="Gestiona y mide el crecimiento de tu negocio en Koronel." path="/crecer" />
      <Header />
      <div style={{ paddingTop: '64px' }} className="max-w-2xl mx-auto px-4 py-6 space-y-6">

        {/* Greeting + business selector */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
          <p className="text-sm font-caption text-muted-foreground">{greeting}, {firstName}.</p>
          {businesses.length > 1 ? (
            <select
              value={business?.id}
              onChange={e => setBusiness(businesses.find(b => b.id === e.target.value))}
              className="mt-1 font-heading font-bold text-xl text-foreground bg-transparent border-none outline-none cursor-pointer"
            >
              {businesses.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
            </select>
          ) : (
            <h1 className="font-heading font-bold text-xl text-foreground mt-0.5">{business?.name}</h1>
          )}
          </div>
          <WalletWidget balance={walletBalance} loading={loadingWallet} />
        </div>

        {/* Pulse */}
        {pulse && (
          <PulseIndicator
            pulse={pulse.pulse}
            reason={pulse.reason}
            cta={pulse.cta}
            onCta={() => navigate('/crecer/nueva')}
          />
        )}

        {/* Advisor — upcoming commercial date */}
        {calendarEvent && !advisorDismissed && (
          <AdvisorCard
            event={calendarEvent}
            onCreateAction={() => navigate(`/crecer/nueva?bid=${business?.id}`)}
            onDismiss={() => setAdvisorDismissed(true)}
          />
        )}

        {/* ¿Qué necesitas hoy? */}
        <div>
          <h2 className="font-heading font-semibold text-base text-foreground mb-3">¿Qué necesitas hoy?</h2>
          <div className="grid grid-cols-2 gap-3">
            {INTENT_OPTIONS.map(opt => (
              <button
                key={opt.key}
                onClick={() => handleIntent(opt.key)}
                className="flex items-center gap-3 p-3.5 bg-card border border-border rounded-xl text-left hover:border-primary/40 hover:shadow-sm transition-all"
              >
                <div
                  className="shrink-0 w-9 h-9 rounded-full flex items-center justify-center"
                  style={{ background: opt.color + '18' }}
                >
                  <Icon name={opt.icon} size={18} color={opt.color} />
                </div>
                <span className="text-sm font-caption font-medium text-foreground leading-tight">{opt.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Weekly summary */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-heading font-semibold text-base text-foreground">Esta semana</h2>
          </div>
          <WeeklySummary stats={weeklyStats} loading={loadingData} />
        </div>

        {/* Active actions */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-heading font-semibold text-base text-foreground">
              Acciones activas
              {activeActions.length > 0 && (
                <span className="ml-2 text-xs font-caption px-2 py-0.5 rounded-full bg-primary/10 text-primary font-semibold">
                  {activeActions.length}
                </span>
              )}
            </h2>
            {actions.length > 0 && (
              <Link to="/crecer/acciones" className="text-xs font-caption font-semibold text-primary hover:underline">
                Ver todas
              </Link>
            )}
          </div>
          <div className="bg-card border border-border rounded-xl px-4">
            <ActiveActionsMini actions={activeActions} loading={loadingData} />
          </div>
        </div>

        {/* Bottom CTA */}
        <div className="pb-6">
          <button
            onClick={() => navigate(`/crecer/nueva?bid=${business?.id}`)}
            className="w-full h-12 rounded-xl text-sm font-caption font-semibold text-primary-foreground flex items-center justify-center gap-2 transition-opacity hover:opacity-90"
            style={{ background: 'var(--color-primary)' }}
          >
            <Icon name="Plus" size={18} color="white" />
            Crear una acción
          </button>
        </div>
      </div>
    </div>
  );
}
