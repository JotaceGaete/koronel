// Route: /crecer/nueva  — Asistente de creación de acciones (protected)
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
import IntentStep from './steps/IntentStep';
import SuggestionStep from './steps/SuggestionStep';
import ContentStep from './steps/ContentStep';
import UrgencyStep from './steps/UrgencyStep';
import DistributionStep from './steps/DistributionStep';

const STEPS = ['intent', 'suggestion', 'content', 'urgency', 'distribution'];

const STEP_LABELS = {
  intent:       '¿Qué necesitas?',
  suggestion:   'Tipo de acción',
  content:      'El contenido',
  urgency:      'Duración',
  distribution: 'Distribución',
};

function defaultEndsAt(days = 7) {
  const d = new Date();
  d.setDate(d.getDate() + days);
  d.setHours(23, 59, 0, 0);
  return d.toISOString().slice(0, 16);
}

export default function CreateAction() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const initialIntent = searchParams.get('intent') || '';
  const initialBusinessId = searchParams.get('bid') || '';

  const [step, setStep] = useState(initialIntent ? 1 : 0);
  const [intent, setIntent] = useState(initialIntent);
  const [suggestedType, setSuggestedType] = useState(null);
  const [acceptedSuggestion, setAcceptedSuggestion] = useState(false);

  const [business, setBusiness] = useState(null);
  const [followersCount, setFollowersCount] = useState(0);
  const [pulse, setPulse] = useState(null);
  const [loadingBusiness, setLoadingBusiness] = useState(true);

  const [form, setForm] = useState({
    action_type:    '',
    title:          '',
    headline:       '',
    description:    '',
    discount_type:  null,
    discount_pct:   '',
    discount_amount:'',
    discount_label: '',
    original_price: '',
    promo_price:    '',
    promo_code:     '',
    starts_at:      new Date().toISOString().slice(0, 16),
    ends_at:        defaultEndsAt(7),
    max_redemptions:'',
    show_countdown: true,
    dist_koronel:   true,
    dist_map:       true,
    dist_profile:   true,
    dist_followers: true,
    dist_walinka:   false,
  });

  const [coverFile, setCoverFile] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  // Load business + pulse
  useEffect(() => {
    if (!user) { navigate('/login', { state: { from: '/crecer/nueva' } }); return; }
    async function load() {
      let biz = null;
      if (initialBusinessId) {
        const { data } = await businessService?.getById?.(initialBusinessId) || {};
        biz = data;
      }
      if (!biz) {
        const { data } = await businessService?.getByOwner(user.id);
        biz = data?.[0] || null;
      }
      if (!biz) { navigate('/crecer'); return; }
      setBusiness(biz);

      const [pulseRes, followersRes] = await Promise.all([
        pulseService.getBusinessPulse(biz.id),
        supabase?.from('business_followers')?.select('id', { count: 'exact', head: true })?.eq('business_id', biz.id),
      ]);
      setPulse(pulseRes);
      setFollowersCount(followersRes?.count || 0);
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
    const url = URL.createObjectURL(file);
    setImagePreview(url);
  }, []);

  const canAdvance = () => {
    if (step === 0) return !!intent;
    if (step === 1) return !!form.action_type;
    if (step === 2) return !!form.title?.trim();
    if (step === 3) return !!form.ends_at;
    return true;
  };

  const handleNext = () => {
    if (!canAdvance()) return;
    if (step < STEPS.length - 1) setStep(s => s + 1);
    else handleSubmit();
  };

  const handleBack = () => {
    if (step > 0) setStep(s => s - 1);
    else navigate('/crecer');
  };

  const handleSubmit = async () => {
    setSubmitting(true);
    setError(null);
    try {
      let coverImagePath = null;
      if (coverFile) {
        const { path, error: uploadErr } = await actionService.uploadCoverImage(coverFile);
        if (uploadErr) throw new Error('Error al subir imagen');
        coverImagePath = path;
      }

      const { data, error: createErr } = await actionService.create({
        userId:                 user.id,
        businessId:             business.id,
        formData:               form,
        coverImagePath,
        triggerIntent:          intent,
        suggestedType,
        acceptedSuggestion,
        pulseAtCreation:        pulse?.pulse,
        daysInactiveAtCreation: pulse?.daysSinceLastAction,
        aiContextSnapshot: {
          category_key:            business?.category_key,
          follower_count:          followersCount,
          days_since_last_action:  pulse?.daysSinceLastAction,
          pulse:                   pulse?.pulse,
        },
      });

      if (createErr) throw createErr;
      navigate(`/acciones/${data.slug}?created=1`);
    } catch (err) {
      setError(err?.message || 'Error al crear la acción. Intenta de nuevo.');
      setSubmitting(false);
    }
  };

  if (loadingBusiness) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--color-background)' }}>
        <div className="w-8 h-8 border-2 border-t-transparent rounded-full animate-spin" style={{ borderColor: 'var(--color-primary)', borderTopColor: 'transparent' }} />
      </div>
    );
  }

  const currentStepKey = STEPS[step];
  const isLastStep = step === STEPS.length - 1;

  return (
    <div className="min-h-screen" style={{ background: 'var(--color-background)' }}>
      <PageMeta title="Crear acción" path="/crecer/nueva" />
      <Header />
      <div style={{ paddingTop: '64px' }}>
        {/* Progress bar */}
        <div className="h-1 bg-muted">
          <div
            className="h-full transition-all duration-300"
            style={{ width: `${((step + 1) / STEPS.length) * 100}%`, background: 'var(--color-primary)' }}
          />
        </div>

        <div className="max-w-lg mx-auto px-4 py-6">
          {/* Step header */}
          <div className="flex items-center gap-3 mb-6">
            <button
              onClick={handleBack}
              className="w-9 h-9 rounded-full flex items-center justify-center border border-border bg-card hover:bg-muted transition-colors"
            >
              <Icon name="ArrowLeft" size={16} color="var(--color-foreground)" />
            </button>
            <div>
              <p className="text-xs font-caption text-muted-foreground">
                Paso {step + 1} de {STEPS.length}
              </p>
            </div>
          </div>

          {/* Step content */}
          <div className="min-h-[60vh]">
            {currentStepKey === 'intent' && (
              <IntentStep
                selected={intent}
                onSelect={(key) => {
                  setIntent(key);
                  setStep(1);
                }}
              />
            )}

            {currentStepKey === 'suggestion' && (
              <SuggestionStep
                intent={intent}
                categoryKey={business?.category_key}
                selectedType={form.action_type}
                onSelect={(type, suggestion, isFirst) => {
                  onChange('action_type', type);
                  setSuggestedType(suggestion.type);
                  setAcceptedSuggestion(isFirst);
                  setStep(2);
                }}
              />
            )}

            {currentStepKey === 'content' && (
              <ContentStep
                actionType={form.action_type}
                form={form}
                onChange={onChange}
                onImageChange={handleImageChange}
                imagePreview={imagePreview}
              />
            )}

            {currentStepKey === 'urgency' && (
              <UrgencyStep form={form} onChange={onChange} />
            )}

            {currentStepKey === 'distribution' && (
              <DistributionStep
                form={form}
                onChange={onChange}
                business={business}
                followersCount={followersCount}
              />
            )}
          </div>

          {/* Error */}
          {error && (
            <div className="mt-4 p-3 rounded-xl bg-red-50 border border-red-100 text-sm font-caption text-red-600">
              {error}
            </div>
          )}

          {/* Navigation — shown for content/urgency/distribution */}
          {['content', 'urgency', 'distribution'].includes(currentStepKey) && (
            <div className="mt-6 flex gap-3">
              {isLastStep ? (
                <button
                  onClick={handleSubmit}
                  disabled={submitting || !canAdvance()}
                  className="flex-1 h-12 rounded-xl text-sm font-semibold font-caption text-primary-foreground transition-opacity disabled:opacity-50 flex items-center justify-center gap-2"
                  style={{ background: 'var(--color-primary)' }}
                >
                  {submitting ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                      Publicando...
                    </>
                  ) : (
                    <>
                      <Icon name="Send" size={16} color="white" />
                      Publicar acción
                    </>
                  )}
                </button>
              ) : (
                <button
                  onClick={handleNext}
                  disabled={!canAdvance()}
                  className="flex-1 h-12 rounded-xl text-sm font-semibold font-caption text-primary-foreground transition-opacity disabled:opacity-50"
                  style={{ background: 'var(--color-primary)' }}
                >
                  Continuar
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
