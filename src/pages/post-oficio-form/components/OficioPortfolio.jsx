import React, { useRef, useCallback } from 'react';
import Icon from 'components/AppIcon';

const MAX_PHOTOS = 6;

export default function OficioPortfolio({ photos, onChange }) {
  const fileRef = useRef(null);
  const cameraRef = useRef(null);

  const handleFiles = useCallback((files) => {
    const valid = Array.from(files).filter(f => f.type.startsWith('image/'));
    const newPhotos = valid.map(file => ({
      id: `portfolio_${Date.now()}_${Math.random().toString(36).slice(2)}`,
      url: URL.createObjectURL(file),
      alt: 'Trabajo realizado',
      file,
    }));
    onChange([...photos, ...newPhotos].slice(0, MAX_PHOTOS));
  }, [photos, onChange]);

  const handleInput = (e) => {
    if (e.target.files?.length) handleFiles(e.target.files);
    e.target.value = '';
  };

  const remove = (id) => onChange(photos.filter(p => p.id !== id));

  return (
    <div className="space-y-4">
      <div>
        <p className="text-sm font-caption font-semibold text-foreground mb-0.5">
          Trabajos realizados
          <span className="ml-1 text-xs font-normal text-muted-foreground">(hasta {MAX_PHOTOS} fotos)</span>
        </p>
        <p className="text-sm font-body text-muted-foreground">
          Mostrá fotos de trabajos anteriores. Funciona como tu portfolio y genera más confianza.
        </p>
      </div>

      {/* Drop zone — only when under limit */}
      {photos.length < MAX_PHOTOS && (
        <div
          onClick={() => fileRef.current?.click()}
          className="border-2 border-dashed border-border rounded-md p-5 text-center cursor-pointer hover:border-primary hover:bg-muted transition-all duration-200"
          role="button"
          aria-label="Agregar fotos de trabajos"
        >
          <input ref={fileRef} type="file" accept="image/*" multiple className="hidden" onChange={handleInput} />
          <input ref={cameraRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={handleInput} />
          <div className="flex flex-col items-center gap-2">
            <Icon name="ImagePlus" size={28} color="var(--color-secondary)" />
            <p className="text-sm font-caption text-foreground">
              Toca para agregar fotos
            </p>
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); cameraRef.current?.click(); }}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-caption border border-border bg-card hover:bg-muted transition-colors"
            >
              <Icon name="Camera" size={13} color="currentColor" />
              Tomar foto
            </button>
          </div>
        </div>
      )}

      {/* Grid */}
      {photos.length > 0 && (
        <div className="grid grid-cols-3 gap-3">
          {photos.map(photo => (
            <div key={photo.id} className="relative aspect-square rounded-md overflow-hidden border border-border bg-muted group">
              <img src={photo.url} alt={photo.alt} className="w-full h-full object-cover" />
              <button
                type="button"
                onClick={() => remove(photo.id)}
                className="absolute top-1 right-1 w-6 h-6 rounded-full bg-black bg-opacity-60 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                aria-label="Eliminar foto"
              >
                <Icon name="X" size={12} color="white" />
              </button>
            </div>
          ))}
        </div>
      )}

      {photos.length === 0 && (
        <p className="text-xs font-caption text-muted-foreground text-center">
          Si no tienes fotos ahora, puedes agregarlas después desde tu perfil.
        </p>
      )}
    </div>
  );
}
