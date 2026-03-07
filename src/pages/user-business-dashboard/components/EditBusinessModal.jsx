import React, { useState, useRef } from 'react';
import Icon from 'components/AppIcon';


export default function EditBusinessModal({ business, onClose, onSave }) {
  const [form, setForm] = useState({
    name: business?.name || '',
    phone: business?.phone || '',
    address: business?.address || '',
    description: business?.description || '',
    whatsapp: business?.whatsapp || '',
    redes_sociales: business?.redes_sociales || '',
  });
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState(null);
  const [logoFile, setLogoFile] = useState(null);
  const [logoPreview, setLogoPreview] = useState(null);
  const [photoFiles, setPhotoFiles] = useState([]);
  const [photoPreviews, setPhotoPreviews] = useState([]);
  const logoRef = useRef(null);
  const photosRef = useRef(null);

  const handleChange = (e) => {
    const { name, value } = e?.target;
    setForm(prev => ({ ...prev, [name]: value }));
    if (errors?.[name]) setErrors(prev => ({ ...prev, [name]: null }));
  };

  const handleLogoChange = (e) => {
    const file = e?.target?.files?.[0];
    if (!file) return;
    setLogoFile(file);
    setLogoPreview(URL.createObjectURL(file));
  };

  const handlePhotosChange = (e) => {
    const files = Array.from(e?.target?.files || []);
    const combined = [...photoFiles, ...files]?.slice(0, 5);
    setPhotoFiles(combined);
    setPhotoPreviews(combined?.map(f => URL.createObjectURL(f)));
  };

  const removePhoto = (idx) => {
    const updated = photoFiles?.filter((_, i) => i !== idx);
    setPhotoFiles(updated);
    setPhotoPreviews(updated?.map(f => URL.createObjectURL(f)));
  };

  const validate = () => {
    const errs = {};
    if (!form?.name?.trim()) errs.name = 'El nombre es obligatorio.';
    if (!form?.phone?.trim()) errs.phone = 'El teléfono es obligatorio.';
    if (!form?.address?.trim()) errs.address = 'La dirección es obligatoria.';
    if (!form?.description?.trim()) errs.description = 'La descripción es obligatoria.';
    return errs;
  };

  const handleSubmit = async (e) => {
    e?.preventDefault();
    const errs = validate();
    if (Object.keys(errs)?.length > 0) { setErrors(errs); return; }
    setSaving(true);
    setSaveError(null);
    try {
      await onSave(business?.id, {
        name: form?.name?.trim(),
        phone: form?.phone?.trim(),
        address: form?.address?.trim(),
        description: form?.description?.trim(),
        whatsapp: form?.whatsapp?.trim() || null,
        redes_sociales: form?.redes_sociales?.trim() || null,
      }, logoFile, photoFiles);
    } catch (err) {
      setSaveError(err?.message || 'Error al guardar.');
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.5)' }}>
      <div className="bg-card rounded-xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-6 py-4 border-b border-border sticky top-0 bg-card z-10">
          <h3 className="font-heading font-semibold text-foreground">Editar negocio</h3>
          <button onClick={onClose} className="p-1.5 rounded hover:bg-muted transition-colors">
            <Icon name="X" size={18} color="currentColor" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {[['name', 'Nombre del negocio', 'text'], ['phone', 'Teléfono', 'tel'], ['address', 'Dirección', 'text'], ['whatsapp', 'WhatsApp (opcional)', 'text'], ['redes_sociales', 'Redes sociales (opcional)', 'text']]?.map(([field, label, type]) => (
            <div key={field}>
              <label className="block text-sm font-medium text-foreground mb-1">{label}</label>
              <input
                type={type}
                name={field}
                value={form?.[field]}
                onChange={handleChange}
                className={`w-full px-3 py-2 text-sm border rounded-md bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring ${errors?.[field] ? 'border-red-400' : 'border-border'}`}
              />
              {errors?.[field] && <p className="text-xs mt-1" style={{ color: 'var(--color-error)' }}>{errors?.[field]}</p>}
            </div>
          ))}

          <div>
            <label className="block text-sm font-medium text-foreground mb-1">Descripción</label>
            <textarea
              name="description"
              value={form?.description}
              onChange={handleChange}
              rows={3}
              className={`w-full px-3 py-2 text-sm border rounded-md bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring resize-none ${errors?.description ? 'border-red-400' : 'border-border'}`}
            />
            {errors?.description && <p className="text-xs mt-1" style={{ color: 'var(--color-error)' }}>{errors?.description}</p>}
          </div>

          {/* Logo */}
          <div>
            <label className="block text-sm font-medium text-foreground mb-1">Actualizar logo</label>
            <div onClick={() => logoRef?.current?.click()} className="border-2 border-dashed border-border rounded-lg p-3 text-center cursor-pointer hover:border-primary transition-colors">
              {logoPreview ? (
                <img src={logoPreview} alt="Logo" className="w-16 h-16 object-cover rounded mx-auto" />
              ) : (
                <p className="text-sm text-muted-foreground">Haz clic para cambiar logo</p>
              )}
            </div>
            <input ref={logoRef} type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={handleLogoChange} />
          </div>

          {/* Photos */}
          <div>
            <label className="block text-sm font-medium text-foreground mb-1">Agregar fotos</label>
            <div className="flex flex-wrap gap-2">
              {photoPreviews?.map((src, idx) => (
                <div key={idx} className="relative">
                  <img src={src} alt={`Foto ${idx + 1}`} className="w-16 h-16 object-cover rounded-lg" />
                  <button type="button" onClick={() => removePhoto(idx)} className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-red-500 text-white flex items-center justify-center">
                    <Icon name="X" size={10} color="white" />
                  </button>
                </div>
              ))}
              {photoFiles?.length < 5 && (
                <button type="button" onClick={() => photosRef?.current?.click()} className="w-16 h-16 border-2 border-dashed border-border rounded-lg flex items-center justify-center hover:border-primary transition-colors">
                  <Icon name="Plus" size={18} color="var(--color-muted-foreground)" />
                </button>
              )}
            </div>
            <input ref={photosRef} type="file" accept="image/jpeg,image/png,image/webp" multiple className="hidden" onChange={handlePhotosChange} />
          </div>

          {saveError && <p className="text-sm" style={{ color: 'var(--color-error)' }}>{saveError}</p>}

          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="flex-1 py-2.5 text-sm border border-border rounded-lg hover:bg-muted transition-colors">Cancelar</button>
            <button type="submit" disabled={saving} className="flex-1 py-2.5 text-sm text-white rounded-lg transition-colors disabled:opacity-50" style={{ background: 'var(--color-primary)' }}>
              {saving ? 'Guardando...' : 'Guardar cambios'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
