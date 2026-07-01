import React, { useRef, useState } from 'react';
import Icon from 'components/AppIcon';
import { DURATION_OPTIONS, endsAtFromDays } from '../../../lib/merchantPrefs';

export default function QuickEditStep({ suggestion, form, onChange, onImageChange, imagePreview, prefs }) {
  const fileRef = useRef(null);
  const [showAdvanced, setShowAdvanced] = useState(false);

  const durationDays = prefs?.duration_days || 7;
  const durationLabel = DURATION_OPTIONS.find(o => o.days === durationDays)?.label || `${durationDays} días`;

  const channelsOn = [
    prefs?.dist_koronel !== false && 'Koronel',
    prefs?.dist_map !== false && 'el mapa',
    prefs?.dist_profile !== false && 'tu perfil',
  ].filter(Boolean);

  return (
    <div className="flex flex-col gap-6">
      {/* Title at top — what we're creating */}
      <div>
        <p className="text-sm font-caption text-muted-foreground mb-0.5">Creando:</p>
        <h2 className="font-heading font-bold text-xl text-foreground">{suggestion?.label}</h2>
      </div>

      {/* ── Field 1: Image ──────────────────────────────────────────────────── */}
      <div>
        <label className="block text-sm font-semibold font-caption text-foreground mb-2">
          Foto <span className="text-muted-foreground font-normal">(opcional pero recomendada)</span>
        </label>
        <div
          onClick={() => fileRef.current?.click()}
          className="relative h-40 rounded-2xl border-2 border-dashed border-border bg-muted flex items-center justify-center cursor-pointer hover:border-primary/50 transition-colors overflow-hidden"
        >
          {imagePreview ? (
            <>
              <img src={imagePreview} alt="portada" className="w-full h-full object-cover" />
              <div className="absolute inset-0 bg-black/30 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity">
                <span className="text-white text-sm font-caption font-semibold">Cambiar foto</span>
              </div>
            </>
          ) : (
            <div className="flex flex-col items-center gap-2 text-muted-foreground">
              <Icon name="ImagePlus" size={32} color="currentColor" />
              <span className="text-sm font-caption">Agregar foto</span>
            </div>
          )}
        </div>
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={e => onImageChange(e.target.files?.[0])}
        />
      </div>

      {/* ── Field 2: Title ──────────────────────────────────────────────────── */}
      <div>
        <label className="block text-sm font-semibold font-caption text-foreground mb-2">
          ¿Qué ofreces? <span className="text-red-500">*</span>
        </label>
        <input
          type="text"
          placeholder={titlePlaceholder(suggestion?.type)}
          value={form.title || ''}
          onChange={e => onChange('title', e.target.value)}
          className="w-full h-12 px-4 rounded-xl border border-border bg-card text-base font-caption text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
          autoFocus
        />
        {form.title && form.title.length > 80 && (
          <p className="text-xs font-caption text-amber-600 mt-1">Los títulos cortos funcionan mejor.</p>
        )}
      </div>

      {/* ── Field 3: Price (optional) ───────────────────────────────────────── */}
      <div>
        <label className="block text-sm font-semibold font-caption text-foreground mb-2">
          Precio especial <span className="text-muted-foreground font-normal">(opcional)</span>
        </label>
        <div className="flex items-center gap-3">
          <div className="relative flex-1">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">$</span>
            <input
              type="text"
              inputMode="numeric"
              placeholder="Normal"
              value={form.original_price || ''}
              onChange={e => onChange('original_price', e.target.value)}
              className="w-full h-12 pl-7 pr-3 rounded-xl border border-border bg-card text-base font-data text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
            />
          </div>
          <Icon name="ArrowRight" size={16} color="var(--color-muted-foreground)" className="shrink-0" />
          <div className="relative flex-1">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">$</span>
            <input
              type="text"
              inputMode="numeric"
              placeholder="Oferta"
              value={form.promo_price || ''}
              onChange={e => onChange('promo_price', e.target.value)}
              className="w-full h-12 pl-7 pr-3 rounded-xl border border-border bg-card text-base font-data text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
            />
          </div>
        </div>
      </div>

      {/* ── Smart defaults summary ──────────────────────────────────────────── */}
      <div className="bg-muted/60 rounded-2xl p-4 flex flex-col gap-2">
        <p className="text-xs font-caption text-muted-foreground uppercase tracking-wide font-semibold mb-1">
          Ya está configurado
        </p>

        <DefaultChip
          icon="Clock"
          label={`Válida por ${durationLabel}`}
          onEdit={() => setShowAdvanced(true)}
        />
        <DefaultChip
          icon="Globe"
          label={`En ${channelsOn.join(', ')}`}
          onEdit={() => setShowAdvanced(true)}
        />
        <DefaultChip
          icon="Zap"
          label="Cuenta regresiva activada"
          onEdit={() => setShowAdvanced(true)}
        />
      </div>

      {/* ── Advanced options (collapsed) ────────────────────────────────────── */}
      {!showAdvanced ? (
        <button
          type="button"
          onClick={() => setShowAdvanced(true)}
          className="text-sm font-caption text-muted-foreground flex items-center gap-1.5 hover:text-foreground transition-colors"
        >
          <Icon name="Settings2" size={14} />
          Opciones avanzadas
        </button>
      ) : (
        <AdvancedOptions form={form} onChange={onChange} prefs={prefs} onClose={() => setShowAdvanced(false)} />
      )}
    </div>
  );
}

function DefaultChip({ icon, label, onEdit }) {
  return (
    <div className="flex items-center justify-between gap-2">
      <div className="flex items-center gap-2">
        <Icon name={icon} size={14} color="var(--color-primary)" />
        <span className="text-sm font-caption text-foreground">{label}</span>
      </div>
      <button
        type="button"
        onClick={onEdit}
        className="text-xs font-caption text-muted-foreground hover:text-foreground transition-colors underline"
      >
        Cambiar
      </button>
    </div>
  );
}

function AdvancedOptions({ form, onChange, prefs, onClose }) {
  return (
    <div className="border border-border rounded-2xl p-4 space-y-5">
      <div className="flex items-center justify-between">
        <p className="text-sm font-semibold font-caption text-foreground">Opciones avanzadas</p>
        <button type="button" onClick={onClose} className="text-xs font-caption text-muted-foreground hover:text-foreground">
          Cerrar
        </button>
      </div>

      {/* Duration */}
      <div>
        <label className="text-xs font-caption text-muted-foreground uppercase tracking-wide mb-2 block">Duración</label>
        <div className="flex flex-wrap gap-2">
          {DURATION_OPTIONS.map(opt => {
            const currentDays = form.ends_at
              ? Math.round((new Date(form.ends_at) - Date.now()) / 86400000)
              : prefs?.duration_days || 7;
            const isActive = Math.abs(currentDays - opt.days) < 1;
            return (
              <button
                key={opt.days}
                type="button"
                onClick={() => onChange('ends_at', endsAtFromDays(opt.days))}
                className={`px-3 h-8 rounded-full text-xs font-caption font-semibold border transition-all ${
                  isActive ? 'border-primary bg-primary/5 text-primary' : 'border-border bg-card text-foreground hover:border-primary/30'
                }`}
              >
                {opt.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Description */}
      <div>
        <label className="text-xs font-caption text-muted-foreground uppercase tracking-wide mb-2 block">Descripción</label>
        <textarea
          rows={3}
          placeholder="Condiciones, detalles, qué incluye..."
          value={form.description || ''}
          onChange={e => onChange('description', e.target.value)}
          className="w-full px-3 py-2.5 rounded-xl border border-border bg-card text-sm font-caption text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 resize-none"
        />
      </div>

      {/* Channels */}
      <div>
        <label className="text-xs font-caption text-muted-foreground uppercase tracking-wide mb-2 block">Distribución</label>
        {[
          { key: 'dist_map',      label: 'Mapa interactivo' },
          { key: 'dist_profile',  label: 'Perfil del negocio' },
          { key: 'dist_followers',label: 'Notificar seguidores' },
        ].map(ch => {
          const isOn = form[ch.key] !== false;
          return (
            <label key={ch.key} className="flex items-center gap-3 py-2 cursor-pointer">
              <div
                className={`w-10 h-6 rounded-full transition-colors shrink-0 relative ${isOn ? 'bg-primary' : 'bg-muted'}`}
                onClick={() => onChange(ch.key, !isOn)}
              >
                <span className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-all ${isOn ? 'left-4' : 'left-0.5'}`} />
              </div>
              <span className="text-sm font-caption text-foreground">{ch.label}</span>
            </label>
          );
        })}
      </div>

      {/* Promo code */}
      <div>
        <label className="text-xs font-caption text-muted-foreground uppercase tracking-wide mb-2 block">Código de descuento (opcional)</label>
        <input
          type="text"
          placeholder="Ej: PROMO20"
          value={form.promo_code || ''}
          onChange={e => onChange('promo_code', e.target.value.toUpperCase())}
          className="w-full h-10 px-3 rounded-xl border border-border bg-card text-sm font-caption text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
        />
      </div>
    </div>
  );
}

function titlePlaceholder(type) {
  const map = {
    offer:       '30% de descuento en toda la tienda',
    liquidation: 'Liquidación de temporada — precios únicos',
    launch:      'Presentamos nuestra nueva colección',
    event:       'Gran evento este sábado — ven y trae amigos',
    happy_hour:  'Happy Hour: bebidas 2x1 de 18 a 20 hrs',
    season:      'Especiales de invierno — nueva temporada',
    anniversary: 'Celebramos nuestro aniversario contigo',
    new_product: 'Nuevo producto: ya disponible en tienda',
  };
  return map[type] || '¿Qué quieres ofrecer?';
}
