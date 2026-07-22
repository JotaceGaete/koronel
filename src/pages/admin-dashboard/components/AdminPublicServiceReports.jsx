import React, { useState, useEffect, useCallback } from 'react';
import Icon from 'components/AppIcon';
import { publicServicesService, PUBLIC_SERVICE_REPORT_STATUSES } from '../../../services/publicServicesService';

const STATUS_COLORS = {
  pending: '#f59e0b',
  reviewed: '#3b82f6',
  resolved: '#22c55e',
  dismissed: '#94a3b8',
};

function formatDate(value) {
  if (!value) return '—';
  try {
    return new Date(value)?.toLocaleDateString('es-CL', { day: 'numeric', month: 'short', year: 'numeric' });
  } catch {
    return '—';
  }
}

export default function AdminPublicServiceReports({ onEditService }) {
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filterStatus, setFilterStatus] = useState('pending');
  const [processing, setProcessing] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    const { data, error: err } = await publicServicesService?.adminGetReports({ status: filterStatus });
    if (err) setError(err?.message || 'No se pudieron cargar los reportes.');
    setReports(data || []);
    setLoading(false);
  }, [filterStatus]);

  useEffect(() => { load(); }, [load]);

  const handleStatusChange = async (id, status) => {
    setProcessing(id);
    const { error: err } = await publicServicesService?.adminUpdateReportStatus(id, status);
    if (err) {
      setError(err?.message || 'No se pudo actualizar el reporte.');
    } else {
      setReports(prev => prev?.filter(r => r?.id !== id || filterStatus === 'all'));
    }
    setProcessing(null);
  };

  return (
    <div>
      <div className="flex flex-wrap gap-2 mb-4">
        {['all', ...PUBLIC_SERVICE_REPORT_STATUSES?.map(s => s?.key)]?.map(s => (
          <button
            key={s}
            onClick={() => setFilterStatus(s)}
            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${filterStatus === s ? 'text-white' : 'bg-muted text-muted-foreground hover:bg-muted/80'}`}
            style={filterStatus === s ? { background: 'var(--color-primary)' } : {}}
          >
            {s === 'all' ? 'Todos' : PUBLIC_SERVICE_REPORT_STATUSES?.find(x => x?.key === s)?.label}
          </button>
        ))}
      </div>

      {error && (
        <div className="mb-4 p-3 rounded-md text-sm" style={{ background: '#fee2e2', color: 'var(--color-error)' }}>
          {error}
        </div>
      )}

      <div className="space-y-3">
        {loading ? (
          Array.from({ length: 3 })?.map((_, i) => (
            <div key={i} className="h-28 bg-muted rounded-lg animate-pulse" />
          ))
        ) : reports?.length === 0 ? (
          <div className="py-12 text-center text-muted-foreground">
            <Icon name="Inbox" size={40} color="currentColor" className="mx-auto mb-3 opacity-40" />
            <p>No hay reportes {filterStatus !== 'all' ? PUBLIC_SERVICE_REPORT_STATUSES?.find(s => s?.key === filterStatus)?.label?.toLowerCase() : ''}</p>
          </div>
        ) : reports?.map(report => (
          <div key={report?.id} className="bg-card border border-border rounded-lg p-4">
            <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1 flex-wrap">
                  <span
                    className="text-xs font-medium px-2 py-0.5 rounded-full text-white"
                    style={{ background: STATUS_COLORS?.[report?.status] || '#94a3b8' }}
                  >
                    {PUBLIC_SERVICE_REPORT_STATUSES?.find(s => s?.key === report?.status)?.label || report?.status}
                  </span>
                  <span className="text-xs text-muted-foreground">{formatDate(report?.created_at)}</span>
                  {report?.issue_type && (
                    <span className="text-xs px-2 py-0.5 rounded-full bg-muted text-muted-foreground">{report?.issue_type}</span>
                  )}
                </div>
                <h4 className="font-medium text-foreground">{report?.service?.name || 'Servicio eliminado'}</h4>
                <p className="text-sm text-foreground mt-1">{report?.message}</p>
                <div className="mt-2 text-xs text-muted-foreground space-y-0.5">
                  {report?.reporter_email && <p>Contacto: {report?.reporter_email}</p>}
                  {report?.source_url && (
                    <p>
                      Fuente:{' '}
                      <a href={report?.source_url} target="_blank" rel="noopener noreferrer" className="underline">
                        {report?.source_url}
                      </a>
                    </p>
                  )}
                </div>
              </div>
              <div className="flex flex-col gap-2 shrink-0 w-full sm:w-auto">
                <div className="flex gap-2">
                  {report?.service?.id && (
                    <a
                      href={`/servicios/${report?.service?.id}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md border border-border hover:bg-muted transition-colors"
                    >
                      <Icon name="ExternalLink" size={13} color="currentColor" /> Ver servicio
                    </a>
                  )}
                  {report?.service?.id && (
                    <button
                      onClick={() => onEditService?.(report?.service?.id)}
                      className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md border border-border hover:bg-muted transition-colors"
                    >
                      <Icon name="Pencil" size={13} color="currentColor" /> Editar ficha
                    </button>
                  )}
                </div>
                <div className="flex gap-2">
                  {report?.status !== 'reviewed' && (
                    <button
                      onClick={() => handleStatusChange(report?.id, 'reviewed')}
                      disabled={processing === report?.id}
                      className="flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white rounded-md transition-colors disabled:opacity-50"
                      style={{ background: '#3b82f6' }}
                    >
                      Revisado
                    </button>
                  )}
                  {report?.status !== 'resolved' && (
                    <button
                      onClick={() => handleStatusChange(report?.id, 'resolved')}
                      disabled={processing === report?.id}
                      className="flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white rounded-md transition-colors disabled:opacity-50"
                      style={{ background: '#22c55e' }}
                    >
                      Resuelto
                    </button>
                  )}
                  {report?.status !== 'dismissed' && (
                    <button
                      onClick={() => handleStatusChange(report?.id, 'dismissed')}
                      disabled={processing === report?.id}
                      className="flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white rounded-md transition-colors disabled:opacity-50"
                      style={{ background: '#94a3b8' }}
                    >
                      Descartar
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
