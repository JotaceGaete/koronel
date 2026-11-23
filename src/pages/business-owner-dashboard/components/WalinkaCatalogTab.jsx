import React, { useCallback, useEffect, useState } from 'react';
import Icon from 'components/AppIcon';
import {
  walinkaService,
  walinkaErrorMessage,
  WALINKA_INFO_URL,
} from '../../../services/walinkaService';

/**
 * «Mi catálogo Walinka»: permite al propietario vincular uno de sus catálogos
 * Walinka a cada negocio propio. Toda la autorización ocurre en el servidor
 * (funciones RPC SECURITY DEFINER); aquí solo se presenta el estado.
 */
export default function WalinkaCatalogTab({ businesses }) {
  const [catalogs, setCatalogs] = useState([]);
  const [catalogsLoading, setCatalogsLoading] = useState(true);
  const [catalogsError, setCatalogsError] = useState(null);

  const loadCatalogs = useCallback(async () => {
    setCatalogsLoading(true);
    setCatalogsError(null);
    const { data, error } = await walinkaService.getMyCatalogs();
    if (error) setCatalogsError(walinkaErrorMessage(error));
    setCatalogs(data || []);
    setCatalogsLoading(false);
  }, []);

  useEffect(() => {
    loadCatalogs();
  }, [loadCatalogs]);

  if (!businesses?.length) {
    return (
      <div className="py-12 text-center text-sm text-muted-foreground">
        Primero registra un negocio para poder vincular tu catálogo Walinka.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div>
        <h2 className="font-heading font-semibold text-lg text-foreground">Mi catálogo Walinka</h2>
        <p className="text-sm text-muted-foreground mt-1">
          Vincula tu catálogo Walinka para que los visitantes de tu ficha puedan ver tus productos y pedir por WhatsApp.
        </p>
      </div>

      {catalogsError && (
        <div className="p-3 rounded-lg text-sm" style={{ background: '#fee2e2', color: '#991b1b' }}>
          {catalogsError}
        </div>
      )}

      {businesses.map((biz) => (
        <BusinessWalinkaCard
          key={biz?.id}
          business={biz}
          catalogs={catalogs}
          catalogsLoading={catalogsLoading}
          onChanged={loadCatalogs}
        />
      ))}
    </div>
  );
}

function BusinessWalinkaCard({ business, catalogs, catalogsLoading, onChanged }) {
  const [link, setLink] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState('');
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const [notice, setNotice] = useState(null);

  const loadStatus = useCallback(async () => {
    setLoading(true);
    setError(null);
    const { data, error: err } = await walinkaService.getLinkStatus(business?.id);
    if (err) setError(walinkaErrorMessage(err));
    setLink(data);
    setLoading(false);
  }, [business?.id]);

  useEffect(() => {
    loadStatus();
  }, [loadStatus]);

  const selectedCatalog = catalogs.find((c) => c.id === selected) || null;

  const handleLink = async () => {
    if (!selectedCatalog) return;
    setBusy(true);
    setError(null);
    setNotice(null);
    const { error: err } = await walinkaService.link(business.id, selectedCatalog.id);
    setBusy(false);
    setConfirming(false);
    if (err) {
      setError(walinkaErrorMessage(err));
      return;
    }
    setSelected('');
    setNotice('Catálogo vinculado correctamente.');
    await loadStatus();
    onChanged?.();
  };

  const handleUnlink = async () => {
    setBusy(true);
    setError(null);
    setNotice(null);
    const { error: err } = await walinkaService.unlink(business.id);
    setBusy(false);
    setConfirming(false);
    if (err) {
      setError(walinkaErrorMessage(err));
      return;
    }
    setNotice('Catálogo desvinculado.');
    await loadStatus();
    onChanged?.();
  };

  const notClaimed = business?.claimed !== true;

  return (
    <section
      className="bg-card border border-border rounded-xl p-4"
      aria-label={`Catálogo Walinka de ${business?.name}`}
      data-testid={`walinka-card-${business?.id}`}
    >
      <h3 className="font-heading font-semibold text-sm text-foreground mb-3">{business?.name}</h3>

      {error && (
        <p className="mb-3 p-2 rounded text-xs" style={{ background: '#fee2e2', color: '#991b1b' }} role="alert">
          {error}
        </p>
      )}
      {notice && (
        <p className="mb-3 p-2 rounded text-xs" style={{ background: '#dcfce7', color: '#166534' }} role="status">
          {notice}
        </p>
      )}

      {loading ? (
        <p className="text-sm text-muted-foreground">Cargando estado…</p>
      ) : link ? (
        <div className="space-y-3">
          <div className="flex items-center gap-2 text-sm">
            <Icon name="Link" size={16} color="var(--color-primary)" />
            <span>
              Vinculado a <strong>{link.walinka_name || 'tu catálogo Walinka'}</strong>
            </span>
          </div>
          {link.walinka_public_url ? (
            <a
              href={link.walinka_public_url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-sm underline"
              style={{ color: 'var(--color-primary)' }}
            >
              Ver catálogo
              <Icon name="ExternalLink" size={14} color="currentColor" />
            </a>
          ) : (
            <p className="text-xs" style={{ color: '#92400e' }}>
              El catálogo no está activo o no es público en Walinka, por lo que no se muestra en tu ficha.
            </p>
          )}
          {confirming ? (
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs text-muted-foreground">¿Desvincular este catálogo?</span>
              <button
                type="button"
                onClick={handleUnlink}
                disabled={busy}
                className="px-3 py-1.5 rounded-lg text-xs font-medium text-white disabled:opacity-50"
                style={{ background: '#dc2626' }}
              >
                {busy ? 'Desvinculando…' : 'Sí, desvincular'}
              </button>
              <button
                type="button"
                onClick={() => setConfirming(false)}
                disabled={busy}
                className="px-3 py-1.5 rounded-lg text-xs font-medium border border-border"
              >
                Cancelar
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setConfirming(true)}
              className="px-3 py-1.5 rounded-lg text-xs font-medium border border-border hover:bg-muted"
            >
              Desvincular
            </button>
          )}
        </div>
      ) : notClaimed ? (
        <p className="text-sm text-muted-foreground">
          Este negocio aún no figura como reclamado a tu nombre, por lo que no se puede vincular un catálogo.
        </p>
      ) : catalogsLoading ? (
        <p className="text-sm text-muted-foreground">Cargando tus catálogos…</p>
      ) : catalogs.length === 0 ? (
        <div className="text-sm text-muted-foreground space-y-2">
          <p>
            No tienes catálogos Walinka activos y públicos. Walinka te permite publicar un catálogo y recibir pedidos por WhatsApp.
          </p>
          <a
            href={WALINKA_INFO_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 underline"
            style={{ color: 'var(--color-primary)' }}
          >
            Conoce Walinka
            <Icon name="ExternalLink" size={14} color="currentColor" />
          </a>
        </div>
      ) : (
        <div className="space-y-3">
          <label className="block text-xs font-medium text-foreground" htmlFor={`walinka-select-${business.id}`}>
            Selecciona el catálogo que quieres asociar
          </label>
          <select
            id={`walinka-select-${business.id}`}
            value={selected}
            onChange={(e) => {
              setSelected(e.target.value);
              setConfirming(false);
            }}
            className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
          >
            <option value="">— Elegir catálogo —</option>
            {catalogs.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
          {selectedCatalog && !confirming && (
            <button
              type="button"
              onClick={() => setConfirming(true)}
              className="px-4 py-2 rounded-lg text-sm font-medium text-white"
              style={{ background: 'var(--color-primary)' }}
            >
              Vincular catálogo
            </button>
          )}
          {selectedCatalog && confirming && (
            <div className="space-y-2">
              <p className="text-xs text-muted-foreground">
                Tu ficha mostrará un botón hacia <strong>{selectedCatalog.public_url}</strong>. ¿Confirmas?
              </p>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={handleLink}
                  disabled={busy}
                  className="px-4 py-2 rounded-lg text-sm font-medium text-white disabled:opacity-50"
                  style={{ background: 'var(--color-primary)' }}
                >
                  {busy ? 'Vinculando…' : 'Confirmar vinculación'}
                </button>
                <button
                  type="button"
                  onClick={() => setConfirming(false)}
                  disabled={busy}
                  className="px-4 py-2 rounded-lg text-sm font-medium border border-border"
                >
                  Cancelar
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </section>
  );
}
