import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';

vi.mock('../../lib/supabase', () => ({
  supabase: { from: vi.fn(() => ({ select: vi.fn(() => ({ eq: vi.fn(() => Promise.resolve({ count: 0, data: [] })), order: vi.fn(() => ({ limit: vi.fn(() => Promise.resolve({ data: [] })) })) })) })) },
}));

import AdminNotificationsPanel from './AdminNotificationsPanel';

beforeEach(() => {
  vi.clearAllMocks();
});

describe('AdminNotificationsPanel — ancho del panel desplegable', () => {
  it('usa un ancho fijo explícito, nunca w-full — este panel vive dentro de un wrapper "relative" cuyo único hijo en flujo normal es el botón de campana (~36px); w-full ahí colapsa el panel a ese ancho en vez de a un tamaño propio', async () => {
    render(<AdminNotificationsPanel onNavigate={vi.fn()} />);

    fireEvent.click(screen.getByLabelText('Notificaciones'));

    const panel = await screen.findByText('Notificaciones', { selector: 'span' });
    const panelBox = panel?.closest('[class*="absolute"]');
    expect(panelBox)?.toBeTruthy();
    expect(panelBox?.className)?.not?.toMatch(/\bw-full\b/);
  });

  it('el ancho fijo cae en el rango pedido (~340–400px) y tiene un tope basado en el viewport para no desbordar en móvil', async () => {
    render(<AdminNotificationsPanel onNavigate={vi.fn()} />);

    fireEvent.click(screen.getByLabelText('Notificaciones'));

    const panel = await screen.findByText('Notificaciones', { selector: 'span' });
    const panelBox = panel?.closest('[class*="absolute"]');

    const widthMatch = panelBox?.className?.match(/\bw-\[(\d+)px\]/);
    expect(widthMatch)?.toBeTruthy();
    const widthPx = Number(widthMatch?.[1]);
    expect(widthPx)?.toBeGreaterThanOrEqual(340);
    expect(widthPx)?.toBeLessThanOrEqual(400);

    expect(panelBox?.className)?.toMatch(/max-w-\[calc\(100vw/);
  });

  it('sigue abriendo y cerrando el panel con normalidad (sin cambios de comportamiento, solo de ancho)', async () => {
    render(<AdminNotificationsPanel onNavigate={vi.fn()} />);

    expect(screen.queryByText('Notificaciones', { selector: 'span' }))?.not?.toBeInTheDocument();

    fireEvent.click(screen.getByLabelText('Notificaciones'));
    expect(await screen.findByText('Notificaciones', { selector: 'span' }))?.toBeInTheDocument();

    fireEvent.click(screen.getByLabelText('Notificaciones'));
    expect(screen.queryByText('Notificaciones', { selector: 'span' }))?.not?.toBeInTheDocument();
  });
});
