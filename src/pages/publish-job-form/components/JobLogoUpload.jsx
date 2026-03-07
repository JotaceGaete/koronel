import React, { useRef } from 'react';
import Icon from 'components/AppIcon';
import Image from 'components/AppImage';

export default function JobLogoUpload({ logoPreview, onFileChange }) {
  const inputRef = useRef(null);

  const handleFile = (e) => {
    const file = e?.target?.files?.[0];
    if (!file) return;
    if (!['image/jpeg', 'image/png', 'image/webp']?.includes(file?.type)) {
      alert('Solo se permiten imágenes JPG, PNG o WebP.');
      return;
    }
    if (file?.size > 5 * 1024 * 1024) {
      alert('La imagen no puede superar los 5 MB.');
      return;
    }
    const reader = new FileReader();
    reader.onload = (ev) => onFileChange(file, ev?.target?.result);
    reader?.readAsDataURL(file);
  };

  return (
    <div className="bg-card border border-border rounded-xl p-5">
      <h2 className="text-base font-heading font-semibold text-foreground mb-4">Logo de la empresa (opcional)</h2>
      <div className="flex items-center gap-4">
        <div
          className="w-20 h-20 rounded-xl border-2 border-dashed border-border bg-muted flex items-center justify-center overflow-hidden cursor-pointer hover:border-primary transition-colors"
          onClick={() => inputRef?.current?.click()}
        >
          {logoPreview ? (
            <Image src={logoPreview} alt="Vista previa del logo" className="w-full h-full object-cover" />
          ) : (
            <Icon name="ImagePlus" size={24} color="var(--color-muted-foreground)" />
          )}
        </div>
        <div>
          <button
            type="button"
            onClick={() => inputRef?.current?.click()}
            className="text-sm font-caption font-medium text-primary hover:underline"
          >
            {logoPreview ? 'Cambiar logo' : 'Subir logo'}
          </button>
          <p className="text-xs text-muted-foreground mt-0.5">JPG, PNG o WebP. Máx 5 MB.</p>
          {logoPreview && (
            <button
              type="button"
              onClick={() => onFileChange(null, null)}
              className="text-xs mt-1 hover:underline"
              style={{ color: '#dc2626' }}
            >
              Eliminar
            </button>
          )}
        </div>
      </div>
      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="hidden"
        onChange={handleFile}
      />
    </div>
  );
}
