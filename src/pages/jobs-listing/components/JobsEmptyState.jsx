import React from 'react';
import Icon from 'components/AppIcon';
import Button from 'components/ui/Button';

export default function JobsEmptyState({ onPublicar }) {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center">
      <div className="w-16 h-16 rounded-full flex items-center justify-center mb-4" style={{ background: 'var(--color-muted)' }}>
        <Icon name="Briefcase" size={28} color="var(--color-muted-foreground)" />
      </div>
      <h3 className="text-lg font-heading font-semibold text-foreground mb-2">No hay empleos disponibles</h3>
      <p className="text-sm text-muted-foreground mb-6 max-w-sm">
        No encontramos ofertas de trabajo con los filtros seleccionados. Intenta con otros criterios o publica una oferta.
      </p>
      <Button variant="default" size="md" iconName="Plus" iconPosition="left" iconSize={16} onClick={onPublicar}>
        Publicar Empleo
      </Button>
    </div>
  );
}
