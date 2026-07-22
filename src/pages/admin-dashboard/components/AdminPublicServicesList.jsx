import React, { useState, useEffect, useCallback } from 'react';
import Icon from 'components/AppIcon';
import { publicServicesService, PUBLIC_SERVICE_CATEGORIES, getPublicServiceCategoryLabel } from '../../../services/publicServicesService';
import AdminPublicServiceForm from './AdminPublicServiceForm';

function formatDate(value) {
  if (!value) return '—';
  try {
    return new Date(value)?.toLocaleDateString('es-CL', { day: 'numeric', month: 'short', year: 'numeric' });
  } catch {
    return '—';
  }
}

export default function AdminPublicServicesList({ focusServiceId, onFocusHandled }) {
  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState('');
  const [filterCategory, setFilterCategory] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [actionLoading, setActionLoading] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [editItem, setEditItem] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    const { data, error: err } = await publicServicesService?.adminGetAll({
      search,
      categoryKey: filterCategory,
      status: filterStatus,
    });
    if (err) setError(err?.message || 'No se pudieron cargar los servicios.');
    setServices(data || []);
    setLoading(false);
  }, [search, filterCategory, filterStatus]);

  useEffect(() => { load(); }, [load]);

  // Si venimos desde Reportes con "Editar ficha", abrimos el formulario
  // directo apenas tengamos los datos del servicio.
  useEffect(() => {
    if (!focusServiceId || loading) return;
    const target = services?.find(s => s?.id === focusServiceId);
    if (target) {
      setEditItem(target);
      setShowForm(true);
      onFocusHandled?.();
    }
  }, [focusServiceId, loading, services, onFocusHandled]);

  const openCreate = () => {
    setEditItem(null);
    setShowForm(true);
  };

  const openEdit = (service) => {
    setEditItem(service);
    setShowForm(true);
  };

  const handleSaved = () => {
    setShowForm(false);
    setEditItem(null);
    load();
  };

  const handleToggleActive = async (service) => {
    setActionLoading(service?.id + 'active');
    const isActive = service?.status === 'published';
    const { error: err } = await publicServicesService?.adminSetActive(service?.id, !isActive);
    if (err) {
      setError(err?.message || 'No se pudo cambiar el estado.');
    } else {
      setServices(prev => prev?.map(s => s?.id === service?.id ? { ...s, status: isActive ? 'draft' : 'published' } : s));
    }
    setActionLoading(null);
  };

  const handleDeleteConfirmed = async () => {
    if (!deleteTarget) return;
    setActionLoading(deleteTarget?.id + 'delete');
    const { error: err } = await publicServicesService?.adminDelete(deleteTarget?.id);
    setActionLoading(null);
    if (err) {
      setError(err?.message || 'No se pudo eliminar el servicio.');
      setDeleteTarget(null);
      return;
    }
    setServices(prev => prev?.filter(s => s?.id !== deleteTarget?.id));
    setDeleteTarget(null);
  };

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
        <div className="flex-1 relative max-w-sm">
          <Icon name="Search" size={16} color="currentColor" className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            value={search}
            onChange={e => setSearch(e?.target?.value)}
            placeholder="Buscar por nombre..."
            className="w-full pl-9 pr-3 py-2 text-sm border border-border rounded-md bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
          />
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <select
            value={filterCategory}
            onChange={e => setFilterCategory(e?.target?.value)}
            className="px-3 py-2 text-sm border border-border rounded-md bg-background text-foreground focus:outline-none"
          >
            <option value="all">Todas las categorías</option>
            {PUBLIC_SERVICE_CATEGORIES?.map(c => (
              <option key={c?.key} value={c?.key}>{c?.label}</option>
            ))}
          </select>
          <select
            value={filterStatus}
            onChange={e => setFilterStatus(e?.target?.value)}
            className="px-3 py-2 text-sm border border-border rounded-md bg-background text-foreground focus:outline-none"
          >
            <option value="all">Todos los estados</option>
            <option value="published">Activos</option>
            <option value="draft">Inactivos</option>
          </select>
          <button
            onClick={openCreate}
            className="flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium text-white transition-colors"
            style={{ background: 'var(--color-primary)' }}
          >
            <Icon name="Plus" size={16} color="white" /> Agregar servicio
          </button>
        </div>
      </div>

      {error && (
        <div className="mb-4 p-3 rounded-md text-sm" style={{ background: '#fee2e2', color: 'var(--color-error)' }}>
          {error}
        </div>
      )}

      <div className="overflow-x-auto rounded-lg border border-border">
        <table className="w-full text-sm">
          <thead className="bg-muted">
            <tr>
              <th className="text-left px-4 py-3 font-medium text-muted-foreground">Nombre</th>
              <th className="text-left px-4 py-3 font-medium text-muted-foreground hidden md:table-cell">Categoría</th>
              <th className="text-left px-4 py-3 font-medium text-muted-foreground hidden lg:table-cell">Dirección</th>
              <th className="text-center px-4 py-3 font-medium text-muted-foreground">Estado</th>
              <th className="text-left px-4 py-3 font-medium text-muted-foreground hidden lg:table-cell">Verificado</th>
              <th className="text-left px-4 py-3 font-medium text-muted-foreground hidden lg:table-cell">Actualizado</th>
              <th className="text-right px-4 py-3 font-medium text-muted-foreground">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {loading ? (
              Array.from({ length: 5 })?.map((_, i) => (
                <tr key={i}>
                  <td colSpan={7} className="px-4 py-3">
                    <div className="h-4 bg-muted rounded animate-pulse" />
                  </td>
                </tr>
              ))
            ) : services?.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-4 py-12 text-center">
                  <div className="flex flex-col items-center gap-3">
                    <Icon name="Landmark" size={32} color="var(--color-muted-foreground)" />
                    <p className="text-muted-foreground">No se encontraron servicios.</p>
                  </div>
                </td>
              </tr>
            ) : services?.map(service => {
              const isActive = service?.status === 'published';
              return (
                <tr key={service?.id} className="hover:bg-muted/50 transition-colors">
                  <td className="px-4 py-3">
                    <div className="font-medium text-foreground">{service?.name}</div>
                    <div className="text-xs text-muted-foreground">{service?.institution_type}</div>
                  </td>
                  <td className="px-4 py-3 hidden md:table-cell text-muted-foreground">
                    {getPublicServiceCategoryLabel(service?.category_key)}
                  </td>
                  <td className="px-4 py-3 hidden lg:table-cell text-muted-foreground truncate max-w-[220px]">
                    {service?.address || '—'}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span
                      className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium"
                      style={isActive ? { background: '#d1fae5', color: '#059669' } : { background: 'var(--color-muted)', color: 'var(--color-muted-foreground)' }}
                    >
                      {isActive ? 'Activo' : 'Inactivo'}
                    </span>
                  </td>
                  <td className="px-4 py-3 hidden lg:table-cell text-muted-foreground">
                    {formatDate(service?.verified_at)}
                  </td>
                  <td className="px-4 py-3 hidden lg:table-cell text-muted-foreground">
                    {formatDate(service?.updated_at)}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-1">
                      <button
                        onClick={() => openEdit(service)}
                        className="p-1.5 rounded hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
                        title="Editar"
                      >
                        <Icon name="Pencil" size={15} color="currentColor" />
                      </button>
                      <button
                        onClick={() => handleToggleActive(service)}
                        disabled={actionLoading === service?.id + 'active'}
                        className="p-1.5 rounded hover:bg-muted transition-colors disabled:opacity-50"
                        title={isActive ? 'Desactivar' : 'Activar'}
                        style={{ color: isActive ? '#d97706' : '#059669' }}
                      >
                        <Icon name={isActive ? 'ToggleRight' : 'ToggleLeft'} size={17} color="currentColor" />
                      </button>
                      <button
                        onClick={() => setDeleteTarget(service)}
                        className="p-1.5 rounded hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
                        title="Eliminar"
                      >
                        <Icon name="Trash2" size={15} color="currentColor" />
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {showForm && (
        <AdminPublicServiceForm
          service={editItem}
          onClose={() => { setShowForm(false); setEditItem(null); }}
          onSaved={handleSaved}
        />
      )}

      {deleteTarget && (
        <DeleteServiceConfirm
          service={deleteTarget}
          busy={actionLoading === deleteTarget?.id + 'delete'}
          onCancel={() => setDeleteTarget(null)}
          onConfirm={handleDeleteConfirmed}
        />
      )}
    </div>
  );
}

// Confirmación reforzada: eliminar es la acción secundaria y poco frecuente
// (la recomendada para el uso normal es Desactivar, que no borra nada). Para
// evitar un clic accidental, hay que escribir el nombre exacto del servicio.
function DeleteServiceConfirm({ service, busy, onCancel, onConfirm }) {
  const [confirmText, setConfirmText] = useState('');
  const canConfirm = confirmText?.trim() === service?.name?.trim();

  return (
    <div className="fixed inset-0 z-[210] flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.5)' }}>
      <div className="bg-card rounded-xl shadow-xl w-full max-w-md">
        <div className="px-6 py-4 border-b border-border">
          <h3 className="font-heading font-semibold text-foreground flex items-center gap-2">
            <Icon name="AlertTriangle" size={18} color="var(--color-error)" />
            Eliminar definitivamente
          </h3>
        </div>
        <div className="p-6 space-y-3">
          <p className="text-sm text-foreground">
            Vas a eliminar <strong>{service?.name}</strong> de forma permanente. Esta acción no se puede deshacer.
          </p>
          <p className="text-sm text-muted-foreground">
            Si solo quieres que deje de aparecer en <code>/servicios</code>, usa <strong>Desactivar</strong> en su lugar —
            conserva el historial y sus reportes.
          </p>
          <p className="text-sm text-muted-foreground">
            Si tiene reportes de corrección asociados, la eliminación será rechazada; resuélvelos o descártalos primero.
          </p>
          <div>
            <label className="block text-sm font-medium text-foreground mb-1">
              Escribe <span className="font-mono">{service?.name}</span> para confirmar
            </label>
            <input
              value={confirmText}
              onChange={e => setConfirmText(e?.target?.value)}
              className="w-full px-3 py-2 text-sm border border-border rounded-md bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>
          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onCancel}
              className="flex-1 px-4 py-2 text-sm border border-border rounded-md hover:bg-muted transition-colors"
            >
              Cancelar
            </button>
            <button
              type="button"
              disabled={!canConfirm || busy}
              onClick={onConfirm}
              className="flex-1 px-4 py-2 text-sm text-white rounded-md transition-colors disabled:opacity-50"
              style={{ background: 'var(--color-error)' }}
            >
              {busy ? 'Eliminando...' : 'Eliminar definitivamente'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
