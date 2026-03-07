import React, { useState, useEffect, useCallback, useRef } from 'react';
import Header from 'components/ui/Header';
import Icon from 'components/AppIcon';
import Image from 'components/AppImage';
import { Link } from 'react-router-dom';
import StatsCards from './components/StatsCards';
import QuickActions from './components/QuickActions';
import TabNav from './components/TabNav';
import MyAdsTab from './components/MyAdsTab';
import MyBusinessesTab from './components/MyBusinessesTab';
import AccountSettingsTab from './components/AccountSettingsTab';
import MyMessagesTab from './components/MyMessagesTab';
import { useAuth } from '../../contexts/AuthContext';
import { messageService } from '../../services/messageService';

export default function UserAccountDashboard() {
  const [activeTab, setActiveTab] = useState('ads');
  const [unreadCount, setUnreadCount] = useState(0);
  const [toast, setToast] = useState(null);
  const channelRef = useRef(null);
  const toastTimerRef = useRef(null);
  const { user, userProfile } = useAuth();

  const displayName = userProfile?.full_name || user?.email?.split('@')?.[0] || 'Usuario';
  const memberSince = user?.created_at
    ? new Date(user?.created_at)?.toLocaleDateString('es-CL', { month: 'long', year: 'numeric' })
    : 'Recientemente';
  const avatarUrl = userProfile?.avatar_url || null;

  const showToast = useCallback((msg) => {
    setToast(msg);
    if (toastTimerRef?.current) clearTimeout(toastTimerRef?.current);
    toastTimerRef.current = setTimeout(() => setToast(null), 5000);
  }, []);

  const loadUnreadCount = useCallback(async () => {
    if (!user?.id) return;
    const { count } = await messageService?.getUnreadCount(user?.id);
    setUnreadCount(count || 0);
  }, [user?.id]);

  useEffect(() => {
    if (!user?.id) return;
    loadUnreadCount();

    // Real-time subscription for new messages
    channelRef.current = messageService?.subscribeToNewMessages(user?.id, (newMsg) => {
      setUnreadCount(prev => prev + 1);
      // Show in-app toast alert
      showToast({
        senderName: 'Nuevo mensaje',
        body: newMsg?.body || 'Tienes un nuevo mensaje'
      });
    });

    return () => {
      messageService?.unsubscribeFromMessages(channelRef?.current);
      if (toastTimerRef?.current) clearTimeout(toastTimerRef?.current);
    };
  }, [user?.id, loadUnreadCount, showToast]);

  // When user opens messages tab, refresh unread count
  const handleTabChange = (tab) => {
    setActiveTab(tab);
    if (tab === 'messages') {
      setTimeout(() => loadUnreadCount(), 800);
    }
  };

  return (
    <div className="min-h-screen" style={{ background: 'var(--color-background)' }}>
      <Header />
      {/* In-app toast notification */}
      {toast && (
        <div
          className="fixed top-20 right-4 z-50 flex items-start gap-3 px-4 py-3 rounded-lg shadow-lg max-w-sm animate-fade-in cursor-pointer"
          style={{ background: 'var(--color-card)', border: '1px solid var(--color-border)' }}
          onClick={() => { setActiveTab('messages'); setToast(null); }}
          role="alert"
        >
          <div className="w-8 h-8 rounded-full flex items-center justify-center shrink-0" style={{ background: 'var(--color-primary)' }}>
            <Icon name="MessageSquare" size={15} color="white" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-foreground">{toast?.senderName}</p>
            <p className="text-xs text-muted-foreground truncate mt-0.5">{toast?.body}</p>
            <p className="text-xs mt-1" style={{ color: 'var(--color-primary)' }}>Toca para ver →</p>
          </div>
          <button
            onClick={(e) => { e?.stopPropagation(); setToast(null); }}
            className="shrink-0 p-0.5 rounded hover:bg-muted transition-colors"
          >
            <Icon name="X" size={14} color="var(--color-muted-foreground)" />
          </button>
        </div>
      )}
      <main className="pt-16">
        {/* Page Header */}
        <div className="border-b border-border" style={{ background: 'var(--color-card)' }}>
          <div className="max-w-7xl mx-auto px-4 md:px-6 lg:px-8 py-5 md:py-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 md:w-14 md:h-14 rounded-full overflow-hidden bg-muted shrink-0 flex items-center justify-center">
                  {avatarUrl ? (
                    <Image src={avatarUrl} alt={`Avatar de ${displayName}`} className="w-full h-full object-cover" />
                  ) : (
                    <Icon name="User" size={24} color="var(--color-muted-foreground)" />
                  )}
                </div>
                <div>
                  <h1 className="font-heading font-bold text-xl md:text-2xl text-foreground">
                    Hola, {displayName?.split(' ')?.[0]}
                  </h1>
                  <p className="text-sm font-caption text-muted-foreground flex items-center gap-1.5">
                    <Icon name="Calendar" size={13} color="currentColor" />
                    Miembro desde {memberSince}
                  </p>
                </div>
              </div>
              <QuickActions />
            </div>
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-4 md:px-6 lg:px-8 py-5 md:py-6 space-y-5 md:space-y-6">
          {/* Stats */}
          <StatsCards userId={user?.id} />

          {/* Tabs + Content */}
          <div className="bg-card border border-border rounded-md overflow-hidden shadow-sm">
            <TabNav activeTab={activeTab} onTabChange={handleTabChange} unreadCount={unreadCount} />
            <div className="p-4 md:p-6">
              {activeTab === 'ads' && <MyAdsTab userId={user?.id} />}
              {activeTab === 'businesses' && <MyBusinessesTab userId={user?.id} />}
              {activeTab === 'messages' && <MyMessagesTab onMessagesRead={loadUnreadCount} />}
              {activeTab === 'settings' && <AccountSettingsTab />}
            </div>
          </div>
        </div>
      </main>
      {/* Footer */}
      <footer className="border-t border-border mt-10" style={{ background: 'var(--color-card)' }}>
        <div className="max-w-7xl mx-auto px-4 md:px-6 lg:px-8 py-6 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-md flex items-center justify-center" style={{ background: 'var(--color-primary)' }}>
              <Icon name="MapPin" size={14} color="white" />
            </div>
            <span className="font-heading font-bold text-sm" style={{ color: 'var(--color-primary)' }}>
              Coronel<span style={{ color: 'var(--color-accent)' }}>Local</span>
            </span>
          </div>
          <p className="text-xs font-caption text-muted-foreground">
            © {new Date()?.getFullYear()} CoronelLocal. Todos los derechos reservados.
          </p>
          <div className="flex items-center gap-4">
            <Link to="/homepage" className="text-xs font-caption text-muted-foreground hover:text-foreground transition-colors">Inicio</Link>
            <Link to="/classified-ads-listing" className="text-xs font-caption text-muted-foreground hover:text-foreground transition-colors">Clasificados</Link>
            <Link to="/business-directory-listing" className="text-xs font-caption text-muted-foreground hover:text-foreground transition-colors">Negocios</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}