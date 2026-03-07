import React, { useState } from 'react';

import Button from 'components/ui/Button';

export default function EventActions({ event }) {
  const [copied, setCopied] = useState(false);

  const handleWhatsApp = () => {
    if (!event?.contactWhatsapp) return;
    const num = event?.contactWhatsapp?.replace(/\D/g, '');
    const msg = encodeURIComponent(`Hola, vi el evento "${event?.title}" en CoronelLocal y me gustaría más información.`);
    window.open(`https://wa.me/${num}?text=${msg}`, '_blank');
  };

  const handleShare = async () => {
    if (navigator?.share) {
      try {
        await navigator.share({ title: event?.title, url: window.location?.href });
        return;
      } catch (err) {
        // Fall through to clipboard fallback on NotAllowedError or AbortError
      }
    }
    try {
      await navigator?.clipboard?.writeText(window.location?.href);
    } catch (err) {
      // ignore clipboard errors
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const handleCalendar = () => {
    const start = new Date(event?.startDatetime);
    const end = new Date(event?.endDatetime);
    const fmt = d => d?.toISOString()?.replace(/[-:]/g, '')?.split('.')?.[0] + 'Z';
    const url = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(event?.title)}&dates=${fmt(start)}/${fmt(end)}&details=${encodeURIComponent(event?.description || '')}&location=${encodeURIComponent(event?.address || '')}`;
    window.open(url, '_blank');
  };

  return (
    <div className="bg-card border border-border rounded-xl p-5 space-y-3">
      <h3 className="font-heading font-semibold text-sm text-foreground">Contacto y acciones</h3>
      {event?.contactWhatsapp && (
        <Button
          variant="success"
          fullWidth
          iconName="MessageCircle"
          iconPosition="left"
          iconSize={16}
          onClick={handleWhatsApp}
        >
          Contactar por WhatsApp
        </Button>
      )}
      <Button
        variant="outline"
        fullWidth
        iconName="CalendarPlus"
        iconPosition="left"
        iconSize={16}
        onClick={handleCalendar}
      >
        Agregar al calendario
      </Button>
      <Button
        variant="outline"
        fullWidth
        iconName={copied ? 'Check' : 'Share2'}
        iconPosition="left"
        iconSize={16}
        onClick={handleShare}
      >
        {copied ? 'Enlace copiado' : 'Compartir evento'}
      </Button>
    </div>
  );
}
