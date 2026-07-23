import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../lib/supabase', () => ({
  supabase: { from: vi.fn() },
}));

import { supabase } from '../lib/supabase';
import { businessService } from './businessService';

function makeBuilder(result) {
  const builder = {
    select: vi.fn(() => builder),
    eq: vi.fn(() => builder),
    single: vi.fn(() => Promise.resolve(result)),
  };
  return builder;
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe('businessService.getById — category embed does not shadow the plain category column', () => {
  it('aliases the categories embed as category_ref, never as category (regression: AdminBusinessForm crashed rendering an object as a child)', async () => {
    let selectArg;
    supabase?.from?.mockImplementation((table) => {
      expect(table)?.toBe('businesses');
      return {
        select: vi.fn((arg) => {
          selectArg = arg;
          return makeBuilder({
            data: {
              id: 'biz-1',
              category: 'Pizzería',
              category_id: 'cat-1',
              category_ref: { id: 'cat-1', name: 'Pizzería', name_key: 'restaurantes-pizzeria', parent_id: null },
            },
            error: null,
          });
        }),
      };
    });

    const { data, error } = await businessService?.getById('biz-1');

    expect(error)?.toBeNull();
    expect(selectArg)?.toContain('category_ref:categories(');
    expect(selectArg?.replace('category_ref:categories(', ''))?.not?.toContain('category:categories(');
    expect(typeof data?.category)?.toBe('string');
    expect(data?.category)?.toBe('Pizzería');
    expect(typeof data?.category_ref)?.toBe('object');
  });

  it('1. edita un negocio con todos sus campos presentes', async () => {
    supabase?.from?.mockImplementation(() => ({
      select: vi.fn(() => makeBuilder({
        data: {
          id: 'biz-full', name: 'Ferretería Central', category: 'Ferretería', category_id: 'cat-2',
          category_ref: { id: 'cat-2', name: 'Ferretería', name_key: 'ferreteria', parent_id: null },
          address: 'Calle Real 123', phone: '+56911111111', email: 'contacto@ferreteria.cl',
          website: 'https://ferreteria.cl', whatsapp: '+56911111111', description: 'Todo en ferretería',
        },
        error: null,
      })),
    }));

    const { data, error } = await businessService?.getById('biz-full');

    expect(error)?.toBeNull();
    expect(data?.name)?.toBe('Ferretería Central');
    expect(typeof data?.category)?.toBe('string');
    expect(data?.category_ref?.name)?.toBe('Ferretería');
  });

  it('2. edita un negocio con campos opcionales en null, sin lanzar excepción', async () => {
    supabase?.from?.mockImplementation(() => ({
      select: vi.fn(() => makeBuilder({
        data: {
          id: 'biz-nulls', name: 'Almacén El Sol', category: 'Almacén', category_id: null,
          category_ref: null, website: null, whatsapp: null, description: null, phone: null,
        },
        error: null,
      })),
    }));

    const { data, error } = await businessService?.getById('biz-nulls');

    expect(error)?.toBeNull();
    expect(data?.category)?.toBe('Almacén'); // el texto plano no se pierde cuando category_ref es null
    expect(data?.category_ref)?.toBeNull();
  });

  it('3. normaliza la relación cuando PostgREST la devuelve como objeto', async () => {
    supabase?.from?.mockImplementation(() => ({
      select: vi.fn(() => makeBuilder({
        data: { id: 'biz-obj', category: 'Panadería', category_ref: { id: 'cat-3', name: 'Panadería', parent_id: null } },
        error: null,
      })),
    }));

    const { data } = await businessService?.getById('biz-obj');

    expect(data?.category_ref)?.toEqual({ id: 'cat-3', name: 'Panadería', parent_id: null });
  });

  it('4. normaliza la relación cuando PostgREST la devuelve como array (relación ambigua o cache de esquema desactualizado)', async () => {
    supabase?.from?.mockImplementation(() => ({
      select: vi.fn(() => makeBuilder({
        data: { id: 'biz-arr', category: 'Panadería', category_ref: [{ id: 'cat-3', name: 'Panadería', parent_id: null }] },
        error: null,
      })),
    }));

    const { data, error } = await businessService?.getById('biz-arr');

    expect(error)?.toBeNull();
    expect(Array.isArray(data?.category_ref))?.toBe(false);
    expect(data?.category_ref)?.toEqual({ id: 'cat-3', name: 'Panadería', parent_id: null });
  });

  it('4b. un array vacío de la relación se normaliza a null, no a undefined ni a un array vacío', async () => {
    supabase?.from?.mockImplementation(() => ({
      select: vi.fn(() => makeBuilder({
        data: { id: 'biz-arr-empty', category: 'Panadería', category_ref: [] },
        error: null,
      })),
    }));

    const { data } = await businessService?.getById('biz-arr-empty');

    expect(data?.category_ref)?.toBeNull();
  });

  it('5. negocio inexistente: single() sin filas devuelve error PGRST116, sin lanzar excepción no controlada', async () => {
    supabase?.from?.mockImplementation(() => ({
      select: vi.fn(() => makeBuilder({
        data: null,
        error: { code: 'PGRST116', message: 'JSON object requested, multiple (or no) rows returned' },
      })),
    }));

    const { data, error } = await businessService?.getById('no-existe');

    expect(data)?.toBeNull();
    expect(error?.code)?.toBe('PGRST116');
  });

  it('6. error de consulta genérico (red, permisos) se devuelve como error controlado, no como excepción', async () => {
    supabase?.from?.mockImplementation(() => ({
      select: vi.fn(() => makeBuilder({
        data: null,
        error: { code: '500', message: 'internal error' },
      })),
    }));

    const { data, error } = await businessService?.getById('biz-error');

    expect(data)?.toBeNull();
    expect(error?.code)?.toBe('500');
  });

  it('resuelve la categoría padre desde category_ref.parent_id, nunca desde category.parent_id', async () => {
    let secondCall;
    let callCount = 0;
    supabase?.from?.mockImplementation((table) => {
      callCount += 1;
      if (callCount === 1) {
        expect(table)?.toBe('businesses');
        return {
          select: vi.fn(() => makeBuilder({
            data: { id: 'biz-1', category: 'Pizzería', category_ref: { id: 'cat-1', name: 'Pizzería', parent_id: 'cat-parent' } },
            error: null,
          })),
        };
      }
      secondCall = table;
      expect(table)?.toBe('categories');
      return {
        select: vi.fn(() => makeBuilder({ data: { id: 'cat-parent', name: 'Restaurantes' }, error: null })),
      };
    });

    const { data } = await businessService?.getById('biz-1');

    expect(secondCall)?.toBe('categories');
    expect(data?.category_ref?.parent)?.toEqual({ id: 'cat-parent', name: 'Restaurantes' });
    expect(data?.category)?.toBe('Pizzería');
  });
});
