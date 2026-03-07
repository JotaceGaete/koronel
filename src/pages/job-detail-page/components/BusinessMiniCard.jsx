import React from 'react';
import { useNavigate } from 'react-router-dom';
import Icon from 'components/AppIcon';

export default function BusinessMiniCard({ business }) {
  const navigate = useNavigate();

  const handleCall = (e) => {
    e?.stopPropagation();
    if (business?.phone) window.location.href = `tel:${business?.phone}`;
  };

  const handleWhatsApp = (e) => {
    e?.stopPropagation();
    if (business?.whatsapp) {
      window.open(`https://wa.me/${business?.whatsapp?.replace(/\D/g, '')}`, '_blank');
    }
  };

  const handleViewBusiness = () => {
    navigate(`/business-profile-page?id=${business?.id}`);
  };

  const rating = business?.rating ? parseFloat(business?.rating) : null;

  return (
    <div
      className="bg-card border border-border rounded-xl p-4 cursor-pointer hover:shadow-md transition-shadow"
      onClick={handleViewBusiness}
    >
      <div className="flex items-center gap-2 mb-3">
        <Icon name="Building2" size={15} color="var(--color-primary)" />
        <h3 className="text-sm font-heading font-semibold text-foreground">Empresa en el directorio</h3>
      </div>

      <div className="flex items-start gap-3">
        <div className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: 'var(--color-primary)15' }}>
          <Icon name="Building2" size={20} color="var(--color-primary)" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-caption font-semibold text-foreground truncate">{business?.name}</p>
          {business?.address && (
            <div className="flex items-center gap-1 mt-0.5">
              <Icon name="MapPin" size={11} color="var(--color-muted-foreground)" />
              <p className="text-xs text-muted-foreground truncate">{business?.address}</p>
            </div>
          )}
          {rating && (
            <div className="flex items-center gap-1 mt-1">
              {Array.from({ length: 5 })?.map((_, i) => (
                <Icon
                  key={i}
                  name="Star"
                  size={11}
                  color={i < Math.round(rating) ? '#f59e0b' : '#d1d5db'}
                />
              ))}
              <span className="text-xs text-muted-foreground ml-0.5">{rating?.toFixed(1)}</span>
            </div>
          )}
        </div>
      </div>

      <div className="flex gap-2 mt-3">
        {business?.phone && (
          <button
            type="button"
            onClick={handleCall}
            className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg border border-border text-xs font-caption font-medium text-foreground hover:bg-muted transition-colors"
          >
            <Icon name="Phone" size={13} color="currentColor" />
            Llamar
          </button>
        )}
        {business?.whatsapp && (
          <button
            type="button"
            onClick={handleWhatsApp}
            className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-caption font-medium text-white transition-colors"
            style={{ background: '#25d366' }}
          >
            <Icon name="MessageCircle" size={13} color="white" />
            WhatsApp
          </button>
        )}
        <button
          type="button"
          onClick={handleViewBusiness}
          className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-caption font-medium transition-colors"
          style={{ background: 'var(--color-primary)', color: 'white' }}
        >
          <Icon name="ExternalLink" size={13} color="white" />
          Ver perfil
        </button>
      </div>
    </div>
  );
}
