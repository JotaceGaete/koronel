import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';

vi.mock('../../../services/publicServicesService', () => ({
  publicServicesService: {
    adminGetAll: vi.fn(),
    adminSetActive: vi.fn(),
    adminDelete: vi.fn(),
  },
  PUBLIC_SERVICE_CATEGORIES: [
    { key: 'instituciones_publicas', label: 'Instituciones públicas' },
    { key: 'salud', label: 'Salud' },
    { key: 'emergencias', label: 'Emergencias' },
    { key: 'atencion_ciudadana', label: 'Atención ciudadana' },
  ],
  getPublicServiceCategoryLabel: (key) => ({
    instituciones_publicas: 'Instituciones públicas',
    salud: 'Salud',
    emergencias: 'Emergencias',
    atencion_ciudadana: 'Atención ciudadana',
  }?.[key] || key),
}));

// El formulario se prueba a fondo por separado; acá solo confirmamos que se abre.
vi.mock('./AdminPublicServiceForm', () => ({
  default: ({ service, onClose }) => (
    <div>
      <p>Formulario: {service ? `Editar ${service?.name}` : 'Nuevo'}</p>
      <button onClick={onClose}>cerrar-formulario-test</button>
    </div>
  ),
}));

import { publicServicesService } from '../../../services/publicServicesService';
import AdminPublicServicesList from './AdminPublicServicesList';

const activeService = {
  id: 'svc-1',
  name: 'Municipalidad de Coronel',
  institution_type: 'Municipalidad',
  category_key: 'instituciones_publicas',
  address: 'Los Notros 1489, Coronel',
  status: 'published',
  verified_at: '2026-07-22',
  updated_at: '2026-07-22T00:00:00Z',
};

const inactiveServiceNoOptionalFields = {
  id: 'svc-2',
  name: 'Cuerpo de Bomberos de Coronel',
  institution_type: 'Bomberos',
  category_key: 'emergencias',
  address: null,
  status: 'draft',
  verified_at: null,
  updated_at: null,
};

beforeEach(() => {
  vi.clearAllMocks();
});

describe('AdminPublicServicesList — carga', () => {
  it('carga y muestra los servicios del listado admin (activos e inactivos)', async () => {
    publicServicesService?.adminGetAll?.mockResolvedValue({ data: [activeService, inactiveServiceNoOptionalFields], error: null });
    render(<AdminPublicServicesList />);

    expect(await screen.findByText('Municipalidad de Coronel'))?.toBeInTheDocument();
    expect(screen.getByText('Cuerpo de Bomberos de Coronel'))?.toBeInTheDocument();
    expect(screen.getByText('Activo'))?.toBeInTheDocument();
    expect(screen.getByText('Inactivo'))?.toBeInTheDocument();
  });

  it('los campos opcionales ausentes (dirección, fechas) no rompen el render — se muestran como "—"', async () => {
    publicServicesService?.adminGetAll?.mockResolvedValue({ data: [inactiveServiceNoOptionalFields], error: null });
    render(<AdminPublicServicesList />);

    expect(await screen.findByText('Cuerpo de Bomberos de Coronel'))?.toBeInTheDocument();
    expect(screen.getAllByText('—')?.length)?.toBeGreaterThan(0);
  });

  it('abre el formulario de creación al hacer clic en "Agregar servicio"', async () => {
    publicServicesService?.adminGetAll?.mockResolvedValue({ data: [], error: null });
    render(<AdminPublicServicesList />);
    await screen.findByText('No se encontraron servicios.');

    fireEvent.click(screen.getByText('Agregar servicio'));

    expect(await screen.findByText('Formulario: Nuevo'))?.toBeInTheDocument();
  });

  it('el buscador re-consulta adminGetAll con el término de búsqueda', async () => {
    publicServicesService?.adminGetAll?.mockResolvedValue({ data: [], error: null });
    render(<AdminPublicServicesList />);
    await screen.findByText('No se encontraron servicios.');

    fireEvent.change(screen.getByPlaceholderText('Buscar por nombre...'), { target: { value: 'hospital' } });

    await waitFor(() => {
      expect(publicServicesService?.adminGetAll)?.toHaveBeenCalledWith(
        expect.objectContaining({ search: 'hospital' })
      );
    });
  });
});

describe('AdminPublicServicesList — activar/desactivar', () => {
  it('desactivar un servicio activo llama a adminSetActive(id, false)', async () => {
    publicServicesService?.adminGetAll?.mockResolvedValue({ data: [activeService], error: null });
    publicServicesService?.adminSetActive?.mockResolvedValue({ data: { ...activeService, status: 'draft' }, error: null });
    render(<AdminPublicServicesList />);

    fireEvent.click(await screen.findByTitle('Desactivar'));

    await waitFor(() => {
      expect(publicServicesService?.adminSetActive)?.toHaveBeenCalledWith('svc-1', false);
    });
    expect(await screen.findByText('Inactivo'))?.toBeInTheDocument();
  });

  it('activar un servicio inactivo llama a adminSetActive(id, true)', async () => {
    publicServicesService?.adminGetAll?.mockResolvedValue({ data: [inactiveServiceNoOptionalFields], error: null });
    publicServicesService?.adminSetActive?.mockResolvedValue({ data: { ...inactiveServiceNoOptionalFields, status: 'published' }, error: null });
    render(<AdminPublicServicesList />);

    fireEvent.click(await screen.findByTitle('Activar'));

    await waitFor(() => {
      expect(publicServicesService?.adminSetActive)?.toHaveBeenCalledWith('svc-2', true);
    });
    expect(await screen.findByText('Activo'))?.toBeInTheDocument();
  });
});

describe('AdminPublicServicesList — eliminación', () => {
  it('muestra la confirmación reforzada (con el nombre del servicio) antes de eliminar, sin llamar a adminDelete todavía', async () => {
    publicServicesService?.adminGetAll?.mockResolvedValue({ data: [activeService], error: null });
    render(<AdminPublicServicesList />);

    fireEvent.click(await screen.findByTitle('Eliminar'));

    expect(await screen.findByText(/Vas a eliminar/))?.toBeInTheDocument();
    expect(screen.getByText('Municipalidad de Coronel', { selector: 'strong' }))?.toBeInTheDocument();
    expect(publicServicesService?.adminDelete)?.not?.toHaveBeenCalled();

    // El botón de confirmar sigue deshabilitado hasta escribir el nombre exacto.
    const confirmButton = screen.getByRole('button', { name: 'Eliminar definitivamente' });
    expect(confirmButton)?.toBeDisabled();
  });

  it('solo llama a adminDelete cuando se escribe el nombre exacto y se confirma', async () => {
    publicServicesService?.adminGetAll?.mockResolvedValue({ data: [activeService], error: null });
    publicServicesService?.adminDelete?.mockResolvedValue({ error: null });
    render(<AdminPublicServicesList />);

    fireEvent.click(await screen.findByTitle('Eliminar'));
    const [, confirmInput] = screen.getAllByRole('textbox');
    fireEvent.change(confirmInput, { target: { value: 'Municipalidad de Coronel' } });

    const confirmButton = screen.getByRole('button', { name: 'Eliminar definitivamente' });
    expect(confirmButton)?.not?.toBeDisabled();
    fireEvent.click(confirmButton);

    await waitFor(() => {
      expect(publicServicesService?.adminDelete)?.toHaveBeenCalledWith('svc-1');
    });
  });

  it('si adminDelete falla (p. ej. por reportes asociados), muestra el mensaje de error sin romper la página', async () => {
    publicServicesService?.adminGetAll?.mockResolvedValue({ data: [activeService], error: null });
    publicServicesService?.adminDelete?.mockResolvedValue({ error: new Error('No se puede eliminar: este servicio tiene reportes asociados. Desactívalo, o resuelve/descarta sus reportes primero.') });
    render(<AdminPublicServicesList />);

    fireEvent.click(await screen.findByTitle('Eliminar'));
    const [, confirmInput] = screen.getAllByRole('textbox');
    fireEvent.change(confirmInput, { target: { value: 'Municipalidad de Coronel' } });
    fireEvent.click(screen.getByRole('button', { name: 'Eliminar definitivamente' }));

    expect(await screen.findByText(/tiene reportes asociados/))?.toBeInTheDocument();
    // La fila sigue en la lista: no se eliminó ante el error.
    expect(screen.getByText('Municipalidad de Coronel'))?.toBeInTheDocument();
  });
});
