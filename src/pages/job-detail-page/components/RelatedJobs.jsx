import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import Icon from 'components/AppIcon';
import { jobService } from '../../../services/jobService';

export default function RelatedJobs({ category, excludeId }) {
  const [jobs, setJobs] = useState([]);

  useEffect(() => {
    if (!category || !excludeId) return;
    jobService?.getRelated(category, excludeId, 3)?.then(({ data }) => {
      setJobs(data || []);
    });
  }, [category, excludeId]);

  if (!jobs?.length) return null;

  return (
    <div className="mt-8">
      <h2 className="text-lg font-heading font-semibold text-foreground mb-4">Empleos similares</h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
        {jobs?.map(job => (
          <Link
            key={job?.id}
            to={`/empleo/${job?.slug}`}
            className="bg-card border border-border rounded-xl p-4 hover:shadow-md hover:-translate-y-0.5 transition-all duration-200"
          >
            <h3 className="font-heading font-semibold text-sm text-foreground line-clamp-2 mb-1 hover:text-primary transition-colors">
              {job?.title}
            </h3>
            <p className="text-xs text-muted-foreground mb-2">{job?.company}</p>
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <Icon name="MapPin" size={11} color="var(--color-primary)" />
              <span className="truncate">{job?.location}</span>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
