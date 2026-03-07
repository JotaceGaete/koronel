import React, { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import Header from 'components/ui/Header';
import Icon from 'components/AppIcon';
import Button from 'components/ui/Button';
import { useAuth } from '../../contexts/AuthContext';
import { jobService } from '../../services/jobService';
import JobFormFields from './components/JobFormFields';
import JobLogoUpload from './components/JobLogoUpload';
import BusinessLinkSection from './components/BusinessLinkSection';

const INITIAL_FORM = {
  titulo: '',
  empresa: '',
  descripcion: '',
  requisitos: '',
  categoria: 'Otro',
  modalidad: 'Presencial',
  tipo: 'Full-time',
  ubicacion: '',
  salario_min: '',
  salario_max: '',
  email_contacto: '',
  whatsapp_contacto: '',
  logo_url: '',
  business_id: null,
};

export default function PublishJobForm() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState(INITIAL_FORM);
  const [errors, setErrors] = useState({});
  const [logoFile, setLogoFile] = useState(null);
  const [logoPreview, setLogoPreview] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [submitError, setSubmitError] = useState(null);
  const [linkedBusiness, setLinkedBusiness] = useState(null);

  if (!user) {
    navigate('/login', { state: { from: '/publicar-empleo' } });
    return null;
  }

  const validate = () => {
    const errs = {};
    if (!form?.titulo?.trim()) errs.titulo = 'El título es obligatorio';
    if (!form?.empresa?.trim()) errs.empresa = 'El nombre de la empresa es obligatorio';
    if (!form?.descripcion?.trim()) errs.descripcion = 'La descripción es obligatoria';
    if (!form?.ubicacion?.trim()) errs.ubicacion = 'La ubicación es obligatoria';
    if (!form?.email_contacto?.trim()) {
      errs.email_contacto = 'El email de contacto es obligatorio';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/?.test(form?.email_contacto)) {
      errs.email_contacto = 'Ingresa un email válido';
    }
    if (form?.salario_min && form?.salario_max) {
      if (parseInt(form?.salario_min) > parseInt(form?.salario_max)) {
        errs.salario_max = 'El salario máximo debe ser mayor al mínimo';
      }
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
    if (Object.keys(errs)?.length > 0) {
      setErrors(errs);
      return;
    }
    setSubmitting(true);
    setSubmitError(null);
    try {
      let logoUrl = form?.logo_url;
      if (logoFile) {
        const { url, error: uploadErr } = await jobService?.uploadLogo(logoFile, user?.id);
        if (uploadErr) throw new Error('Error al subir el logo: ' + uploadErr?.message);
        logoUrl = url;
      }
      const { error } = await jobService?.create({ ...form, logo_url: logoUrl, business_id: linkedBusiness?.id || null }, user?.id);
      if (error) throw new Error(error?.message || 'Error al publicar la oferta');
      setSuccess(true);
    } catch (err) {
      setSubmitError(err?.message || 'Error inesperado. Intenta de nuevo.');
    } finally {
      setSubmitting(false);
    }
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
            <h2 className="text-2xl font-heading font-bold text-foreground mb-2">¡Oferta enviada!</h2>
            <p className="text-muted-foreground mb-6">Tu oferta fue enviada y está pendiente de aprobación.</p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Button variant="outline" onClick={() => navigate('/empleos')}>Ver empleos</Button>
              <Button variant="default" onClick={() => { setSuccess(false); setForm(INITIAL_FORM); setLogoFile(null); setLogoPreview(null); }}>
                Publicar otra
              </Button>
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
        <div className="max-w-3xl mx-auto px-4 md:px-6 lg:px-8 py-8">
          {/* Page Header */}
          <div className="mb-8">
            <h1 className="text-3xl font-heading font-bold text-foreground">Publicar Empleo</h1>
            <p className="text-muted-foreground mt-1">Completa el formulario para publicar tu oferta de trabajo en Coronel.</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6" noValidate>
            {/* Logo Upload */}
            <JobLogoUpload
              logoPreview={logoPreview}
              onFileChange={(file, preview) => { setLogoFile(file); setLogoPreview(preview); }}
            />

            {/* Business Link Section */}
            <BusinessLinkSection
              selectedBusiness={linkedBusiness}
              onSelect={(biz) => setLinkedBusiness(biz)}
              onClear={() => setLinkedBusiness(null)}
            />

            {/* Form Fields */}
            <JobFormFields form={form} errors={errors} onChange={handleChange} />

            {/* Submit Error */}
            {submitError && (
              <div className="px-4 py-3 rounded-lg flex items-start gap-2" style={{ background: '#fee2e2', border: '1px solid #fca5a5' }}>
                <Icon name="AlertCircle" size={16} color="#991b1b" className="mt-0.5 flex-shrink-0" />
                <p className="text-sm" style={{ color: '#991b1b' }}>{submitError}</p>
              </div>
            )}

            {/* Submit */}
            <div className="flex flex-col sm:flex-row gap-3 pt-2">
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
                {submitting ? 'Enviando...' : 'Publicar oferta'}
              </Button>
              <Button type="button" variant="outline" size="lg" onClick={() => navigate('/empleos')}>
                Cancelar
              </Button>
            </div>
          </form>
        </div>
      </main>
    </div>
  );
}
