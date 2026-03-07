import React from 'react';
import { Link } from 'react-router-dom';
import Icon from 'components/AppIcon';
import Button from 'components/ui/Button';

export default function EmptyState({ onReset }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
      <div
        className="w-16 h-16 rounded-full flex items-center justify-center mb-4"
        style={{ background: 'var(--color-muted)' }}
      >
        <Icon name="SearchX" size={32} color="var(--color-secondary)" />
      </div>
      <h3 className="font-heading font-semibold text-lg text-foreground mb-2">No se encontraron avisos</h3>
      <p className="text-sm font-caption text-muted-foreground mb-6 max-w-xs">
        Intenta ajustar los filtros o buscar con otras palabras clave.
      </p>
      <div className="flex flex-col sm:flex-row gap-3">
        <Button variant="outline" onClick={onReset} iconName="RotateCcw" iconPosition="left" iconSize={16}>
          Limpiar filtros
        </Button>
        <Link to="/post-classified-ad">
          <Button variant="default" iconName="Plus" iconPosition="left" iconSize={16}>
            Publicar aviso
          </Button>
        </Link>
      </div>
    </div>
  );
}