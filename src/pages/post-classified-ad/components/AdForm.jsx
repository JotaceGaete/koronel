import React from 'react';
import Icon from 'components/AppIcon';
import Input from 'components/ui/Input';

const LOCATIONS = [
  { value: '', label: 'Selecciona un sector' },
  { value: 'Centro', label: 'Centro' },
  { value: 'Coronel Norte', label: 'Coronel Norte' },
  { value: 'Coronel Sur', label: 'Coronel Sur' },
  { value: 'Boca Sur', label: 'Boca Sur' },
  { value: 'Lagunillas', label: 'Lagunillas' },
  { value: 'Palomares', label: 'Palomares' },
  { value: 'Schwager', label: 'Schwager' },
  { value: 'Otro sector', label: 'Otro sector' },
];

export default function AdForm({ formData, errors, onChange, categories = [], categoriesLoading = false, categoriesError = null }) {
  const handleChange = (field, value) => onChange(field, value);

  const formatPrice = (raw) => {
    const digits = raw?.replace(/\D/g, '');
    if (!digits) return '';
    return Number(digits)?.toLocaleString('es-CL');
  };

  const handlePriceChange = (e) => {
    let formatted = formatPrice(e?.target?.value);
    handleChange('price', formatted);
  };

  const handlePhoneChange = (e) => {
    let val = e?.target?.value?.replace(/\D/g, '');
    if (val?.startsWith('56')) val = val?.slice(2);
    val = val?.slice(0, 9);
    let formatted = val;
    if (val?.length > 1) formatted = val?.slice(0, 1) + ' ' + val?.slice(1);
    if (val?.length > 5) formatted = val?.slice(0, 1) + ' ' + val?.slice(1, 5) + ' ' + val?.slice(5);
    handleChange('phone', formatted ? '+56 ' + formatted : '');
  };

  const renderCategorySelect = () => {
    if (categoriesLoading) {
      return (
        <div className="w-full h-11 flex items-center px-4 rounded-md border border-border bg-muted text-sm font-caption text-muted-foreground gap-2">
          <Icon name="Loader" size={15} color="currentColor" className="animate-spin" />
          Cargando categorías...
        </div>
      );
    }

    if (categoriesError) {
      return (
        <div className="w-full h-11 flex items-center px-4 rounded-md border border-error bg-card text-sm font-caption gap-2" style={{ color: 'var(--color-error)' }}>
          <Icon name="AlertCircle" size={15} color="currentColor" />
          Error al cargar categorías. Recarga la página.
        </div>
      );
    }

    if (categories?.length === 0) {
      return (
        <div className="w-full h-11 flex items-center px-4 rounded-md border border-border bg-muted text-sm font-caption text-muted-foreground gap-2">
          <Icon name="Info" size={15} color="currentColor" />
          No hay categorías aún.
        </div>
      );
    }

    return (
      <div className="relative">
        <select
          value={formData?.category}
          onChange={(e) => handleChange('category', e?.target?.value)}
          className={`w-full h-11 pl-4 pr-10 text-sm font-caption rounded-md border appearance-none bg-card text-foreground focus:outline-none focus:ring-2 focus:ring-ring transition-all duration-200
            ${errors?.category ? 'border-error' : 'border-border'}`}
        >
          <option value="">Selecciona una categoría</option>
          {categories?.map(c => (
            <option key={c?.id} value={c?.id}>{c?.name}</option>
          ))}
        </select>
        <div className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2">
          <Icon name="ChevronDown" size={16} color="var(--color-secondary)" />
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-5">
      {/* Title */}
      <div>
        <Input
          label="Título del aviso"
          type="text"
          placeholder="Ej: Vendo bicicleta montaña Trek en buen estado"
          value={formData?.title}
          onChange={(e) => handleChange('title', e?.target?.value)}
          required
          maxLength={80}
          error={errors?.title}
        />
        <div className="flex justify-end mt-1">
          <span className={`text-xs font-caption ${formData?.title?.length > 70 ? 'text-warning' : 'text-muted-foreground'}`}>
            {formData?.title?.length}/80
          </span>
        </div>
      </div>
      {/* Category */}
      <div>
        <label className="block text-sm font-caption font-semibold text-foreground mb-1.5">
          Categoría <span className="text-error">*</span>
        </label>
        {renderCategorySelect()}
        {errors?.category && <p className="mt-1 text-xs font-caption text-error">{errors?.category}</p>}
      </div>
      {/* Description */}
      <div>
        <label className="block text-sm font-caption font-semibold text-foreground mb-1.5">
          Descripción <span className="text-error">*</span>
        </label>
        <textarea
          value={formData?.description}
          onChange={(e) => handleChange('description', e?.target?.value)}
          placeholder="Describe tu artículo o servicio con detalle: estado, características, motivo de venta..."
          rows={5}
          maxLength={1000}
          className={`w-full px-4 py-3 text-sm font-body rounded-md border bg-card text-foreground placeholder-muted-foreground resize-none focus:outline-none focus:ring-2 focus:ring-ring transition-all duration-200
            ${errors?.description ? 'border-error' : 'border-border'}`}
        />
        <div className="flex items-start justify-between mt-1">
          {errors?.description
            ? <p className="text-xs font-caption text-error">{errors?.description}</p>
            : <span />}
          <span className={`text-xs font-caption ml-auto ${formData?.description?.length > 900 ? 'text-warning' : 'text-muted-foreground'}`}>
            {formData?.description?.length}/1000
          </span>
        </div>
      </div>
      {/* Price */}
      <div>
        <label className="block text-sm font-caption font-semibold text-foreground mb-1.5">
          Precio <span className="text-xs font-normal text-muted-foreground">(opcional)</span>
        </label>
        <div className="relative">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm font-data font-medium text-muted-foreground">$</span>
          <input
            type="text"
            inputMode="numeric"
            value={formData?.price}
            onChange={handlePriceChange}
            placeholder="0"
            className="w-full h-11 pl-8 pr-16 text-sm font-data rounded-md border border-border bg-card text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring transition-all duration-200"
          />
          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-caption text-muted-foreground">CLP</span>
        </div>
        <div className="flex items-center gap-2 mt-2">
          <input
            type="checkbox"
            id="price_negotiable"
            checked={formData?.priceNegotiable}
            onChange={(e) => handleChange('priceNegotiable', e?.target?.checked)}
            className="w-4 h-4 rounded border-border accent-primary"
          />
          <label htmlFor="price_negotiable" className="text-sm font-caption text-foreground cursor-pointer">
            Precio a convenir
          </label>
        </div>
      </div>
      {/* Phone */}
      <div>
        <Input
          label="Teléfono de contacto"
          type="tel"
          placeholder="+56 9 1234 5678"
          value={formData?.phone}
          onChange={handlePhoneChange}
          required
          error={errors?.phone}
        />
        <div className="flex items-center gap-2 mt-2">
          <input
            type="checkbox"
            id="whatsapp_toggle"
            checked={formData?.whatsapp}
            onChange={(e) => handleChange('whatsapp', e?.target?.checked)}
            className="w-4 h-4 rounded border-border accent-primary"
          />
          <label htmlFor="whatsapp_toggle" className="flex items-center gap-1.5 text-sm font-caption text-foreground cursor-pointer">
            <Icon name="MessageCircle" size={15} color="var(--color-success)" />
            Disponible por WhatsApp
          </label>
        </div>
      </div>
      {/* Location */}
      <div>
        <label className="block text-sm font-caption font-semibold text-foreground mb-1.5">
          Sector en Coronel
        </label>
        <div className="relative">
          <select
            value={formData?.location}
            onChange={(e) => handleChange('location', e?.target?.value)}
            className="w-full h-11 pl-4 pr-10 text-sm font-caption rounded-md border border-border appearance-none bg-card text-foreground focus:outline-none focus:ring-2 focus:ring-ring transition-all duration-200"
          >
            {LOCATIONS?.map(l => (
              <option key={l?.value} value={l?.value}>{l?.label}</option>
            ))}
          </select>
          <div className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2">
            <Icon name="ChevronDown" size={16} color="var(--color-secondary)" />
          </div>
        </div>
      </div>
      {/* Duración fija: 30 días */}
      <p className="text-sm font-caption text-muted-foreground">
        Tu aviso se publicará por 30 días.
      </p>
    </div>
  );
}