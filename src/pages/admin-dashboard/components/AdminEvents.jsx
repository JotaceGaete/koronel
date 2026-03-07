import React, { useState, useEffect, useCallback } from 'react';
import Icon from 'components/AppIcon';
import AdminPageHeader from 'components/admin/AdminPageHeader';
import { eventService } from '../../../services/eventService';

const STATUS_CONFIG = {
  pending: { label: 'Pendiente', color: '#d97706', bg: '#fef3c7' },
  approved: { label: 'Aprobado', color: '#059669', bg: '#d1fae5' },
  rejected: { label: 'Rechazado', color: '#dc2626', bg: '#fee2e2' },
  active: { label: 'Activo', color: '#059669', bg: '#d1fae5' },
};

const CATEGORY_LABELS = {
  church: 'Iglesia',
  courses: 'Cursos',
  meetups: 'Encuentros',
  other: 'Otro',
};

export default function AdminEvents() {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterCategory, setFilterCategory] = useState('all');
  const [actionLoading, setActionLoading] = useState(null);
  const [showDetail, setShowDetail] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { data, error: err } = await eventService?.adminGetAll({
        search,
        status: filterStatus !== 'all' ? filterStatus : undefined,
        category: filterCategory !== 'all' ? filterCategory : undefined,
      });
      if (err) throw err;
      setEvents(data || []);
    } catch (e) {
      setError(e?.message || 'Error al cargar eventos');
    } finally {
      setLoading(false);
    }
  }, [search, filterStatus, filterCategory]);

  useEffect(() => { load(); }, [load]);

  const handleStatusChange = async (id, status) => {
    setActionLoading(id + status);
    try {
      const { error: err } = await eventService?.updateStatus(id, status);
      if (err) throw err;
      setEvents(prev => prev?.map(e => e?.id === id ? { ...e, status } : e));
    } catch (e) {
      setError(e?.message || 'Error al actualizar estado');
    } finally {
      setActionLoading(null);
    }
  };

  const handleToggleFeatured = async (event) => {
    setActionLoading(event?.id + 'featured');
    try {
      const { error: err } = await eventService?.update(event?.id, { is_featured: !event?.is_featured });
      if (err) throw err;
      setEvents(prev => prev?.map(e => e?.id === event?.id ? { ...e, is_featured: !e?.is_featured } : e));
    } catch (e) {
      setError(e?.message || 'Error al actualizar destacado');
    } finally {
      setActionLoading(null);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('¿Eliminar este evento permanentemente?')) return;
    setActionLoading(id + 'delete');
    try {
      const { error: err } = await eventService?.delete(id);
      if (err) throw err;
      setEvents(prev => prev?.filter(e => e?.id !== id));
    } catch (e) {
      setError(e?.message || 'Error al eliminar evento');
    } finally {
      setActionLoading(null);
    }
  };

  const formatDate = (dtStr) => {
    if (!dtStr) return '—';
    try {
      return new Date(dtStr)?.toLocaleDateString('es-CL', { day: 'numeric', month: 'short', year: 'numeric' });
    } catch { return '—'; }
  };

  const pendingCount = events?.filter(e => e?.status === 'pending')?.length;

  return (
    <div>
      <AdminPageHeader
        title="Eventos"
        subtitle={pendingCount > 0 ? `${pendingCount} evento${pendingCount > 1 ? 's' : ''} pendiente${pendingCount > 1 ? 's' : ''} de aprobación` : undefined}
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <select
              value={filterStatus}
              onChange={e => setFilterStatus(e?.target?.value)}
              className="px-3 py-2 text-sm border border-border rounded-md bg-background text-foreground focus:outline-none"
            >
              <option value="all">Todos los estados</option>
              <option value="pending">Pendientes</option>
              <option value="approved">Aprobados</option>
              <option value="rejected">Rechazados</option>
              <option value="active">Activos</option>
            </select>
            <select
              value={filterCategory}
              onChange={e => setFilterCategory(e?.target?.value)}
              className="px-3 py-2 text-sm border border-border rounded-md bg-background text-foreground focus:outline-none"
            >
              <option value="all">Todas las categorías</option>
              <option value="church">Iglesia</option>
              <option value="courses">Cursos</option>
              <option value="meetups">Encuentros</option>
              <option value="farmacias">Farmacias</option>
              <option value="other">Otro</option>
            </select>
            {pendingCount > 0 && (
              <span className="inline-flex items-center justify-center min-w-[22px] h-5 px-1.5 rounded-full text-xs font-bold text-white" style={{ background: '#d97706' }}>
                {pendingCount}
              </span>
            )}
          </div>
        }
      />
      {/* Search */}
      <div className="mt-4 mb-4 relative">
        <Icon name="Search" size={16} color="currentColor" className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
        <input
          value={search}
          onChange={e => setSearch(e?.target?.value)}
          placeholder="Buscar evento..."
          className="w-full pl-9 pr-3 py-2 text-sm border border-border rounded-md bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
        />
      </div>
      {error && (
        <div className="mb-4 p-3 rounded-md text-sm" style={{ background: '#fee2e2', color: '#dc2626' }}>
          {error}
        </div>
      )}
      {/* Table */}
      <div className="overflow-x-auto rounded-lg border border-border">
        <table className="w-full text-sm">
          <thead className="bg-muted sticky top-[65px] z-40">
            <tr>
              <th className="text-left px-4 py-3 font-medium text-muted-foreground">Evento</th>
              <th className="text-left px-4 py-3 font-medium text-muted-foreground hidden md:table-cell">Categoría</th>
              <th className="text-left px-4 py-3 font-medium text-muted-foreground hidden lg:table-cell">Fecha</th>
              <th className="text-left px-4 py-3 font-medium text-muted-foreground hidden lg:table-cell">Autor</th>
              <th className="text-center px-4 py-3 font-medium text-muted-foreground">Estado</th>
              <th className="text-center px-4 py-3 font-medium text-muted-foreground hidden md:table-cell">Destacado</th>
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
            ) : events?.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-muted-foreground">
                  No se encontraron eventos
                </td>
              </tr>
            ) : events?.map(event => {
              const statusCfg = STATUS_CONFIG?.[event?.status] || STATUS_CONFIG?.pending;
              return (
                <tr key={event?.id} className="hover:bg-muted/50 transition-colors">
                  <td className="px-4 py-3">
                    <div className="font-medium text-foreground line-clamp-1">{event?.title}</div>
                    <div className="text-xs text-muted-foreground truncate">{event?.venue_name || event?.address || '—'}</div>
                  </td>
                  <td className="px-4 py-3 hidden md:table-cell text-muted-foreground">
                    {CATEGORY_LABELS?.[event?.category] || (event?.category
                      ? event?.category?.charAt(0)?.toUpperCase() + event?.category?.slice(1)
                      : '—')}
                  </td>
                  <td className="px-4 py-3 hidden lg:table-cell text-muted-foreground">
                    {formatDate(event?.start_datetime)}
                  </td>
                  <td className="px-4 py-3 hidden lg:table-cell text-muted-foreground">
                    {event?.user?.full_name || event?.user?.email || '—'}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span
                      className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium"
                      style={{ background: statusCfg?.bg, color: statusCfg?.color }}
                    >
                      {statusCfg?.label}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-center hidden md:table-cell">
                    <button
                      onClick={() => handleToggleFeatured(event)}
                      disabled={actionLoading === event?.id + 'featured'}
                      className="p-1.5 rounded hover:bg-muted transition-colors disabled:opacity-50"
                      title={event?.is_featured ? 'Quitar destacado' : 'Destacar'}
                      style={{ color: event?.is_featured ? '#d97706' : 'var(--color-muted-foreground)' }}
                    >
                      <Icon name={event?.is_featured ? 'Star' : 'StarOff'} size={15} color="currentColor" />
                    </button>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-1">
                      {event?.status !== 'approved' && event?.status !== 'active' && (
                        <button
                          onClick={() => handleStatusChange(event?.id, 'approved')}
                          disabled={actionLoading === event?.id + 'approved'}
                          className="p-1.5 rounded hover:bg-muted transition-colors disabled:opacity-50"
                          title="Aprobar"
                          style={{ color: '#059669' }}
                        >
                          <Icon name="CheckCircle" size={15} color="currentColor" />
                        </button>
                      )}
                      {event?.status !== 'rejected' && (
                        <button
                          onClick={() => handleStatusChange(event?.id, 'rejected')}
                          disabled={actionLoading === event?.id + 'rejected'}
                          className="p-1.5 rounded hover:bg-muted transition-colors disabled:opacity-50"
                          title="Rechazar"
                          style={{ color: '#d97706' }}
                        >
                          <Icon name="XCircle" size={15} color="currentColor" />
                        </button>
                      )}
                      <button
                        onClick={() => setShowDetail(event)}
                        className="p-1.5 rounded hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
                        title="Ver detalle"
                      >
                        <Icon name="Eye" size={15} color="currentColor" />
                      </button>
                      <button
                        onClick={() => handleDelete(event?.id)}
                        disabled={actionLoading === event?.id + 'delete'}
                        className="p-1.5 rounded hover:bg-muted transition-colors disabled:opacity-50"
                        title="Eliminar"
                        style={{ color: 'var(--color-error)' }}
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
      {/* Detail Modal */}
      {showDetail && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.5)' }}>
          <div className="bg-card rounded-xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between px-6 py-4 border-b border-border">
              <h3 className="font-heading font-semibold text-foreground">Detalle del Evento</h3>
              <button onClick={() => setShowDetail(null)} className="p-1.5 rounded hover:bg-muted">
                <Icon name="X" size={18} color="currentColor" />
              </button>
            </div>
            <div className="p-6 space-y-3">
              {showDetail?.image_url && (
                <img src={showDetail?.image_url} alt={showDetail?.title} className="w-full rounded-lg object-cover" style={{ maxHeight: '200px' }} />
              )}
              <div>
                <p className="text-xs text-muted-foreground">Título</p>
                <p className="font-medium text-foreground">{showDetail?.title}</p>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <p className="text-xs text-muted-foreground">Categoría</p>
                  <p className="text-sm text-foreground">{CATEGORY_LABELS?.[showDetail?.category] || showDetail?.category}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Estado</p>
                  <p className="text-sm text-foreground capitalize">{showDetail?.status}</p>
                </div>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Fecha inicio</p>
                <p className="text-sm text-foreground">{formatDate(showDetail?.start_datetime)}</p>
              </div>
              {showDetail?.venue_name && (
                <div>
                  <p className="text-xs text-muted-foreground">Lugar</p>
                  <p className="text-sm text-foreground">{showDetail?.venue_name}</p>
                </div>
              )}
              {(showDetail?.address_text || showDetail?.address) && (
                <div>
                  <p className="text-xs text-muted-foreground">Dirección</p>
                  <p className="text-sm text-foreground">{showDetail?.address_text || showDetail?.address}</p>
                </div>
              )}
              {showDetail?.description && (
                <div>
                  <p className="text-xs text-muted-foreground">Descripción</p>
                  <p className="text-sm text-foreground">{showDetail?.description}</p>
                </div>
              )}
              <div className="flex gap-2 pt-2">
                {showDetail?.status !== 'approved' && (
                  <button
                    onClick={() => { handleStatusChange(showDetail?.id, 'approved'); setShowDetail(null); }}
                    className="flex-1 py-2 rounded-lg text-sm font-medium text-white"
                    style={{ background: '#059669' }}
                  >
                    Aprobar
                  </button>
                )}
                {showDetail?.status !== 'rejected' && (
                  <button
                    onClick={() => { handleStatusChange(showDetail?.id, 'rejected'); setShowDetail(null); }}
                    className="flex-1 py-2 rounded-lg text-sm font-medium text-white"
                    style={{ background: '#dc2626' }}
                  >
                    Rechazar
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
