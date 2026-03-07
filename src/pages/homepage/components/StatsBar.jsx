import React from 'react';
import Icon from 'components/AppIcon';
import { supabase } from '../../../lib/supabase';

const STAT_DEFS = [
  { key: 'businesses', label: 'Negocios registrados', icon: 'Building2', color: 'var(--color-primary)', showPlus: true },
  { key: 'classifieds', label: 'Clasificados activos', icon: 'Tag', color: 'var(--color-accent)', showPlus: true },
  { key: 'users', label: 'Usuarios activos', icon: 'Users', color: 'var(--color-success)', showPlus: true },
  { key: 'categories', label: 'Categorías', icon: 'LayoutGrid', color: 'var(--color-secondary)', showPlus: false },
];

function formatValue(count, showPlus = false) {
  if (typeof count !== 'number' || Number.isNaN(count)) return '—';
  const formatted = count.toLocaleString('es-CL');
  return showPlus ? `${formatted}+` : formatted;
}

export default function StatsBar() {
  const [stats, setStats] = React.useState(
    STAT_DEFS?.map((def) => ({ ...def, value: '—' }))
  );

  React.useEffect(() => {
    let isCancelled = false;

    const loadStats = async () => {
      try {
        const [
          { count: businessCount },
          { count: classifiedCount },
          { count: userCount },
          { count: categoryCount },
        ] = await Promise.all([
          supabase
            ?.from('businesses')
            ?.select('id', { count: 'exact', head: true })
            ?.in('status', ['published', 'premium']),
          supabase
            ?.from('classified_ads')
            ?.select('id', { count: 'exact', head: true })
            ?.eq('ad_status', 'active'),
          supabase
            ?.from('user_profiles')
            ?.select('id', { count: 'exact', head: true }),
          supabase
            ?.from('categories')
            ?.select('id', { count: 'exact', head: true })
            ?.eq('is_active', true),
        ]);

        if (isCancelled) return;

        setStats([
          {
            ...STAT_DEFS[0],
            value: formatValue(businessCount ?? 0, STAT_DEFS[0]?.showPlus),
          },
          {
            ...STAT_DEFS[1],
            value: formatValue(classifiedCount ?? 0, STAT_DEFS[1]?.showPlus),
          },
          {
            ...STAT_DEFS[2],
            value: formatValue(userCount ?? 0, STAT_DEFS[2]?.showPlus),
          },
          {
            ...STAT_DEFS[3],
            value: formatValue(categoryCount ?? 0, STAT_DEFS[3]?.showPlus),
          },
        ]);
      } catch (error) {
        // eslint-disable-next-line no-console
        console.error('Error cargando estadísticas del portal:', error);
      }
    };

    loadStats();

    return () => {
      isCancelled = true;
    };
  }, []);

  return (
    <section className="w-full py-6 md:py-8 px-4 md:px-6 lg:px-8 border-y border-border bg-card">
      <div className="max-w-7xl mx-auto">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6">
          {stats?.map((stat) => (
            <div
              key={stat?.label}
              className="flex flex-col sm:flex-row items-center sm:items-start gap-2 sm:gap-3 text-center sm:text-left"
            >
              <div
                className="flex items-center justify-center w-10 h-10 rounded-lg shrink-0"
                style={{ background: `${stat?.color}18` }}
              >
                <Icon name={stat?.icon} size={20} color={stat?.color} />
              </div>
              <div>
                <p className="font-heading font-bold text-xl md:text-2xl text-foreground font-data">
                  {stat?.value}
                </p>
                <p className="text-xs md:text-sm font-caption text-muted-foreground leading-tight">
                  {stat?.label}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}