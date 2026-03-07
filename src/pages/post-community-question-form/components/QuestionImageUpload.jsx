import React, { useRef } from 'react';
import Icon from 'components/AppIcon';

const MAX_FILES = 3;
const MAX_SIZE_MB = 10;
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

export default function QuestionImageUpload({ images, onAdd, onRemove, error }) {
  const inputRef = useRef(null);

  const handleFiles = (e) => {
    const files = Array.from(e?.target?.files || []);
    const remaining = MAX_FILES - (images?.length || 0);
    const toAdd = [];
    const errs = [];

    files?.slice(0, remaining)?.forEach(file => {
      if (!ALLOWED_TYPES?.includes(file?.type)) {
        errs?.push(`${file?.name}: tipo no permitido (JPG, PNG, WebP)`);
        return;
      }
      if (file?.size > MAX_SIZE_MB * 1024 * 1024) {
        errs?.push(`${file?.name}: excede ${MAX_SIZE_MB}MB`);
        return;
      }
      toAdd?.push({ file, preview: URL.createObjectURL(file) });
    });

    if (toAdd?.length > 0) onAdd?.(toAdd, errs?.length > 0 ? errs?.join(', ') : null);
    else if (errs?.length > 0) onAdd?.([], errs?.join(', '));
    e.target.value = '';
  };

  const canAdd = (images?.length || 0) < MAX_FILES;

  return (
    <div>
      <label className="block text-sm font-medium text-foreground mb-1.5">
        Imágenes <span className="text-muted-foreground font-normal">(opcional, máx. {MAX_FILES})</span>
      </label>
      <div className="flex flex-wrap gap-3">
        {/* Thumbnails */}
        {images?.map((img, idx) => (
          <div key={idx} className="relative w-24 h-24 rounded-lg overflow-hidden border border-border group">
            <img
              src={img?.preview}
              alt={`Imagen ${idx + 1}`}
              className="w-full h-full object-cover"
            />
            <button
              type="button"
              onClick={() => onRemove?.(idx)}
              className="absolute top-1 right-1 w-5 h-5 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
              style={{ background: 'rgba(0,0,0,0.6)' }}
              title="Quitar imagen"
            >
              <Icon name="X" size={12} color="white" />
            </button>
            <div
              className="absolute bottom-0 left-0 right-0 text-center text-xs py-0.5"
              style={{ background: 'rgba(0,0,0,0.4)', color: 'white' }}
            >
              {idx + 1}/{MAX_FILES}
            </div>
          </div>
        ))}

        {/* Add button */}
        {canAdd && (
          <button
            type="button"
            onClick={() => inputRef?.current?.click()}
            className="w-24 h-24 rounded-lg border-2 border-dashed flex flex-col items-center justify-center gap-1 transition-colors hover:bg-muted"
            style={{ borderColor: error ? 'var(--color-error)' : 'var(--color-border)' }}
          >
            <Icon name="ImagePlus" size={20} color="var(--color-muted-foreground)" />
            <span className="text-xs text-muted-foreground">Agregar</span>
          </button>
        )}
      </div>
      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        multiple
        className="hidden"
        onChange={handleFiles}
      />
      <p className="text-xs text-muted-foreground mt-1.5">
        JPG, PNG o WebP · Máx. {MAX_SIZE_MB}MB por imagen · {images?.length || 0}/{MAX_FILES} imágenes
      </p>
      {error && <p className="text-xs mt-1" style={{ color: 'var(--color-error)' }}>{error}</p>}
    </div>
  );
}
