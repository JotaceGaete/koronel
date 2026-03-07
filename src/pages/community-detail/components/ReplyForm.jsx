import React, { useState } from 'react';
import Icon from 'components/AppIcon';
import { communityService } from '../../../services/communityService';
import BusinessSearchDropdown from './BusinessSearchDropdown';

export default function ReplyForm({ postId, userId, onReplyAdded }) {
  const [body, setBody] = useState('');
  const [linkedBusiness, setLinkedBusiness] = useState(null);
  const [showSuggestForm, setShowSuggestForm] = useState(false);
  const [suggestData, setSuggestData] = useState({ business_name: '', category: '', phone: '', address: '' });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  const handleSubmit = async (e) => {
    e?.preventDefault();
    if (!body?.trim()) return;
    setSubmitting(true);
    setError(null);
    try {
      const { data: reply, error: replyErr } = await communityService?.createReply({
        postId,
        body,
        userId,
        linkedBusinessId: linkedBusiness?.id || null,
      });
      if (replyErr) throw replyErr;

      // Create suggested business if form is shown and has data
      if (showSuggestForm && suggestData?.business_name?.trim() && reply?.id) {
        await communityService?.createSuggestedBusiness({
          replyId: reply?.id,
          businessName: suggestData?.business_name,
          category: suggestData?.category,
          phone: suggestData?.phone,
          address: suggestData?.address,
          suggestedBy: userId,
        });
      }

      setBody('');
      setLinkedBusiness(null);
      setShowSuggestForm(false);
      setSuggestData({ business_name: '', category: '', phone: '', address: '' });
      onReplyAdded?.();
    } catch (e) {
      setError(e?.message || 'Error al enviar la respuesta');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-foreground mb-1.5">Tu respuesta</label>
        <textarea
          value={body}
          onChange={e => setBody(e?.target?.value)}
          placeholder="Escribe tu respuesta o recomendación..."
          rows={4}
          className="w-full px-4 py-2.5 text-sm border border-border rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring resize-none"
        />
      </div>

      {/* Link business */}
      <div>
        <p className="text-sm font-medium text-foreground mb-1.5 flex items-center gap-1.5">
          <Icon name="Building2" size={14} color="currentColor" />
          Vincular un negocio
          <span className="text-xs text-muted-foreground font-normal">(opcional)</span>
        </p>
        <BusinessSearchDropdown
          value={linkedBusiness}
          onChange={setLinkedBusiness}
          onClear={() => setLinkedBusiness(null)}
        />
      </div>

      {/* Suggest new business toggle */}
      <div>
        <button
          type="button"
          onClick={() => setShowSuggestForm(v => !v)}
          className="flex items-center gap-2 text-sm font-medium transition-colors"
          style={{ color: showSuggestForm ? 'var(--color-primary)' : 'var(--color-muted-foreground)' }}
        >
          <Icon name={showSuggestForm ? 'ChevronDown' : 'ChevronRight'} size={14} color="currentColor" />
          Sugerir un negocio nuevo
        </button>

        {showSuggestForm && (
          <div className="mt-3 p-4 rounded-lg border border-border bg-muted/30 space-y-3">
            <p className="text-xs text-muted-foreground">El negocio sugerido quedará pendiente de aprobación por el administrador.</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-foreground mb-1">Nombre del negocio *</label>
                <input
                  type="text"
                  value={suggestData?.business_name}
                  onChange={e => setSuggestData(p => ({ ...p, business_name: e?.target?.value }))}
                  placeholder="Nombre"
                  className="w-full px-3 py-2 text-sm border border-border rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-foreground mb-1">Categoría</label>
                <input
                  type="text"
                  value={suggestData?.category}
                  onChange={e => setSuggestData(p => ({ ...p, category: e?.target?.value }))}
                  placeholder="Ej: Restaurante"
                  className="w-full px-3 py-2 text-sm border border-border rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-foreground mb-1">Teléfono</label>
                <input
                  type="text"
                  value={suggestData?.phone}
                  onChange={e => setSuggestData(p => ({ ...p, phone: e?.target?.value }))}
                  placeholder="+56 9 XXXX XXXX"
                  className="w-full px-3 py-2 text-sm border border-border rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-foreground mb-1">Dirección</label>
                <input
                  type="text"
                  value={suggestData?.address}
                  onChange={e => setSuggestData(p => ({ ...p, address: e?.target?.value }))}
                  placeholder="Dirección en Coronel"
                  className="w-full px-3 py-2 text-sm border border-border rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                />
              </div>
            </div>
          </div>
        )}
      </div>

      {error && (
        <div className="p-3 rounded-lg text-sm" style={{ background: '#fee2e2', color: '#dc2626' }}>
          {error}
        </div>
      )}

      <button
        type="submit"
        disabled={submitting || !body?.trim()}
        className="w-full py-3 rounded-xl text-sm font-semibold text-white transition-all hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        style={{ background: 'var(--color-primary)' }}
      >
        {submitting ? (
          <><div className="w-4 h-4 rounded-full border-2 border-t-transparent animate-spin border-white" />Enviando...</>
        ) : (
          <><Icon name="Send" size={16} color="white" />Enviar respuesta</>
        )}
      </button>
    </form>
  );
}
