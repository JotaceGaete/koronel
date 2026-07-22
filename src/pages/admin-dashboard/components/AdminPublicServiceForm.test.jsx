import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';

vi.mock('../../../services/publicServicesService', () => ({
  publicServicesService: {
    adminCreate: vi.fn(),
    adminUpdate: vi.fn(),
  },
  PUBLIC_SERVICE_CATEGORIES: [
    { key: 'instituciones_publicas', label: 'Instituciones públicas' },
    { key: 'salud', label: 'Salud' },
    { key: 'emergencias', label: 'Emergencias' },
    { key: 'atencion_ciudadana', label: 'Atención ciudadana' },
  ],
}));

import { publicServicesService } from '../../../services/publicServicesService';
import AdminPublicServiceForm from './AdminPublicServiceForm';

beforeEach(() => {
  vi.clearAllMocks();
});

function fillRequiredFields({ name = 'Nuevo Servicio', category = 'salud', type = 'Hospital público' } = {}) {
  fireEvent.change(screen.getByPlaceholderText('Ej: Municipalidad de Coronel'), { target: { value: name } });
  fireEvent.change(screen.getByDisplayValue('— Elige —'), { target: { value: category } });
  fireEvent.change(screen.getByPlaceholderText('Ej: Hospital público'), { target: { value: type } });
}

// jsdom aplica su propia validación nativa (required / type="email") sobre un
// fireEvent.click en el botón submit, y bloquea el evento "submit" antes de que
// el onSubmit de React se ejecute — igual que un navegador real con HTML5
// constraint validation. Para probar los mensajes de error propios (los que sí
// ve el admin) hay que disparar el evento "submit" directamente, como ya hace
// el resto de la suite al no usar campos required/type inválidos al enviar.
function submitFormDirectly(container) {
  fireEvent.submit(container?.querySelector('form'));
}

describe('AdminPublicServiceForm — crear', () => {
  it('crear un servicio con solo los campos obligatorios llena los opcionales como null (no strings vacíos)', async () => {
    publicServicesService?.adminCreate?.mockResolvedValue({ data: { id: 'new-1' }, error: null });
    const onSaved = vi.fn();
    render(<AdminPublicServiceForm service={null} onClose={vi.fn()} onSaved={onSaved} />);

    fillRequiredFields();
    fireEvent.click(screen.getByText('Guardar'));

    await waitFor(() => expect(publicServicesService?.adminCreate)?.toHaveBeenCalled());
    const payload = publicServicesService?.adminCreate?.mock?.calls?.[0]?.[0];
    expect(payload?.name)?.toBe('Nuevo Servicio');
    expect(payload?.category_key)?.toBe('salud');
    expect(payload?.institution_type)?.toBe('Hospital público');
    // Todos los campos opcionales que quedaron vacíos deben ir como null.
    expect(payload?.address)?.toBe(null);
    expect(payload?.phone)?.toBe(null);
    expect(payload?.email)?.toBe(null);
    expect(payload?.schedule_note)?.toBe(null);
    expect(payload?.website)?.toBe(null);
    expect(payload?.whatsapp)?.toBe(null);
    expect(payload?.latitude)?.toBe(null);
    expect(payload?.longitude)?.toBe(null);
    expect(payload?.verified_at)?.toBe(null);
    expect(payload?.source_url)?.toBe(null);
    expect(payload?.status)?.toBe('published'); // "Servicio activo" viene marcado por defecto

    expect(onSaved)?.toHaveBeenCalledWith({ id: 'new-1' });
  });

  it('auto-genera el slug desde el nombre pero permite editarlo manualmente', async () => {
    publicServicesService?.adminCreate?.mockResolvedValue({ data: { id: 'new-1' }, error: null });
    render(<AdminPublicServiceForm service={null} onClose={vi.fn()} onSaved={vi.fn()} />);

    fireEvent.change(screen.getByPlaceholderText('Ej: Municipalidad de Coronel'), { target: { value: 'Hospital San José' } });
    expect(screen.getByPlaceholderText(/auto-generado/)?.value)?.toBe('hospital-san-jose');

    fireEvent.change(screen.getByPlaceholderText(/auto-generado/), { target: { value: 'hospital-personalizado' } });
    fireEvent.change(screen.getByPlaceholderText('Ej: Municipalidad de Coronel'), { target: { value: 'Hospital San José Cambiado' } });
    // Una vez editado a mano, cambiar el nombre ya no pisa el slug manual.
    expect(screen.getByPlaceholderText(/auto-generado/)?.value)?.toBe('hospital-personalizado');
  });

  it('no permite guardar sin nombre, categoría o tipo de institución', async () => {
    const { container } = render(<AdminPublicServiceForm service={null} onClose={vi.fn()} onSaved={vi.fn()} />);

    submitFormDirectly(container);

    expect(await screen.findByText('El nombre es obligatorio.'))?.toBeInTheDocument();
    expect(publicServicesService?.adminCreate)?.not?.toHaveBeenCalled();
  });

  it('valida el formato del correo antes de enviar', async () => {
    const { container } = render(<AdminPublicServiceForm service={null} onClose={vi.fn()} onSaved={vi.fn()} />);
    fillRequiredFields();
    fireEvent.change(container?.querySelector('input[type="email"]'), { target: { value: 'no-es-un-correo' } });

    submitFormDirectly(container);

    expect(await screen.findByText('El correo no tiene un formato válido.'))?.toBeInTheDocument();
    expect(publicServicesService?.adminCreate)?.not?.toHaveBeenCalled();
  });

  it('valida la URL del sitio web (y acepta un dominio sin protocolo agregando https://)', async () => {
    publicServicesService?.adminCreate?.mockResolvedValue({ data: { id: 'new-1' }, error: null });
    render(<AdminPublicServiceForm service={null} onClose={vi.fn()} onSaved={vi.fn()} />);
    fillRequiredFields();
    fireEvent.change(screen.getByPlaceholderText('https://...'), { target: { value: 'coronel.cl' } });

    fireEvent.click(screen.getByText('Guardar'));

    await waitFor(() => expect(publicServicesService?.adminCreate)?.toHaveBeenCalled());
    const payload = publicServicesService?.adminCreate?.mock?.calls?.[0]?.[0];
    expect(payload?.website)?.toBe('https://coronel.cl');
  });

  it('muestra un error entendible cuando el slug ya existe (violación de unicidad en la base)', async () => {
    publicServicesService?.adminCreate?.mockResolvedValue({
      data: null,
      error: new Error('Ya existe un servicio con ese slug. Elige otro.'),
    });
    render(<AdminPublicServiceForm service={null} onClose={vi.fn()} onSaved={vi.fn()} />);
    fillRequiredFields();

    fireEvent.click(screen.getByText('Guardar'));

    expect(await screen.findByText('Ya existe un servicio con ese slug. Elige otro.'))?.toBeInTheDocument();
  });

  it('evita doble envío: el botón se deshabilita mientras se guarda', async () => {
    let resolveCreate;
    publicServicesService?.adminCreate?.mockImplementation(() => new Promise(resolve => { resolveCreate = resolve; }));
    render(<AdminPublicServiceForm service={null} onClose={vi.fn()} onSaved={vi.fn()} />);
    fillRequiredFields();

    fireEvent.click(screen.getByText('Guardar'));
    await screen.findByText('Guardando...');
    expect(screen.getByText('Guardando...')?.closest('button'))?.toBeDisabled();

    resolveCreate({ data: { id: 'new-1' }, error: null });
  });
});

describe('AdminPublicServiceForm — editar', () => {
  const existingService = {
    id: 'svc-1',
    name: 'Municipalidad de Coronel',
    slug: 'municipalidad-de-coronel',
    category_key: 'instituciones_publicas',
    institution_type: 'Municipalidad',
    description: null,
    address: 'Los Notros 1489, Coronel',
    phone: '+56 41 240 7000',
    email: null,
    schedule_note: null,
    website: 'https://www.coronel.cl',
    whatsapp: null,
    latitude: null,
    longitude: null,
    status: 'published',
    verified_at: '2026-07-22',
    source_url: null,
  };

  it('precarga los datos existentes y llama a adminUpdate con el id correcto', async () => {
    publicServicesService?.adminUpdate?.mockResolvedValue({ data: { ...existingService, phone: '+56 41 000 0000' }, error: null });
    const onSaved = vi.fn();
    render(<AdminPublicServiceForm service={existingService} onClose={vi.fn()} onSaved={onSaved} />);

    expect(screen.getByDisplayValue('Municipalidad de Coronel'))?.toBeInTheDocument();
    fireEvent.change(screen.getByDisplayValue('+56 41 240 7000'), { target: { value: '+56 41 000 0000' } });
    fireEvent.click(screen.getByText('Guardar'));

    await waitFor(() => expect(publicServicesService?.adminUpdate)?.toHaveBeenCalledWith('svc-1', expect.objectContaining({ phone: '+56 41 000 0000' })));
    expect(onSaved)?.toHaveBeenCalled();
  });

  it('desmarcar "Servicio activo" guarda status: draft (desactivar)', async () => {
    publicServicesService?.adminUpdate?.mockResolvedValue({ data: existingService, error: null });
    render(<AdminPublicServiceForm service={existingService} onClose={vi.fn()} onSaved={vi.fn()} />);

    fireEvent.click(screen.getByLabelText('Servicio activo (visible en /servicios)'));
    fireEvent.click(screen.getByText('Guardar'));

    await waitFor(() => {
      expect(publicServicesService?.adminUpdate)?.toHaveBeenCalledWith('svc-1', expect.objectContaining({ status: 'draft' }));
    });
  });
});
