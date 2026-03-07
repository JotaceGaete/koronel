import React, { useState } from 'react';
import Icon from 'components/AppIcon';

const DAYS = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];
const DAY_KEYS = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];

function formatSlots(dayData) {
  if (!dayData) return null;
  if (dayData?.closed) return { closed: true };
  // New format: { open: false }
  if (dayData?.open === false) return { closed: true };
  if (dayData?.allDay) return { allDay: true };
  if (Array.isArray(dayData?.slots) && dayData?.slots?.length > 0) {
    return { slots: dayData?.slots };
  }
  // Legacy format: { open, close }
  if (dayData?.open && dayData?.close) {
    return { slots: [{ open: dayData?.open, close: dayData?.close }] };
  }
  return null;
}

function getCurrentStatus(hours) {
  if (!hours) return { open: false, label: 'Horario no disponible' };

  // always_open mode
  if (hours?.mode === 'always_open') return { open: true, label: 'Abierto 24/7' };
  // variable mode
  if (hours?.mode === 'variable' || hours?.variable === true) {
    return { open: false, label: 'Horario variable – Consulta por WhatsApp' };
  }

  const now = new Date();
  const dayIndex = now?.getDay() === 0 ? 6 : now?.getDay() - 1;
  const dayKey = DAY_KEYS?.[dayIndex];

  // New by_day format
  const rawDay = hours?.mode === 'by_day' ? hours?.days?.[dayKey] : hours?.[dayKey];
  const today = formatSlots(rawDay);

  if (!today) return { open: false, label: 'Horario no disponible' };
  if (today?.closed) return { open: false, label: 'Hoy: Cerrado' };
  if (today?.allDay) return { open: true, label: 'Abierto · 24 horas' };

  const currentMinutes = now?.getHours() * 60 + now?.getMinutes();
  for (const slot of today?.slots) {
    const [openH, openM] = slot?.open?.split(':')?.map(Number);
    const [closeH, closeM] = slot?.close?.split(':')?.map(Number);
    const openMinutes = openH * 60 + openM;
    const closeMinutes = closeH * 60 + closeM;
    if (currentMinutes >= openMinutes && currentMinutes < closeMinutes) {
      const minsLeft = closeMinutes - currentMinutes;
      if (minsLeft <= 60) return { open: true, label: `Abierto · Cierra en ${minsLeft} min` };
      return { open: true, label: `Abierto · Cierra a las ${slot?.close}` };
    }
  }
  const firstSlot = today?.slots?.[0];
  return { open: false, label: `Cerrado · Abre ${firstSlot?.open || ''}` };
}

export default function OpeningHours({ hours }) {
  const [expanded, setExpanded] = useState(false);
  const status = getCurrentStatus(hours);
  const now = new Date();
  const todayIndex = now?.getDay() === 0 ? 6 : now?.getDay() - 1;

  if (!hours) return null;

  // always_open mode
  if (hours?.mode === 'always_open') {
    return (
      <div className="bg-card border border-border rounded-lg p-4 md:p-5">
        <div className="flex items-center gap-2">
          <Icon name="Clock" size={18} color="var(--color-primary)" />
          <span className="font-heading font-semibold text-base text-foreground">Horario</span>
        </div>
        <div className="mt-2 flex items-center gap-2">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-medium bg-green-100 text-green-700">
            <Icon name="Clock" size={14} color="currentColor" />
            Abierto 24/7
          </span>
        </div>
      </div>
    );
  }

  // variable mode (new and legacy)
  if (hours?.mode === 'variable' || hours?.variable === true) {
    return (
      <div className="bg-card border border-border rounded-lg p-4 md:p-5">
        <div className="flex items-center gap-2">
          <Icon name="Clock" size={18} color="var(--color-primary)" />
          <span className="font-heading font-semibold text-base text-foreground">Horario</span>
        </div>
        <p className="mt-2 text-sm font-caption text-muted-foreground flex items-center gap-2">
          <Icon name="MessageCircle" size={15} color="var(--color-primary)" />
          Horario variable – Consulta por WhatsApp
        </p>
      </div>
    );
  }

  // Determine day source (new by_day format or legacy flat keys)
  const getDayData = (key) => {
    if (hours?.mode === 'by_day') return hours?.days?.[key];
    return hours?.[key];
  };

  return (
    <div className="bg-card border border-border rounded-lg p-4 md:p-5">
      <button
        onClick={() => setExpanded((v) => !v)}
        className="w-full flex items-center justify-between focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-md"
        aria-expanded={expanded}
      >
        <div className="flex items-center gap-2">
          <Icon name="Clock" size={18} color="var(--color-primary)" />
          <span className="font-heading font-semibold text-base text-foreground">Horario</span>
        </div>
        <div className="flex items-center gap-2">
          <span className={`text-sm font-caption font-medium ${status?.open ? 'text-green-600' : 'text-red-500'}`}>
            {status?.label}
          </span>
          <Icon name={expanded ? 'ChevronUp' : 'ChevronDown'} size={16} color="var(--color-secondary)" />
        </div>
      </button>
      {expanded && (
        <div className="mt-4 space-y-1">
          {DAY_KEYS?.map((key, i) => {
            const dayData = formatSlots(getDayData(key));
            const isToday = i === todayIndex;
            return (
              <div
                key={key}
                className={`flex items-start justify-between py-1.5 px-2 rounded-md text-sm font-caption ${
                  isToday ? 'bg-primary/5 font-medium text-foreground' : 'text-muted-foreground'
                }`}
              >
                <span className={`w-24 shrink-0 ${isToday ? 'text-primary font-semibold' : ''}`}>{DAYS?.[i]}</span>
                {!dayData || dayData?.closed ? (
                  <span className="text-red-500">Cerrado</span>
                ) : dayData?.allDay ? (
                  <span className="text-green-600">24 horas</span>
                ) : (
                  <div className="text-right space-y-0.5">
                    {dayData?.slots?.map((slot, si) => (
                      <div key={si}>{slot?.open} – {slot?.close}</div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}