import React, { useState, useEffect, useCallback } from 'react';
import Icon from 'components/AppIcon';
import { adminPopupService } from '../../../services/adminService';
import AdminPageHeader from 'components/admin/AdminPageHeader';

const EMPTY_FORM = { title: '', message: '', button_text: 'Explorar negocios', button_link: '/business-directory-listing', image_url: '', active: false, starts_at: '', ends_at: '' };

export default function AdminPopups() {
  const [popups, setPopups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [editItem, setEditItem] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [preview, setPreview] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setPopups(await adminPopupService?.getAll());
    } catch (e) {
      setError(e?.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const openCreate = () => { setEditItem(null); setForm(EMPTY_FORM); setShowForm(true); };
  const openEdit = (p) => {
    setEditItem(p);
    setForm({
      title: p?.title || '',
      message: p?.message || '',
      button_text: p?.button_text || 'Explorar negocios',
      button_link: p?.button_link || '',
      image_url: p?.image_url || '',
      active: p?.active ?? false,
      starts_at: p?.starts_at ? p?.starts_at?.slice(0, 16) : '',
      ends_at: p?.ends_at ? p?.ends_at?.slice(0, 16) : '',
    });
    setShowForm(true);
  };

  const handleSave = async (e) => {
    e?.preventDefault();
    setSaving(true);
    try {
      const payload = {
        ...form,
        starts_at: form?.starts_at || null,
        ends_at: form?.ends_at || null,
        image_url: form?.image_url || null,
      };
      if (editItem) {
        await adminPopupService?.update(editItem?.id, payload);
      } else {
        await adminPopupService?.create(payload);
      }
      setShowForm(false);
      load();
    } catch (e) {
      setError(e?.message);
    } finally {
      setSaving(false);
    }
  };

  const handleToggleActive = async (p) => {
    try {
      await adminPopupService?.update(p?.id, { active: !p?.active });
      load();
    } catch (e) {
      setError(e?.message);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('¿Eliminar este popup?')) return;
    try {
      await adminPopupService?.remove(id);
      load();
    } catch (e) {
      setError(e?.message);
    }
  };

  return (
    <div>
      <AdminPageHeader
        title="Popups del Sitio"
        actions={
          <button onClick={openCreate} className="flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium text-white transition-colors" style={{ background: 'var(--color-primary)' }}>
            <Icon name="Plus" size={16} color="white" /> Nuevo Popup
          </button>
        }
      />
      {error && <div className="mt-4 mb-4 p-3 rounded-md text-sm" style={{ background: '#fee2e2', color: 'var(--color-error)' }}>{error}</div>}
      <div className="mt-4 grid gap-4">
        {loading ? (
          Array.from({ length: 3 })?.map((_, i) => <div key={i} className="h-24 bg-muted rounded-lg animate-pulse" />)
        ) : popups?.length === 0 ? (
          <div className="py-12 text-center text-muted-foreground">
            <Icon name="MessageSquare" size={40} color="currentColor" className="mx-auto mb-3 opacity-40" />
            <p>No hay popups configurados</p>
          </div>
        ) : popups?.map(p => (
          <div key={p?.id} className="bg-card border border-border rounded-lg p-4">
            <div className="flex items-start justify-between gap-3">
              {p?.image_url && (
                <img src={p?.image_url} alt="" className="w-16 h-12 object-cover rounded-md shrink-0" />
              )}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${p?.active ? 'text-white' : 'bg-muted text-muted-foreground'}`} style={p?.active ? { background: '#22c55e' } : {}}>
                    {p?.active ? 'Activo' : 'Inactivo'}
                  </span>
                  {p?.starts_at && <span className="text-xs text-muted-foreground">Desde: {new Date(p.starts_at)?.toLocaleDateString('es-CL')}</span>}
                  {p?.ends_at && <span className="text-xs text-muted-foreground">Hasta: {new Date(p.ends_at)?.toLocaleDateString('es-CL')}</span>}
                </div>
                <h4 className="font-medium text-foreground">{p?.title}</h4>
                <p className="text-sm text-muted-foreground mt-0.5 line-clamp-2">{p?.message}</p>
                <p className="text-xs text-muted-foreground mt-1">Botón: <span className="font-medium">{p?.button_text}</span>{p?.button_link && ` → ${p?.button_link}`}</p>
              </div>
              <div className="flex items-center gap-1 shrink-0">
                <button onClick={() => setPreview(p)} className="p-1.5 rounded hover:bg-muted transition-colors text-muted-foreground" title="Vista previa">
                  <Icon name="Eye" size={15} color="currentColor" />
                </button>
                <button onClick={() => handleToggleActive(p)} className="p-1.5 rounded hover:bg-muted transition-colors text-muted-foreground">
                  <Icon name={p?.active ? 'EyeOff' : 'Eye'} size={15} color="currentColor" />
                </button>
                <button onClick={() => openEdit(p)} className="p-1.5 rounded hover:bg-muted transition-colors text-muted-foreground"><Icon name="Pencil" size={15} color="currentColor" /></button>
                <button onClick={() => handleDelete(p?.id)} className="p-1.5 rounded hover:bg-muted transition-colors" style={{ color: 'var(--color-error)' }}><Icon name="Trash2" size={15} color="currentColor" /></button>
              </div>
            </div>
          </div>
        ))}
      </div>
      {/* Preview Modal */}
      {preview && (
        <div className="fixed inset-0 z-[300] flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.6)' }}>
          <div className="bg-white rounded-3xl shadow-2xl w-full overflow-hidden" style={{ maxWidth: '420px', boxShadow: '0 25px 60px rgba(0,0,0,0.25)' }}>
            {preview?.image_url && (
              <div className="relative w-full" style={{ height: '200px' }}>
                <img src={preview?.image_url} alt="" className="w-full h-full object-cover" />
                <div className="absolute inset-x-0 bottom-0" style={{ height: '80px', background: 'linear-gradient(to top, rgba(255,255,255,1) 0%, rgba(255,255,255,0) 100%)' }} />
              </div>
            )}
            <div className="px-7 pb-7" style={{ paddingTop: preview?.image_url ? '0' : '28px' }}>
              <h3 className="text-2xl font-heading font-bold text-center mb-2" style={{ color: 'var(--color-foreground)' }}>{preview?.title}</h3>
              <p className="text-center text-sm mb-6" style={{ color: 'var(--color-muted-foreground)' }}>{preview?.message}</p>
              <div className="flex flex-col gap-3 mb-6">
                {[{ emoji: '📍', text: 'Encuentra negocios locales' }, { emoji: '🏷', text: 'Descubre ofertas y promociones' }, { emoji: '📣', text: 'Publica tu negocio o aviso' }]?.map((b, i) => (
                  <div key={i} className="flex items-center gap-3">
                    <span className="flex items-center justify-center shrink-0 text-lg" style={{ width: '40px', height: '40px', borderRadius: '12px', background: 'rgba(37,99,235,0.1)' }}>{b?.emoji}</span>
                    <span className="text-sm font-medium" style={{ color: 'var(--color-foreground)' }}>{b?.text}</span>
                  </div>
                ))}
              </div>
              <button onClick={() => setPreview(null)} className="w-full py-3.5 rounded-2xl text-white font-semibold text-base" style={{ background: 'linear-gradient(135deg, var(--color-primary) 0%, #1a3a5c 100%)', boxShadow: '0 4px 16px rgba(37,99,235,0.35)' }}>
                {preview?.button_text}
              </button>
              <button onClick={() => setPreview(null)} className="w-full mt-3 py-2 text-sm text-center" style={{ color: 'var(--color-muted-foreground)' }}>Explorar más tarde</button>
            </div>
          </div>
        </div>
      )}
      {/* Form Modal */}
      {showForm && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.5)' }}>
          <div className="bg-card rounded-xl shadow-xl w-full max-w-md max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between px-6 py-4 border-b border-border">
              <h3 className="font-heading font-semibold text-foreground">{editItem ? 'Editar Popup' : 'Nuevo Popup'}</h3>
              <button onClick={() => setShowForm(false)} className="p-1.5 rounded hover:bg-muted"><Icon name="X" size={18} color="currentColor" /></button>
            </div>
            <form onSubmit={handleSave} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">Título *</label>
                <input required value={form?.title} onChange={e => setForm(f => ({ ...f, title: e?.target?.value }))} className="w-full px-3 py-2 text-sm border border-border rounded-md bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring" />
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">Mensaje</label>
                <textarea rows={3} value={form?.message} onChange={e => setForm(f => ({ ...f, message: e?.target?.value }))} className="w-full px-3 py-2 text-sm border border-border rounded-md bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring" />
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">URL de imagen del popup</label>
                <input
                  type="url"
                  value={form?.image_url}
                  onChange={e => setForm(f => ({ ...f, image_url: e?.target?.value }))}
                  placeholder="https://ejemplo.com/imagen.jpg"
                  className="w-full px-3 py-2 text-sm border border-border rounded-md bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                />
                {form?.image_url && (
                  <img src={form?.image_url} alt="Vista previa" className="mt-2 w-full h-28 object-cover rounded-md border border-border" onError={e => { e.target.style.display = 'none'; }} />
                )}
                <p className="text-xs text-muted-foreground mt-1">Deja vacío para usar imagen predeterminada</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">Texto del botón</label>
                <input value={form?.button_text} onChange={e => setForm(f => ({ ...f, button_text: e?.target?.value }))} className="w-full px-3 py-2 text-sm border border-border rounded-md bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring" />
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">Enlace del botón</label>
                <input value={form?.button_link} onChange={e => setForm(f => ({ ...f, button_link: e?.target?.value }))} placeholder="/business-directory-listing" className="w-full px-3 py-2 text-sm border border-border rounded-md bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1">Fecha inicio</label>
                  <input type="datetime-local" value={form?.starts_at} onChange={e => setForm(f => ({ ...f, starts_at: e?.target?.value }))} className="w-full px-3 py-2 text-sm border border-border rounded-md bg-background text-foreground focus:outline-none" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1">Fecha fin</label>
                  <input type="datetime-local" value={form?.ends_at} onChange={e => setForm(f => ({ ...f, ends_at: e?.target?.value }))} className="w-full px-3 py-2 text-sm border border-border rounded-md bg-background text-foreground focus:outline-none" />
                </div>
              </div>
              <label className="flex items-center gap-2 text-sm text-foreground cursor-pointer">
                <input type="checkbox" checked={form?.active} onChange={e => setForm(f => ({ ...f, active: e?.target?.checked }))} className="rounded" />
                Activo
              </label>
              {error && <p className="text-sm" style={{ color: 'var(--color-error)' }}>{error}</p>}
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowForm(false)} className="flex-1 px-4 py-2 text-sm border border-border rounded-md hover:bg-muted transition-colors">Cancelar</button>
                <button type="submit" disabled={saving} className="flex-1 px-4 py-2 text-sm text-white rounded-md transition-colors disabled:opacity-50" style={{ background: 'var(--color-primary)' }}>{saving ? 'Guardando...' : 'Guardar'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
