import React, { useState, useEffect, useCallback } from 'react';
import Icon from 'components/AppIcon';
import AdminPageHeader from 'components/admin/AdminPageHeader';
import { cityAdminService } from '../../../services/cityAdminService';

const EMPTY_FORM = {
  cityName: '',
  brandName: '',
  countryName: '',
  region: '',
  logoUrl: '',
  colorPrimary: '',
  seoDescription: '',
  heroTitle: '',
  heroSubtitle: '',
  searchPlaceholder: '',
  footerText: '',
};

function toForm(data) {
  return {
    cityName: data?.cityName || '',
    brandName: data?.brandName || '',
    countryName: data?.countryName || '',
    region: data?.region || '',
    logoUrl: data?.logoUrl || '',
    colorPrimary: data?.colorPrimary || '',
    seoDescription: data?.seoDescription || '',
    heroTitle: data?.heroTitle || '',
    heroSubtitle: data?.heroSubtitle || '',
    searchPlaceholder: data?.searchPlaceholder || '',
    footerText: data?.footerText || '',
  };
}

export default function AdminCityForm({ communityCityId, onClose }) {
  const [form, setForm] = useState(EMPTY_FORM);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState(null);
  const [savedMessage, setSavedMessage] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const data = await cityAdminService?.getById(communityCityId);
      setForm(toForm(data));
    } catch (e) {
      setLoadError(e?.message);
    } finally {
      setLoading(false);
    }
  }, [communityCityId]);

  useEffect(() => { load(); }, [load]);

  const handleChange = (field) => (e) => {
    const value = e?.target?.value;
    setForm((f) => ({ ...f, [field]: value }));
  };

  const handleSave = async (e) => {
    e?.preventDefault();
    setSaving(true);
    setSaveError(null);
    setSavedMessage(null);
    try {
      await cityAdminService?.update(communityCityId, form);
      // No asumir que la RPC devuelve toda la configuración: recargar desde
      // getById para que el formulario refleje el estado real guardado.
      const fresh = await cityAdminService?.getById(communityCityId);
      setForm(toForm(fresh));
      setSavedMessage('Cambios guardados correctamente.');
    } catch (e) {
      // Conservar lo escrito por el usuario: no recargar ni limpiar el
      // formulario cuando el guardado falla.
      setSaveError(e?.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      <AdminPageHeader
        title="Editar ciudad"
        subtitle="Marca, portada y textos visibles en el sitio"
        actions={
          <button
            onClick={onClose}
            className="flex items-center gap-2 px-3 py-2 rounded-md text-sm border border-border hover:bg-muted transition-colors"
          >
            <Icon name="ArrowLeft" size={15} color="currentColor" />
            Volver al listado
          </button>
        }
      />

      {loading ? (
        <div className="mt-6 flex items-center justify-center py-16">
          <div className="w-8 h-8 rounded-full border-2 border-t-transparent animate-spin" style={{ borderColor: 'var(--color-primary)', borderTopColor: 'transparent' }} />
        </div>
      ) : loadError ? (
        <div className="mt-6 p-4 rounded-md text-sm" style={{ background: '#fee2e2', color: 'var(--color-error)' }}>
          No se pudo cargar la ciudad: {loadError}
        </div>
      ) : (
        <form onSubmit={handleSave} className="mt-6 max-w-2xl space-y-8">
          <section className="space-y-4">
            <h3 className="font-heading font-semibold text-foreground text-sm uppercase tracking-wider text-muted-foreground">Identidad</h3>
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">Nombre de la ciudad</label>
              <input
                value={form?.cityName}
                onChange={handleChange('cityName')}
                className="w-full px-3 py-2 text-sm border border-border rounded-md bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">País</label>
              <input
                value={form?.countryName}
                onChange={handleChange('countryName')}
                className="w-full px-3 py-2 text-sm border border-border rounded-md bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">Región</label>
              <input
                value={form?.region}
                onChange={handleChange('region')}
                className="w-full px-3 py-2 text-sm border border-border rounded-md bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
          </section>

          <section className="space-y-4">
            <h3 className="font-heading font-semibold text-foreground text-sm uppercase tracking-wider text-muted-foreground">Marca</h3>
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">Nombre de marca</label>
              <input
                value={form?.brandName}
                onChange={handleChange('brandName')}
                className="w-full px-3 py-2 text-sm border border-border rounded-md bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">Logo (URL)</label>
              <input
                value={form?.logoUrl}
                onChange={handleChange('logoUrl')}
                className="w-full px-3 py-2 text-sm border border-border rounded-md bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">Color principal</label>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={form?.colorPrimary || '#6366f1'}
                  onChange={handleChange('colorPrimary')}
                  className="w-10 h-9 rounded border border-border cursor-pointer p-0.5"
                />
                <input
                  value={form?.colorPrimary}
                  onChange={handleChange('colorPrimary')}
                  placeholder="#6366f1"
                  className="flex-1 px-3 py-2 text-sm border border-border rounded-md bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring font-mono"
                />
              </div>
            </div>
          </section>

          <section className="space-y-4">
            <h3 className="font-heading font-semibold text-foreground text-sm uppercase tracking-wider text-muted-foreground">Textos</h3>
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">Descripción SEO</label>
              <textarea
                value={form?.seoDescription}
                onChange={handleChange('seoDescription')}
                rows={2}
                className="w-full px-3 py-2 text-sm border border-border rounded-md bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">Título de portada</label>
              <input
                value={form?.heroTitle}
                onChange={handleChange('heroTitle')}
                className="w-full px-3 py-2 text-sm border border-border rounded-md bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">Subtítulo de portada</label>
              <input
                value={form?.heroSubtitle}
                onChange={handleChange('heroSubtitle')}
                className="w-full px-3 py-2 text-sm border border-border rounded-md bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">Placeholder de búsqueda</label>
              <input
                value={form?.searchPlaceholder}
                onChange={handleChange('searchPlaceholder')}
                className="w-full px-3 py-2 text-sm border border-border rounded-md bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">Texto de pie de página</label>
              <input
                value={form?.footerText}
                onChange={handleChange('footerText')}
                className="w-full px-3 py-2 text-sm border border-border rounded-md bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
          </section>

          {saveError && (
            <p className="text-sm" style={{ color: 'var(--color-error)' }}>{saveError}</p>
          )}
          {savedMessage && (
            <p className="text-sm" style={{ color: 'var(--color-success)' }}>{savedMessage}</p>
          )}

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 text-sm border border-border rounded-md hover:bg-muted transition-colors"
            >
              Volver
            </button>
            <button
              type="submit"
              disabled={saving}
              className="flex-1 px-4 py-2 text-sm text-white rounded-md transition-colors disabled:opacity-50"
              style={{ background: 'var(--color-primary)' }}
            >
              {saving ? 'Guardando...' : 'Guardar'}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
