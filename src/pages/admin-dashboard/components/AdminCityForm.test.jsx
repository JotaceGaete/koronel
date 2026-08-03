import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';

const getById = vi.fn();
const update = vi.fn();
vi.mock('../../../services/cityAdminService', () => ({
  cityAdminService: {
    getById: (...args) => getById(...args),
    update: (...args) => update(...args),
  },
}));

import AdminCityForm from './AdminCityForm';

const FULL_DATA = {
  communityCityId: 'cc-1',
  cityName: 'Coronel',
  brandName: 'Koronel',
  countryName: 'Chile',
  region: 'Biobío',
  logoUrl: 'https://x/logo.png',
  colorPrimary: '#112233',
  seoDescription: 'Portal de Coronel',
  heroTitle: 'Bienvenido a Coronel',
  heroSubtitle: 'Tu ciudad',
  searchPlaceholder: 'Buscar en Coronel...',
  footerText: '© Coronel',
};

beforeEach(() => {
  vi.clearAllMocks();
});

describe('AdminCityForm', () => {
  it('recibe communityCityId y lo usa para cargar los datos', async () => {
    getById?.mockResolvedValue(FULL_DATA);
    render(<AdminCityForm communityCityId="cc-1" onClose={() => {}} />);
    await waitFor(() => expect(getById)?.toHaveBeenCalledWith('cc-1'));
  });

  it('muestra un spinner mientras carga y no renderiza el formulario', async () => {
    let resolvePromise;
    getById?.mockReturnValue(new Promise((resolve) => { resolvePromise = resolve; }));
    const { container } = render(<AdminCityForm communityCityId="cc-1" onClose={() => {}} />);

    expect(container?.querySelector('.animate-spin'))?.toBeInTheDocument();
    expect(screen.queryByText('Identidad'))?.not?.toBeInTheDocument();

    resolvePromise(FULL_DATA);
    await waitFor(() => expect(screen.getByText('Identidad'))?.toBeInTheDocument());
  });

  it('prellena correctamente los 11 campos', async () => {
    getById?.mockResolvedValue(FULL_DATA);
    render(<AdminCityForm communityCityId="cc-1" onClose={() => {}} />);

    expect(await screen.findByDisplayValue('Coronel'))?.toBeInTheDocument();
    expect(screen.getByDisplayValue('Koronel'))?.toBeInTheDocument();
    expect(screen.getByDisplayValue('Chile'))?.toBeInTheDocument();
    expect(screen.getByDisplayValue('Biobío'))?.toBeInTheDocument();
    expect(screen.getByDisplayValue('https://x/logo.png'))?.toBeInTheDocument();
    expect(screen.getAllByDisplayValue('#112233')?.length)?.toBeGreaterThan(0);
    expect(screen.getByDisplayValue('Portal de Coronel'))?.toBeInTheDocument();
    expect(screen.getByDisplayValue('Bienvenido a Coronel'))?.toBeInTheDocument();
    expect(screen.getByDisplayValue('Tu ciudad'))?.toBeInTheDocument();
    expect(screen.getByDisplayValue('Buscar en Coronel...'))?.toBeInTheDocument();
    expect(screen.getByDisplayValue('© Coronel'))?.toBeInTheDocument();
  });

  it('permite editar un campo', async () => {
    getById?.mockResolvedValue(FULL_DATA);
    render(<AdminCityForm communityCityId="cc-1" onClose={() => {}} />);

    const input = await screen.findByDisplayValue('Coronel');
    fireEvent.change(input, { target: { value: 'Coronel Editado' } });
    expect(input?.value)?.toBe('Coronel Editado');
  });

  it('al guardar llama a cityAdminService.update(communityCityId, payload) con los valores del formulario', async () => {
    getById?.mockResolvedValue(FULL_DATA);
    update?.mockResolvedValue({});
    render(<AdminCityForm communityCityId="cc-1" onClose={() => {}} />);

    const input = await screen.findByDisplayValue('Coronel');
    fireEvent.change(input, { target: { value: 'Coronel Editado' } });
    fireEvent.click(screen.getByRole('button', { name: 'Guardar' }));

    await waitFor(() => expect(update)?.toHaveBeenCalledWith(
      'cc-1',
      expect.objectContaining({ cityName: 'Coronel Editado' })
    ));
  });

  it('evita doble envío mientras guarda (botón deshabilitado)', async () => {
    getById?.mockResolvedValue(FULL_DATA);
    let resolveUpdate;
    update?.mockReturnValue(new Promise((resolve) => { resolveUpdate = resolve; }));
    render(<AdminCityForm communityCityId="cc-1" onClose={() => {}} />);

    await screen.findByDisplayValue('Coronel');
    fireEvent.click(screen.getByRole('button', { name: 'Guardar' }));

    await waitFor(() => expect(screen.getByRole('button', { name: 'Guardando...' }))?.toBeDisabled());

    resolveUpdate({});
    await waitFor(() => expect(screen.getByRole('button', { name: 'Guardar' }))?.not?.toBeDisabled());
  });

  it('después de guardar vuelve a llamar getById(communityCityId) y rehidrata el formulario con la respuesta real', async () => {
    getById?.mockResolvedValueOnce(FULL_DATA);
    update?.mockResolvedValue({});
    const REFRESHED = { ...FULL_DATA, cityName: 'Coronel (desde servidor)' };

    render(<AdminCityForm communityCityId="cc-1" onClose={() => {}} />);
    await screen.findByDisplayValue('Coronel');

    getById?.mockResolvedValueOnce(REFRESHED);
    fireEvent.click(screen.getByRole('button', { name: 'Guardar' }));

    await waitFor(() => expect(getById)?.toHaveBeenCalledTimes(2));
    expect(getById)?.toHaveBeenLastCalledWith('cc-1');
    expect(await screen.findByDisplayValue('Coronel (desde servidor)'))?.toBeInTheDocument();
  });

  it('muestra un mensaje de éxito tras guardar', async () => {
    getById?.mockResolvedValue(FULL_DATA);
    update?.mockResolvedValue({});
    render(<AdminCityForm communityCityId="cc-1" onClose={() => {}} />);

    await screen.findByDisplayValue('Coronel');
    fireEvent.click(screen.getByRole('button', { name: 'Guardar' }));

    expect(await screen.findByText('Cambios guardados correctamente.'))?.toBeInTheDocument();
  });

  it('un error de guardado conserva exactamente lo escrito por el usuario', async () => {
    getById?.mockResolvedValue(FULL_DATA);
    update?.mockRejectedValue(new Error('fallo al guardar'));
    render(<AdminCityForm communityCityId="cc-1" onClose={() => {}} />);

    const input = await screen.findByDisplayValue('Coronel');
    fireEvent.change(input, { target: { value: 'Coronel Sin Guardar' } });
    fireEvent.click(screen.getByRole('button', { name: 'Guardar' }));

    expect(await screen.findByText('fallo al guardar'))?.toBeInTheDocument();
    expect(screen.getByDisplayValue('Coronel Sin Guardar'))?.toBeInTheDocument();
    // No se recarga tras un error de guardado: getById solo se llamó en la carga inicial.
    expect(getById)?.toHaveBeenCalledTimes(1);
  });

  it('un error de lectura no muestra un formulario incompleto', async () => {
    getById?.mockRejectedValue(new Error('no encontrada'));
    render(<AdminCityForm communityCityId="cc-1" onClose={() => {}} />);

    expect(await screen.findByText(/no encontrada/))?.toBeInTheDocument();
    expect(screen.queryByText('Identidad'))?.not?.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Guardar' }))?.not?.toBeInTheDocument();
  });
});
