import React, { useEffect, useState } from 'react';
import Icon from 'components/AppIcon';
import { supabase } from '../../../lib/supabase';

export default function StatsCards({ userId }) {
  const [stats, setStats] = useState({
    adViews: 0,
    businessVisits: 0,
    activeAds: 0,
    businesses: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userId) return;
    let mounted = true;
    async function fetchStats() {
      try {
        const [adsResult, bizResult] = await Promise.all([
          supabase?.from('classified_ads')?.select('views, ad_status')?.eq('user_id', userId),
          supabase?.from('businesses')?.select('profile_visits')?.eq('owner_id', userId),
        ]);
        if (!mounted) return;
        const ads = adsResult?.data || [];
        const businesses = bizResult?.data || [];
        setStats({
          adViews: ads?.reduce((sum, a) => sum + (a?.views || 0), 0),
          businessVisits: businesses?.reduce((sum, b) => sum + (b?.profile_visits || 0), 0),
          activeAds: ads?.filter(a => a?.ad_status === 'active')?.length,
          businesses: businesses?.length,
        });
      } catch (err) {
        console.error('StatsCards fetch error:', err);
      } finally {
        if (mounted) setLoading(false);
      }
    }
    fetchStats();
    return () => { mounted = false; };
  }, [userId]);

  const statItems = [
    { label: 'Vistas de Avisos', value: loading ? '...' : stats?.adViews?.toLocaleString('es-CL'), icon: 'Eye', color: 'var(--color-primary)' },
    { label: 'Visitas a Negocios', value: loading ? '...' : stats?.businessVisits?.toLocaleString('es-CL'), icon: 'Building2', color: 'var(--color-accent)' },
    { label: 'Avisos Activos', value: loading ? '...' : String(stats?.activeAds), icon: 'Tag', color: 'var(--color-success)' },
    { label: 'Negocios', value: loading ? '...' : String(stats?.businesses), icon: 'Store', color: 'var(--color-secondary)' },
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
      {statItems?.map((stat) => (
        <div
          key={stat?.label}
          className="bg-card border border-border rounded-md p-4 flex flex-col gap-2 shadow-sm"
        >
          <div
            className="w-9 h-9 rounded-md flex items-center justify-center"
            style={{ background: `${stat?.color}18` }}
          >
            <Icon name={stat?.icon} size={18} color={stat?.color} />
          </div>
          <p className="font-data text-xl md:text-2xl font-semibold text-foreground">{stat?.value}</p>
          <p className="text-xs font-caption text-muted-foreground leading-tight">{stat?.label}</p>
        </div>
      ))}
    </div>
  );
}