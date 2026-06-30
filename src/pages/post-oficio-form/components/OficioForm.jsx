import React from 'react';
import Icon from 'components/AppIcon';
import Input from 'components/ui/Input';

const OFICIO_CATEGORIES = [
  { group: 'Hogar', items: ['Gasfíter', 'Electricista', 'Albañil', 'Carpintero', 'Pintor', 'Cerrajero', 'Jardinero', 'Fumigador', 'Soldador', 'Techador'] },
  { group: 'Belleza', items: ['Peluquera', 'Barbero', 'Manicure', 'Pedicure', 'Podóloga', 'Masajista', 'Depilación'] },
  { group: 'Salud', items: ['Enfermera a domicilio', 'Cuidadora adulto mayor', 'Kinesiólogo', 'Nutricionista'] },
  { group: 'Vehículos', items: ['Mecánico', 'Lavado de autos', 'Grúa', 'Pintura automotriz'] },
  { group: 'Tecnología', items: ['Técnico PC', 'Reparación celulares', 'Cámaras de seguridad', 'Redes y WiFi'] },
  { group: 'Mascotas', items: ['Peluquería canina', 'Veterinario a domicilio', 'Paseo de perros'] },
  { group: 'Educación', items: ['Clases particulares', 'Apoyo escolar', 'Idiomas'] },
  { group: 'Otro', items: ['Otro oficio'] },
];

const PRICE_TYPES = [
  { value: 'free_quote', label: 'Presupuesto gratis', description: 'Voy a ver el trabajo antes de cobrar' },
  { value: 'from', label: 'Desde $', description: 'Precio mínimo de referencia' },
  { value: 'hourly', label: 'Por hora', description: 'Cobro por hora trabajada' },
  { value: 'negotiable', label: 'A convenir', description: 'Sin precio fijo publicado' },
];

const ZONES = ['Coronel', 'Lota', 'Escuadrón', 'San Pedro', 'Concepción', 'Penco', 'Tomé'];

export default function OficioForm({ form, errors, onChange }) {
  const set = (field, value) => onChange(field, value);

  const toggleZone = (zone) => {
    const current = form.zones || [];
    const next = current.includes(zone)
      ? current.filter(z => z !== zone)
      : [...current, zone];
    set('zones', next);
  };

  const handlePhoneChange = (e) => {
    let val = e.target.value.replace(/\D/g, '');
    if (val.startsWith('56')) val = val.slice(2);
    val = val.slice(0, 9);
    let formatted = val;
    if (val.length > 1) formatted = val.slice(0, 1) + ' ' + val.slice(1);
    if (val.length > 5) formatted = val.slice(0, 1) + ' ' + val.slice(1, 5) + ' ' + val.slice(5);
    set('phone', formatted ? '+56 ' + formatted : '');
  };

  const formatPrice = (raw) => {
    const digits = raw.replace(/\D/g, '');
    if (!digits) return '';
    return Number(digits).toLocaleString('es-CL');
  };

  const showPriceField = form.priceType === 'from' || form.priceType === 'hourly';

  return (
    <div className="space-y-8">

      {/* ── Bloque 1: ¿Cómo te llamas? ── */}
      <div className="space-y-4">
        <div className="flex items-center gap-2 pb-2 border-b border-border">
          <span className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold text-primary-foreground shrink-0"
            style={{ background: 'var(--color-primary)' }}>1</span>
          <h3 className="font-heading font-semibold text-base text-foreground">¿Cómo te llamás?</h3>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-caption font-semibold text-foreground mb-1.5">
              Nombre <span className="text-error">*</span>
            </label>
            <input
              type="text"
              value={form.providerName}
              onChange={e => set('providerName', e.target.value)}
              placeholder="Ej: Carlos"
              maxLength={60}
              className={`w-full h-11 px-4 text-sm font-caption rounded-md border bg-card text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring transition-all
                ${errors.providerName ? 'border-error' : 'border-border'}`}
            />
            {errors.providerName && <p className="mt-1 text-xs font-caption text-error">{errors.providerName}</p>}
          </div>
          <div>
            <label className="block text-sm font-caption font-semibold text-foreground mb-1.5">
              Apellido (opcional)
            </label>
            <input
              type="text"
              value={form.providerLastName || ''}
              onChange={e => set('providerLastName', e.target.value)}
              placeholder="Ej: Soto"
              maxLength={60}
              className="w-full h-11 px-4 text-sm font-caption rounded-md border border-border bg-card text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring transition-all"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-caption font-semibold text-foreground mb-1.5">
            Nombre público (opcional)
          </label>
          <input
            type="text"
            value={form.providerDisplayName || ''}
            onChange={e => set('providerDisplayName', e.target.value)}
            placeholder="Ej: Don Luis, Peluquera Carolina"
            maxLength={60}
            className="w-full h-11 px-4 text-sm font-caption rounded-md border border-border bg-card text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring transition-all"
          />
          <p className="mt-1 text-xs font-caption text-muted-foreground">
            Si lo completás, este será el nombre que vean los vecinos en tu ficha.
          </p>
        </div>
      </div>

      {/* ── Bloque 2: ¿A qué te dedicas? ── */}
      <div className="space-y-5">
        <div className="flex items-center gap-2 pb-2 border-b border-border">
          <span className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold text-primary-foreground shrink-0"
            style={{ background: 'var(--color-primary)' }}>2</span>
          <h3 className="font-heading font-semibold text-base text-foreground">¿A qué te dedicás?</h3>
        </div>

        {/* Título */}
        <div>
          <label className="block text-sm font-caption font-semibold text-foreground mb-1.5">
            ¿A qué te dedicás? <span className="text-error">*</span>
          </label>
          <input
            type="text"
            value={form.title}
            onChange={e => { set('title', e.target.value); }}
            placeholder="Ej: Gasfíter a domicilio"
            maxLength={80}
            className={`w-full h-11 px-4 text-sm font-caption rounded-md border bg-card text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring transition-all
              ${errors.title ? 'border-error' : 'border-border'}`}
          />
          {errors.title
            ? <p className="mt-1 text-xs font-caption text-error">{errors.title}</p>
            : <p className="mt-1 text-xs font-caption text-muted-foreground">Electricista certificado · Manicure profesional · Podóloga · Carpintero</p>
          }
        </div>

        {/* Categoría */}
        <div>
          <label className="block text-sm font-caption font-semibold text-foreground mb-1.5">
            Categoría <span className="text-error">*</span>
          </label>
          <div className="relative">
            <select
              value={form.category}
              onChange={e => set('category', e.target.value)}
              className={`w-full h-11 pl-4 pr-10 text-sm font-caption rounded-md border appearance-none bg-card text-foreground focus:outline-none focus:ring-2 focus:ring-ring transition-all
                ${errors.category ? 'border-error' : 'border-border'}`}
            >
              <option value="">Selecciona tu categoría</option>
              {OFICIO_CATEGORIES.map(g => (
                <optgroup key={g.group} label={g.group}>
                  {g.items.map(item => (
                    <option key={item} value={item}>{item}</option>
                  ))}
                </optgroup>
              ))}
            </select>
            <div className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2">
              <Icon name="ChevronDown" size={16} color="var(--color-secondary)" />
            </div>
          </div>
          {errors.category && <p className="mt-1 text-xs font-caption text-error">{errors.category}</p>}
        </div>
      </div>

      {/* ── Bloque 2: Descripción ── */}
      <div className="space-y-4">
        <div className="flex items-center gap-2 pb-2 border-b border-border">
          <span className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold text-primary-foreground shrink-0"
            style={{ background: 'var(--color-primary)' }}>3</span>
          <h3 className="font-heading font-semibold text-base text-foreground">Contale a la gente sobre vos</h3>
        </div>

        <div className="p-3 rounded-md text-sm font-caption space-y-1"
          style={{ background: 'rgba(44,82,130,0.06)', border: '1px solid rgba(44,82,130,0.15)' }}>
          <p className="font-medium text-foreground mb-1.5">¿Qué incluir?</p>
          {['¿Qué servicios realizás exactamente?', '¿Cuánto tiempo llevás trabajando?', '¿Atendés urgencias?', '¿Tenés herramientas propias?', '¿Entregás boleta?', '¿Trabajás fines de semana?'].map(hint => (
            <div key={hint} className="flex items-start gap-1.5">
              <Icon name="ChevronRight" size={13} color="var(--color-primary)" className="mt-0.5 shrink-0" />
              <span className="text-muted-foreground">{hint}</span>
            </div>
          ))}
        </div>

        <div>
          <textarea
            value={form.description}
            onChange={e => set('description', e.target.value)}
            rows={6}
            maxLength={1000}
            placeholder="Escribí lo que querés que la gente sepa antes de contactarte..."
            className={`w-full px-4 py-3 text-sm font-body rounded-md border bg-card text-foreground placeholder-muted-foreground resize-none focus:outline-none focus:ring-2 focus:ring-ring transition-all
              ${errors.description ? 'border-error' : 'border-border'}`}
          />
          <div className="flex items-start justify-between mt-1">
            {errors.description
              ? <p className="text-xs font-caption text-error">{errors.description}</p>
              : <span />}
            <span className={`text-xs font-caption ml-auto ${form.description.length > 900 ? 'text-warning' : 'text-muted-foreground'}`}>
              {form.description.length}/1000
            </span>
          </div>
        </div>
      </div>

      {/* ── Bloque 3: ¿Cómo cobrás? ── */}
      <div className="space-y-4">
        <div className="flex items-center gap-2 pb-2 border-b border-border">
          <span className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold text-primary-foreground shrink-0"
            style={{ background: 'var(--color-primary)' }}>4</span>
          <h3 className="font-heading font-semibold text-base text-foreground">¿Cómo cobrás?</h3>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {PRICE_TYPES.map(pt => (
            <label
              key={pt.value}
              className={`flex items-start gap-3 p-3 rounded-md border cursor-pointer transition-all ${
                form.priceType === pt.value
                  ? 'border-primary bg-card shadow-sm ring-2 ring-primary ring-offset-1'
                  : 'border-border bg-card hover:border-primary/50'
              }`}
            >
              <input
                type="radio"
                name="priceType"
                value={pt.value}
                checked={form.priceType === pt.value}
                onChange={() => set('priceType', pt.value)}
                className="mt-0.5 accent-primary shrink-0"
              />
              <div>
                <p className="text-sm font-caption font-semibold text-foreground">{pt.label}</p>
                <p className="text-xs font-caption text-muted-foreground">{pt.description}</p>
              </div>
            </label>
          ))}
        </div>

        {showPriceField && (
          <div>
            <label className="block text-sm font-caption font-semibold text-foreground mb-1.5">
              {form.priceType === 'hourly' ? 'Valor por hora ($)' : 'Precio desde ($)'}
            </label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm font-data font-medium text-muted-foreground">$</span>
              <input
                type="text"
                inputMode="numeric"
                value={form.price}
                onChange={e => set('price', formatPrice(e.target.value))}
                placeholder="0"
                className="w-full h-11 pl-8 pr-16 text-sm font-data rounded-md border border-border bg-card text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring transition-all"
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-caption text-muted-foreground">CLP</span>
            </div>
          </div>
        )}
      </div>

      {/* ── Bloque 4: ¿Dónde trabajás? ── */}
      <div className="space-y-4">
        <div className="flex items-center gap-2 pb-2 border-b border-border">
          <span className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold text-primary-foreground shrink-0"
            style={{ background: 'var(--color-primary)' }}>5</span>
          <h3 className="font-heading font-semibold text-base text-foreground">¿Dónde trabajás?</h3>
        </div>

        <p className="text-sm font-caption text-muted-foreground">
          Seleccioná las comunas donde ofrecés tus servicios.
        </p>

        <div className="flex flex-wrap gap-2">
          {ZONES.map(zone => {
            const selected = (form.zones || []).includes(zone);
            return (
              <button
                key={zone}
                type="button"
                onClick={() => toggleZone(zone)}
                className={`flex items-center gap-1.5 px-3 py-2 rounded-full text-sm font-caption font-medium border transition-all min-h-[40px] ${
                  selected
                    ? 'text-primary-foreground border-primary'
                    : 'border-border bg-card text-foreground hover:border-primary/50'
                }`}
                style={selected ? { background: 'var(--color-primary)' } : {}}
              >
                {selected && <Icon name="Check" size={13} color="currentColor" />}
                {zone}
              </button>
            );
          })}
        </div>

        {/* Otras comunas */}
        <div>
          <label className="block text-xs font-caption text-muted-foreground mb-1">
            Otras comunas (separadas por coma)
          </label>
          <input
            type="text"
            value={form.otherZones || ''}
            onChange={e => set('otherZones', e.target.value)}
            placeholder="Ej: Lebu, Arauco"
            className="w-full h-10 px-3 text-sm font-caption rounded-md border border-border bg-card text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring transition-all"
          />
        </div>

        {errors.zones && <p className="text-xs font-caption text-error">{errors.zones}</p>}
      </div>

      {/* ── Bloque 5: Contacto ── */}
      <div className="space-y-4">
        <div className="flex items-center gap-2 pb-2 border-b border-border">
          <span className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold text-primary-foreground shrink-0"
            style={{ background: 'var(--color-primary)' }}>6</span>
          <h3 className="font-heading font-semibold text-base text-foreground">Contacto</h3>
        </div>

        {/* WhatsApp — campo primario */}
        <div>
          <label className="block text-sm font-caption font-semibold text-foreground mb-1.5">
            Número de WhatsApp / Teléfono <span className="text-error">*</span>
          </label>
          <input
            type="tel"
            value={form.phone}
            onChange={handlePhoneChange}
            placeholder="+56 9 1234 5678"
            className={`w-full h-12 px-4 text-base font-data rounded-md border bg-card text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring transition-all
              ${errors.phone ? 'border-error' : 'border-border'}`}
          />
          {errors.phone && <p className="mt-1 text-xs font-caption text-error">{errors.phone}</p>}

          <label className="flex items-center gap-2 mt-3 cursor-pointer group">
            <div
              className={`relative w-10 h-6 rounded-full transition-colors ${form.whatsapp ? '' : 'bg-muted'}`}
              style={form.whatsapp ? { background: '#25d366' } : {}}
              onClick={() => set('whatsapp', !form.whatsapp)}
            >
              <div className={`absolute top-1 w-4 h-4 rounded-full bg-white shadow transition-transform ${form.whatsapp ? 'translate-x-5' : 'translate-x-1'}`} />
            </div>
            <span className="text-sm font-caption text-foreground group-hover:text-primary transition-colors">
              Este número es WhatsApp
            </span>
            {form.whatsapp && (
              <span className="text-xs font-caption px-2 py-0.5 rounded-full text-white" style={{ background: '#25d366' }}>
                WhatsApp
              </span>
            )}
          </label>
        </div>

        {/* Horario */}
        <div>
          <label className="block text-sm font-caption font-semibold text-foreground mb-1.5">
            ¿Cuándo podés atender?
          </label>
          <input
            type="text"
            value={form.scheduleNote || ''}
            onChange={e => set('scheduleNote', e.target.value)}
            placeholder="Ej: Lunes a sábado de 8:00 a 18:00 · Urgencias disponible"
            maxLength={120}
            className="w-full h-11 px-4 text-sm font-caption rounded-md border border-border bg-card text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring transition-all"
          />
          <p className="mt-1 text-xs font-caption text-muted-foreground">
            Opcional. Ayuda a que te contacten en el momento correcto.
          </p>
        </div>

        {/* Valoraciones — opt-in, no implementado todavía */}
        <div className="p-3 rounded-md border border-border bg-muted">
          <label className="flex items-start gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={!!form.ratingsEnabled}
              onChange={e => set('ratingsEnabled', e.target.checked)}
              className="mt-0.5 w-4 h-4 accent-primary shrink-0"
            />
            <div>
              <p className="text-sm font-caption font-semibold text-foreground">
                Quiero permitir que mis clientes me recomienden cuando esta función esté disponible.
              </p>
              <p className="text-xs font-caption text-muted-foreground mt-0.5">
                Las valoraciones ayudan a generar confianza y conseguir más clientes.
              </p>
            </div>
          </label>
        </div>
      </div>
    </div>
  );
}
