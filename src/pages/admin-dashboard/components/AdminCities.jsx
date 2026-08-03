import React, { useState, useEffect, useCallback } from 'react';
import Icon from 'components/AppIcon';
import AdminPageHeader from 'components/admin/AdminPageHeader';
import { cityAdminService } from '../../../services/cityAdminService';
import AdminCityForm from './AdminCityForm';

export default function AdminCities() {
  const [cities, setCities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [editingCommunityCityId, setEditingCommunityCityId] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setCities(await cityAdminService?.getAll());
    } catch (e) {
      setError(e?.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  if (editingCommunityCityId) {
    return (
      <AdminCityForm
        communityCityId={editingCommunityCityId}
        onClose={() => setEditingCommunityCityId(null)}
      />
    );
  }

  return (
    <div>
      <AdminPageHeader title="Ciudades" subtitle="Configuración de marca y contenido por ciudad" />
      {error && (
        <div className="mt-4 mb-4 p-3 rounded-md text-sm" style={{ background: '#fee2e2', color: 'var(--color-error)' }}>{error}</div>
      )}
      <div className="mt-4 overflow-x-auto rounded-lg border border-border">
        <table className="w-full text-sm">
          <thead className="bg-muted sticky top-[65px] z-40">
            <tr>
              <th className="text-left px-4 py-3 font-medium text-muted-foreground">Nombre</th>
              <th className="text-left px-4 py-3 font-medium text-muted-foreground">Slug</th>
              <th className="text-left px-4 py-3 font-medium text-muted-foreground hidden sm:table-cell">Estado</th>
              <th className="text-left px-4 py-3 font-medium text-muted-foreground hidden md:table-cell">Dominio(s)</th>
              <th className="text-left px-4 py-3 font-medium text-muted-foreground">Vínculo</th>
              <th className="text-right px-4 py-3 font-medium text-muted-foreground">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {loading ? (
              Array.from({ length: 3 })?.map((_, i) => (
                <tr key={i}><td colSpan={6} className="px-4 py-3"><div className="h-4 bg-muted rounded animate-pulse" /></td></tr>
              ))
            ) : cities?.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-12 text-center">
                  <div className="flex flex-col items-center gap-3">
                    <Icon name="MapPin" size={32} color="var(--color-muted-foreground)" />
                    <p className="text-muted-foreground">No hay ciudades registradas.</p>
                  </div>
                </td>
              </tr>
            ) : (
              cities?.map((c) => (
                <tr key={c?.communityCityId} className="hover:bg-muted/50 transition-colors">
                  <td className="px-4 py-3 font-medium text-foreground">{c?.nombre}</td>
                  <td className="px-4 py-3 text-muted-foreground font-mono text-xs">{c?.slug}</td>
                  <td className="px-4 py-3 hidden sm:table-cell text-muted-foreground text-sm">{c?.estado}</td>
                  <td className="px-4 py-3 hidden md:table-cell text-muted-foreground text-xs">
                    {c?.domains?.length ? c?.domains?.join(', ') : '—'}
                  </td>
                  <td className="px-4 py-3">
                    {c?.isLinked ? (
                      <span className="text-xs px-2 py-0.5 rounded-full font-medium" style={{ background: 'var(--color-success)15', color: 'var(--color-success)' }}>Vinculada</span>
                    ) : (
                      <span className="text-xs px-2 py-0.5 rounded-full bg-muted text-muted-foreground">Sin vincular</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button
                      onClick={() => setEditingCommunityCityId(c?.communityCityId)}
                      className="p-1.5 rounded hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
                    >
                      <Icon name="Pencil" size={15} color="currentColor" />
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
