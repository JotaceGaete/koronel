import React, { useState, useEffect, useRef, useCallback } from 'react';
import Icon from 'components/AppIcon';
import { supabase } from '../../lib/supabase';

const NOTIFICATION_TYPES = [
  {
    key: 'claims',
    label: 'Reclamaciones pendientes',
    icon: 'FileCheck',
    color: '#f59e0b',
    section: 'claims',
    query: async () => {
      const { count } = await supabase?.from('business_claims')?.select('id', { count: 'exact', head: true })?.eq('claim_status', 'pending');
      return count || 0;
    },
    fetchItems: async () => {
      const { data } = await supabase?.from('business_claims')?.select('id, claimant_name, created_at, business:businesses(name)')?.eq('claim_status', 'pending')?.order('created_at', { ascending: false })?.limit(5);
      return (data || [])?.map(r => ({
        id: r?.id,
        text: `${r?.claimant_name} reclama "${r?.business?.name || '—'}"`,
        time: r?.created_at,
        section: 'claims',
        icon: 'FileCheck',
        color: '#f59e0b',
      }));
    },
  },
  {
    key: 'ads',
    label: 'Clasificados pendientes',
    icon: 'Tag',
    color: '#f97316',
    section: 'ads',
    query: async () => {
      const { count } = await supabase?.from('classified_ads')?.select('id', { count: 'exact', head: true })?.eq('ad_status', 'pending');
      return count || 0;
    },
    fetchItems: async () => {
      const { data } = await supabase?.from('classified_ads')?.select('id, title, created_at')?.eq('ad_status', 'pending')?.order('created_at', { ascending: false })?.limit(5);
      return (data || [])?.map(r => ({
        id: r?.id,
        text: `Clasificado: "${r?.title}"`,
        time: r?.created_at,
        section: 'ads',
        icon: 'Tag',
        color: '#f97316',
      }));
    },
  },
  {
    key: 'community',
    label: 'Posts comunidad pendientes',
    icon: 'MessageCircle',
    color: '#8b5cf6',
    section: 'community',
    query: async () => {
      const { count } = await supabase?.from('community_posts')?.select('id', { count: 'exact', head: true })?.eq('status', 'pending');
      return count || 0;
    },
    fetchItems: async () => {
      const { data } = await supabase?.from('community_posts')?.select('id, title, created_at')?.eq('status', 'pending')?.order('created_at', { ascending: false })?.limit(5);
      return (data || [])?.map(r => ({
        id: r?.id,
        text: `Post: "${r?.title}"`,
        time: r?.created_at,
        section: 'community',
        icon: 'MessageCircle',
        color: '#8b5cf6',
      }));
    },
  },
  {
    key: 'events',
    label: 'Eventos pendientes',
    icon: 'CalendarDays',
    color: '#06b6d4',
    section: 'events',
    query: async () => {
      const { count } = await supabase?.from('events')?.select('id', { count: 'exact', head: true })?.eq('status', 'pending');
      return count || 0;
    },
    fetchItems: async () => {
      const { data } = await supabase?.from('events')?.select('id, title, created_at')?.eq('status', 'pending')?.order('created_at', { ascending: false })?.limit(5);
      return (data || [])?.map(r => ({
        id: r?.id,
        text: `Evento: "${r?.title}"`,
        time: r?.created_at,
        section: 'events',
        icon: 'CalendarDays',
        color: '#06b6d4',
      }));
    },
  },
  {
    key: 'empleos',
    label: 'Empleos pendientes',
    icon: 'Briefcase',
    color: '#10b981',
    section: 'empleos',
    query: async () => {
      const { count } = await supabase?.from('jobs')?.select('id', { count: 'exact', head: true })?.eq('status', 'pending');
      return count || 0;
    },
    fetchItems: async () => {
      const { data } = await supabase?.from('jobs')?.select('id, title, company, created_at')?.eq('status', 'pending')?.order('created_at', { ascending: false })?.limit(5);
      return (data || [])?.map(r => ({
        id: r?.id,
        text: `Empleo: "${r?.title}" — ${r?.company}`,
        time: r?.created_at,
        section: 'empleos',
        icon: 'Briefcase',
        color: '#10b981',
      }));
    },
  },
  {
    key: 'businesses',
    label: 'Negocios pendientes',
    icon: 'Building2',
    color: '#3b82f6',
    section: 'businesses',
    query: async () => {
      const { count } = await supabase?.from('businesses')?.select('id', { count: 'exact', head: true })?.eq('status', 'pending');
      return count || 0;
    },
    fetchItems: async () => {
      const { data } = await supabase?.from('businesses')?.select('id, name, created_at')?.eq('status', 'pending')?.order('created_at', { ascending: false })?.limit(5);
      return (data || [])?.map(r => ({
        id: r?.id,
        text: `Negocio: "${r?.name}"`,
        time: r?.created_at,
        section: 'businesses',
        icon: 'Building2',
        color: '#3b82f6',
      }));
    },
  },
];

function timeAgo(dateStr) {
  if (!dateStr) return '';
  try {
    const diff = Date.now() - new Date(dateStr)?.getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'ahora';
    if (mins < 60) return `hace ${mins}m`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `hace ${hrs}h`;
    const days = Math.floor(hrs / 24);
    return `hace ${days}d`;
  } catch { return ''; }
}

export default function AdminNotificationsPanel({ onNavigate }) {
  const [open, setOpen] = useState(false);
  const [totalCount, setTotalCount] = useState(0);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [seenIds, setSeenIds] = useState(() => {
    try { return new Set(JSON.parse(localStorage.getItem('admin_seen_notifs') || '[]')); }
    catch { return new Set(); }
  });
  const panelRef = useRef(null);

  // Fetch counts for badge
  const fetchCounts = useCallback(async () => {
    try {
      const counts = await Promise.all(NOTIFICATION_TYPES?.map(t => t?.query()));
      setTotalCount(counts?.reduce((a, b) => a + b, 0));
    } catch { /* silent */ }
  }, []);

  // Fetch all pending items for dropdown
  const fetchItems = useCallback(async () => {
    setLoading(true);
    try {
      const allArrays = await Promise.all(NOTIFICATION_TYPES?.map(t => t?.fetchItems()));
      const all = allArrays?.flat()?.sort((a, b) => new Date(b.time) - new Date(a.time));
      setItems(all);
    } catch { /* silent */ } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCounts();
    const interval = setInterval(fetchCounts, 60000);
    return () => clearInterval(interval);
  }, [fetchCounts]);

  useEffect(() => {
    if (open) fetchItems();
  }, [open, fetchItems]);

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    const handler = (e) => {
      if (panelRef?.current && !panelRef?.current?.contains(e?.target)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  const unseenCount = items?.filter(i => !seenIds?.has(i?.id))?.length;

  const handleOpen = () => {
    setOpen(v => !v);
  };

  const markAllSeen = () => {
    const newSeen = new Set([...seenIds, ...items.map(i => i.id)]);
    setSeenIds(newSeen);
    try { localStorage.setItem('admin_seen_notifs', JSON.stringify([...newSeen])); } catch { /* silent */ }
  };

  const handleItemClick = (item) => {
    // Mark this item as seen
    const newSeen = new Set([...seenIds, item.id]);
    setSeenIds(newSeen);
    try { localStorage.setItem('admin_seen_notifs', JSON.stringify([...newSeen])); } catch { /* silent */ }
    onNavigate?.(item?.section);
    setOpen(false);
  };

  const displayCount = Math.min(totalCount, 99);

  return (
    <div className="relative" ref={panelRef}>
      {/* Bell Button */}
      <button
        onClick={handleOpen}
        className="relative flex items-center justify-center w-9 h-9 rounded-md border border-border bg-muted hover:bg-primary hover:text-primary-foreground transition-all"
        aria-label="Notificaciones"
      >
        <Icon name="Bell" size={17} color="currentColor" />
        {totalCount > 0 && (
          <span
            className="absolute -top-1.5 -right-1.5 flex items-center justify-center min-w-[18px] h-[18px] px-1 rounded-full text-[10px] font-bold text-white leading-none"
            style={{ background: '#ef4444' }}
          >
            {displayCount}{totalCount > 99 ? '+' : ''}
          </span>
        )}
      </button>
      {/* Dropdown Panel */}
      {open && (
        <div
          className="absolute right-0 top-full mt-2 w-full max-w-[320px] bg-card border border-border rounded-xl shadow-xl z-[200] overflow-hidden"
          style={{ maxHeight: '480px' }}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-border">
            <div className="flex items-center gap-2">
              <Icon name="Bell" size={15} color="var(--color-primary)" />
              <span className="text-sm font-semibold text-foreground">Notificaciones</span>
              {totalCount > 0 && (
                <span
                  className="flex items-center justify-center min-w-[20px] h-5 px-1.5 rounded-full text-[10px] font-bold text-white"
                  style={{ background: '#ef4444' }}
                >
                  {displayCount}
                </span>
              )}
            </div>
            {items?.length > 0 && unseenCount > 0 && (
              <button
                onClick={markAllSeen}
                className="text-xs text-muted-foreground hover:text-foreground transition-colors"
              >
                Marcar vistas
              </button>
            )}
          </div>

          {/* Summary pills */}
          <div className="flex flex-wrap gap-1.5 px-4 py-2.5 border-b border-border bg-muted/40">
            {NOTIFICATION_TYPES?.map(type => {
              const typeItems = items?.filter(i => i?.section === type?.section);
              if (typeItems?.length === 0) return null;
              return (
                <button
                  key={type?.key}
                  onClick={() => { onNavigate?.(type?.section); setOpen(false); }}
                  className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium border transition-colors hover:opacity-80"
                  style={{ borderColor: type?.color, color: type?.color, background: type?.color + '18' }}
                >
                  <Icon name={type?.icon} size={11} color={type?.color} />
                  {typeItems?.length}
                </button>
              );
            })}
            {items?.length === 0 && !loading && (
              <span className="text-xs text-muted-foreground">Sin pendientes</span>
            )}
          </div>

          {/* Items list */}
          <div className="overflow-y-auto" style={{ maxHeight: '320px' }}>
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <div
                  className="w-5 h-5 rounded-full border-2 border-t-transparent animate-spin"
                  style={{ borderColor: 'var(--color-primary)', borderTopColor: 'transparent' }}
                />
              </div>
            ) : items?.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 gap-2">
                <Icon name="CheckCircle2" size={28} color="#22c55e" />
                <p className="text-sm text-muted-foreground">Todo al día</p>
              </div>
            ) : (
              items?.map((item) => {
                const isSeen = seenIds?.has(item?.id);
                return (
                  <button
                    key={item?.id}
                    onClick={() => handleItemClick(item)}
                    className={`w-full flex items-start gap-3 px-4 py-3 text-left hover:bg-muted/60 transition-colors border-b border-border/50 last:border-b-0 ${
                      isSeen ? 'opacity-60' : ''
                    }`}
                  >
                    <div
                      className="flex-shrink-0 flex items-center justify-center w-7 h-7 rounded-full mt-0.5"
                      style={{ background: item?.color + '20' }}
                    >
                      <Icon name={item?.icon} size={13} color={item?.color} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium text-foreground leading-snug line-clamp-2">
                        {!isSeen && (
                          <span
                            className="inline-block w-1.5 h-1.5 rounded-full mr-1.5 mb-0.5 align-middle"
                            style={{ background: item?.color }}
                          />
                        )}
                        {item?.text}
                      </p>
                      <p className="text-[10px] text-muted-foreground mt-0.5">{timeAgo(item?.time)}</p>
                    </div>
                    <Icon name="ChevronRight" size={13} color="var(--color-muted-foreground)" className="flex-shrink-0 mt-1" />
                  </button>
                );
              })
            )}
          </div>

          {/* Footer */}
          {items?.length > 0 && (
            <div className="px-4 py-2.5 border-t border-border bg-muted/30">
              <p className="text-[10px] text-muted-foreground text-center">
                Mostrando los últimos 5 por categoría · Haz clic para ir a la sección
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
