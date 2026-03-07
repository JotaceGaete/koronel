import React, { useState } from 'react';
import Icon from 'components/AppIcon';
import Button from 'components/ui/Button';

const PRICE_RANGES = [
  { value: 'all', label: 'Cualquier precio' },
  { value: '0-50000', label: 'Hasta $50.000' },
  { value: '50000-200000', label: '$50.000 - $200.000' },
  { value: '200000-500000', label: '$200.000 - $500.000' },
  { value: '500000+', label: 'Más de $500.000' },
];

const DATE_FILTERS = [
  { value: 'all', label: 'Cualquier fecha' },
  { value: 'today', label: 'Hoy' },
  { value: 'week', label: 'Esta semana' },
  { value: 'month', label: 'Este mes' },
];

const CONDITIONS = [
  { value: 'all', label: 'Cualquier estado' },
  { value: 'Nuevo', label: 'Nuevo' },
  { value: 'Como nuevo', label: 'Como nuevo' },
  { value: 'Buen estado', label: 'Buen estado' },
  { value: 'Usado', label: 'Usado' },
];

export default function FilterPanel({ filters, onChange, onReset, resultCount, isMobile = false, onClose }) {
  const handleChange = (key, value) => {
    onChange({ ...filters, [key]: value });
  };

  const content = (
    <div className={`${isMobile ? 'p-4 flex flex-col gap-4' : 'flex flex-wrap items-center gap-3'}`}>
      {/* Price Range */}
      <div className={isMobile ? 'flex flex-col gap-1' : ''}>
        {isMobile && <label className="text-xs font-caption font-semibold text-muted-foreground uppercase tracking-wider">Precio</label>}
        <select
          value={filters?.priceRange}
          onChange={(e) => handleChange('priceRange', e?.target?.value)}
          className="h-10 px-3 pr-8 text-sm font-caption text-foreground bg-card border border-border rounded-md appearance-none cursor-pointer focus:outline-none focus:ring-2 focus:ring-ring w-full md:w-auto"
          aria-label="Rango de precio"
        >
          {PRICE_RANGES?.map((r) => (
            <option key={r?.value} value={r?.value}>{r?.label}</option>
          ))}
        </select>
      </div>

      {/* Date Filter */}
      <div className={isMobile ? 'flex flex-col gap-1' : ''}>
        {isMobile && <label className="text-xs font-caption font-semibold text-muted-foreground uppercase tracking-wider">Fecha</label>}
        <select
          value={filters?.dateFilter}
          onChange={(e) => handleChange('dateFilter', e?.target?.value)}
          className="h-10 px-3 pr-8 text-sm font-caption text-foreground bg-card border border-border rounded-md appearance-none cursor-pointer focus:outline-none focus:ring-2 focus:ring-ring w-full md:w-auto"
          aria-label="Filtro de fecha"
        >
          {DATE_FILTERS?.map((d) => (
            <option key={d?.value} value={d?.value}>{d?.label}</option>
          ))}
        </select>
      </div>

      {/* Condition */}
      <div className={isMobile ? 'flex flex-col gap-1' : ''}>
        {isMobile && <label className="text-xs font-caption font-semibold text-muted-foreground uppercase tracking-wider">Estado</label>}
        <select
          value={filters?.condition}
          onChange={(e) => handleChange('condition', e?.target?.value)}
          className="h-10 px-3 pr-8 text-sm font-caption text-foreground bg-card border border-border rounded-md appearance-none cursor-pointer focus:outline-none focus:ring-2 focus:ring-ring w-full md:w-auto"
          aria-label="Estado del artículo"
        >
          {CONDITIONS?.map((c) => (
            <option key={c?.value} value={c?.value}>{c?.label}</option>
          ))}
        </select>
      </div>

      {/* Result count + reset */}
      <div className={`flex items-center gap-3 ${isMobile ? 'mt-2' : 'ml-auto'}`}>
        <span className="text-sm font-caption text-muted-foreground whitespace-nowrap">
          <span className="font-semibold text-foreground">{resultCount}</span> avisos
        </span>
        <Button variant="ghost" size="sm" onClick={onReset} iconName="RotateCcw" iconPosition="left" iconSize={14}>
          Limpiar
        </Button>
        {isMobile && (
          <Button variant="default" size="sm" onClick={onClose}>
            Ver resultados
          </Button>
        )}
      </div>
    </div>
  );

  if (isMobile) {
    return (
      <div className="fixed inset-0 z-[200] flex flex-col" role="dialog" aria-modal="true" aria-label="Filtros">
        <div className="absolute inset-0 bg-foreground opacity-40" onClick={onClose} />
        <div className="relative mt-auto bg-card rounded-t-xl shadow-xl max-h-[80vh] overflow-y-auto">
          <div className="flex items-center justify-between px-4 py-3 border-b border-border sticky top-0 bg-card">
            <h2 className="font-heading font-semibold text-base text-foreground">Filtros</h2>
            <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-md hover:bg-muted transition-colors" aria-label="Cerrar filtros">
              <Icon name="X" size={18} color="currentColor" />
            </button>
          </div>
          {content}
        </div>
      </div>
    );
  }

  return (
    <div className="bg-card border border-border rounded-md px-4 py-3">
      {content}
    </div>
  );
}