import React, { useState, useRef, useCallback } from 'react';
import Icon from 'components/AppIcon';
import Image from 'components/AppImage';

export default function EventImageUpload({ photo, onChange }) {
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef(null);

  const handleFile = useCallback((file) => {
    if (!file?.type?.startsWith('image/')) return;
    const preview = {
      id: `event_img_${Date.now()}`,
      url: URL.createObjectURL(file),
      alt: `Imagen del evento: ${file?.name}`,
      name: file?.name,
      file,
    };
    onChange(preview);
  }, [onChange]);

  const handleDrop = useCallback((e) => {
    e?.preventDefault();
    setIsDragging(false);
    const file = e?.dataTransfer?.files?.[0];
    if (file) handleFile(file);
  }, [handleFile]);

  const handleDragOver = (e) => { e?.preventDefault(); setIsDragging(true); };
  const handleDragLeave = () => setIsDragging(false);

  const removePhoto = () => onChange(null);

  return (
    <div className="space-y-3">
      <label className="block text-sm font-caption font-semibold text-foreground">
        Imagen del evento
        <span className="ml-1 text-xs font-normal text-muted-foreground">(opcional, recomendado)</span>
      </label>

      {photo ? (
        <div className="relative rounded-lg overflow-hidden border border-border" style={{ aspectRatio: '16/7' }}>
          <Image
            src={photo?.url}
            alt={photo?.alt}
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-black/0 hover:bg-black/30 transition-all duration-200 flex items-center justify-center opacity-0 hover:opacity-100">
            <button
              type="button"
              onClick={removePhoto}
              className="flex items-center gap-2 px-4 py-2 bg-white rounded-full text-sm font-medium shadow-lg"
              style={{ color: 'var(--color-error)' }}
            >
              <Icon name="Trash2" size={15} color="currentColor" />
              Eliminar imagen
            </button>
          </div>
          <div className="absolute top-2 left-2">
            <span className="px-2 py-1 text-xs font-caption font-semibold rounded text-white" style={{ background: 'var(--color-primary)' }}>
              Imagen principal
            </span>
          </div>
        </div>
      ) : (
        <div
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onClick={() => fileInputRef?.current?.click()}
          className={`relative border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-all duration-200 ${
            isDragging ? 'border-primary bg-blue-50' : 'border-border hover:border-primary hover:bg-muted'
          }`}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => e?.key === 'Enter' && fileInputRef?.current?.click()}
          aria-label="Subir imagen del evento"
        >
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => { const f = e?.target?.files?.[0]; if (f) handleFile(f); }}
            capture="environment"
          />
          <div className="flex flex-col items-center gap-3">
            <div className="w-14 h-14 rounded-full flex items-center justify-center" style={{ background: 'var(--color-muted)' }}>
              <Icon name="ImagePlus" size={28} color="var(--color-primary)" />
            </div>
            <div>
              <p className="text-sm font-caption font-medium text-foreground">
                Arrastra una imagen o{' '}
                <span style={{ color: 'var(--color-primary)' }}>haz clic para seleccionar</span>
              </p>
              <p className="text-xs font-caption text-muted-foreground mt-1">
                JPG, PNG, WEBP — máx. 10 MB — Proporción 16:9 recomendada
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
