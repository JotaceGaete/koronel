import React from 'react';
import Icon from 'components/AppIcon';
import Input from 'components/ui/Input';

const BASE_CATEGORIES = [
  { value: '', label: 'Selecciona una categoría' },
  { value: 'church', label: '⛪ Iglesia / Culto' },
  { value: 'courses', label: '📚 Cursos y Talleres' },
  { value: 'meetups', label: '🤝 Encuentros y Reuniones' },
  { value: 'farmacias', label: '💊 Farmacias' },
  { value: 'other', label: '📌 Otro' },
];

export default function EventFormFields({ formData, errors, onChange, userBusinesses }) {
  const handleChange = (field, value) => onChange(field, value);

  const handleWhatsAppChange = (e) => {
    let val = e?.target?.value?.replace(/\D/g, '');
    if (val?.startsWith('56')) val = val?.slice(2);
    val = val?.slice(0, 9);
    let formatted = val;
    if (val?.length > 1) formatted = val?.slice(0, 1) + ' ' + val?.slice(1);
    if (val?.length > 5) formatted = val?.slice(0, 1) + ' ' + val?.slice(1, 5) + ' ' + val?.slice(5);
    handleChange('contactWhatsapp', formatted ? '+56 ' + formatted : '');
  };

  return (
    <div className="space-y-5">
      {/* Title */}
      <div>
        <Input
          label="Título del evento"
          type="text"
          placeholder="Ej: Feria Gastronómica de Coronel"
          value={formData?.title || ''}
          onChange={(e) => handleChange('title', e?.target?.value)}
          required
          maxLength={100}
          error={errors?.title}
        />
        <div className="flex justify-end mt-1">
          <span className={`text-xs font-caption ${
            (formData?.title?.length || 0) > 85 ? 'text-warning' : 'text-muted-foreground'
          }`}>
            {formData?.title?.length || 0}/100
          </span>
        </div>
      </div>

      {/* Category */}
      <div>
        <label className="block text-sm font-caption font-semibold text-foreground mb-1.5">
          Categoría <span className="text-error">*</span>
        </label>
        <div className="relative">
          <select
            value={formData?.category || ''}
            onChange={(e) => handleChange('category', e?.target?.value)}
            className={`w-full h-11 pl-4 pr-10 text-sm font-caption rounded-md border appearance-none bg-card text-foreground focus:outline-none focus:ring-2 focus:ring-ring transition-all duration-200 ${
              errors?.category ? 'border-error' : 'border-border'
            }`}
          >
            {BASE_CATEGORIES?.map(c => (
              <option key={c?.value} value={c?.value}>{c?.label}</option>
            ))}
          </select>
          <div className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2">
            <Icon name="ChevronDown" size={16} color="var(--color-secondary)" />
          </div>
        </div>
        {errors?.category && <p className="mt-1 text-xs font-caption text-error">{errors?.category}</p>}
      </div>

      {/* Date/Time Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-caption font-semibold text-foreground mb-1.5">
            Fecha y hora de inicio <span className="text-error">*</span>
          </label>
          <input
            type="datetime-local"
            value={formData?.startDatetime || ''}
            onChange={(e) => handleChange('startDatetime', e?.target?.value)}
            className={`w-full h-11 px-3 text-sm font-caption rounded-md border bg-card text-foreground focus:outline-none focus:ring-2 focus:ring-ring transition-all duration-200 ${
              errors?.startDatetime ? 'border-error' : 'border-border'
            }`}
          />
          {errors?.startDatetime && <p className="mt-1 text-xs font-caption text-error">{errors?.startDatetime}</p>}
        </div>
        <div>
          <label className="block text-sm font-caption font-semibold text-foreground mb-1.5">
            Fecha y hora de término <span className="text-error">*</span>
          </label>
          <input
            type="datetime-local"
            value={formData?.endDatetime || ''}
            onChange={(e) => handleChange('endDatetime', e?.target?.value)}
            className={`w-full h-11 px-3 text-sm font-caption rounded-md border bg-card text-foreground focus:outline-none focus:ring-2 focus:ring-ring transition-all duration-200 ${
              errors?.endDatetime ? 'border-error' : 'border-border'
            }`}
          />
          {errors?.endDatetime && <p className="mt-1 text-xs font-caption text-error">{errors?.endDatetime}</p>}
        </div>
      </div>

      {/* Venue */}
      <Input
        label="Nombre del lugar"
        type="text"
        placeholder="Ej: Plaza de Armas de Coronel"
        value={formData?.venueName || ''}
        onChange={(e) => handleChange('venueName', e?.target?.value)}
        required
        error={errors?.venueName}
      />

      {/* Address */}
      <Input
        label="Dirección"
        type="text"
        placeholder="Ej: Av. Capitán Ávalos 1245, Coronel"
        value={formData?.address || ''}
        onChange={(e) => handleChange('address', e?.target?.value)}
        required
        error={errors?.address}
      />

      {/* Description */}
      <div>
        <label className="block text-sm font-caption font-semibold text-foreground mb-1.5">
          Descripción <span className="text-error">*</span>
        </label>
        <textarea
          value={formData?.description || ''}
          onChange={(e) => handleChange('description', e?.target?.value)}
          placeholder="Describe el evento: actividades, quiénes pueden asistir, qué incluye..."
          rows={5}
          maxLength={1500}
          className={`w-full px-4 py-3 text-sm font-body rounded-md border bg-card text-foreground placeholder-muted-foreground resize-none focus:outline-none focus:ring-2 focus:ring-ring transition-all duration-200 ${
            errors?.description ? 'border-error' : 'border-border'
          }`}
        />
        <div className="flex items-start justify-between mt-1">
          {errors?.description
            ? <p className="text-xs font-caption text-error">{errors?.description}</p>
            : <span />}
          <span className={`text-xs font-caption ml-auto ${
            (formData?.description?.length || 0) > 1350 ? 'text-warning' : 'text-muted-foreground'
          }`}>
            {formData?.description?.length || 0}/1500
          </span>
        </div>
      </div>

      {/* WhatsApp */}
      <div>
        <Input
          label="WhatsApp de contacto"
          type="tel"
          placeholder="+56 9 1234 5678"
          value={formData?.contactWhatsapp || ''}
          onChange={handleWhatsAppChange}
          error={errors?.contactWhatsapp}
        />
        <p className="mt-1 text-xs text-muted-foreground">Número de contacto para consultas sobre el evento</p>
      </div>

      {/* Organizer Business (optional) */}
      {userBusinesses?.length > 0 && (
        <div>
          <label className="block text-sm font-caption font-semibold text-foreground mb-1.5">
            Negocio organizador
            <span className="ml-1 text-xs font-normal text-muted-foreground">(opcional)</span>
          </label>
          <div className="relative">
            <select
              value={formData?.organizerBusinessId || ''}
              onChange={(e) => handleChange('organizerBusinessId', e?.target?.value)}
              className="w-full h-11 pl-4 pr-10 text-sm font-caption rounded-md border border-border appearance-none bg-card text-foreground focus:outline-none focus:ring-2 focus:ring-ring transition-all duration-200"
            >
              <option value="">Sin negocio organizador</option>
              {userBusinesses?.map(b => (
                <option key={b?.id} value={b?.id}>{b?.name}</option>
              ))}
            </select>
            <div className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2">
              <Icon name="ChevronDown" size={16} color="var(--color-secondary)" />
            </div>
          </div>
          <p className="mt-1 text-xs text-muted-foreground">Vincula este evento a uno de tus negocios reclamados</p>
        </div>
      )}
    </div>
  );
}
