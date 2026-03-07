import React from 'react';
import { Link } from 'react-router-dom';
import Icon from 'components/AppIcon';
import Image from 'components/AppImage';
import { jobService } from '../../../services/jobService';

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

const MODALITY_COLORS = {
  'Presencial': { bg: '#d1fae5', color: '#065f46' },
  'Remoto': { bg: '#dbeafe', color: '#1d4ed8' },
  'Híbrido': { bg: '#ede9fe', color: '#5b21b6' },
};

export default function JobCard({ job }) {
  const catStyle = CATEGORY_COLORS?.[job?.category] || CATEGORY_COLORS?.['Otro'];
  const modStyle = MODALITY_COLORS?.[job?.modality] || { bg: '#f3f4f6', color: '#374151' };
  const salary = jobService?.formatSalary(job?.salary_min, job?.salary_max);

  return (
    <Link
      to={`/empleo/${job?.slug}`}
      className="group bg-card border border-border rounded-xl p-4 hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 flex flex-col gap-3"
    >
      {/* Header */}
      <div className="flex items-start gap-3">
        <div className="w-12 h-12 rounded-lg border border-border bg-muted flex-shrink-0 overflow-hidden flex items-center justify-center">
          {job?.logo_url ? (
            <Image src={job?.logo_url} alt={`Logo de ${job?.company}`} className="w-full h-full object-cover" />
          ) : (
            <Icon name="Briefcase" size={22} color="var(--color-muted-foreground)" />
          )}
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="font-heading font-semibold text-sm text-foreground line-clamp-2 group-hover:text-primary transition-colors">
            {job?.title}
          </h3>
          <p className="text-xs text-muted-foreground truncate mt-0.5">{job?.company}</p>
        </div>
      </div>
      {/* Badges */}
      <div className="flex flex-wrap gap-1.5">
        <span className="px-2 py-0.5 rounded-full text-xs font-caption font-semibold" style={{ background: catStyle?.bg, color: catStyle?.color }}>
          {job?.category}
        </span>
        <span className="px-2 py-0.5 rounded-full text-xs font-caption font-semibold" style={{ background: modStyle?.bg, color: modStyle?.color }}>
          {job?.modality}
        </span>
        {job?.type && (
          <span className="px-2 py-0.5 rounded-full text-xs font-caption bg-muted text-muted-foreground">
            {job?.type}
          </span>
        )}
      </div>
      {/* Details */}
      <div className="space-y-1">
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <Icon name="MapPin" size={12} color="var(--color-primary)" />
          <span className="truncate">{job?.location}</span>
        </div>
        {salary && (
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Icon name="DollarSign" size={12} color="var(--color-primary)" />
            <span>{salary}</span>
          </div>
        )}
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <Icon name="Clock" size={12} color="var(--color-muted-foreground)" />
          <span>{jobService?.formatDate(job?.created_at)}</span>
        </div>
      </div>
      {/* CTA */}
      <div className="mt-auto pt-2 border-t border-border">
        <span className="inline-flex items-center gap-1.5 text-xs font-caption font-semibold text-primary group-hover:gap-2.5 transition-all">
          Postular
          <Icon name="ArrowRight" size={12} color="currentColor" />
        </span>
      </div>
    </Link>
  );
}
