import React, { useState, useEffect } from 'react';
import Icon from 'components/AppIcon';
import { churchDetailsService } from '../../../services/eventService';
import { useAuth } from '../../../contexts/AuthContext';

export default function ChurchDetails({ businessId, canEdit: canEditProp }) {
  const { user } = useAuth();
  const [details, setDetails] = useState(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [canEdit, setCanEdit] = useState(canEditProp || false);
  const [form, setForm] = useState({
    pastorName: '',
    serviceSchedule: '',
    weeklyMessage: '',
  });

  useEffect(() => {
    if (!businessId) return;
    setLoading(true);
    churchDetailsService?.getByBusinessId(businessId)?.then(({ data }) => {
      if (data) {
        setDetails(data);
        setForm({
          pastorName: data?.pastor_name || '',
          serviceSchedule: data?.service_schedule || '',
          weeklyMessage: data?.weekly_message || '',
        });
      }
      setLoading(false);
    });
  }, [businessId]);

  useEffect(() => {
    if (canEditProp !== undefined) {
      setCanEdit(canEditProp);
      return;
    }
    if (!user?.id || !businessId) return;
    // Check if user is admin
    const isAdmin = user?.user_metadata?.role === 'admin' || user?.app_metadata?.role === 'admin';
    if (isAdmin) { setCanEdit(true); return; }
    // Check approved claim
    churchDetailsService?.hasApprovedClaim(businessId, user?.id)?.then(hasClaim => {
      setCanEdit(hasClaim);
    });
  }, [user?.id, businessId, canEditProp]);

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    try {
      const { data, error: err } = await churchDetailsService?.upsert(businessId, form);
      if (err) throw err;
      setDetails(data);
      setEditing(false);
    } catch (e) {
      setError(e?.message || 'Error al guardar');
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    setEditing(false);
    setError(null);
    setForm({
      pastorName: details?.pastor_name || '',
      serviceSchedule: details?.service_schedule || '',
      weeklyMessage: details?.weekly_message || '',
    });
  };

  if (loading) {
    return (
      <div className="bg-card border border-border rounded-lg p-4 md:p-5">
        <div className="h-4 bg-muted rounded animate-pulse w-1/3 mb-4" />
        <div className="space-y-2">
          <div className="h-3 bg-muted rounded animate-pulse" />
          <div className="h-3 bg-muted rounded animate-pulse w-2/3" />
        </div>
      </div>
    );
  }

  const hasData = details?.pastor_name || details?.service_schedule || details?.weekly_message;

  if (!hasData && !canEdit) return null;

  return (
    <div className="bg-card border border-border rounded-lg p-4 md:p-5">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Icon name="Church" size={18} color="var(--color-primary)" />
          <h3 className="font-heading font-semibold text-base text-foreground">Información Religiosa</h3>
        </div>
        {canEdit && !editing && (
          <button
            onClick={() => setEditing(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md border border-border hover:bg-muted transition-colors"
          >
            <Icon name="Pencil" size={13} color="currentColor" />
            Editar
          </button>
        )}
      </div>

      {editing ? (
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-foreground mb-1">Pastor / Líder</label>
            <input
              type="text"
              value={form?.pastorName}
              onChange={e => setForm(f => ({ ...f, pastorName: e?.target?.value }))}
              placeholder="Nombre del pastor o líder espiritual"
              className="w-full px-3 py-2 text-sm border border-border rounded-md bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-foreground mb-1">Horario de cultos</label>
            <textarea
              value={form?.serviceSchedule}
              onChange={e => setForm(f => ({ ...f, serviceSchedule: e?.target?.value }))}
              placeholder="Ej: Domingo 10:00 - Culto matutino&#10;Miércoles 19:30 - Estudio bíblico"
              rows={4}
              className="w-full px-3 py-2 text-sm border border-border rounded-md bg-background text-foreground resize-none focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-foreground mb-1">Mensaje semanal</label>
            <textarea
              value={form?.weeklyMessage}
              onChange={e => setForm(f => ({ ...f, weeklyMessage: e?.target?.value }))}
              placeholder="Comparte un mensaje o reflexión semanal para la comunidad..."
              rows={4}
              className="w-full px-3 py-2 text-sm border border-border rounded-md bg-background text-foreground resize-none focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>
          {error && <p className="text-sm" style={{ color: 'var(--color-error)' }}>{error}</p>}
          <div className="flex gap-3">
            <button
              type="button"
              onClick={handleCancel}
              className="flex-1 px-4 py-2 text-sm border border-border rounded-md hover:bg-muted transition-colors"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={saving}
              className="flex-1 px-4 py-2 text-sm text-white rounded-md transition-colors disabled:opacity-50"
              style={{ background: 'var(--color-primary)' }}
            >
              {saving ? 'Guardando...' : 'Guardar'}
            </button>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          {details?.pastor_name && (
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-full flex items-center justify-center shrink-0" style={{ background: 'var(--color-muted)' }}>
                <Icon name="User" size={15} color="var(--color-primary)" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Pastor / Líder</p>
                <p className="text-sm font-medium text-foreground">{details?.pastor_name}</p>
              </div>
            </div>
          )}
          {details?.service_schedule && (
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-full flex items-center justify-center shrink-0" style={{ background: 'var(--color-muted)' }}>
                <Icon name="Clock" size={15} color="var(--color-primary)" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Horario de cultos</p>
                <p className="text-sm text-foreground whitespace-pre-line">{details?.service_schedule}</p>
              </div>
            </div>
          )}
          {details?.weekly_message && (
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-full flex items-center justify-center shrink-0" style={{ background: 'var(--color-muted)' }}>
                <Icon name="MessageSquare" size={15} color="var(--color-primary)" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Mensaje semanal</p>
                <p className="text-sm text-foreground whitespace-pre-line">{details?.weekly_message}</p>
              </div>
            </div>
          )}
          {!hasData && canEdit && (
            <div className="text-center py-4">
              <p className="text-sm text-muted-foreground mb-3">Aún no hay información religiosa. ¡Sé el primero en completarla!</p>
              <button
                onClick={() => setEditing(true)}
                className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white rounded-md"
                style={{ background: 'var(--color-primary)' }}
              >
                <Icon name="Plus" size={15} color="white" />
                Agregar información
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
