import React from 'react';
import Icon from 'components/AppIcon';

const DURATION_PRESETS = [
  { label: 'Hoy',          days: 0,  hours: 0  },
  { label: '24 horas',     days: 1,  hours: 24 },
  { label: '3 días',       days: 3,  hours: 72 },
  { label: '7 días',       days: 7,  hours: 168 },
  { label: '15 días',      days: 15, hours: 360 },
  { label: '30 días',      days: 30, hours: 720 },
];

function addDays(d) {
  const date = new Date();
  date.setDate(date.getDate() + d);
  date.setHours(23, 59, 0, 0);
  return date.toISOString().slice(0, 16);
}

export default function UrgencyStep({ form, onChange }) {
  const field = (key) => ({
    value: form[key] || '',
    onChange: (e) => onChange(key, e.target.value),
  });

  const hoursLeft = form.ends_at
    ? Math.max(0, Math.floor((new Date(form.ends_at) - Date.now()) / 3600000))
    : null;

  const isUrgent = hoursLeft !== null && hoursLeft <= 48;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-heading font-bold text-xl text-foreground mb-1">¿Cuánto dura esta acción?</h2>
        <p className="text-sm font-caption text-muted-foreground">
          Las acciones con límite de tiempo generan más urgencia y mejor respuesta.
        </p>
      </div>

      {/* Duration presets */}
      <div>
        <label className="text-sm font-semibold font-caption text-foreground mb-2 block">Duración rápida</label>
        <div className="grid grid-cols-3 gap-2">
          {DURATION_PRESETS.map(preset => {
            const targetEndsAt = addDays(preset.days);
            const isActive = form.ends_at?.slice(0, 10) === targetEndsAt.slice(0, 10);
            return (
              <button
                key={preset.label}
                type="button"
                onClick={() => {
                  const starts = new Date().toISOString().slice(0, 16);
                  onChange('starts_at', starts);
                  onChange('ends_at', targetEndsAt);
                }}
                className={`h-10 rounded-xl text-xs font-caption font-semibold border transition-all ${
                  isActive
                    ? 'border-primary bg-primary/5 text-primary'
                    : 'border-border bg-card text-foreground hover:border-primary/30'
                }`}
              >
                {preset.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Manual date/time pickers */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-xs font-caption text-muted-foreground mb-1.5 block">Inicia</label>
          <input
            type="datetime-local"
            className="w-full h-11 px-3 rounded-xl border border-border bg-card text-sm font-caption text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
            {...field('starts_at')}
          />
        </div>
        <div>
          <label className="text-xs font-caption text-muted-foreground mb-1.5 block">
            Termina <span className="text-red-500">*</span>
          </label>
          <input
            type="datetime-local"
            className="w-full h-11 px-3 rounded-xl border border-border bg-card text-sm font-caption text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
            {...field('ends_at')}
          />
        </div>
      </div>

      {/* Preview */}
      {hoursLeft !== null && (
        <div className={`flex items-center gap-3 p-3 rounded-xl ${isUrgent ? 'bg-red-50 border border-red-100' : 'bg-muted'}`}>
          <Icon name="Clock" size={18} color={isUrgent ? '#ef4444' : 'var(--color-muted-foreground)'} />
          <p className="text-sm font-caption" style={{ color: isUrgent ? '#ef4444' : 'var(--color-muted-foreground)' }}>
            {isUrgent
              ? `¡Menos de 48 horas! Aparecerá en la sección "Urgentes".`
              : `Esta acción durará ${hoursLeft >= 24 ? `${Math.floor(hoursLeft / 24)} días` : `${hoursLeft} horas`}.`
            }
          </p>
        </div>
      )}

      {/* Countdown toggle */}
      <div className="flex items-center justify-between py-3 border-t border-border">
        <div>
          <p className="text-sm font-semibold font-caption text-foreground">Mostrar cuenta regresiva</p>
          <p className="text-xs font-caption text-muted-foreground mt-0.5">El contador aparece en el detalle de tu acción</p>
        </div>
        <button
          type="button"
          onClick={() => onChange('show_countdown', !form.show_countdown)}
          className={`relative w-12 h-6 rounded-full transition-colors ${form.show_countdown !== false ? 'bg-primary' : 'bg-muted'}`}
        >
          <span className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-all ${form.show_countdown !== false ? 'left-6' : 'left-0.5'}`} />
        </button>
      </div>

      {/* Optional: cupo */}
      <div>
        <label className="text-sm font-semibold font-caption text-foreground mb-1 block">
          Cupo máximo <span className="text-muted-foreground font-normal">(opcional)</span>
        </label>
        <p className="text-xs font-caption text-muted-foreground mb-2">
          Si tienes stock limitado o cupos contados, ponlo aquí. Se mostrará una barra de progreso.
        </p>
        <input
          type="number" min="1"
          placeholder="Ej: 50"
          className="w-36 h-11 px-3 rounded-xl border border-border bg-card text-sm font-data text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
          {...field('max_redemptions')}
        />
      </div>
    </div>
  );
}
