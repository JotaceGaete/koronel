// Pulse rules — Fase 1 implementation (no AI, pure logic)
// Returns { pulse, reason, cta } based on business activity context.

export const PULSE = {
  GREEN:  'green',
  YELLOW: 'yellow',
  RED:    'red',
  BLUE:   'blue',
};

export const PULSE_CONFIG = {
  green:  { label: 'Tu negocio está activo',           color: '#22c55e', bg: '#f0fdf4', icon: 'CheckCircle2' },
  yellow: { label: 'Hace días que no publicas',         color: '#f59e0b', bg: '#fffbeb', icon: 'AlertCircle'  },
  red:    { label: 'Estás perdiendo visibilidad',       color: '#ef4444', bg: '#fef2f2', icon: 'XCircle'      },
  blue:   { label: 'Hoy tuviste muchas visitas',        color: '#3b82f6', bg: '#eff6ff', icon: 'TrendingUp'   },
};

/**
 * @param {object} ctx
 * @param {number} ctx.daysSinceLastAction   - days since last active action
 * @param {number} ctx.viewsLast7d           - view count in last 7 days
 * @param {number} ctx.viewsPrev7d           - view count in prior 7 days
 * @param {number} ctx.activeActionsCount    - currently active actions
 */
export function computePulse({ daysSinceLastAction, viewsLast7d, viewsPrev7d, activeActionsCount }) {
  const days = daysSinceLastAction ?? 999;
  const views7 = viewsLast7d ?? 0;
  const viewsPrev = viewsPrev7d ?? 0;
  const active = activeActionsCount ?? 0;

  // Blue: spike in views with no recent action — opportunity to convert
  if (views7 > Math.max(viewsPrev * 1.5, 20) && days > 3) {
    return {
      pulse: PULSE.BLUE,
      reason: `Recibiste muchas visitas esta semana pero llevas ${days} días sin publicar nada.`,
      cta: 'Convierte esas visitas en ventas',
    };
  }

  // Green: active action in last 7 days
  if (days <= 7 && active > 0) {
    return {
      pulse: PULSE.GREEN,
      reason: 'Tienes acciones activas. Tu negocio tiene buena visibilidad.',
      cta: null,
    };
  }

  // Green: no actions but very recent (≤3 days) and just registered
  if (days <= 3) {
    return {
      pulse: PULSE.GREEN,
      reason: 'Tu negocio está visible en Koronel.',
      cta: 'Publica tu primera acción para llegar a más personas',
    };
  }

  // Yellow: 7-14 days without action
  if (days <= 14) {
    return {
      pulse: PULSE.YELLOW,
      reason: `Llevas ${days} días sin publicar nada. Los negocios que publican semanalmente reciben 3x más consultas.`,
      cta: 'Crear una acción ahora',
    };
  }

  // Red: more than 14 days without action
  return {
    pulse: PULSE.RED,
    reason: `Llevas más de ${Math.floor(days / 7)} semana${days > 14 ? 's' : ''} sin publicar. Tu visibilidad está cayendo.`,
    cta: 'Recupera tu visibilidad',
  };
}
