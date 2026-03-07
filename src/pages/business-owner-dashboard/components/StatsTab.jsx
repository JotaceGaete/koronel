import React from 'react';
import Icon from 'components/AppIcon';

function StatCard({ icon, iconColor, value, label }) {
  return (
    <div className="bg-card border border-border rounded-xl p-4 flex items-center gap-4">
      <div
        className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0"
        style={{ background: `${iconColor}20` }}
      >
        <Icon name={icon} size={22} color={iconColor} />
      </div>
      <div>
        <p className="font-heading font-bold text-2xl text-foreground leading-none">{value}</p>
        <p className="text-sm text-muted-foreground mt-0.5">{label}</p>
      </div>
    </div>
  );
}

export default function StatsTab({ businesses }) {
  if (!businesses?.length) {
    return (
      <div className="py-12 text-center">
        <Icon name="BarChart2" size={40} color="var(--color-muted-foreground)" className="mx-auto mb-3" />
        <p className="text-sm text-muted-foreground">No tienes negocios registrados aún.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {businesses?.map(biz => (
        <div key={biz?.id}>
          {businesses?.length > 1 && (
            <h3 className="font-heading font-semibold text-foreground mb-3 flex items-center gap-2">
              <Icon name="Building2" size={16} color="var(--color-primary)" />
              {biz?.name}
            </h3>
          )}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <StatCard
              icon="Eye"
              iconColor="var(--color-primary)"
              value={biz?.profile_visits || 0}
              label="Visitas al perfil"
            />
            <StatCard
              icon="Phone"
              iconColor="var(--color-accent)"
              value={biz?.contacts_count || 0}
              label="Contactos recibidos"
            />
            <div className="bg-card border border-border rounded-xl p-4 flex items-center gap-4">
              <div
                className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0"
                style={{ background: '#fef3c7' }}
              >
                <Icon name="Star" size={22} color="#f59e0b" />
              </div>
              <div>
                <div className="flex items-baseline gap-1.5">
                  <p className="font-heading font-bold text-2xl text-foreground leading-none">
                    {biz?.review_count || 0}
                  </p>
                  {biz?.rating ? (
                    <span className="text-sm font-medium" style={{ color: '#f59e0b' }}>
                      ★ {parseFloat(biz?.rating)?.toFixed(1)}
                    </span>
                  ) : null}
                </div>
                <p className="text-sm text-muted-foreground mt-0.5">Reseñas</p>
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
