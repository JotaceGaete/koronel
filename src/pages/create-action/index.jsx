// Route: /crecer/nueva  — Asistente conversacional (protected)
// Flow: Conversación → Sugerencia → Edición rápida → Celebración
import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import Header from 'components/ui/Header';
import PageMeta from 'components/PageMeta';
import Icon from 'components/AppIcon';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';
import { businessService } from '../../services/businessService';
import { actionService } from '../../services/actionService';
import { pulseService } from '../../services/pulseService';
import { loadPrefs, savePrefs, endsAtFromDays } from '../../lib/merchantPrefs';
import ConversationStep from './steps/ConversationStep';
import SuggestionStep from './steps/SuggestionStep';
import QuickEditStep from './steps/QuickEditStep';
import SuccessScreen from './SuccessScreen';

// ── Steps ────────────────────────────────────────────────────────────────────
const STEP = { CONVERSATION: 0, SUGGESTION: 1, EDIT: 2, SUCCESS: 3 };

function buildDefaultForm(suggestion, prefs) {
  const durationDays = prefs?.duration_days || 7;
  return {
    action_type:    suggestion?.type || 'offer',
    title:          '',
    headline:       '',
    description:    '',
    discount_type:  prefs?.discount_type || null,
    original_price: '',
    promo_price:    '',
    promo_code:     '',
    starts_at:      new Date().toISOString(),
    ends_at:        endsAtFromDays(durationDays),
    max_redemptions:'',
    show_countdown: true,
    dist_koronel:   prefs?.dist_koronel ?? true,
    dist_map:       prefs?.dist_map     ?? true,
    dist_profile:   prefs?.dist_profile ?? true,
    dist_followers: prefs?.dist_followers ?? true,
    dist_walinka:   prefs?.dist_walinka ?? false,
  };
}

export default function CreateAction() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const initialIntent = searchParams.get('intent') || null;

  const [step, setStep] = useState(STEP.CONVERSATION);
  const [situation, setSituation] = useState(null);
  const [selectedSuggestion, setSelectedSuggestion] = useState(null);

  const [business, setBusiness] = useState(null);
  const [prefs, setPrefs] = useState(null);
  const [loadingBusiness, setLoadingBusiness] = useState(true);

  const [form, setForm] = useState({});
  const [coverFile, setCoverFile] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [createdAction, setCreatedAction] = useState(null);
  const [pulse, setPulse] = useState(null);

  // Load business + prefs
  useEffect(() => {
    if (!user) { navigate('/login', { state: { from: '/crecer/nueva' } }); return; }
    async function load() {
      const bid = searchParams.get('bid');
      let biz = null;
      if (bid) {
        const { data } = await businessService?.getById?.(bid) || {};
        biz = data;
      }
      if (!biz) {
        const { data } = await businessService?.getByOwner(user.id);
        biz = data?.[0] || null;
      }
      if (!biz) { navigate('/crecer'); return; }
      setBusiness(biz);

      const loadedPrefs = loadPrefs(biz.id);
      setPrefs(loadedPrefs);

      // If intent pre-selected (from growth center), skip to that situation
      if (initialIntent) {
        const mapping = {
          low_sales:     'low_traffic',
          new_customers: 'new_customers',
          excess_stock:  'excess_stock',
          event:         'event',
          free_publish:  'idea',
        };
        const situation = mapping[initialIntent] || 'idea';
        setSituation(situation);
        setStep(STEP.SUGGESTION);
      }

      pulseService.getBusinessPulse(biz.id).then(p => setPulse(p));
      setLoadingBusiness(false);
    }
    load();
  }, [user]);

  const onChange = useCallback((key, value) => {
    setForm(prev => ({ ...prev, [key]: value }));
  }, []);

  const handleImageChange = useCallback((file) => {
    if (!file) return;
    setCoverFile(file);
    setImagePreview(URL.createObjectURL(file));
  }, []);

  // Step 1: merchant picks situation
  const handleSituationSelect = (situationKey) => {
    setSituation(situationKey);
    setStep(STEP.SUGGESTION);
  };

  // Step 2: merchant picks suggestion → build pre-filled form
  const handleSuggestionSelect = (suggestion) => {
    setSelectedSuggestion(suggestion);
    setForm(buildDefaultForm(suggestion, prefs));
    setStep(STEP.EDIT);
  };

  const handleBack = () => {
    if (step === STEP.SUGGESTION) { setStep(STEP.CONVERSATION); setSituation(null); }
    else if (step === STEP.EDIT)  { setStep(STEP.SUGGESTION); }
    else navigate('/crecer');
  };

  // Step 3: publish
  const handlePublish = async () => {
    if (!form.title?.trim()) return;
    setSubmitting(true);
    setError(null);
    try {
      let coverImagePath = null;
      if (coverFile) {
        const { path, error: uploadErr } = await actionService.uploadCoverImage(coverFile);
        if (uploadErr) throw new Error('No se pudo subir la imagen. Intenta de nuevo.');
        coverImagePath = path;
      }

      const { data, error: createErr } = await actionService.create({
        userId:                 user.id,
        businessId:             business.id,
        formData:               form,
        coverImagePath,
        triggerIntent:          situation,
        suggestedType:          selectedSuggestion?.type,
        acceptedSuggestion:     true,
        pulseAtCreation:        pulse?.pulse,
        daysInactiveAtCreation: pulse?.daysSinceLastAction,
        aiContextSnapshot: {
          category_key:           business?.category_key,
          follower_count:         0,
          days_since_last_action: pulse?.daysSinceLastAction,
          pulse:                  pulse?.pulse,
          publish_count:          prefs?.publish_count || 0,
        },
      });

      if (createErr) throw createErr;

      // Persist prefs so next time is pre-filled
      const durationDays = Math.round((new Date(form.ends_at) - Date.now()) / 86400000);
      savePrefs(business.id, {
        action_type:   form.action_type,
        duration_days: Math.max(1, durationDays),
        discount_type: form.discount_type,
        dist_map:      form.dist_map,
        dist_profile:  form.dist_profile,
        dist_followers:form.dist_followers,
        dist_walinka:  form.dist_walinka,
      });

      setCreatedAction(data);
      setStep(STEP.SUCCESS);
    } catch (err) {
      setError(err?.message || 'Algo salió mal. Intenta de nuevo.');
      setSubmitting(false);
    }
  };

  const handleCreateAnother = () => {
    setStep(STEP.CONVERSATION);
    setSituation(null);
    setSelectedSuggestion(null);
    setForm({});
    setCoverFile(null);
    setImagePreview(null);
    setCreatedAction(null);
    setError(null);
    setSubmitting(false);
  };

  // ── Loading ────────────────────────────────────────────────────────────────
  if (loadingBusiness) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--color-background)' }}>
        <div className="w-8 h-8 border-2 border-t-transparent rounded-full animate-spin" style={{ borderColor: 'var(--color-primary)', borderTopColor: 'transparent' }} />
      </div>
    );
  }

  // ── Render ─────────────────────────────────────────────────────────────────
  const showHeader = step !== STEP.SUCCESS;
  const showBack   = step === STEP.SUGGESTION || step === STEP.EDIT;
  const showPublishBar = step === STEP.EDIT;

  return (
    <div className="min-h-screen" style={{ background: 'var(--color-background)' }}>
      <PageMeta title="Nueva promoción" path="/crecer/nueva" />

      {/* Header — only for conversation + suggestion + edit steps */}
      {showHeader && (
        <div
          className="fixed top-0 left-0 right-0 z-40 flex items-center h-14 px-4 gap-3 border-b border-border"
          style={{ background: 'var(--color-background)' }}
        >
          {showBack ? (
            <button
              onClick={handleBack}
              className="w-9 h-9 flex items-center justify-center rounded-full hover:bg-muted transition-colors"
            >
              <Icon name="ArrowLeft" size={18} color="var(--color-foreground)" />
            </button>
          ) : (
            <button
              onClick={() => navigate('/crecer')}
              className="w-9 h-9 flex items-center justify-center rounded-full hover:bg-muted transition-colors"
            >
              <Icon name="X" size={18} color="var(--color-foreground)" />
            </button>
          )}

          {/* Progress dots */}
          {step !== STEP.SUCCESS && (
            <div className="flex items-center gap-1.5 flex-1 justify-center">
              {[STEP.CONVERSATION, STEP.SUGGESTION, STEP.EDIT].map(s => (
                <div
                  key={s}
                  className="rounded-full transition-all duration-300"
                  style={{
                    width: step === s ? 20 : 6,
                    height: 6,
                    background: step >= s ? 'var(--color-primary)' : 'var(--color-muted)',
                  }}
                />
              ))}
            </div>
          )}

          {/* Business name */}
          <p className="text-xs font-caption text-muted-foreground shrink-0 w-9 text-right truncate">
            {business?.name?.split(' ')?.[0]}
          </p>
        </div>
      )}

      {/* Content */}
      <div style={{ paddingTop: showHeader ? '56px' : 0, paddingBottom: showPublishBar ? '96px' : '24px' }} className="max-w-lg mx-auto px-4 py-6">

        {step === STEP.CONVERSATION && (
          <ConversationStep
            businessName={business?.name}
            onSelect={handleSituationSelect}
          />
        )}

        {step === STEP.SUGGESTION && (
          <SuggestionStep
            situation={situation}
            categoryKey={business?.category_key}
            lastActionType={prefs?.action_type}
            onSelect={handleSuggestionSelect}
          />
        )}

        {step === STEP.EDIT && (
          <QuickEditStep
            suggestion={selectedSuggestion}
            form={form}
            onChange={onChange}
            onImageChange={handleImageChange}
            imagePreview={imagePreview}
            prefs={prefs}
          />
        )}

        {step === STEP.SUCCESS && (
          <SuccessScreen
            action={createdAction}
            channels={form}
            onCreateAnother={handleCreateAnother}
          />
        )}
      </div>

      {/* Publish bar — only on edit step */}
      {showPublishBar && (
        <div
          className="fixed bottom-0 left-0 right-0 px-4 py-4 border-t border-border z-40"
          style={{ background: 'var(--color-background)' }}
        >
          {error && (
            <p className="text-xs font-caption text-red-600 mb-3 text-center">{error}</p>
          )}
          <button
            onClick={handlePublish}
            disabled={submitting || !form.title?.trim()}
            className="w-full h-12 rounded-2xl text-sm font-semibold font-caption text-primary-foreground flex items-center justify-center gap-2 transition-opacity disabled:opacity-40"
            style={{ background: 'var(--color-primary)' }}
          >
            {submitting ? (
              <>
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Publicando...
              </>
            ) : (
              <>
                <Icon name="Send" size={16} color="white" />
                Publicar ahora
              </>
            )}
          </button>
          {!form.title?.trim() && (
            <p className="text-xs font-caption text-muted-foreground text-center mt-2">
              Escribe qué ofreces para continuar
            </p>
          )}
        </div>
      )}
    </div>
  );
}
