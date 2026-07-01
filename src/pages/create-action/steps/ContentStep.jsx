import React, { useRef } from 'react';
import Icon from 'components/AppIcon';
import { ACTION_TYPE_LABELS } from '../../../lib/intentToSuggestion';

const DISCOUNT_TYPES = [
  { value: 'pct',    label: '% de descuento' },
  { value: 'amount', label: 'Monto fijo ($)' },
  { value: 'label',  label: 'Texto libre (2x1, etc.)' },
  { value: null,     label: 'Sin descuento' },
];

const NEEDS_DISCOUNT = ['offer', 'liquidation', 'happy_hour'];
const NEEDS_EVENT_DATE = ['event', 'anniversary'];

export default function ContentStep({ actionType, form, onChange, onImageChange, imagePreview }) {
  const fileRef = useRef(null);
  const typeLabel = ACTION_TYPE_LABELS[actionType] || 'Acción';
  const showDiscount = NEEDS_DISCOUNT.includes(actionType);
  const showEventInfo = NEEDS_EVENT_DATE.includes(actionType);

  const field = (key) => ({
    value: form[key] || '',
    onChange: (e) => onChange(key, e.target.value),
  });

  return (
    <div className="space-y-5">
      <div>
        <h2 className="font-heading font-bold text-xl text-foreground mb-1">Cuéntanos sobre tu {typeLabel.toLowerCase()}</h2>
        <p className="text-sm font-caption text-muted-foreground">
          Esta información aparecerá en el listado y en el detalle de tu acción.
        </p>
      </div>

      {/* Cover image */}
      <div>
        <label className="text-sm font-semibold font-caption text-foreground mb-2 block">
          Imagen de portada <span className="text-muted-foreground font-normal">(opcional)</span>
        </label>
        <div
          onClick={() => fileRef.current?.click()}
          className="relative h-36 rounded-xl border-2 border-dashed border-border bg-muted flex items-center justify-center cursor-pointer hover:border-primary/50 transition-colors overflow-hidden"
        >
          {imagePreview ? (
            <img src={imagePreview} alt="portada" className="w-full h-full object-cover" />
          ) : (
            <div className="flex flex-col items-center gap-2 text-muted-foreground">
              <Icon name="ImagePlus" size={28} color="currentColor" />
              <span className="text-xs font-caption">Agregar imagen</span>
            </div>
          )}
        </div>
        <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={e => onImageChange(e.target.files?.[0])} />
      </div>

      {/* Title */}
      <div>
        <label className="text-sm font-semibold font-caption text-foreground mb-1.5 block">
          Título <span className="text-red-500">*</span>
        </label>
        <input
          type="text"
          placeholder={actionType === 'happy_hour' ? 'Ej: Happy Hour 18:00 – 20:00' : actionType === 'launch' ? 'Ej: Presentamos nuestra nueva colección' : 'Ej: 30% de descuento en toda la tienda'}
          className="w-full h-11 px-3 rounded-xl border border-border bg-card text-sm font-caption text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
          {...field('title')}
        />
      </div>

      {/* Headline */}
      <div>
        <label className="text-sm font-semibold font-caption text-foreground mb-1.5 block">
          Subtítulo <span className="text-muted-foreground font-normal">(opcional)</span>
        </label>
        <input
          type="text"
          placeholder="Una línea que lo explica todo"
          className="w-full h-11 px-3 rounded-xl border border-border bg-card text-sm font-caption text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
          {...field('headline')}
        />
      </div>

      {/* Description */}
      <div>
        <label className="text-sm font-semibold font-caption text-foreground mb-1.5 block">
          Descripción <span className="text-muted-foreground font-normal">(opcional)</span>
        </label>
        <textarea
          rows={3}
          placeholder="Condiciones, detalles, qué incluye..."
          className="w-full px-3 py-2.5 rounded-xl border border-border bg-card text-sm font-caption text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 resize-none"
          {...field('description')}
        />
      </div>

      {/* Discount fields */}
      {showDiscount && (
        <div>
          <label className="text-sm font-semibold font-caption text-foreground mb-2 block">Tipo de oferta</label>
          <div className="grid grid-cols-2 gap-2 mb-3">
            {DISCOUNT_TYPES.map(dt => (
              <button
                key={String(dt.value)}
                type="button"
                onClick={() => onChange('discount_type', dt.value)}
                className={`h-9 rounded-lg text-xs font-caption font-semibold border transition-all ${
                  form.discount_type === dt.value
                    ? 'border-primary bg-primary/5 text-primary'
                    : 'border-border bg-card text-foreground hover:border-primary/30'
                }`}
              >
                {dt.label}
              </button>
            ))}
          </div>

          {form.discount_type === 'pct' && (
            <div className="flex items-center gap-3">
              <input
                type="number" min="1" max="100"
                placeholder="20"
                className="w-24 h-11 px-3 rounded-xl border border-border bg-card text-sm font-data text-foreground text-center focus:outline-none focus:ring-2 focus:ring-primary/30"
                {...field('discount_pct')}
              />
              <span className="text-sm font-caption text-muted-foreground">% de descuento</span>
            </div>
          )}
          {form.discount_type === 'amount' && (
            <div className="flex items-center gap-3">
              <span className="text-sm font-caption text-muted-foreground">$</span>
              <input
                type="text"
                placeholder="5.000"
                className="flex-1 h-11 px-3 rounded-xl border border-border bg-card text-sm font-data text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
                {...field('discount_amount')}
              />
              <span className="text-sm font-caption text-muted-foreground">de descuento</span>
            </div>
          )}
          {form.discount_type === 'label' && (
            <input
              type="text"
              placeholder="Ej: 2x1, Gratis despacho, Pack especial"
              className="w-full h-11 px-3 rounded-xl border border-border bg-card text-sm font-caption text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
              {...field('discount_label')}
            />
          )}

          {(form.discount_type === 'pct' || form.discount_type === 'amount') && (
            <div className="flex gap-3 mt-3">
              <div className="flex-1">
                <label className="text-xs font-caption text-muted-foreground mb-1 block">Precio normal</label>
                <input type="text" placeholder="$25.000"
                  className="w-full h-10 px-3 rounded-xl border border-border bg-card text-sm font-data text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
                  {...field('original_price')}
                />
              </div>
              <div className="flex-1">
                <label className="text-xs font-caption text-muted-foreground mb-1 block">Precio especial</label>
                <input type="text" placeholder="$17.500"
                  className="w-full h-10 px-3 rounded-xl border border-border bg-card text-sm font-data text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
                  {...field('promo_price')}
                />
              </div>
            </div>
          )}
        </div>
      )}

      {/* Promo code */}
      <div>
        <label className="text-sm font-semibold font-caption text-foreground mb-1.5 block">
          Código de descuento <span className="text-muted-foreground font-normal">(opcional)</span>
        </label>
        <input
          type="text"
          placeholder="Ej: KORONEL20"
          className="w-full h-11 px-3 rounded-xl border border-border bg-card text-sm font-caption text-foreground uppercase placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
          {...field('promo_code')}
        />
      </div>
    </div>
  );
}
