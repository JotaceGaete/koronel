import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../../lib/supabase';

const DEFAULT_IMAGE = 'https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?w=800&q=80';

const BENEFITS = [
  { emoji: '📍', text: 'Encuentra negocios locales' },
  { emoji: '🏷', text: 'Descubre ofertas y promociones' },
  { emoji: '📣', text: 'Publica tu negocio o aviso' },
];

export default function WelcomePopup() {
  const [popup, setPopup] = useState(null);
  const [visible, setVisible] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const dismissed = sessionStorage.getItem('welcome_popup_dismissed');
    if (dismissed) return;

    const fetchPopup = async () => {
      try {
        const now = new Date()?.toISOString();
        const { data, error } = await supabase?.from('popups')?.select('*')?.eq('active', true)?.or(`starts_at.is.null,starts_at.lte.${now}`)?.or(`ends_at.is.null,ends_at.gte.${now}`)?.order('created_at', { ascending: false })?.limit(1)?.single();

        if (error || !data) return;
        setPopup(data);
        // Small delay for smooth entrance
        setTimeout(() => setVisible(true), 400);
      } catch {
        // Silently fail — popup is non-critical
      }
    };

    fetchPopup();
  }, []);

  const handleClose = () => {
    setVisible(false);
    sessionStorage.setItem('welcome_popup_dismissed', '1');
    setTimeout(() => setPopup(null), 300);
  };

  const handleCTA = () => {
    handleClose();
    if (popup?.button_link) {
      navigate(popup?.button_link);
    }
  };

  if (!popup) return null;

  const imageUrl = popup?.image_url || DEFAULT_IMAGE;
  const title = popup?.title || 'Bienvenido';
  const message = popup?.message || 'Descubre negocios, ofertas y clasificados cerca de ti.';
  const buttonText = popup?.button_text || 'Explorar negocios';

  return (
    <div
      className="fixed inset-0 z-[500] flex items-center justify-center p-4"
      style={{
        background: 'rgba(0,0,0,0.55)',
        backdropFilter: 'blur(4px)',
        transition: 'opacity 0.3s ease',
        opacity: visible ? 1 : 0,
        pointerEvents: visible ? 'auto' : 'none',
      }}
      onClick={(e) => { if (e?.target === e?.currentTarget) handleClose(); }}
    >
      <div
        className="relative w-full bg-white overflow-hidden"
        style={{
          maxWidth: '420px',
          borderRadius: '24px',
          boxShadow: '0 25px 60px rgba(0,0,0,0.25), 0 8px 24px rgba(0,0,0,0.12)',
          transform: visible ? 'translateY(0) scale(1)' : 'translateY(24px) scale(0.97)',
          transition: 'transform 0.35s cubic-bezier(0.34,1.56,0.64,1), opacity 0.3s ease',
          opacity: visible ? 1 : 0,
        }}
      >
        {/* Close button */}
        <button
          onClick={handleClose}
          className="absolute top-3 right-3 z-10 w-8 h-8 flex items-center justify-center rounded-full bg-white bg-opacity-80 hover:bg-opacity-100 transition-all"
          style={{ boxShadow: '0 2px 8px rgba(0,0,0,0.15)' }}
          aria-label="Cerrar"
        >
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
            <path d="M1 1l12 12M13 1L1 13" stroke="#374151" strokeWidth="2" strokeLinecap="round" />
          </svg>
        </button>

        {/* Hero image */}
        <div className="relative w-full overflow-hidden" style={{ height: '200px' }}>
          <img
            src={imageUrl}
            alt="Bienvenido al directorio local"
            className="w-full h-full object-cover"
            onError={(e) => { e.target.src = DEFAULT_IMAGE; }}
          />
          {/* Gradient overlay at bottom */}
          <div
            className="absolute inset-x-0 bottom-0"
            style={{ height: '80px', background: 'linear-gradient(to top, rgba(255,255,255,1) 0%, rgba(255,255,255,0) 100%)' }}
          />
        </div>

        {/* Content */}
        <div className="px-7 pb-7" style={{ marginTop: '-8px' }}>
          {/* Title */}
          <h2
            className="font-heading font-bold text-center mb-2"
            style={{ fontSize: '1.6rem', color: 'var(--color-foreground)', lineHeight: 1.2 }}
          >
            {title}
          </h2>

          {/* Subtitle */}
          <p
            className="text-center mb-6"
            style={{ color: 'var(--color-muted-foreground)', fontSize: '0.95rem', lineHeight: 1.5 }}
          >
            {message}
          </p>

          {/* Benefits */}
          <div className="flex flex-col gap-3 mb-7">
            {BENEFITS?.map((b, i) => (
              <div key={i} className="flex items-center gap-3">
                <span
                  className="flex items-center justify-center shrink-0 text-lg"
                  style={{
                    width: '40px',
                    height: '40px',
                    borderRadius: '12px',
                    background: 'var(--color-primary)',
                    opacity: 0.12,
                    position: 'absolute',
                  }}
                />
                <span
                  className="flex items-center justify-center shrink-0 text-lg"
                  style={{
                    width: '40px',
                    height: '40px',
                    borderRadius: '12px',
                    background: 'rgba(var(--color-primary-rgb, 37,99,235), 0.1)',
                  }}
                >
                  {b?.emoji}
                </span>
                <span style={{ color: 'var(--color-foreground)', fontSize: '0.9rem', fontWeight: 500 }}>
                  {b?.text}
                </span>
              </div>
            ))}
          </div>

          {/* CTA Button */}
          <button
            onClick={handleCTA}
            className="w-full py-3.5 rounded-2xl text-white font-semibold text-base transition-all hover:opacity-90 active:scale-95"
            style={{
              background: 'linear-gradient(135deg, var(--color-primary) 0%, #1a3a5c 100%)',
              boxShadow: '0 4px 16px rgba(37,99,235,0.35)',
              fontSize: '1rem',
            }}
          >
            {buttonText}
          </button>

          {/* Skip link */}
          <button
            onClick={handleClose}
            className="w-full mt-3 py-2 text-sm text-center transition-colors hover:underline"
            style={{ color: 'var(--color-muted-foreground)' }}
          >
            Explorar más tarde
          </button>
        </div>
      </div>
    </div>
  );
}
