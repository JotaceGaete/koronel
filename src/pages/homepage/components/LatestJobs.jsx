import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import Icon from 'components/AppIcon';
import Button from 'components/ui/Button';
import { jobService } from '../../../services/jobService';

const MODALITY_COLORS = {
  'Presencial': { bg: '#d1fae5', color: '#065f46' },
  'Remoto': { bg: '#dbeafe', color: '#1d4ed8' },
  'Híbrido': { bg: '#ede9fe', color: '#5b21b6' },
};

function JobMiniCard({ job }) {
  const modStyle = MODALITY_COLORS?.[job?.modality] || { bg: '#f3f4f6', color: '#374151' };
  const salary = jobService?.formatSalary(job?.salary_min, job?.salary_max);

  return (
    <Link
      to={`/empleo/${job?.slug}`}
      className="group flex-shrink-0 w-64 sm:w-72 bg-card border border-border rounded-xl p-4 hover:shadow-md hover:-translate-y-0.5 transition-all duration-200"
    >
      <div className="flex items-start gap-2 mb-3">
        <div className="w-9 h-9 rounded-lg bg-muted flex items-center justify-center flex-shrink-0">
          <Icon name="Briefcase" size={16} color="var(--color-primary)" />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="font-heading font-semibold text-sm text-foreground line-clamp-2 group-hover:text-primary transition-colors">
            {job?.title}
          </h3>
          <p className="text-xs text-muted-foreground truncate">{job?.company}</p>
        </div>
      </div>
      <div className="flex flex-wrap gap-1.5 mb-3">
        <span className="px-2 py-0.5 rounded-full text-xs font-caption font-semibold" style={{ background: modStyle?.bg, color: modStyle?.color }}>
          {job?.modality}
        </span>
      </div>
      <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-3">
        <Icon name="MapPin" size={11} color="var(--color-primary)" />
        <span className="truncate">{job?.location}</span>
      </div>
      {salary && (
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-3">
          <Icon name="DollarSign" size={11} color="var(--color-primary)" />
          <span>{salary}</span>
        </div>
      )}
      <span className="inline-flex items-center gap-1 text-xs font-caption font-semibold text-primary group-hover:gap-2 transition-all">
        Ver oferta <Icon name="ArrowRight" size={11} color="currentColor" />
      </span>
    </Link>
  );
}

export default function LatestJobs() {
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    jobService?.getLatest(4)?.then(({ data }) => {
      if (!mounted) return;
      setJobs(data || []);
      setLoading(false);
    });
    return () => { mounted = false; };
  }, []);

  if (!loading && jobs?.length === 0) return null;

  return (
    <section className="w-full py-12 md:py-14 lg:py-16 px-4 md:px-6 lg:px-8" style={{ background: 'var(--color-muted)' }}>
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-lg flex items-center justify-center" style={{ background: 'var(--color-primary)' }}>
              <Icon name="Briefcase" size={18} color="white" />
            </div>
            <div>
              <h2 className="text-2xl md:text-3xl font-heading font-bold text-foreground">Últimas Ofertas de Empleo</h2>
              <p className="text-xs text-muted-foreground">Oportunidades laborales en Coronel</p>
            </div>
          </div>
          <Link to="/empleos">
            <Button variant="ghost" size="sm" iconName="ArrowRight" iconPosition="right" iconSize={14}>
              Ver todos
            </Button>
          </Link>
        </div>

        {loading ? (
          <div className="flex gap-4 overflow-x-auto pb-2">
            {Array.from({ length: 4 })?.map((_, i) => (
              <div key={i} className="flex-shrink-0 w-64 sm:w-72 bg-card border border-border rounded-xl p-4 animate-pulse">
                <div className="flex gap-2 mb-3">
                  <div className="w-9 h-9 rounded-lg bg-muted" />
                  <div className="flex-1 space-y-1.5">
                    <div className="h-3 bg-muted rounded w-3/4" />
                    <div className="h-2.5 bg-muted rounded w-1/2" />
                  </div>
                </div>
                <div className="h-2.5 bg-muted rounded w-1/3 mb-2" />
                <div className="h-2.5 bg-muted rounded w-2/3" />
              </div>
            ))}
          </div>
        ) : (
          <div className="flex gap-4 overflow-x-auto pb-2" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
            {jobs?.map(job => <JobMiniCard key={job?.id} job={job} />)}
            <Link
              to="/publicar-empleo"
              className="flex-shrink-0 w-64 sm:w-72 border-2 border-dashed border-border rounded-xl flex flex-col items-center justify-center p-6 text-center hover:border-primary hover:bg-card transition-all duration-200 group"
            >
              <div className="w-12 h-12 rounded-full flex items-center justify-center mb-3" style={{ background: 'var(--color-card)' }}>
                <Icon name="BriefcasePlus" size={22} color="var(--color-primary)" />
              </div>
              <p className="text-sm font-caption font-semibold text-foreground group-hover:text-primary transition-colors">
                ¿Tienes una vacante?
              </p>
              <p className="text-xs text-muted-foreground mt-1">Publica gratis</p>
            </Link>
          </div>
        )}
      </div>
    </section>
  );
}
