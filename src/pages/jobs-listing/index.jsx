import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import Header from 'components/ui/Header';
import Icon from 'components/AppIcon';
import Button from 'components/ui/Button';
import { jobService } from '../../services/jobService';
import { useAuth } from '../../contexts/AuthContext';
import JobCard from './components/JobCard';
import JobFilters from './components/JobFilters';
import JobsEmptyState from './components/JobsEmptyState';

export default function JobsListing() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [count, setCount] = useState(0);
  const [search, setSearch] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [filters, setFilters] = useState({ category: 'all', modality: 'all', type: 'all' });
  const [page, setPage] = useState(1);
  const PAGE_SIZE = 12;

  const load = useCallback(async () => {
    setLoading(true);
    const { data, count: total, error } = await jobService?.getPublished({
      search,
      category: filters?.category,
      modality: filters?.modality,
      type: filters?.type,
      page,
      pageSize: PAGE_SIZE,
    });
    if (!error) {
      setJobs(data);
      setCount(total);
    }
    setLoading(false);
  }, [search, filters, page]);

  useEffect(() => { load(); }, [load]);

  const handleSearch = (e) => {
    e?.preventDefault();
    setSearch(searchInput);
    setPage(1);
  };

  const handleFilterChange = (key, value) => {
    setFilters(prev => ({ ...prev, [key]: value }));
    setPage(1);
  };

  const handlePublicar = () => {
    if (!user) {
      navigate('/login', { state: { from: '/publicar-empleo' } });
    } else {
      navigate('/publicar-empleo');
    }
  };

  return (
    <div className="min-h-screen flex flex-col" style={{ background: 'var(--color-background)' }}>
      <Header />
      <main className="flex-1" style={{ paddingTop: '64px' }}>
        {/* Page Header */}
        <div className="py-8 px-4 md:px-6 lg:px-8" style={{ background: 'var(--color-card)', borderBottom: '1px solid var(--color-border)' }}>
          <div className="max-w-7xl mx-auto">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
              <div>
                <h1 className="text-3xl md:text-4xl font-heading font-bold text-foreground">Empleos en Coronel</h1>
                <p className="text-muted-foreground mt-1">{count > 0 ? `${count} oferta${count !== 1 ? 's' : ''} disponible${count !== 1 ? 's' : ''}` : 'Encuentra tu próximo trabajo'}</p>
              </div>
              <Button
                variant="default"
                size="md"
                iconName="Plus"
                iconPosition="left"
                iconSize={16}
                onClick={handlePublicar}
              >
                Publicar Empleo
              </Button>
            </div>

            {/* Search */}
            <form onSubmit={handleSearch} className="flex gap-2 mb-4">
              <div className="flex-1 relative">
                <Icon name="Search" size={18} color="var(--color-muted-foreground)" className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="text"
                  value={searchInput}
                  onChange={e => setSearchInput(e?.target?.value)}
                  placeholder="Busca por cargo, empresa o ubicación..."
                  className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-border bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary text-sm"
                />
              </div>
              <Button type="submit" variant="default" size="md">Buscar</Button>
            </form>

            {/* Filters */}
            <JobFilters filters={filters} onFilterChange={handleFilterChange} />
          </div>
        </div>

        {/* Results */}
        <div className="max-w-7xl mx-auto px-4 md:px-6 lg:px-8 py-8">
          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {Array.from({ length: 6 })?.map((_, i) => (
                <div key={i} className="bg-card border border-border rounded-xl p-4 animate-pulse">
                  <div className="flex gap-3 mb-3">
                    <div className="w-12 h-12 rounded-lg bg-muted flex-shrink-0" />
                    <div className="flex-1 space-y-2">
                      <div className="h-4 bg-muted rounded w-3/4" />
                      <div className="h-3 bg-muted rounded w-1/2" />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <div className="h-3 bg-muted rounded w-full" />
                    <div className="h-3 bg-muted rounded w-2/3" />
                  </div>
                </div>
              ))}
            </div>
          ) : jobs?.length === 0 ? (
            <JobsEmptyState onPublicar={handlePublicar} />
          ) : (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {jobs?.map(job => <JobCard key={job?.id} job={job} />)}
              </div>
              {/* Pagination */}
              {count > PAGE_SIZE && (
                <div className="flex items-center justify-center gap-2 mt-8">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={page === 1}
                    onClick={() => setPage(p => Math.max(1, p - 1))}
                    iconName="ChevronLeft"
                    iconPosition="left"
                    iconSize={16}
                  >
                    Anterior
                  </Button>
                  <span className="text-sm text-muted-foreground px-3">
                    Página {page} de {Math.ceil(count / PAGE_SIZE)}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={page >= Math.ceil(count / PAGE_SIZE)}
                    onClick={() => setPage(p => p + 1)}
                    iconName="ChevronRight"
                    iconPosition="right"
                    iconSize={16}
                  >
                    Siguiente
                  </Button>
                </div>
              )}
            </>
          )}
        </div>
      </main>
    </div>
  );
}
