import React from 'react';
import Icon from 'components/AppIcon';

const CHANNELS = [
  {
    key: 'dist_koronel',
    icon: 'Globe',
    label: 'Listado de Koronel',
    description: 'Aparece en /acciones para toda la comunidad.',
    locked: true,
  },
  {
    key: 'dist_map',
    icon: 'Map',
    label: 'Mapa interactivo',
    description: 'Se muestra como pin en el mapa de Koronel.',
    locked: false,
  },
  {
    key: 'dist_profile',
    icon: 'Store',
    label: 'Perfil de tu negocio',
    description: 'Visible en la página de tu negocio.',
    locked: false,
  },
  {
    key: 'dist_followers',
    icon: 'Bell',
    label: 'Notificar seguidores',
    description: 'Las personas que siguen tu negocio reciben una notificación.',
    locked: false,
    badge: (followers) => followers > 0 ? `${followers} seguidores` : null,
  },
];

export default function DistributionStep({ form, onChange, business, followersCount }) {
  const hasWalinka = business?.walinka_enabled || business?.walinka_catalog_url;

  return (
    <div className="space-y-5">
      <div>
        <h2 className="font-heading font-bold text-xl text-foreground mb-1">¿Dónde la mostramos?</h2>
        <p className="text-sm font-caption text-muted-foreground">
          Una sola acción, todos los canales. Elige dónde quieres que aparezca.
        </p>
      </div>

      <div className="space-y-2">
        {CHANNELS.map(ch => {
          const isOn = form[ch.key] !== false;
          const badge = ch.badge?.(followersCount);
          return (
            <div
              key={ch.key}
              className={`flex items-center gap-3 p-4 rounded-xl border transition-all ${
                isOn ? 'border-primary/30 bg-primary/5' : 'border-border bg-card'
              } ${ch.locked ? 'opacity-75' : 'cursor-pointer'}`}
              onClick={() => !ch.locked && onChange(ch.key, !isOn)}
            >
              <div className={`shrink-0 w-10 h-10 rounded-full flex items-center justify-center ${isOn ? 'bg-primary/10' : 'bg-muted'}`}>
                <Icon name={ch.icon} size={18} color={isOn ? 'var(--color-primary)' : 'var(--color-muted-foreground)'} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-semibold font-caption text-foreground">{ch.label}</p>
                  {ch.locked && <span className="text-xs font-caption px-1.5 py-0.5 rounded-full bg-muted text-muted-foreground">Siempre activo</span>}
                  {badge && <span className="text-xs font-caption px-1.5 py-0.5 rounded-full bg-primary/10 text-primary">{badge}</span>}
                </div>
                <p className="text-xs font-caption text-muted-foreground mt-0.5">{ch.description}</p>
              </div>
              {!ch.locked && (
                <div className={`shrink-0 w-11 h-6 rounded-full transition-colors ${isOn ? 'bg-primary' : 'bg-muted'}`}>
                  <span className={`block mt-0.5 w-5 h-5 rounded-full bg-white shadow transition-all ${isOn ? 'ml-5' : 'ml-0.5'}`} />
                </div>
              )}
            </div>
          );
        })}

        {/* Walinka channel — only if business has it */}
        {hasWalinka ? (
          <div
            className={`flex items-center gap-3 p-4 rounded-xl border transition-all cursor-pointer ${
              form.dist_walinka ? 'border-primary/30 bg-primary/5' : 'border-border bg-card'
            }`}
            onClick={() => onChange('dist_walinka', !form.dist_walinka)}
          >
            <div className={`shrink-0 w-10 h-10 rounded-full flex items-center justify-center ${form.dist_walinka ? 'bg-primary/10' : 'bg-muted'}`}>
              <Icon name="BookOpen" size={18} color={form.dist_walinka ? 'var(--color-primary)' : 'var(--color-muted-foreground)'} />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <p className="text-sm font-semibold font-caption text-foreground">Enlazar catálogo Walinka</p>
                <span className="text-xs font-caption px-1.5 py-0.5 rounded-full bg-blue-100 text-blue-700">Walinka</span>
              </div>
              <p className="text-xs font-caption text-muted-foreground mt-0.5">
                Agrega un botón "Ver catálogo" que lleva a tu tienda online.
              </p>
            </div>
            <div className={`shrink-0 w-11 h-6 rounded-full transition-colors ${form.dist_walinka ? 'bg-primary' : 'bg-muted'}`}>
              <span className={`block mt-0.5 w-5 h-5 rounded-full bg-white shadow transition-all ${form.dist_walinka ? 'ml-5' : 'ml-0.5'}`} />
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-3 p-4 rounded-xl border border-dashed border-border bg-card opacity-60">
            <div className="shrink-0 w-10 h-10 rounded-full flex items-center justify-center bg-muted">
              <Icon name="BookOpen" size={18} color="var(--color-muted-foreground)" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold font-caption text-foreground">Catálogo Walinka</p>
              <p className="text-xs font-caption text-muted-foreground mt-0.5">
                <a href="/mis-negocios" className="underline">Activa Walinka en tu negocio</a> para habilitar esta opción.
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Summary */}
      <div className="bg-muted rounded-xl p-3">
        <p className="text-xs font-caption text-muted-foreground">
          Tu acción será visible en {[
            form.dist_koronel !== false && 'Koronel',
            form.dist_map !== false && 'el mapa',
            form.dist_profile !== false && 'tu perfil',
            form.dist_followers !== false && followersCount > 0 && `${followersCount} seguidores`,
            form.dist_walinka && 'Walinka',
          ].filter(Boolean).join(', ')}.
        </p>
      </div>
    </div>
  );
}
