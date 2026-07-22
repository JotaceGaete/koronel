import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';

vi.mock('../../../services/adminService', () => ({
  adminAdService: {
    getAll: vi.fn(),
    update: vi.fn(),
    remove: vi.fn(),
  },
}));

import { adminAdService } from '../../../services/adminService';
import AdminProfesionales from './AdminProfesionales';

const firstAd = {
  id: 'ad-1',
  ad_status: 'active',
  provider_display_name: 'Juan Pérez, Gasfíter',
  category: 'Gasfitería',
  location: 'Centro',
  phone: '+56911111111',
  provider_verified: false,
  price_type: 'visit',
  price: 10000,
};

const secondAd = {
  id: 'ad-2',
  ad_status: 'pending',
  provider_display_name: 'María Soto, Abogada',
  category: 'Legal',
  location: 'Lagunillas',
  provider_verified: true,
  price_type: 'hourly',
  price: 20000,
};

beforeEach(() => {
  vi.clearAllMocks();
});

describe('AdminProfesionales — encabezado de la tabla ya no es sticky (regresión visual)', () => {
  it('el thead no usa position sticky ni un offset top manual — esa combinación tapaba la primera fila', async () => {
    adminAdService?.getAll?.mockResolvedValue([firstAd]);
    const { container } = render(<AdminProfesionales />);
    await screen.findByText('Juan Pérez, Gasfíter');

    const thead = container?.querySelector('thead');
    expect(thead)?.toBeTruthy();
    expect(thead?.className)?.not?.toMatch(/\bsticky\b/);
    expect(thead?.className)?.not?.toMatch(/top-\[/);
  });
});

describe('AdminProfesionales — el primer registro carga completo y visible', () => {
  it('renderiza el primer profesional con todos sus datos (nombre, categoría, zona, precio)', async () => {
    adminAdService?.getAll?.mockResolvedValue([firstAd]);
    render(<AdminProfesionales />);

    expect(await screen.findByText('Juan Pérez, Gasfíter'))?.toBeInTheDocument();
    expect(screen.getByText('Gasfitería'))?.toBeInTheDocument();
    expect(screen.getByText('Centro'))?.toBeInTheDocument();
    expect(screen.getByText(/\+56911111111/))?.toBeInTheDocument();
  });

  it('renderiza varios registros — el primero y el último son igualmente accesibles', async () => {
    adminAdService?.getAll?.mockResolvedValue([firstAd, secondAd]);
    render(<AdminProfesionales />);

    expect(await screen.findByText('Juan Pérez, Gasfíter'))?.toBeInTheDocument();
    expect(screen.getByText('María Soto, Abogada'))?.toBeInTheDocument();
  });
});

describe('AdminProfesionales — sin regresiones funcionales', () => {
  it('el buscador sigue re-consultando adminAdService.getAll con el término de búsqueda', async () => {
    adminAdService?.getAll?.mockResolvedValue([]);
    render(<AdminProfesionales />);
    await screen.findByText('No hay profesionales publicados');

    fireEvent.change(screen.getByPlaceholderText('Buscar profesional...'), { target: { value: 'gasfiter' } });

    await waitFor(() => {
      expect(adminAdService?.getAll)?.toHaveBeenCalledWith(
        expect.objectContaining({ search: 'gasfiter', listingType: 'profesionales' })
      );
    });
  });

  it('el filtro de estado sigue re-consultando con el status elegido', async () => {
    adminAdService?.getAll?.mockResolvedValue([]);
    render(<AdminProfesionales />);
    await screen.findByText('No hay profesionales publicados');

    fireEvent.change(screen.getByDisplayValue('Todos los estados'), { target: { value: 'pending' } });

    await waitFor(() => {
      expect(adminAdService?.getAll)?.toHaveBeenCalledWith(
        expect.objectContaining({ status: 'pending', listingType: 'profesionales' })
      );
    });
  });

  it('aprobar una ficha pendiente sigue llamando a adminAdService.update con ad_status: active', async () => {
    adminAdService?.getAll?.mockResolvedValue([secondAd]);
    adminAdService?.update?.mockResolvedValue({ ...secondAd, ad_status: 'active' });
    render(<AdminProfesionales />);
    await screen.findByText('María Soto, Abogada');

    fireEvent.click(screen.getByText('Aprobar'));

    await waitFor(() => {
      expect(adminAdService?.update)?.toHaveBeenCalledWith('ad-2', expect.objectContaining({ ad_status: 'active' }));
    });
  });

  it('marcar/quitar verificación sigue llamando a adminAdService.update con provider_verified', async () => {
    adminAdService?.getAll?.mockResolvedValue([firstAd]);
    adminAdService?.update?.mockResolvedValue({ ...firstAd, provider_verified: true });
    render(<AdminProfesionales />);
    await screen.findByText('Juan Pérez, Gasfíter');

    fireEvent.click(screen.getByTitle('Marcar como verificado'));

    await waitFor(() => {
      expect(adminAdService?.update)?.toHaveBeenCalledWith('ad-1', { provider_verified: true });
    });
  });

  it('eliminar sigue pidiendo confirmación y llamando a adminAdService.remove', async () => {
    const confirmSpy = vi.spyOn(window, 'confirm')?.mockReturnValue(true);
    adminAdService?.getAll?.mockResolvedValue([firstAd]);
    adminAdService?.remove?.mockResolvedValue(undefined);
    render(<AdminProfesionales />);
    await screen.findByText('Juan Pérez, Gasfíter');

    fireEvent.click(screen.getByTitle('Eliminar ficha'));

    expect(confirmSpy)?.toHaveBeenCalled();
    await waitFor(() => {
      expect(adminAdService?.remove)?.toHaveBeenCalledWith('ad-1');
    });
    confirmSpy?.mockRestore();
  });
});
