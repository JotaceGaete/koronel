import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../lib/supabase', () => ({
  supabase: { from: vi.fn() },
}));

import { supabase } from '../lib/supabase';
import {
  publicServicesService,
  PUBLIC_SERVICE_CATEGORIES,
  PUBLIC_SERVICE_REPORT_STATUSES,
  getPublicServiceCategoryLabel,
} from './publicServicesService';

function makeBuilder(result) {
  const builder = {
    select: vi.fn(() => builder),
    insert: vi.fn(() => builder),
    update: vi.fn(() => builder),
    delete: vi.fn(() => builder),
    eq: vi.fn(() => builder),
    ilike: vi.fn(() => builder),
    order: vi.fn(() => builder),
    single: vi.fn(() => Promise.resolve(result)),
    maybeSingle: vi.fn(() => Promise.resolve(result)),
    then: (resolve, reject) => Promise.resolve(result).then(resolve, reject),
  };
  return builder;
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe('PUBLIC_SERVICE_CATEGORIES / getPublicServiceCategoryLabel', () => {
  it('has exactly the four categories requested for this module', () => {
    expect(PUBLIC_SERVICE_CATEGORIES?.map(c => c?.key))?.toEqual([
      'instituciones_publicas', 'salud', 'emergencias', 'atencion_ciudadana',
    ]);
  });

  it('maps each key to its display label', () => {
    expect(getPublicServiceCategoryLabel('salud'))?.toBe('Salud');
    expect(getPublicServiceCategoryLabel('emergencias'))?.toBe('Emergencias');
  });
});

describe('publicServicesService.getAll', () => {
  it('reads exclusively from public_services — never touches businesses or classified_ads', async () => {
    let queriedTable;
    supabase?.from?.mockImplementation((table) => {
      queriedTable = table;
      return makeBuilder({ data: [{ id: 'svc-1', name: 'Municipalidad de Coronel' }], error: null });
    });

    const { data, error } = await publicServicesService?.getAll();

    expect(error)?.toBeNull();
    expect(queriedTable)?.toBe('public_services');
    expect(supabase?.from)?.not?.toHaveBeenCalledWith('businesses');
    expect(supabase?.from)?.not?.toHaveBeenCalledWith('classified_ads');
    expect(data)?.toHaveLength(1);
  });

  it('filters by category_key from the query when a valid category is given', async () => {
    let builder;
    supabase?.from?.mockImplementation(() => {
      builder = makeBuilder({ data: [], error: null });
      return builder;
    });

    await publicServicesService?.getAll({ categoryKey: 'salud' });

    expect(builder?.eq?.mock?.calls)?.toContainEqual(['category_key', 'salud']);
  });

  it('ignores an invalid category key instead of sending it to the database', async () => {
    let builder;
    supabase?.from?.mockImplementation(() => {
      builder = makeBuilder({ data: [], error: null });
      return builder;
    });

    await publicServicesService?.getAll({ categoryKey: 'not-a-real-category' });

    expect(builder?.eq?.mock?.calls?.some(call => call?.[0] === 'category_key'))?.toBe(false);
  });

  it('returns an empty list (not a throw) when the query errors, e.g. table not migrated yet', async () => {
    supabase?.from?.mockImplementation(() => makeBuilder({ data: null, error: new Error('relation does not exist') }));

    const { data, error } = await publicServicesService?.getAll();

    expect(error)?.toBeTruthy();
    expect(data)?.toEqual([]);
  });
});

describe('publicServicesService.getById', () => {
  it('fetches a single published service by id', async () => {
    let builder;
    supabase?.from?.mockImplementation(() => {
      builder = makeBuilder({ data: { id: 'svc-1', name: 'Hospital San José de Coronel' }, error: null });
      return builder;
    });

    const { data, error } = await publicServicesService?.getById('svc-1');

    expect(error)?.toBeNull();
    expect(data?.id)?.toBe('svc-1');
    expect(builder?.eq?.mock?.calls)?.toContainEqual(['id', 'svc-1']);
  });
});

describe('publicServicesService.submitReport', () => {
  it('rejects an empty message before hitting the database', async () => {
    const { data, error } = await publicServicesService?.submitReport({ serviceId: 'svc-1', message: '   ' });

    expect(data)?.toBeNull();
    expect(error)?.toBeTruthy();
    expect(supabase?.from)?.not?.toHaveBeenCalled();
  });

  it('inserts into public_service_reports, never into public_services itself', async () => {
    let queriedTable;
    let insertedPayload;
    supabase?.from?.mockImplementation((table) => {
      queriedTable = table;
      return {
        insert: vi.fn((payload) => {
          insertedPayload = payload;
          return makeBuilder({ data: { id: 'report-1', ...payload }, error: null });
        }),
      };
    });

    const { error } = await publicServicesService?.submitReport({
      serviceId: 'svc-1',
      name: 'Vecino',
      email: 'vecino@example.com',
      message: 'El teléfono cambió',
    });

    expect(error)?.toBeNull();
    expect(queriedTable)?.toBe('public_service_reports');
    expect(insertedPayload?.service_id)?.toBe('svc-1');
    expect(insertedPayload?.message)?.toBe('El teléfono cambió');
  });

  it('never touches public_services when submitting a report — a reporter can only ever insert a report', async () => {
    supabase?.from?.mockImplementation(() => ({
      insert: vi.fn(() => makeBuilder({ data: { id: 'report-1' }, error: null })),
    }));

    await publicServicesService?.submitReport({ serviceId: 'svc-1', message: 'algo' });

    expect(supabase?.from)?.not?.toHaveBeenCalledWith('public_services');
  });
});

describe('publicServicesService.adminGetAll — a diferencia de getAll, ve TODO (activo e inactivo)', () => {
  it('no filtra por status — el listado admin debe poder ver servicios inactivos también', async () => {
    let builder;
    supabase?.from?.mockImplementation(() => {
      builder = makeBuilder({ data: [], error: null });
      return builder;
    });

    await publicServicesService?.adminGetAll();

    expect(builder?.eq?.mock?.calls?.some(call => call?.[0] === 'status'))?.toBe(false);
  });

  it('filtra por status cuando el admin elige un estado específico', async () => {
    let builder;
    supabase?.from?.mockImplementation(() => {
      builder = makeBuilder({ data: [], error: null });
      return builder;
    });

    await publicServicesService?.adminGetAll({ status: 'draft' });

    expect(builder?.eq?.mock?.calls)?.toContainEqual(['status', 'draft']);
  });

  it('busca por nombre con ilike cuando se da un término de búsqueda', async () => {
    let builder;
    supabase?.from?.mockImplementation(() => {
      builder = makeBuilder({ data: [], error: null });
      return builder;
    });

    await publicServicesService?.adminGetAll({ search: 'hospital' });

    expect(builder?.ilike?.mock?.calls)?.toContainEqual(['name', '%hospital%']);
  });
});

describe('publicServicesService.adminCreate / adminUpdate', () => {
  it('rechaza sin llegar a la base de datos si falta nombre, categoría o tipo de institución', async () => {
    const { error } = await publicServicesService?.adminCreate({ category_key: 'salud' });
    expect(error)?.toBeTruthy();
    expect(supabase?.from)?.not?.toHaveBeenCalled();
  });

  it('guarda los campos opcionales vacíos como null, nunca como string vacío', async () => {
    let insertedPayload;
    supabase?.from?.mockImplementation(() => ({
      insert: vi.fn((payload) => {
        insertedPayload = payload;
        return makeBuilder({ data: { id: 'svc-new', ...payload }, error: null });
      }),
    }));

    await publicServicesService?.adminCreate({
      name: 'Nuevo Servicio',
      category_key: 'salud',
      institution_type: 'Hospital',
      address: '',
      phone: '',
      email: '',
      website: '',
    });

    expect(insertedPayload?.address)?.toBeNull();
    expect(insertedPayload?.phone)?.toBeNull();
    expect(insertedPayload?.email)?.toBeNull();
    expect(insertedPayload?.website)?.toBeNull();
  });

  it('adminUpdate solo toca el servicio con el id dado', async () => {
    let builder;
    supabase?.from?.mockImplementation(() => {
      builder = makeBuilder({ data: { id: 'svc-1' }, error: null });
      builder.update = vi.fn(() => builder);
      return builder;
    });

    await publicServicesService?.adminUpdate('svc-1', { name: 'Actualizado' });

    expect(builder?.eq?.mock?.calls)?.toContainEqual(['id', 'svc-1']);
  });

  it('traduce una violación de unicidad de slug (23505) a un mensaje entendible', async () => {
    supabase?.from?.mockImplementation(() => ({
      insert: vi.fn(() => makeBuilder({ data: null, error: { code: '23505', message: 'duplicate key value' } })),
    }));

    const { data, error } = await publicServicesService?.adminCreate({
      name: 'Duplicado',
      category_key: 'salud',
      institution_type: 'Hospital',
      slug: 'ya-existe',
    });

    expect(data)?.toBeNull();
    expect(error?.message)?.toBe('Ya existe un servicio con ese slug. Elige otro.');
  });
});

describe('publicServicesService.adminSetActive', () => {
  it('activar guarda status: published', async () => {
    let updatedPayload;
    supabase?.from?.mockImplementation(() => ({
      update: vi.fn((payload) => {
        updatedPayload = payload;
        return makeBuilder({ data: { id: 'svc-1', ...payload }, error: null });
      }),
      eq: vi.fn(() => makeBuilder({ data: { id: 'svc-1', ...updatedPayload }, error: null })),
    }));

    await publicServicesService?.adminSetActive('svc-1', true);
    expect(updatedPayload)?.toEqual({ status: 'published' });
  });

  it('desactivar guarda status: draft', async () => {
    let updatedPayload;
    supabase?.from?.mockImplementation(() => ({
      update: vi.fn((payload) => {
        updatedPayload = payload;
        return makeBuilder({ data: { id: 'svc-1', ...payload }, error: null });
      }),
      eq: vi.fn(() => makeBuilder({ data: { id: 'svc-1', ...updatedPayload }, error: null })),
    }));

    await publicServicesService?.adminSetActive('svc-1', false);
    expect(updatedPayload)?.toEqual({ status: 'draft' });
  });
});

describe('publicServicesService.adminDelete', () => {
  it('traduce una violación de foreign key (23503, reportes asociados) a un mensaje entendible', async () => {
    supabase?.from?.mockImplementation(() => ({
      delete: vi.fn(() => ({
        eq: vi.fn(() => Promise.resolve({ error: { code: '23503', message: 'update or delete violates foreign key constraint' } })),
      })),
    }));

    const { error } = await publicServicesService?.adminDelete('svc-1');

    expect(error?.message)?.toMatch(/reportes asociados/);
  });

  it('elimina cuando no hay dependencias', async () => {
    supabase?.from?.mockImplementation(() => ({
      delete: vi.fn(() => ({
        eq: vi.fn(() => Promise.resolve({ error: null })),
      })),
    }));

    const { error } = await publicServicesService?.adminDelete('svc-1');
    expect(error)?.toBeNull();
  });
});

describe('publicServicesService — los reportes nunca son de lectura pública', () => {
  it('getAll/getById (uso público) jamás consultan public_service_reports', async () => {
    supabase?.from?.mockImplementation((table) => makeBuilder({ data: table === 'public_services' ? [] : null, error: null }));

    await publicServicesService?.getAll();
    await publicServicesService?.getById('svc-1');

    expect(supabase?.from)?.not?.toHaveBeenCalledWith('public_service_reports');
  });

  it('submitReport (el único método público que toca public_service_reports) solo hace INSERT, nunca SELECT', async () => {
    const insertMock = vi.fn(() => makeBuilder({ data: { id: 'report-1' }, error: null }));
    let sawSelectOnReports = false;
    supabase?.from?.mockImplementation((table) => ({
      insert: insertMock,
      select: table === 'public_service_reports' ? (() => { sawSelectOnReports = true; return makeBuilder({ data: [], error: null }); }) : vi.fn(),
    }));

    await publicServicesService?.submitReport({ serviceId: 'svc-1', message: 'algo' });

    expect(insertMock)?.toHaveBeenCalled();
    // El código de producción nunca llama a .select() antes de .insert() sobre esta tabla
    // para leer reportes existentes — la política RLS tampoco lo permitiría.
    expect(sawSelectOnReports)?.toBe(false);
  });
});

describe('publicServicesService.adminGetReports / adminUpdateReportStatus', () => {
  it('trae los reportes con el servicio relacionado embebido', async () => {
    let selectArg;
    supabase?.from?.mockImplementation(() => ({
      select: vi.fn((arg) => { selectArg = arg; return makeBuilder({ data: [{ id: 'report-1' }], error: null }); }),
    }));

    const { data, error } = await publicServicesService?.adminGetReports();

    expect(error)?.toBeNull();
    expect(data)?.toHaveLength(1);
    expect(selectArg)?.toMatch(/public_services/);
  });

  it('rechaza un estado de reporte no válido antes de tocar la base de datos', async () => {
    const { error } = await publicServicesService?.adminUpdateReportStatus('report-1', 'not-a-real-status');
    expect(error)?.toBeTruthy();
    expect(supabase?.from)?.not?.toHaveBeenCalled();
  });

  it('acepta los cuatro estados soportados: pending, reviewed, resolved, dismissed', () => {
    expect(PUBLIC_SERVICE_REPORT_STATUSES?.map(s => s?.key))?.toEqual(['pending', 'reviewed', 'resolved', 'dismissed']);
  });
});
