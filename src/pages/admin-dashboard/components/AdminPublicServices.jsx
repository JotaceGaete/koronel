import React, { useState } from 'react';
import Icon from 'components/AppIcon';
import AdminPageHeader from 'components/admin/AdminPageHeader';
import AdminPublicServicesList from './AdminPublicServicesList';
import AdminPublicServiceReports from './AdminPublicServiceReports';

const TABS = [
  { id: 'list', label: 'Servicios' },
  { id: 'reports', label: 'Reportes' },
];

// Contenedor de "Servicios públicos": una sola opción en el menú admin, con
// dos sub-pestañas internas (Servicios / Reportes) — no agrega una segunda
// entrada de navegación ni un panel admin paralelo.
export default function AdminPublicServices() {
  const [tab, setTab] = useState('list');
  const [focusServiceId, setFocusServiceId] = useState(null);

  const handleEditService = (serviceId) => {
    setFocusServiceId(serviceId);
    setTab('list');
  };

  return (
    <div>
      <AdminPageHeader
        title="Servicios públicos"
        subtitle="Instituciones públicas y servicios esenciales de Coronel (/servicios)"
      />
      <div className="mt-4 flex items-center gap-1 border-b border-border">
        {TABS?.map(t => (
          <button
            key={t?.id}
            onClick={() => setTab(t?.id)}
            className={`flex items-center gap-1.5 px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              tab === t?.id
                ? 'border-primary text-foreground'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
            style={tab === t?.id ? { borderColor: 'var(--color-primary)' } : {}}
          >
            <Icon name={t?.id === 'list' ? 'Landmark' : 'Flag'} size={15} color="currentColor" />
            {t?.label}
          </button>
        ))}
      </div>
      <div className="mt-4">
        {tab === 'list' ? (
          <AdminPublicServicesList
            focusServiceId={focusServiceId}
            onFocusHandled={() => setFocusServiceId(null)}
          />
        ) : (
          <AdminPublicServiceReports onEditService={handleEditService} />
        )}
      </div>
    </div>
  );
}
