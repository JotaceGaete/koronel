import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import Header from 'components/ui/Header';
import Icon from 'components/AppIcon';
import Button from 'components/ui/Button';
import { jobService } from '../../services/jobService';

const INITIAL_FORM = {
  nombre_completo: '',
  email: '',
  telefono: '',
  cv_url: '',
  carta_presentacion: '',
};

function FieldError({ msg }) {
  if (!msg) return null;
  return <p className="text-xs mt-1" style={{ color: '#dc2626' }}>{msg}</p>;
}

function Label({ children, required }) {
  return (
    <label className="block text-sm font-caption font-semibold text-foreground mb-1">
      {children}{required && <span className="ml-0.5" style={{ color: '#dc2626' }}>*</span>}
    </label>
  );
}

const inputCls = (hasError) =>
  `w-full px-3 py-2.5 rounded-lg border text-sm text-foreground bg-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary transition-all ${
    hasError ? 'border-red-400' : 'border-border'
  }`;

export default function JobApplicationForm() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const jobId = searchParams?.get('job_id');
  const [job, setJob] = useState(null);
  const [jobLoading, setJobLoading] = useState(true);
  const [form, setForm] = useState(INITIAL_FORM);
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [submitError, setSubmitError] = useState(null);

  useEffect(() => {
    if (!jobId) {
      setJobLoading(false);
      return;
    }
    supabaseLoadJob();
  }, [jobId]);

  const supabaseLoadJob = async () => {
    setJobLoading(true);
    // Load by id directly
    const { supabase } = await import('../../lib/supabase');
    const { data } = await supabase?.from('jobs')?.select('id, title, company, slug')?.eq('id', jobId)?.single();
    setJob(data || null);
    setJobLoading(false);
  };

  const validate = () => {
    const errs = {};
    if (!form?.nombre_completo?.trim()) errs.nombre_completo = 'El nombre es obligatorio';
    if (!form?.email?.trim()) {
      errs.email = 'El email es obligatorio';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/?.test(form?.email)) {
      errs.email = 'Ingresa un email válido';
    }
    return errs;
  };

  const handleChange = (key, value) => {
    setForm(prev => ({ ...prev, [key]: value }));
    if (errors?.[key]) setErrors(prev => ({ ...prev, [key]: undefined }));
  };

  const handleSubmit = async (e) => {
    e?.preventDefault();
    const errs = validate();
    if (Object.keys(errs)?.length > 0) { setErrors(errs); return; }
    if (!jobId) { setSubmitError('No se especificó la oferta de empleo.'); return; }
    setSubmitting(true);
    setSubmitError(null);
    const { error } = await jobService?.submitApplication({ ...form, job_id: jobId });
    if (error) {
      setSubmitError(error?.message || 'Error al enviar la postulación. Intenta de nuevo.');
    } else {
      setSuccess(true);
    }
    setSubmitting(false);
  };

  if (success) {
    return (
      <div className="min-h-screen flex flex-col" style={{ background: 'var(--color-background)' }}>
        <Header />
        <main className="flex-1 flex items-center justify-center px-4" style={{ paddingTop: '64px' }}>
          <div className="max-w-md w-full text-center bg-card border border-border rounded-2xl p-8">
            <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4" style={{ background: '#d1fae5' }}>
              <Icon name="CheckCircle" size={32} color="#065f46" />
            </div>
            <h2 className="text-2xl font-heading font-bold text-foreground mb-2">¡Postulación enviada!</h2>
            <p className="text-muted-foreground mb-6">Tu postulación fue enviada exitosamente. El empleador se pondrá en contacto contigo pronto.</p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Button variant="outline" onClick={() => navigate('/empleos')}>Ver más empleos</Button>
              {job?.slug && (
                <Button variant="default" onClick={() => navigate(`/empleo/${job?.slug}`)}>Ver oferta</Button>
              )}
            </div>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col" style={{ background: 'var(--color-background)' }}>
      <Header />
      <main className="flex-1" style={{ paddingTop: '64px' }}>
        <div className="max-w-2xl mx-auto px-4 md:px-6 lg:px-8 py-8">
          {/* Job Context */}
          {jobLoading ? (
            <div className="bg-card border border-border rounded-xl p-4 mb-6 animate-pulse">
              <div className="h-4 bg-muted rounded w-1/2 mb-2" />
              <div className="h-3 bg-muted rounded w-1/3" />
            </div>
          ) : job ? (
            <div className="bg-card border border-border rounded-xl p-4 mb-6 flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center flex-shrink-0">
                <Icon name="Briefcase" size={18} color="var(--color-primary)" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Postulando a</p>
                <p className="text-sm font-heading font-semibold text-foreground">{job?.title}</p>
                <p className="text-xs text-muted-foreground">{job?.company}</p>
              </div>
            </div>
          ) : !jobId ? (
            <div className="bg-card border border-border rounded-xl p-4 mb-6">
              <p className="text-sm text-muted-foreground">No se especificó una oferta. <Link to="/empleos" className="text-primary hover:underline">Ver empleos disponibles</Link>.</p>
            </div>
          ) : null}

          <div className="mb-6">
            <h1 className="text-3xl font-heading font-bold text-foreground">Postular</h1>
            <p className="text-muted-foreground mt-1">Completa el formulario para enviar tu postulación.</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5" noValidate>
            <div className="bg-card border border-border rounded-xl p-5 space-y-4">
              <h2 className="text-base font-heading font-semibold text-foreground">Tus datos</h2>
              <div>
                <Label required>Nombre completo</Label>
                <input
                  type="text"
                  value={form?.nombre_completo}
                  onChange={e => handleChange('nombre_completo', e?.target?.value)}
                  placeholder="Tu nombre completo"
                  className={inputCls(!!errors?.nombre_completo)}
                />
                <FieldError msg={errors?.nombre_completo} />
              </div>
              <div>
                <Label required>Email</Label>
                <input
                  type="email"
                  value={form?.email}
                  onChange={e => handleChange('email', e?.target?.value)}
                  placeholder="tu@email.com"
                  className={inputCls(!!errors?.email)}
                />
                <FieldError msg={errors?.email} />
              </div>
              <div>
                <Label>Teléfono (opcional)</Label>
                <input
                  type="text"
                  value={form?.telefono}
                  onChange={e => handleChange('telefono', e?.target?.value)}
                  placeholder="+56 9 1234 5678"
                  className={inputCls(false)}
                />
              </div>
              <div>
                <Label>Link a tu CV (opcional)</Label>
                <input
                  type="url"
                  value={form?.cv_url}
                  onChange={e => handleChange('cv_url', e?.target?.value)}
                  placeholder="https://drive.google.com/..."
                  className={inputCls(false)}
                />
                <p className="text-xs text-muted-foreground mt-1">Pega el enlace a tu CV en Google Drive, Dropbox, etc.</p>
              </div>
              <div>
                <Label>Carta de presentación (opcional)</Label>
                <textarea
                  value={form?.carta_presentacion}
                  onChange={e => handleChange('carta_presentacion', e?.target?.value)}
                  placeholder="Cuéntanos por qué eres el candidato ideal..."
                  rows={5}
                  className={inputCls(false)}
                />
              </div>
            </div>

            {submitError && (
              <div className="px-4 py-3 rounded-lg flex items-start gap-2" style={{ background: '#fee2e2', border: '1px solid #fca5a5' }}>
                <Icon name="AlertCircle" size={16} color="#991b1b" className="mt-0.5 flex-shrink-0" />
                <p className="text-sm" style={{ color: '#991b1b' }}>{submitError}</p>
              </div>
            )}

            <div className="flex flex-col sm:flex-row gap-3">
              <Button
                type="submit"
                variant="default"
                size="lg"
                disabled={submitting}
                iconName={submitting ? undefined : 'Send'}
                iconPosition="left"
                iconSize={18}
                className="flex-1 sm:flex-none"
              >
                {submitting ? 'Enviando...' : 'Enviar postulación'}
              </Button>
              <Button type="button" variant="outline" size="lg" onClick={() => navigate(-1)}>
                Volver
              </Button>
            </div>
          </form>
        </div>
      </main>
    </div>
  );
}
