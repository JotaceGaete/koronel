import React from 'react';
import Icon from 'components/AppIcon';
import OSMMap from 'components/maps/OSMMap';

export default function BusinessMap({ lat, lng, businessName }) {
  const hasCoords = lat != null && lng != null && !isNaN(parseFloat(lat)) && !isNaN(parseFloat(lng));

  return (
    <div className="bg-card border border-border rounded-lg overflow-hidden">
      <div className="flex items-center gap-2 p-4 border-b border-border">
        <Icon name="Map" size={18} color="var(--color-primary)" />
        <h3 className="font-heading font-semibold text-base text-foreground">Ubicación</h3>
      </div>
      {hasCoords ? (
        <div className="w-full" style={{ height: '300px' }}>
          <OSMMap
            lat={parseFloat(lat)}
            lng={parseFloat(lng)}
            height="300px"
            zoom={16}
            readOnly={true}
          />
        </div>
      ) : (
        <div
          className="flex flex-col items-center justify-center gap-2 py-10 px-4"
          style={{ background: 'var(--color-muted)' }}
        >
          <Icon name="MapPin" size={28} color="var(--color-muted-foreground)" />
          <p className="text-sm text-muted-foreground font-medium">📍 Ubicación no disponible</p>
          <p className="text-xs text-muted-foreground text-center">Este negocio aún no ha registrado su ubicación en el mapa.</p>
        </div>
      )}
    </div>
  );
}