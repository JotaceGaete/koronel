import React, { useState } from 'react';
import Icon from 'components/AppIcon';
import OSMMap from 'components/maps/OSMMap';

export default function LocationPicker({ lat, lng, onChange }) {
  const [enabled, setEnabled] = useState(!!(lat && lng));

  const handleToggle = () => {
    if (enabled) {
      setEnabled(false);
      onChange?.({ lat: null, lng: null });
    } else {
      setEnabled(true);
    }
  };

  const handleClear = () => {
    onChange?.({ lat: null, lng: null });
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <div>
          <label className="block text-sm font-medium text-foreground">
            Ubicación en el mapa
            <span className="ml-2 text-xs text-muted-foreground font-normal">(opcional)</span>
          </label>
          <p className="text-xs text-muted-foreground mt-0.5">
            Haz clic en el mapa para marcar la ubicación exacta
          </p>
        </div>
        <button
          type="button"
          onClick={handleToggle}
          className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
            enabled ? 'bg-primary' : 'bg-muted'
          }`}
          style={enabled ? { background: 'var(--color-primary)' } : {}}
        >
          <span
            className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
              enabled ? 'translate-x-6' : 'translate-x-1'
            }`}
          />
        </button>
      </div>

      {enabled && (
        <div className="rounded-xl overflow-hidden border border-border" style={{ height: '260px' }}>
          <OSMMap
            lat={lat}
            lng={lng}
            onChange={onChange}
            height="260px"
            zoom={14}
            readOnly={false}
          />
        </div>
      )}

      {enabled && lat && lng && (
        <div className="flex items-center justify-between mt-2">
          <p className="text-xs text-muted-foreground">
            <Icon name="MapPin" size={12} color="currentColor" className="inline mr-1" />
            {parseFloat(lat)?.toFixed(5)}, {parseFloat(lng)?.toFixed(5)}
          </p>
          <button
            type="button"
            onClick={handleClear}
            className="text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            Quitar pin
          </button>
        </div>
      )}
    </div>
  );
}
