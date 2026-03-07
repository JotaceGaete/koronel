import React, { useState, useRef, useCallback } from 'react';
import Icon from 'components/AppIcon';
import Image from 'components/AppImage';
import Button from 'components/ui/Button';

export default function PhotoUpload({ photos, onChange }) {
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef(null);

  const handleFiles = useCallback((files) => {
    const validFiles = Array.from(files)?.filter(f => f?.type?.startsWith('image/'));
    const newPhotos = validFiles?.map(file => ({
      id: `photo_${Date.now()}_${Math.random()?.toString(36)?.slice(2)}`,
      url: URL.createObjectURL(file),
      alt: `Foto del aviso: ${file?.name}`,
      name: file?.name,
      file,
    }));
    onChange([...photos, ...newPhotos]?.slice(0, 8));
  }, [photos, onChange]);

  const handleDrop = useCallback((e) => {
    e?.preventDefault();
    setIsDragging(false);
    handleFiles(e?.dataTransfer?.files);
  }, [handleFiles]);

  const handleDragOver = (e) => { e?.preventDefault(); setIsDragging(true); };
  const handleDragLeave = () => setIsDragging(false);

  const removePhoto = (id) => onChange(photos?.filter(p => p?.id !== id));

  const movePhoto = (index, direction) => {
    const newPhotos = [...photos];
    const targetIndex = index + direction;
    if (targetIndex < 0 || targetIndex >= newPhotos?.length) return;
    [newPhotos[index], newPhotos[targetIndex]] = [newPhotos?.[targetIndex], newPhotos?.[index]];
    onChange(newPhotos);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <label className="block text-sm font-caption font-semibold text-foreground">
          Fotos del aviso
          <span className="ml-1 text-xs font-normal text-muted-foreground">(máx. 8 fotos)</span>
        </label>
        <span className="text-xs font-caption text-muted-foreground">{photos?.length}/8</span>
      </div>
      {/* Drop Zone */}
      <div
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onClick={() => fileInputRef?.current?.click()}
        className={`
          relative border-2 border-dashed rounded-md p-6 md:p-8 text-center cursor-pointer
          transition-all duration-250
          ${isDragging
            ? 'border-primary bg-blue-50 dark:bg-blue-950' :'border-border hover:border-primary hover:bg-muted'
          }
        `}
        role="button"
        aria-label="Subir fotos"
        tabIndex={0}
        onKeyDown={(e) => e?.key === 'Enter' && fileInputRef?.current?.click()}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          multiple
          className="hidden"
          onChange={(e) => handleFiles(e?.target?.files)}
          capture="environment"
        />
        <div className="flex flex-col items-center gap-3">
          <div className="w-12 h-12 rounded-full flex items-center justify-center" style={{ background: 'var(--color-muted)' }}>
            <Icon name="ImagePlus" size={24} color="var(--color-primary)" />
          </div>
          <div>
            <p className="text-sm font-caption font-medium text-foreground">
              Arrastra fotos aquí o <span style={{ color: 'var(--color-primary)' }}>haz clic para seleccionar</span>
            </p>
            <p className="text-xs font-caption text-muted-foreground mt-1">
              JPG, PNG, WEBP — máx. 10 MB por foto
            </p>
          </div>
          <Button variant="outline" size="sm" iconName="Camera" iconPosition="left" iconSize={15}
            onClick={(e) => { e?.stopPropagation(); fileInputRef?.current?.click(); }}>
            Tomar foto
          </Button>
        </div>
      </div>
      {/* Thumbnails */}
      {photos?.length > 0 && (
        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-4 lg:grid-cols-4 gap-3">
          {photos?.map((photo, index) => (
            <div key={photo?.id} className="relative group aspect-square rounded-md overflow-hidden border border-border bg-muted">
              <Image
                src={photo?.url}
                alt={photo?.alt}
                className="w-full h-full object-cover"
              />
              {index === 0 && (
                <span className="absolute top-1 left-1 px-1.5 py-0.5 text-xs font-caption font-semibold rounded text-white"
                  style={{ background: 'var(--color-primary)' }}>
                  Principal
                </span>
              )}
              <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-40 transition-all duration-200 flex items-center justify-center gap-1 opacity-0 group-hover:opacity-100">
                {index > 0 && (
                  <button onClick={() => movePhoto(index, -1)}
                    className="w-7 h-7 rounded-full bg-white flex items-center justify-center shadow"
                    aria-label="Mover izquierda">
                    <Icon name="ChevronLeft" size={14} color="var(--color-foreground)" />
                  </button>
                )}
                <button onClick={() => removePhoto(photo?.id)}
                  className="w-7 h-7 rounded-full bg-white flex items-center justify-center shadow"
                  aria-label="Eliminar foto">
                  <Icon name="Trash2" size={14} color="var(--color-error)" />
                </button>
                {index < photos?.length - 1 && (
                  <button onClick={() => movePhoto(index, 1)}
                    className="w-7 h-7 rounded-full bg-white flex items-center justify-center shadow"
                    aria-label="Mover derecha">
                    <Icon name="ChevronRight" size={14} color="var(--color-foreground)" />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}