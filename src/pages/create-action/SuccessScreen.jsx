import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import Icon from 'components/AppIcon';

const CHANNELS = [
  { icon: 'Globe',   label: 'En el listado de Koronel' },
  { icon: 'Map',     label: 'En el mapa interactivo'   },
  { icon: 'Store',   label: 'En tu perfil de negocio'  },
];

export default function SuccessScreen({ action, channels, onCreateAnother }) {
  const navigate = useNavigate();
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    // Trigger entrance animation after mount
    const t = setTimeout(() => setVisible(true), 50);
    return () => clearTimeout(t);
  }, []);

  const activeChannels = CHANNELS.filter(ch => {
    if (ch.icon === 'Map')   return channels?.dist_map !== false;
    if (ch.icon === 'Store') return channels?.dist_profile !== false;
    return true;
  });

  return (
    <div
      className={`flex flex-col min-h-[80vh] items-center transition-all duration-500 ${visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}
    >
      {/* Celebration emoji */}
      <div className="mt-8 mb-6 flex flex-col items-center text-center">
        <span className="text-6xl mb-4 leading-none select-none">🎉</span>
        <h1 className="font-heading font-bold text-2xl text-foreground mb-2">¡Listo!</h1>
        <p className="text-base font-caption text-muted-foreground max-w-xs leading-relaxed">
          Tu promoción ya está publicada y llegando a clientes.
        </p>
      </div>

      {/* What just happened */}
      <div className="w-full bg-card border border-border rounded-2xl p-5 mb-6">
        <p className="text-xs font-caption text-muted-foreground uppercase tracking-wide font-semibold mb-4">
          Ya aparece en
        </p>
        <div className="space-y-3">
          {activeChannels.map((ch, i) => (
            <div
              key={ch.icon}
              className={`flex items-center gap-3 transition-all duration-300`}
              style={{ transitionDelay: `${i * 100 + 200}ms` }}
            >
              <div className="w-8 h-8 rounded-full flex items-center justify-center shrink-0" style={{ background: 'var(--color-primary)/10' }}>
                <Icon name={ch.icon} size={16} color="var(--color-primary)" />
              </div>
              <p className="text-sm font-caption text-foreground">{ch.label}</p>
              <Icon name="CheckCircle2" size={16} color="#22c55e" className="ml-auto shrink-0" />
            </div>
          ))}
        </div>
      </div>

      {/* The action name */}
      {action?.title && (
        <div className="w-full bg-primary/5 border border-primary/20 rounded-2xl p-4 mb-6 text-center">
          <p className="text-sm font-caption text-muted-foreground mb-0.5">Tu promoción</p>
          <p className="font-heading font-semibold text-base text-foreground">"{action.title}"</p>
        </div>
      )}

      {/* CTA: What to do now */}
      <div className="w-full space-y-3">
        <p className="text-xs font-caption text-muted-foreground text-center uppercase tracking-wide font-semibold mb-1">
          Mientras tanto puedes
        </p>

        {action?.slug && (
          <Link
            to={`/acciones/${action.slug}`}
            className="flex items-center gap-3 w-full p-4 bg-card border border-border rounded-2xl hover:border-primary/30 transition-colors"
          >
            <Icon name="Eye" size={18} color="var(--color-primary)" />
            <div className="flex-1">
              <p className="text-sm font-semibold font-caption text-foreground">Ver cómo quedó</p>
              <p className="text-xs font-caption text-muted-foreground">Mira tu promoción como la ven los clientes</p>
            </div>
            <Icon name="ChevronRight" size={16} color="var(--color-muted-foreground)" />
          </Link>
        )}

        <button
          onClick={onCreateAnother}
          className="flex items-center gap-3 w-full p-4 bg-card border border-border rounded-2xl hover:border-primary/30 transition-colors"
        >
          <Icon name="Plus" size={18} color="var(--color-primary)" />
          <div className="flex-1 text-left">
            <p className="text-sm font-semibold font-caption text-foreground">Crear otra promoción</p>
            <p className="text-xs font-caption text-muted-foreground">Más acciones = más visibilidad</p>
          </div>
          <Icon name="ChevronRight" size={16} color="var(--color-muted-foreground)" />
        </button>

        <Link
          to="/crecer"
          className="flex items-center gap-3 w-full p-4 bg-card border border-border rounded-2xl hover:border-primary/30 transition-colors"
        >
          <Icon name="BarChart2" size={18} color="var(--color-primary)" />
          <div className="flex-1">
            <p className="text-sm font-semibold font-caption text-foreground">Ver cómo va mi negocio</p>
            <p className="text-xs font-caption text-muted-foreground">Visitas, consultas y más</p>
          </div>
          <Icon name="ChevronRight" size={16} color="var(--color-muted-foreground)" />
        </Link>
      </div>
    </div>
  );
}
