import React, { useState, useEffect, useCallback, useRef } from 'react';
import Icon from 'components/AppIcon';
import Button from 'components/ui/Button';
import { walinkaLinkService } from '../../../services/walinkaLinkService';
import WalinkaConnectModal from './WalinkaConnectModal';

/** Solo http/https se renderizan como enlace — nunca un esquema arbitrario devuelto por el backend. */
function isSafePublicUrl(url) {
  if (!url) return false;
  try {
    const parsed = new URL(url);
    return parsed?.protocol === 'http:' || parsed?.protocol === 'https:';
  } catch {
    return false;
  }
}

export default function WalinkaSection({ business }) {
  const businessId = business?.id || null;
  const [link, setLink] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [confirmingRevoke, setConfirmingRevoke] = useState(false);
  const [revoking, setRevoking] = useState(false);
  const openButtonRef = useRef(null);
  const headingRef = useRef(null);

  /** Devuelve el foco al botón que abrió el modal si sigue en pantalla; si
   * el estado cambió (p. ej. tras vincular, el botón "Vincular catálogo"
   * desaparece), cae al encabezado de la sección para no perder el foco. */
  const restoreFocus = useCallback(() => {
    if (openButtonRef?.current && document.contains(openButtonRef?.current)) {
      openButtonRef?.current?.focus?.();
    } else {
      headingRef?.current?.focus?.();
    }
  }, []);

  const loadStatus = useCallback(async () => {
    if (!businessId) return;
    setLoading(true);
    setError(null);
    const { data, error: err } = await walinkaLinkService?.getLinkStatus(businessId);
    if (err) {
      setError(err);
    } else {
      setLink(data);
    }
    setLoading(false);
  }, [businessId]);

  useEffect(() => {
    if (!businessId) {
      setLoading(false);
      return;
    }
    loadStatus();
  }, [businessId, loadStatus]);

  const isConnected = link?.status === 'connected';

  const handleLinked = async () => {
    setShowModal(false);
    // requestLink() solo confirma la fila (sin nombre/URL/dominio del
    // catálogo) — se necesita un refresco a getLinkStatus() para mostrar
    // el catálogo enriquecido antes de decir "Conectado".
    await loadStatus();
    restoreFocus();
  };

  const handleRevoke = async () => {
    setRevoking(true);
    setError(null);
    const { data, error: err } = await walinkaLinkService?.revokeLink(businessId);
    setRevoking(false);
    setConfirmingRevoke(false);
    if (err) {
      setError(err);
      return;
    }
    // El resultado de revokeLink() ya trae connection_status: 'revoked' —
    // no hace falta otro round-trip a getLinkStatus() para mostrar "No
    // conectado".
    setLink(data);
  };

  if (!businessId) return null;

  return (
    <div className="border-t border-border p-4">
      <h4 ref={headingRef} tabIndex={-1} className="font-heading font-semibold text-sm text-foreground mb-2 flex items-center gap-1.5 outline-none">
        <Icon name="Link2" size={14} color="currentColor" />
        Walinka
      </h4>

      {loading ? (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <div className="w-4 h-4 border-2 border-t-transparent rounded-full animate-spin" style={{ borderColor: 'var(--color-primary)', borderTopColor: 'transparent' }} />
          Verificando vínculo con Walinka…
        </div>
      ) : error ? (
        <div className="text-sm">
          <p className="mb-2" style={{ color: 'var(--color-error)' }}>{error?.message}</p>
          <Button variant="outline" size="sm" onClick={loadStatus}>Reintentar</Button>
        </div>
      ) : isConnected ? (
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <Icon name="BadgeCheck" size={16} color="var(--color-success)" />
            <span className="text-sm font-medium text-foreground">{link?.catalog?.name || 'Catálogo Walinka'}</span>
            {link?.catalog?.usesCustomDomain && (
              <span className="text-xs font-medium px-1.5 py-0.5 rounded-full bg-muted text-muted-foreground">Dominio propio</span>
            )}
          </div>

          {!confirmingRevoke ? (
            <div className="flex gap-2">
              {isSafePublicUrl(link?.catalog?.publicUrl) && (
                <a
                  href={link?.catalog?.publicUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-1 flex items-center justify-center gap-1.5 py-2 text-sm font-medium rounded-lg text-white transition-colors"
                  style={{ background: 'var(--color-primary)' }}
                >
                  <Icon name="ExternalLink" size={14} color="white" />
                  Ver catálogo
                </a>
              )}
              <Button variant="outline" size="sm" onClick={() => setConfirmingRevoke(true)} disabled={revoking}>
                Desvincular
              </Button>
            </div>
          ) : (
            <div className="p-2.5 rounded-lg bg-muted space-y-2">
              <p className="text-xs text-muted-foreground">¿Desvincular este catálogo de Walinka?</p>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={() => setConfirmingRevoke(false)} disabled={revoking}>
                  Cancelar
                </Button>
                <Button variant="destructive" size="sm" loading={revoking} onClick={handleRevoke}>
                  Desvincular
                </Button>
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="flex items-center justify-between gap-2">
          <span className="text-sm text-muted-foreground">No conectado con Walinka</span>
          <Button ref={openButtonRef} variant="outline" size="sm" iconName="Link2" iconPosition="left" iconSize={14} onClick={() => setShowModal(true)}>
            Vincular catálogo
          </Button>
        </div>
      )}

      {showModal && (
        <WalinkaConnectModal
          businessId={businessId}
          onClose={() => {
            setShowModal(false);
            restoreFocus();
          }}
          onLinked={handleLinked}
        />
      )}
    </div>
  );
}
