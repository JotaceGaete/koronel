import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Icon from 'components/AppIcon';
import { jobService } from '../../../services/jobService';

const MODALITY_COLORS = {
  'Presencial': { bg: '#dbeafe', color: '#1d4ed8' },
  'Remoto': { bg: '#d1fae5', color: '#065f46' },
  'Híbrido': { bg: '#ede9fe', color: '#5b21b6' },
};

export default function BusinessJobs({ businessId }) {
  const navigate = useNavigate();
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!businessId) return;
    setLoading(true);
    jobService?.getByBusiness(businessId)?.then(({ data }) => {
      setJobs(data || []);
      setLoading(false);
    });
  }, [businessId]);

  if (loading) {
    return (
      <div className="bg-card border border-border rounded-lg p-4 md:p-5">
        <div className="flex items-center gap-2 mb-4">
          <Icon name="Briefcase" size={18} color="var(--color-primary)" />
          <h3 className="font-heading font-semibold text-base text-foreground">Empleos</h3>
        </div>
        <div className="space-y-3">
          {[1, 2]?.map(i => (
            <div key={i} className="animate-pulse bg-muted rounded-lg h-16" />
          ))}
        </div>
      </div>
    );
  }

  if (!jobs?.length) return null;

  return (
    <div className="bg-card border border-border rounded-lg p-4 md:p-5">
      <div className="flex items-center gap-2 mb-4">
        <Icon name="Briefcase" size={18} color="var(--color-primary)" />
        <h3 className="font-heading font-semibold text-base text-foreground">Empleos</h3>
        <span className="ml-auto px-2 py-0.5 rounded-full text-xs font-caption font-semibold bg-primary/10 text-primary">
          {jobs?.length}
        </span>
      </div>
      <div className="space-y-3">
        {jobs?.map(job => {
          const modalityStyle = MODALITY_COLORS?.[job?.modality] || { bg: '#f3f4f6', color: '#374151' };
          const salary = jobService?.formatSalary(job?.salary_min, job?.salary_max);
          return (
            <button
              key={job?.id}
              type="button"
              onClick={() => navigate(`/empleo/${job?.slug}`)}
              className="w-full text-left flex items-start gap-3 p-3 rounded-lg border border-border hover:border-primary hover:bg-primary/5 transition-all"
            >
              <div className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: 'var(--color-primary)15' }}>
                <Icon name="Briefcase" size={16} color="var(--color-primary)" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-caption font-semibold text-foreground truncate">{job?.title}</p>
                <div className="flex items-center gap-2 mt-1 flex-wrap">
                  <span className="px-2 py-0.5 rounded-full text-xs font-caption font-medium" style={{ background: modalityStyle?.bg, color: modalityStyle?.color }}>
                    {job?.modality}
                  </span>
                  {salary && (
                    <span className="text-xs text-muted-foreground">{salary}</span>
                  )}
                  <span className="flex items-center gap-1 text-xs text-muted-foreground">
                    <Icon name="MapPin" size={10} color="currentColor" />
                    {job?.location}
                  </span>
                </div>
              </div>
              <Icon name="ChevronRight" size={15} color="var(--color-muted-foreground)" className="flex-shrink-0 mt-1" />
            </button>
          );
        })}
      </div>
    </div>
  );
}
