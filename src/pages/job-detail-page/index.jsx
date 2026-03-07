import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import Header from 'components/ui/Header';
import Icon from 'components/AppIcon';
import Image from 'components/AppImage';
import Button from 'components/ui/Button';
import ShareButtons from 'components/ui/ShareButtons';
import { jobService } from '../../services/jobService';
import { useAuth } from '../../contexts/AuthContext';
import RelatedJobs from './components/RelatedJobs';
import BusinessMiniCard from './components/BusinessMiniCard';

const CATEGORY_COLORS = {
  'Tecnología': { bg: '#dbeafe', color: '#1d4ed8' },
  'Salud': { bg: '#d1fae5', color: '#065f46' },
  'Comercio': { bg: '#fef3c7', color: '#92400e' },
  'Construcción': { bg: '#fee2e2', color: '#991b1b' },
  'Educación': { bg: '#ede9fe', color: '#5b21b6' },
  'Gastronomía': { bg: '#ffedd5', color: '#9a3412' },
  'Administración': { bg: '#e0f2fe', color: '#0369a1' },
  'Otro': { bg: '#f3f4f6', color: '#374151' },
};

export default function JobDetailPage() {
  const { slug } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [job, setJob] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!slug) return;
    setLoading(true);
    jobService?.getBySlug(slug)?.then(({ data, error: err }) => {
      if (err || !data) {
        setError('No se encontró esta oferta de empleo.');
      } else {
        setJob(data);
      }
      setLoading(false);
    });
  }, [slug]);

  const handlePostular = () => {
    navigate(`/postular?job_id=${job?.id}`);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col" style={{ background: 'var(--color-background)' }}>
        <Header />
        <main className="flex-1 flex items-center justify-center" style={{ paddingTop: '64px' }}>
          <div className="flex flex-col items-center gap-3">
            <div className="w-8 h-8 rounded-full border-2 border-t-transparent animate-spin" style={{ borderColor: 'var(--color-primary)', borderTopColor: 'transparent' }} />
            <p className="text-sm text-muted-foreground">Cargando oferta...</p>
          </div>
        </main>
      </div>
    );
  }

  if (error || !job) {
    return (
      <div className="min-h-screen flex flex-col" style={{ background: 'var(--color-background)' }}>
        <Header />
        <main className="flex-1 flex items-center justify-center" style={{ paddingTop: '64px' }}>
          <div className="text-center">
            <Icon name="AlertCircle" size={40} color="var(--color-muted-foreground)" className="mx-auto mb-4" />
            <h2 className="text-xl font-heading font-semibold text-foreground mb-2">Oferta no encontrada</h2>
            <p className="text-muted-foreground mb-4">{error}</p>
            <Link to="/empleos"><Button variant="default">Ver todos los empleos</Button></Link>
          </div>
        </main>
      </div>
    );
  }

  const catStyle = CATEGORY_COLORS?.[job?.category] || CATEGORY_COLORS?.['Otro'];
  const salary = jobService?.formatSalary(job?.salary_min, job?.salary_max);
  const isOwner = user && job?.user_id === user?.id;

  return (
    <div className="min-h-screen flex flex-col" style={{ background: 'var(--color-background)' }}>
      <Header />
      <main className="flex-1" style={{ paddingTop: '64px' }}>
        <div className="max-w-4xl mx-auto px-4 md:px-6 lg:px-8 py-8">
          {/* Pending Banner */}
          {isOwner && job?.status === 'pending' && (
            <div className="mb-6 px-4 py-3 rounded-lg flex items-center gap-2" style={{ background: '#fef3c7', border: '1px solid #fbbf24' }}>
              <Icon name="Clock" size={16} color="#92400e" />
              <p className="text-sm font-caption font-medium" style={{ color: '#92400e' }}>Pendiente de aprobación — Tu oferta está siendo revisada por el equipo.</p>
            </div>
          )}

          {/* Header Card */}
          <div className="bg-card border border-border rounded-xl p-6 mb-6">
            <div className="flex items-start gap-4">
              <div className="w-16 h-16 rounded-xl border border-border bg-muted flex-shrink-0 overflow-hidden flex items-center justify-center">
                {job?.logo_url ? (
                  <Image src={job?.logo_url} alt={`Logo de ${job?.company}`} className="w-full h-full object-cover" />
                ) : (
                  <Icon name="Briefcase" size={28} color="var(--color-muted-foreground)" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <h1 className="text-2xl md:text-3xl font-heading font-bold text-foreground mb-1">{job?.title}</h1>
                <p className="text-base text-muted-foreground font-medium mb-3">{job?.company}</p>
                <div className="flex flex-wrap gap-2">
                  <span className="px-2.5 py-1 rounded-full text-xs font-caption font-semibold" style={{ background: catStyle?.bg, color: catStyle?.color }}>
                    {job?.category}
                  </span>
                  <span className="px-2.5 py-1 rounded-full text-xs font-caption font-semibold bg-muted text-muted-foreground">
                    {job?.modality}
                  </span>
                  <span className="px-2.5 py-1 rounded-full text-xs font-caption font-semibold bg-muted text-muted-foreground">
                    {job?.type}
                  </span>
                </div>
              </div>
            </div>

            {/* Meta info */}
            <div className="mt-4 pt-4 border-t border-border grid grid-cols-1 sm:grid-cols-2 gap-2">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Icon name="MapPin" size={15} color="var(--color-primary)" />
                <span>{job?.location}</span>
              </div>
              {salary && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Icon name="DollarSign" size={15} color="var(--color-primary)" />
                  <span>{salary}</span>
                </div>
              )}
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Icon name="Calendar" size={15} color="var(--color-muted-foreground)" />
                <span>Publicado el {jobService?.formatDate(job?.created_at)}</span>
              </div>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Icon name="CalendarX" size={15} color="var(--color-muted-foreground)" />
                <span>Expira el {jobService?.formatDate(job?.expires_at)}</span>
              </div>
            </div>

            {/* CTA */}
            <div className="mt-5">
              <Button
                variant="default"
                size="lg"
                iconName="Send"
                iconPosition="left"
                iconSize={18}
                onClick={handlePostular}
                className="w-full sm:w-auto"
              >
                Postular ahora
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Main Content */}
            <div className="lg:col-span-2 space-y-6">
              {/* Description */}
              <div className="bg-card border border-border rounded-xl p-6">
                <h2 className="text-lg font-heading font-semibold text-foreground mb-3 flex items-center gap-2">
                  <Icon name="FileText" size={18} color="var(--color-primary)" />
                  Descripción del cargo
                </h2>
                <div className="text-sm text-foreground leading-relaxed whitespace-pre-wrap">{job?.description}</div>
              </div>

              {/* Requirements */}
              {job?.requirements && (
                <div className="bg-card border border-border rounded-xl p-6">
                  <h2 className="text-lg font-heading font-semibold text-foreground mb-3 flex items-center gap-2">
                    <Icon name="CheckCircle" size={18} color="var(--color-primary)" />
                    Requisitos
                  </h2>
                  <div className="text-sm text-foreground leading-relaxed whitespace-pre-wrap">{job?.requirements}</div>
                </div>
              )}
            </div>

            {/* Sidebar */}
            <div className="space-y-4">
              {/* Business mini-card or company name */}
              {job?.businesses ? (
                <BusinessMiniCard business={job?.businesses} />
              ) : (
                <div className="bg-card border border-border rounded-xl p-4">
                  <h3 className="text-sm font-heading font-semibold text-foreground mb-2">Empresa</h3>
                  <div className="flex items-center gap-2">
                    <Icon name="Building2" size={15} color="var(--color-muted-foreground)" />
                    <span className="text-sm text-foreground">{job?.company}</span>
                  </div>
                </div>
              )}

              {/* Contact */}
              <div className="bg-card border border-border rounded-xl p-4">
                <h3 className="text-sm font-heading font-semibold text-foreground mb-3">Contacto</h3>
                <div className="space-y-2">
                  <a href={`mailto:${job?.email_contact}`} className="flex items-center gap-2 text-sm text-primary hover:underline">
                    <Icon name="Mail" size={14} color="currentColor" />
                    {job?.email_contact}
                  </a>
                  {job?.whatsapp_contact && (
                    <a
                      href={`https://wa.me/${job?.whatsapp_contact?.replace(/\D/g, '')}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 text-sm hover:underline"
                      style={{ color: '#25d366' }}
                    >
                      <Icon name="MessageCircle" size={14} color="currentColor" />
                      WhatsApp
                    </a>
                  )}
                </div>
              </div>

              {/* Share */}
              <div className="bg-card border border-border rounded-xl p-4">
                <h3 className="text-sm font-heading font-semibold text-foreground mb-3">Compartir</h3>
                <ShareButtons
                  url={window?.location?.href}
                  title={`${job?.title} en ${job?.company}`}
                />
              </div>

              {/* Apply again */}
              <Button
                variant="default"
                size="md"
                iconName="Send"
                iconPosition="left"
                iconSize={16}
                onClick={handlePostular}
                className="w-full"
              >
                Postular ahora
              </Button>
            </div>
          </div>

          {/* Related Jobs */}
          <RelatedJobs category={job?.category} excludeId={job?.id} />
        </div>
      </main>
    </div>
  );
}
