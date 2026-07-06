import React, { useState, useEffect, useCallback } from 'react';
import Icon from 'components/AppIcon';
import { adminClaimService } from '../../../services/adminService';
import AdminPageHeader from 'components/admin/AdminPageHeader';

const STATUS_LABELS = { pending: 'Pendiente', approved: 'Aprobado', rejected: 'Rechazado' };
const STATUS_COLORS = { pending: '#f59e0b', approved: '#22c55e', rejected: '#ef4444' };

export default function AdminClaimRequests() {
  const [claims, setClaims] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filterStatus, setFilterStatus] = useState('pending');
  const [processing, setProcessing] = useState(null);
  const [rejectingId, setRejectingId] = useState(null);
  const [rejectNote, setRejectNote] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setClaims(await adminClaimService?.getAll(filterStatus));
    } catch (e) {
      setError(e?.message);
    } finally {
      setLoading(false);
    }
  }, [filterStatus]);

  useEffect(() => { load(); }, [load]);

  const handleAction = async (id, status, adminNotes = null) => {
    setProcessing(id);
    try {
      await adminClaimService?.updateStatus(id, status, adminNotes);
      setRejectingId(null);
      setRejectNote('');
      load();
    } catch (e) {
      setError(e?.message);
    } finally {
      setProcessing(null);
    }
  };

  return (
    <div>
      <AdminPageHeader
        title="Solicitudes de Reclamación"
        actions={
          <div className="flex gap-2">
            {['', 'pending', 'approved', 'rejected']?.map(s => (
              <button key={s} onClick={() => setFilterStatus(s)} className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${filterStatus === s ? 'text-white' : 'bg-muted text-muted-foreground hover:bg-muted/80'}`} style={filterStatus === s ? { background: 'var(--color-primary)' } : {}}>
                {s === '' ? 'Todos' : STATUS_LABELS?.[s]}
              </button>
            ))}
          </div>
        }
      />
      {error && <div className="mt-4 mb-4 p-3 rounded-md text-sm" style={{ background: '#fee2e2', color: 'var(--color-error)' }}>{error}</div>}
      <div className="mt-4 space-y-3">
        {loading ? (
          Array.from({ length: 3 })?.map((_, i) => (
            <div key={i} className="h-24 bg-muted rounded-lg animate-pulse" />
          ))
        ) : claims?.length === 0 ? (
          <div className="py-12 text-center text-muted-foreground">
            <Icon name="Inbox" size={40} color="currentColor" className="mx-auto mb-3 opacity-40" />
            <p>No hay solicitudes {filterStatus ? STATUS_LABELS?.[filterStatus]?.toLowerCase() + 's' : ''}</p>
          </div>
        ) : claims?.map(claim => (
          <div key={claim?.id} className="bg-card border border-border rounded-lg p-4">
            <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-xs font-medium px-2 py-0.5 rounded-full text-white" style={{ background: STATUS_COLORS?.[claim?.claim_status] || '#94a3b8' }}>
                    {STATUS_LABELS?.[claim?.claim_status] || claim?.claim_status}
                  </span>
                  <span className="text-xs text-muted-foreground">{new Date(claim.created_at)?.toLocaleDateString('es-CL')}</span>
                </div>
                <h4 className="font-medium text-foreground">{claim?.business?.name || 'Negocio desconocido'}</h4>
                <p className="text-sm text-muted-foreground">{claim?.business?.category} · {claim?.business?.address}</p>
                <div className="mt-2 text-sm">
                  <span className="font-medium text-foreground">{claim?.claimant_name}</span>
                  <span className="text-muted-foreground"> · {claim?.claimant_email}</span>
                  {claim?.claimant_phone && <span className="text-muted-foreground"> · {claim?.claimant_phone}</span>}
                  {claim?.claimant_role && <span className="text-muted-foreground"> · {claim?.claimant_role}</span>}
                </div>
                {claim?.requester && (
                  <p className="text-xs text-muted-foreground">
                    Cuenta: {claim?.requester?.full_name || 'Sin nombre'} ({claim?.requester?.email})
                  </p>
                )}
                {claim?.evidence_notes && (
                  <p className="mt-2 text-xs text-muted-foreground bg-muted/60 rounded-md p-2">
                    <span className="font-medium text-foreground">Evidencia: </span>
                    {claim?.evidence_notes}
                  </p>
                )}
                {claim?.claim_status !== 'pending' && (claim?.admin_notes || claim?.reviewed_at) && (
                  <p className="mt-2 text-xs text-muted-foreground">
                    Revisado{claim?.reviewer?.full_name ? ` por ${claim?.reviewer?.full_name}` : ''}
                    {claim?.reviewed_at ? ` el ${new Date(claim.reviewed_at)?.toLocaleDateString('es-CL')}` : ''}
                    {claim?.admin_notes ? ` · Nota: ${claim?.admin_notes}` : ''}
                  </p>
                )}
              </div>
              {claim?.claim_status === 'pending' && (
                <div className="flex flex-col gap-2 shrink-0 items-end">
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleAction(claim?.id, 'approved')}
                      disabled={processing === claim?.id}
                      className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white rounded-md transition-colors disabled:opacity-50"
                      style={{ background: '#22c55e' }}
                    >
                      <Icon name="Check" size={14} color="white" /> Aprobar
                    </button>
                    <button
                      onClick={() => setRejectingId(rejectingId === claim?.id ? null : claim?.id)}
                      disabled={processing === claim?.id}
                      className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white rounded-md transition-colors disabled:opacity-50"
                      style={{ background: '#ef4444' }}
                    >
                      <Icon name="X" size={14} color="white" /> Rechazar
                    </button>
                  </div>
                  {rejectingId === claim?.id && (
                    <div className="w-full sm:w-64 flex flex-col gap-2">
                      <textarea
                        value={rejectNote}
                        onChange={(e) => setRejectNote(e?.target?.value)}
                        placeholder="Motivo del rechazo (opcional)"
                        rows={2}
                        className="w-full px-2 py-1.5 text-xs rounded-md border border-border bg-card text-foreground resize-none focus:outline-none focus:ring-2 focus:ring-ring"
                      />
                      <button
                        onClick={() => handleAction(claim?.id, 'rejected', rejectNote?.trim() || null)}
                        disabled={processing === claim?.id}
                        className="px-3 py-1.5 text-xs font-medium text-white rounded-md disabled:opacity-50"
                        style={{ background: '#ef4444' }}
                      >
                        Confirmar rechazo
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
