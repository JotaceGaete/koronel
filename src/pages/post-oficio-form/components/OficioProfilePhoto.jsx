import React, { useRef } from 'react';
import Icon from 'components/AppIcon';

export default function OficioProfilePhoto({ photo, onChange }) {
  const fileRef = useRef(null);
  const cameraRef = useRef(null);

  const handleFile = (file) => {
    if (!file || !file.type.startsWith('image/')) return;
    const obj = {
      id: `profile_${Date.now()}`,
      url: URL.createObjectURL(file),
      alt: 'Foto de perfil',
      file,
    };
    onChange(obj);
  };

  const handleInput = (e) => {
    if (e.target.files?.[0]) handleFile(e.target.files[0]);
    e.target.value = '';
  };

  return (
    <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6">
      {/* Avatar */}
      <div className="shrink-0 flex flex-col items-center gap-3">
        <div
          className="w-28 h-28 rounded-full border-4 overflow-hidden bg-muted flex items-center justify-center cursor-pointer hover:opacity-80 transition-opacity"
          style={{ borderColor: photo ? 'var(--color-primary)' : 'var(--color-border)' }}
          onClick={() => fileRef.current?.click()}
          role="button"
          aria-label="Subir foto de perfil"
        >
          {photo ? (
            <img src={photo.url} alt={photo.alt} className="w-full h-full object-cover" />
          ) : (
            <Icon name="User" size={48} color="var(--color-muted-foreground)" />
          )}
        </div>

        {photo ? (
          <button
            type="button"
            onClick={() => onChange(null)}
            className="text-xs font-caption text-muted-foreground hover:text-error transition-colors underline"
          >
            Cambiar foto
          </button>
        ) : (
          <div className="flex flex-col gap-2 items-center">
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              className="flex items-center gap-1.5 px-3 py-2 rounded-md text-sm font-caption font-medium border border-border bg-muted hover:bg-primary hover:text-primary-foreground transition-all min-h-[40px]"
            >
              <Icon name="Upload" size={15} color="currentColor" />
              Subir foto
            </button>
            <button
              type="button"
              onClick={() => cameraRef.current?.click()}
              className="flex items-center gap-1.5 px-3 py-2 rounded-md text-sm font-caption font-medium border border-border bg-card hover:bg-muted transition-all min-h-[40px]"
            >
              <Icon name="Camera" size={15} color="currentColor" />
              Tomar foto
            </button>
          </div>
        )}

        <input ref={fileRef} type="file" accept="image/*" multiple={false} className="hidden" onChange={handleInput} />
        <input ref={cameraRef} type="file" accept="image/*" capture="user" className="hidden" onChange={handleInput} />
      </div>

      {/* Hint */}
      <div className="flex-1 text-center sm:text-left">
        <p className="text-sm font-caption font-semibold text-foreground mb-1">
          Tu foto
        </p>
        <p className="text-sm font-body text-muted-foreground leading-relaxed">
          Las personas confían más cuando pueden ver quién realizará el trabajo.
          Una foto tuya con buena luz es lo que mejor funciona.
        </p>
        <p className="text-xs font-caption text-muted-foreground mt-2">
          Opcional — puedes agregarla después.
        </p>
      </div>
    </div>
  );
}
