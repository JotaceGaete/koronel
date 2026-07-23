import React from 'react';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';

const getById = vi.fn();
vi.mock('../../../services/businessService', () => ({
  businessService: { getById: (...args) => getById(...args) },
}));

const adminBusinessGetAll = vi.fn();
const adminCategoryGetAll = vi.fn();
vi.mock('../../../services/adminService', () => ({
  adminBusinessService: {
    getAll: (...args) => adminBusinessGetAll(...args),
    update: vi.fn(),
    remove: vi.fn(),
  },
  adminCategoryService: { getAll: (...args) => adminCategoryGetAll(...args) },
}));

// El formulario se prueba a fondo en su propio archivo — acá solo confirmamos
// qué recibe como editItem y que la lista permanece funcionando alrededor de él.
vi.mock('./AdminBusinessForm', () => ({
  default: ({ editItem }) => <div data-testid="admin-business-form">form:{editItem ? JSON.stringify(editItem) : 'nuevo'}</div>,
}));

import AdminBusinesses from './AdminBusinesses';

const business = { id: 'biz-1', name: 'Ferretería Central', category: 'Ferretería', status: 'published', owner: { full_name: 'Juan' } };

beforeEach(() => {
  vi.clearAllMocks();
  adminBusinessGetAll.mockResolvedValue([business]);
  adminCategoryGetAll.mockResolvedValue([]);
});

describe('AdminBusinesses — el listado sigue funcionando', () => {
  it('carga y muestra el negocio en la tabla', async () => {
    render(<AdminBusinesses />);
    expect(await screen.findByText('Ferretería Central')).toBeInTheDocument();
  });

  it('un error al cargar el listado no derriba la página (se muestra, no se lanza)', async () => {
    adminBusinessGetAll.mockRejectedValue(new Error('network down'));
    render(<AdminBusinesses />);
    expect(await screen.findByText('network down')).toBeInTheDocument();
  });
});

describe('AdminBusinesses — abrir "Editar" (causa raíz: categories embed shadowing businesses.category)', () => {
  it('1. abre el formulario con un negocio completo, con category como string (nunca como objeto)', async () => {
    getById.mockResolvedValue({
      data: { ...business, category_ref: { id: 'cat-1', name: 'Ferretería', parent_id: null } },
      error: null,
    });
    render(<AdminBusinesses />);
    fireEvent.click(await screen.findByRole('button', { name: /Editar Ferretería Central/i }));

    const form = await screen.findByTestId('admin-business-form');
    const passed = JSON.parse(form?.textContent?.replace('form:', ''));
    expect(typeof passed?.category)?.toBe('string');
  });

  it('2. abre el formulario con un negocio con campos opcionales en null, sin crashear', async () => {
    getById.mockResolvedValue({
      data: { id: 'biz-2', name: 'Almacén El Sol', category: 'Almacén', category_ref: null, website: null, whatsapp: null },
      error: null,
    });
    adminBusinessGetAll.mockResolvedValue([{ id: 'biz-2', name: 'Almacén El Sol', category: 'Almacén', status: 'published' }]);
    render(<AdminBusinesses />);
    fireEvent.click(await screen.findByRole('button', { name: /Editar Almacén El Sol/i }));

    expect(await screen.findByTestId('admin-business-form')).toBeInTheDocument();
  });

  it('3. cuando category_ref viene como objeto, el formulario recibe un string en category', async () => {
    getById.mockResolvedValue({
      data: { ...business, category_ref: { id: 'cat-1', name: 'Ferretería', parent_id: null } },
      error: null,
    });
    render(<AdminBusinesses />);
    fireEvent.click(await screen.findByRole('button', { name: /Editar Ferretería Central/i }));

    const form = await screen.findByTestId('admin-business-form');
    expect(form?.textContent).not.toMatch(/\[object Object\]/);
  });

  it('4. cuando category_ref viene ya normalizado desde un array (servicio), el formulario sigue recibiendo un string en category', async () => {
    // La normalización array->objeto vive en businessService (probada por separado);
    // acá solo confirmamos que el consumidor no vuelve a exponer el objeto crudo.
    getById.mockResolvedValue({
      data: { ...business, category_ref: { id: 'cat-1', name: 'Ferretería', parent_id: null } },
      error: null,
    });
    render(<AdminBusinesses />);
    fireEvent.click(await screen.findByRole('button', { name: /Editar Ferretería Central/i }));

    const form = await screen.findByTestId('admin-business-form');
    const passed = JSON.parse(form?.textContent?.replace('form:', ''));
    expect(typeof passed?.category)?.toBe('string');
  });

  it('5. negocio inexistente: muestra "no se encontró", no abre el formulario, no crashea', async () => {
    getById.mockResolvedValue({ data: null, error: { code: 'PGRST116', message: 'no rows' } });
    render(<AdminBusinesses />);
    fireEvent.click(await screen.findByRole('button', { name: /Editar Ferretería Central/i }));

    expect(await screen.findByText(/No se encontró el negocio/i)).toBeInTheDocument();
    expect(screen.queryByTestId('admin-business-form')).not.toBeInTheDocument();
  });

  it('6. error de consulta al abrir "Editar": muestra un mensaje independiente, sin derribar toda la aplicación', async () => {
    getById.mockResolvedValue({ data: null, error: { code: '500', message: 'internal error' } });
    render(<AdminBusinesses />);
    fireEvent.click(await screen.findByRole('button', { name: /Editar Ferretería Central/i }));

    expect(await screen.findByText('No se pudo cargar el negocio para editarlo. Intenta de nuevo.')).toBeInTheDocument();
    // El listado sigue ahí — la app no cayó al ErrorBoundary.
    expect(screen.getByText('Ferretería Central')).toBeInTheDocument();
    expect(screen.queryByTestId('admin-business-form')).not.toBeInTheDocument();
  });

  it('muestra un indicador de carga (spinner) en el botón mientras se resuelve getById, y lo deshabilita', async () => {
    let resolveGetById;
    getById.mockReturnValue(new Promise((resolve) => { resolveGetById = resolve; }));
    render(<AdminBusinesses />);
    const editButton = await screen.findByRole('button', { name: /Editar Ferretería Central/i });
    fireEvent.click(editButton);

    expect(editButton).toBeDisabled();
    resolveGetById({ data: { ...business, category_ref: null }, error: null });
    await waitFor(() => expect(screen.getByTestId('admin-business-form')).toBeInTheDocument());
  });

  it('un error de "no encontrado" es independiente de uno de "error de consulta" (colores/mensajes distintos)', async () => {
    getById.mockResolvedValue({ data: null, error: { code: 'PGRST116', message: 'no rows' } });
    render(<AdminBusinesses />);
    fireEvent.click(await screen.findByRole('button', { name: /Editar Ferretería Central/i }));
    expect(await screen.findByText(/No se encontró el negocio/i)).toBeInTheDocument();
    expect(screen.queryByText('No se pudo cargar el negocio para editarlo. Intenta de nuevo.')).not.toBeInTheDocument();
  });
});

describe('AdminBusinesses — el botón "Editar" no navega (7. ruta declarada)', () => {
  it('no cambia la URL al hacer clic en "Editar" — es un cambio de estado dentro de /admin-dashboard, no una navegación', async () => {
    getById.mockResolvedValue({ data: { ...business, category_ref: null }, error: null });
    window.history.pushState({}, '', '/admin-dashboard');
    render(<AdminBusinesses />);
    fireEvent.click(await screen.findByRole('button', { name: /Editar Ferretería Central/i }));

    await screen.findByTestId('admin-business-form');
    expect(window.location.pathname).toBe('/admin-dashboard');
  });

  it('el código fuente no usa navigate() ni <Link> para abrir el formulario de edición (regresión estructural)', () => {
    const here = path.dirname(fileURLToPath(import.meta.url));
    const source = fs.readFileSync(path.join(here, 'AdminBusinesses.jsx'), 'utf-8');
    expect(source).not.toMatch(/useNavigate/);
    expect(source).not.toMatch(/<Link\b/);
  });

  it('/admin-dashboard está declarada en Routes.jsx', () => {
    const here = path.dirname(fileURLToPath(import.meta.url));
    const routesSource = fs.readFileSync(path.join(here, '../../../Routes.jsx'), 'utf-8');
    expect(routesSource).toMatch(/path="\/admin-dashboard"/);
  });
});
