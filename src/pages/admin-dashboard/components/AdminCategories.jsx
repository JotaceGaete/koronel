import React, { useState, useEffect, useCallback } from 'react';
import Icon from 'components/AppIcon';
import AdminPageHeader from 'components/admin/AdminPageHeader';
import { adminCategoryService } from '../../../services/adminService';

const EMPTY_FORM = {
  name: '',
  name_key: '',
  parent_id: '',
  icon: '',
  color: '',
  sort_order: '',
  is_active: true,
};

function slugify(str) {
  return str
    ?.toLowerCase()
    ?.normalize('NFD')
    ?.replace(/[\u0300-\u036f]/g, '')
    ?.replace(/[^a-z0-9]+/g, '-')
    ?.replace(/^-+|-+$/g, '');
}

export default function AdminCategories() {
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [editItem, setEditItem] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [slugManual, setSlugManual] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setCategories(await adminCategoryService?.getAll());
    } catch (e) {
      setError(e?.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  // Build tree from flat list
  const parents = categories?.filter(c => !c?.parent_id);
  const getChildren = (parentId) => categories?.filter(c => c?.parent_id === parentId);

  const openCreate = () => {
    setEditItem(null);
    setForm(EMPTY_FORM);
    setSlugManual(false);
    setShowForm(true);
  };

  const openEdit = (c) => {
    setEditItem(c);
    setForm({
      name: c?.name || '',
      name_key: c?.name_key || '',
      parent_id: c?.parent_id || '',
      icon: c?.icon || '',
      color: c?.color || '',
      sort_order: c?.sort_order != null ? String(c?.sort_order) : '',
      is_active: c?.is_active !== false,
    });
    setSlugManual(true);
    setShowForm(true);
  };

  const handleNameChange = (e) => {
    const name = e?.target?.value;
    setForm(f => ({
      ...f,
      name,
      name_key: slugManual ? f?.name_key : slugify(name),
    }));
  };

  const handleSlugChange = (e) => {
    setSlugManual(true);
    setForm(f => ({ ...f, name_key: e?.target?.value }));
  };

  const handleSave = async (e) => {
    e?.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const payload = {
        name: form?.name?.trim(),
        name_key: form?.name_key?.trim(),
        parent_id: form?.parent_id || null,
        icon: form?.icon?.trim() || null,
        color: form?.color?.trim() || null,
        sort_order: form?.sort_order !== '' ? parseInt(form?.sort_order, 10) : 0,
        is_active: form?.is_active,
      };
      if (editItem) {
        await adminCategoryService?.update(editItem?.id, payload);
      } else {
        await adminCategoryService?.create(payload);
      }
      setShowForm(false);
      load();
    } catch (e) {
      setError(e?.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('¿Eliminar esta categoría? Las subcategorías quedarán sin padre.')) return;
    try {
      await adminCategoryService?.remove(id);
      load();
    } catch (e) {
      setError(e?.message);
    }
  };

  const handleResetAll = async () => {
    if (!window.confirm('¿Eliminar TODAS las categorías? Esta acción no se puede deshacer.')) return;
    try {
      for (const c of categories) {
        await adminCategoryService?.remove(c?.id);
      }
      load();
    } catch (e) {
      setError(e?.message);
    }
  };

  // Render a category row
  const renderRow = (c, isChild = false) => (
    <tr key={c?.id} className="hover:bg-muted/50 transition-colors">
      <td className="px-4 py-3">
        <div className="flex items-center gap-2">
          {isChild && <span className="text-muted-foreground ml-4 mr-1">↳</span>}
          {c?.icon && (
            <span className="inline-flex items-center justify-center w-6 h-6 rounded" style={{ background: c?.color ? `${c?.color}20` : 'var(--color-muted)' }}>
              <Icon name={c?.icon} size={14} color={c?.color || 'currentColor'} />
            </span>
          )}
          <span className={`font-medium text-foreground ${isChild ? 'text-sm' : ''}`}>{c?.name}</span>
          {!c?.is_active && (
            <span className="text-xs px-1.5 py-0.5 rounded bg-muted text-muted-foreground">Inactiva</span>
          )}
        </div>
      </td>
      <td className="px-4 py-3 text-muted-foreground font-mono text-xs">{c?.name_key}</td>
      <td className="px-4 py-3 hidden md:table-cell text-muted-foreground text-sm">
        {c?.parent_id
          ? <span className="text-xs px-2 py-0.5 rounded-full bg-muted text-muted-foreground">Subcategoría</span>
          : <span className="text-xs px-2 py-0.5 rounded-full font-medium" style={{ background: 'var(--color-primary)15', color: 'var(--color-primary)' }}>Principal</span>
        }
      </td>
      <td className="px-4 py-3 hidden sm:table-cell text-center text-muted-foreground text-sm">{c?.sort_order ?? 0}</td>
      <td className="px-4 py-3 text-right">
        <div className="flex items-center justify-end gap-1">
          <button onClick={() => openEdit(c)} className="p-1.5 rounded hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"><Icon name="Pencil" size={15} color="currentColor" /></button>
          <button onClick={() => handleDelete(c?.id)} className="p-1.5 rounded hover:bg-muted transition-colors" style={{ color: 'var(--color-error)' }}><Icon name="Trash2" size={15} color="currentColor" /></button>
        </div>
      </td>
    </tr>
  );

  return (
    <div>
      <AdminPageHeader
        title="Categorías"
        actions={
          <div className="flex items-center gap-2">
            <button
              onClick={openCreate}
              className="flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium text-white transition-colors"
              style={{ background: 'var(--color-primary)' }}
            >
              <Icon name="Plus" size={16} color="white" /> Nueva categoría
            </button>
          </div>
        }
      />
      {error && <div className="mt-4 mb-4 p-3 rounded-md text-sm" style={{ background: '#fee2e2', color: 'var(--color-error)' }}>{error}</div>}
      <div className="mt-4 overflow-x-auto rounded-lg border border-border">
        <table className="w-full text-sm">
          <thead className="bg-muted sticky top-[65px] z-40">
            <tr>
              <th className="text-left px-4 py-3 font-medium text-muted-foreground">Nombre</th>
              <th className="text-left px-4 py-3 font-medium text-muted-foreground">Clave/Slug</th>
              <th className="text-left px-4 py-3 font-medium text-muted-foreground hidden md:table-cell">Tipo</th>
              <th className="text-center px-4 py-3 font-medium text-muted-foreground hidden sm:table-cell">Orden</th>
              <th className="text-right px-4 py-3 font-medium text-muted-foreground">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {loading ? (
              Array.from({ length: 5 })?.map((_, i) => (
                <tr key={i}><td colSpan={5} className="px-4 py-3"><div className="h-4 bg-muted rounded animate-pulse" /></td></tr>
              ))
            ) : categories?.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-12 text-center">
                  <div className="flex flex-col items-center gap-3">
                    <Icon name="Tag" size={32} color="var(--color-muted-foreground)" />
                    <p className="text-muted-foreground">No hay categorías. Crea la primera.</p>
                    <button
                      onClick={openCreate}
                      className="px-4 py-2 rounded-md text-sm font-medium text-white"
                      style={{ background: 'var(--color-primary)' }}
                    >
                      Nueva categoría
                    </button>
                  </div>
                </td>
              </tr>
            ) : (
              parents?.map(parent => (
                <React.Fragment key={parent?.id}>
                  {renderRow(parent, false)}
                  {getChildren(parent?.id)?.map(child => renderRow(child, true))}
                </React.Fragment>
              ))
            )}
          </tbody>
        </table>
      </div>
      {/* Create / Edit Modal */}
      {showForm && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.5)' }}>
          <div className="bg-card rounded-xl shadow-xl w-full max-w-md max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between px-6 py-4 border-b border-border sticky top-0 bg-card">
              <h3 className="font-heading font-semibold text-foreground">{editItem ? 'Editar Categoría' : 'Nueva Categoría'}</h3>
              <button onClick={() => setShowForm(false)} className="p-1.5 rounded hover:bg-muted"><Icon name="X" size={18} color="currentColor" /></button>
            </div>
            <form onSubmit={handleSave} className="p-6 space-y-4">
              {/* Nombre */}
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">Nombre <span style={{ color: 'var(--color-error)' }}>*</span></label>
                <input
                  required
                  value={form?.name}
                  onChange={handleNameChange}
                  placeholder="Ej: Salud"
                  className="w-full px-3 py-2 text-sm border border-border rounded-md bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                />
              </div>

              {/* Clave/Slug */}
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">Clave / Slug <span style={{ color: 'var(--color-error)' }}>*</span></label>
                <input
                  required
                  value={form?.name_key}
                  onChange={handleSlugChange}
                  placeholder="ej: salud (auto-generado)"
                  className="w-full px-3 py-2 text-sm border border-border rounded-md bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring font-mono"
                />
                <p className="text-xs text-muted-foreground mt-1">Se genera automáticamente desde el nombre. Puedes editarlo.</p>
              </div>

              {/* Categoría padre */}
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">Categoría padre (opcional)</label>
                <select
                  value={form?.parent_id}
                  onChange={e => setForm(f => ({ ...f, parent_id: e?.target?.value }))}
                  className="w-full px-3 py-2 text-sm border border-border rounded-md bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                >
                  <option value="">— Sin padre (categoría principal) —</option>
                  {parents
                    ?.filter(p => p?.id !== editItem?.id)
                    ?.map(p => (
                      <option key={p?.id} value={p?.id}>{p?.name}</option>
                    ))}
                </select>
              </div>

              {/* Ícono */}
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">Ícono (nombre Lucide, opcional)</label>
                <input
                  value={form?.icon}
                  onChange={e => setForm(f => ({ ...f, icon: e?.target?.value }))}
                  placeholder="Ej: Heart, Car, Wrench"
                  className="w-full px-3 py-2 text-sm border border-border rounded-md bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                />
              </div>

              {/* Color */}
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">Color (hex, opcional)</label>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={form?.color || '#6366f1'}
                    onChange={e => setForm(f => ({ ...f, color: e?.target?.value }))}
                    className="w-10 h-9 rounded border border-border cursor-pointer p-0.5"
                  />
                  <input
                    value={form?.color}
                    onChange={e => setForm(f => ({ ...f, color: e?.target?.value }))}
                    placeholder="#EC4899"
                    className="flex-1 px-3 py-2 text-sm border border-border rounded-md bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring font-mono"
                  />
                </div>
              </div>

              {/* Orden */}
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">Orden (opcional)</label>
                <input
                  type="number"
                  min="0"
                  value={form?.sort_order}
                  onChange={e => setForm(f => ({ ...f, sort_order: e?.target?.value }))}
                  placeholder="0"
                  className="w-full px-3 py-2 text-sm border border-border rounded-md bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                />
              </div>

              {/* Activa */}
              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  id="is_active"
                  checked={form?.is_active}
                  onChange={e => setForm(f => ({ ...f, is_active: e?.target?.checked }))}
                  className="w-4 h-4 rounded border-border"
                />
                <label htmlFor="is_active" className="text-sm font-medium text-foreground cursor-pointer">Categoría activa</label>
              </div>

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
