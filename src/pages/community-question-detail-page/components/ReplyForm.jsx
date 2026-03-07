import React, { useState, useEffect } from 'react';
import Icon from 'components/AppIcon';
import Button from 'components/ui/Button';
import { supabase } from '../../../lib/supabase';

export default function ReplyForm({ postId, user, onReplySubmitted }) {
  const [body, setBody] = useState('');
  const [linkedBusinessId, setLinkedBusinessId] = useState('');
  const [businessSearch, setBusinessSearch] = useState('');
  const [businesses, setBusinesses] = useState([]);
  const [showSuggestForm, setShowSuggestForm] = useState(false);
  const [suggestData, setSuggestData] = useState({ business_name: '', category: '', phone: '', address: '' });
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    const fetchBusinesses = async () => {
      if (businessSearch?.trim()?.length < 2) { setBusinesses([]); return; }
      const { data } = await supabase
        ?.from('businesses')
        ?.select('id, name, category, address')
        ?.ilike('name', `%${businessSearch}%`)
        ?.limit(8);
      setBusinesses(data || []);
    };
    const timer = setTimeout(fetchBusinesses, 300);
    return () => clearTimeout(timer);
  }, [businessSearch]);

  const handleSubmit = async (e) => {
    e?.preventDefault();
    const errs = {};
    if (!body?.trim()) errs.body = 'La respuesta no puede estar vacía';
    if (body?.trim()?.length < 5) errs.body = 'La respuesta debe tener al menos 5 caracteres';
    if (showSuggestForm && !suggestData?.business_name?.trim()) errs.suggest_name = 'El nombre del negocio es obligatorio';
    if (showSuggestForm && !suggestData?.category?.trim()) errs.suggest_category = 'La categoría es obligatoria';
    if (Object.keys(errs)?.length > 0) { setErrors(errs); return; }

    setSubmitting(true);
    try {
      // Insert reply
      const { data: replyData, error: replyError } = await supabase
        ?.from('community_replies')
        ?.insert({
          post_id: postId,
          body: body?.trim(),
          user_id: user?.id,
          linked_business_id: linkedBusinessId || null,
          status: 'active',
        })
        ?.select('*, author:user_profiles(id, full_name, avatar_url), linked_business:businesses(id, name, category, address)')
        ?.single();
      if (replyError) throw replyError;

      // If suggest form is shown, create suggested business
      if (showSuggestForm && suggestData?.business_name?.trim()) {
        await supabase?.from('suggested_businesses')?.insert({
          reply_id: replyData?.id,
          business_name: suggestData?.business_name,
          category: suggestData?.category,
          phone: suggestData?.phone || null,
          address: suggestData?.address || null,
          suggested_by: user?.id,
          status: 'pending',
        });
      }

      setBody('');
      setLinkedBusinessId('');
      setBusinessSearch('');
      setBusinesses([]);
      setShowSuggestForm(false);
      setSuggestData({ business_name: '', category: '', phone: '', address: '' });
      setErrors({});
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
      onReplySubmitted?.(replyData);
    } catch (err) {
      setErrors({ submit: err?.message || 'Error al enviar la respuesta' });
    } finally {
      setSubmitting(false);
    }
  };

  if (!user) {
    return (
      <div className="bg-card border border-border rounded-xl p-5 text-center">
        <Icon name="MessageSquare" size={24} color="var(--color-muted-foreground)" className="mx-auto mb-2" />
        <p className="text-sm text-muted-foreground mb-3">Inicia sesión para responder</p>
        <a href="/login" className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium text-white" style={{ background: 'var(--color-primary)' }}>
          <Icon name="LogIn" size={14} color="white" />
          Iniciar sesión
        </a>
      </div>
    );
  }

  return (
    <div className="bg-card border border-border rounded-xl p-5">
      <h3 className="font-heading font-semibold text-foreground mb-4 flex items-center gap-2">
        <Icon name="Reply" size={18} color="var(--color-primary)" />
        Responder
      </h3>

      <form onSubmit={handleSubmit} noValidate className="space-y-4">
        {/* Body */}
        <div>
          <textarea
            value={body}
            onChange={e => { setBody(e?.target?.value); if (errors?.body) setErrors(p => ({ ...p, body: null })); }}
            placeholder="Escribe tu respuesta o recomendación..."
            rows={4}
            className="w-full px-3 py-2 text-sm border rounded-md bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring resize-none"
            style={{ borderColor: errors?.body ? 'var(--color-error)' : 'var(--color-border)' }}
          />
          {errors?.body && <p className="text-xs mt-1" style={{ color: 'var(--color-error)' }}>{errors?.body}</p>}
        </div>

        {/* Link Business */}
        <div>
          <label className="block text-sm font-medium text-foreground mb-1">Vincular un negocio (opcional)</label>
          <div className="relative">
            <Icon name="Search" size={14} color="currentColor" className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              value={businessSearch}
              onChange={e => { setBusinessSearch(e?.target?.value); setLinkedBusinessId(''); }}
              placeholder="Buscar negocio en el directorio..."
              className="w-full pl-9 pr-3 py-2 text-sm border border-border rounded-md bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>
          {businesses?.length > 0 && (
            <div className="mt-1 border border-border rounded-md bg-card shadow-md overflow-hidden">
              {businesses?.map(biz => (
                <button
                  key={biz?.id}
                  type="button"
                  onClick={() => { setLinkedBusinessId(biz?.id); setBusinessSearch(biz?.name); setBusinesses([]); }}
                  className={`w-full text-left px-3 py-2 text-sm hover:bg-muted transition-colors ${
                    linkedBusinessId === biz?.id ? 'bg-muted font-medium' : ''
                  }`}
                >
                  <span className="font-medium text-foreground">{biz?.name}</span>
                  {biz?.category && <span className="text-muted-foreground ml-2 text-xs">{biz?.category}</span>}
                </button>
              ))}
            </div>
          )}
          {linkedBusinessId && (
            <div className="flex items-center gap-2 mt-1.5">
              <Icon name="CheckCircle" size={13} color="#059669" />
              <span className="text-xs text-muted-foreground">Negocio vinculado: <strong>{businessSearch}</strong></span>
              <button type="button" onClick={() => { setLinkedBusinessId(''); setBusinessSearch(''); }} className="text-xs ml-auto" style={{ color: 'var(--color-error)' }}>Quitar</button>
            </div>
          )}
        </div>

        {/* Suggest New Business Toggle */}
        <div>
          <button
            type="button"
            onClick={() => setShowSuggestForm(v => !v)}
            className="flex items-center gap-2 text-sm font-medium transition-colors"
            style={{ color: 'var(--color-primary)' }}
          >
            <Icon name={showSuggestForm ? 'ChevronUp' : 'PlusCircle'} size={16} color="currentColor" />
            {showSuggestForm ? 'Cancelar sugerencia' : 'Sugerir un negocio nuevo'}
          </button>

          {showSuggestForm && (
            <div className="mt-3 p-4 rounded-lg border border-border space-y-3" style={{ background: 'var(--color-muted)' }}>
              <p className="text-xs text-muted-foreground">El negocio sugerido quedará pendiente de aprobación por el equipo.</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-foreground mb-1">Nombre <span style={{ color: 'var(--color-error)' }}>*</span></label>
                  <input
                    type="text"
                    value={suggestData?.business_name}
                    onChange={e => setSuggestData(p => ({ ...p, business_name: e?.target?.value }))}
                    placeholder="Nombre del negocio"
                    className="w-full px-3 py-1.5 text-sm border border-border rounded-md bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                    style={{ borderColor: errors?.suggest_name ? 'var(--color-error)' : 'var(--color-border)' }}
                  />
                  {errors?.suggest_name && <p className="text-xs mt-0.5" style={{ color: 'var(--color-error)' }}>{errors?.suggest_name}</p>}
                </div>
                <div>
                  <label className="block text-xs font-medium text-foreground mb-1">Categoría <span style={{ color: 'var(--color-error)' }}>*</span></label>
                  <input
                    type="text"
                    value={suggestData?.category}
                    onChange={e => setSuggestData(p => ({ ...p, category: e?.target?.value }))}
                    placeholder="Ej: Restaurante, Ferretería"
                    className="w-full px-3 py-1.5 text-sm border border-border rounded-md bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                    style={{ borderColor: errors?.suggest_category ? 'var(--color-error)' : 'var(--color-border)' }}
                  />
                  {errors?.suggest_category && <p className="text-xs mt-0.5" style={{ color: 'var(--color-error)' }}>{errors?.suggest_category}</p>}
                </div>
                <div>
                  <label className="block text-xs font-medium text-foreground mb-1">Teléfono</label>
                  <input
                    type="text"
                    value={suggestData?.phone}
                    onChange={e => setSuggestData(p => ({ ...p, phone: e?.target?.value }))}
                    placeholder="+56 9 XXXX XXXX"
                    className="w-full px-3 py-1.5 text-sm border border-border rounded-md bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-foreground mb-1">Dirección</label>
                  <input
                    type="text"
                    value={suggestData?.address}
                    onChange={e => setSuggestData(p => ({ ...p, address: e?.target?.value }))}
                    placeholder="Dirección del negocio"
                    className="w-full px-3 py-1.5 text-sm border border-border rounded-md bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                  />
                </div>
              </div>
            </div>
          )}
        </div>

        {success && (
          <div className="flex items-center gap-2 p-3 rounded-md text-sm" style={{ background: '#d1fae5', color: '#065f46' }}>
            <Icon name="CheckCircle" size={15} color="currentColor" />
            ¡Respuesta enviada exitosamente!
          </div>
        )}

        {errors?.submit && (
          <div className="p-3 rounded-md text-sm" style={{ background: '#fee2e2', color: '#dc2626' }}>
            {errors?.submit}
          </div>
        )}

        <Button
          type="submit"
          variant="default"
          disabled={submitting}
          iconName={submitting ? undefined : 'Send'}
          iconPosition="right"
          iconSize={15}
        >
          {submitting ? 'Enviando...' : 'Enviar respuesta'}
        </Button>
      </form>
    </div>
  );
}
