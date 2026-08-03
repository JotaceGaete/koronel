import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';

const getAll = vi.fn();
vi.mock('../../../services/cityAdminService', () => ({
  cityAdminService: { getAll: (...args) => getAll(...args) },
}));

// El formulario se prueba a fondo en su propio archivo — acá solo confirmamos
// qué communityCityId recibe y que el listado sigue funcionando alrededor de él.
vi.mock('./AdminCityForm', () => ({
  default: ({ communityCityId }) => <div data-testid="admin-city-form">form:{communityCityId}</div>,
}));

import AdminCities from './AdminCities';

const CORONEL_ROW = {
  communityCityId: 'cc-1',
  nombre: 'Coronel',
  slug: 'coronel',
  estado: 'active',
  domains: ['coronel.cl', 'www.coronel.cl'],
  isLinked: true,
};

const UNLINKED_ROW = {
  communityCityId: 'cc-2',
  nombre: 'Otra Ciudad',
  slug: 'otra',
  estado: 'onboarding',
  domains: [],
  isLinked: false,
};

beforeEach(() => {
  vi.clearAllMocks();
});

describe('AdminCities', () => {
  it('muestra el estado de carga mientras getAll está pendiente', async () => {
    let resolvePromise;
    getAll?.mockReturnValue(new Promise((resolve) => { resolvePromise = resolve; }));
    const { container } = render(<AdminCities />);

    expect(container?.querySelector('.animate-pulse'))?.toBeInTheDocument();

    resolvePromise([]);
    await waitFor(() => expect(container?.querySelector('.animate-pulse'))?.not?.toBeInTheDocument());
  });

  it('lista Coronel con nombre, slug, estado, dominios y vínculo', async () => {
    getAll?.mockResolvedValue([CORONEL_ROW]);
    render(<AdminCities />);

    const row = (await screen.findByText('Coronel'))?.closest('tr');
    expect(within(row)?.getByText('Coronel'))?.toBeInTheDocument();
    expect(within(row)?.getByText('coronel'))?.toBeInTheDocument();
    expect(within(row)?.getByText('active'))?.toBeInTheDocument();
    expect(within(row)?.getByText('coronel.cl, www.coronel.cl'))?.toBeInTheDocument();
    expect(within(row)?.getByText('Vinculada'))?.toBeInTheDocument();
  });

  it('muestra "Vinculada" cuando isLinked === true', async () => {
    getAll?.mockResolvedValue([CORONEL_ROW]);
    render(<AdminCities />);
    expect(await screen.findByText('Vinculada'))?.toBeInTheDocument();
    expect(screen.queryByText('Sin vincular'))?.not?.toBeInTheDocument();
  });

  it('muestra "Sin vincular" cuando isLinked === false', async () => {
    getAll?.mockResolvedValue([UNLINKED_ROW]);
    render(<AdminCities />);
    expect(await screen.findByText('Sin vincular'))?.toBeInTheDocument();
    expect(screen.queryByText('Vinculada'))?.not?.toBeInTheDocument();
  });

  it('el botón Editar abre el formulario', async () => {
    getAll?.mockResolvedValue([CORONEL_ROW]);
    render(<AdminCities />);
    const row = (await screen.findByText('Coronel'))?.closest('tr');
    fireEvent.click(within(row)?.getByRole('button'));
    expect(await screen.findByTestId('admin-city-form'))?.toBeInTheDocument();
  });

  it('pasa exactamente el communityCityId seleccionado al formulario, nunca el slug', async () => {
    getAll?.mockResolvedValue([CORONEL_ROW, UNLINKED_ROW]);
    render(<AdminCities />);

    const otraRow = (await screen.findByText('Otra Ciudad'))?.closest('tr');
    fireEvent.click(within(otraRow)?.getByRole('button'));

    const form = await screen.findByTestId('admin-city-form');
    expect(form?.textContent)?.toBe('form:cc-2');
    expect(form?.textContent)?.not?.toContain(UNLINKED_ROW?.slug);
  });

  it('error de carga muestra un mensaje visible', async () => {
    getAll?.mockRejectedValue(new Error('fallo de red'));
    render(<AdminCities />);
    expect(await screen.findByText('fallo de red'))?.toBeInTheDocument();
  });

  it('no existe un botón funcional "Nueva ciudad"', async () => {
    getAll?.mockResolvedValue([CORONEL_ROW]);
    render(<AdminCities />);
    await screen.findByText('Coronel');
    expect(screen.queryByText(/nueva ciudad/i))?.not?.toBeInTheDocument();
  });
});
