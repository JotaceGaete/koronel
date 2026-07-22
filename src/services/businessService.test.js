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
    then: (resolve, reject) => Promise.resolve(result).then(resolve, reject),
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
              category: 'Pizzeria',
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
    // The root cause: an embed aliased with the same name as an existing plain
    // column silently overwrites it in the PostgREST response.
    expect(selectArg)?.toContain('category_ref:categories(');
    // Removing the correct, qualified alias must not leave a bare "category:categories("
    // behind — that bare form is exactly the bug (shadows businesses.category).
    expect(selectArg?.replace('category_ref:categories(', ''))?.not?.toContain('category:categories(');
    // `category` must stay the plain string businesses.category column — never
    // an object — because AdminBusinessForm renders it directly as JSX text.
    expect(typeof data?.category)?.toBe('string');
    expect(data?.category)?.toBe('Pizzeria');
    expect(typeof data?.category_ref)?.toBe('object');
  });

  it('resolves the parent category from category_ref.parent_id, not from category.parent_id', async () => {
    let secondCall;
    let callCount = 0;
    supabase?.from?.mockImplementation((table) => {
      callCount += 1;
      if (callCount === 1) {
        expect(table)?.toBe('businesses');
        return {
          select: vi.fn(() => makeBuilder({
            data: {
              id: 'biz-1',
              category: 'Pizzeria',
              category_ref: { id: 'cat-1', name: 'Pizzería', parent_id: 'cat-parent' },
            },
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
    // The plain string column is completely untouched by the parent lookup.
    expect(data?.category)?.toBe('Pizzeria');
  });

  it('returns the business with a null category_ref when there is no linked category (legacy row)', async () => {
    supabase?.from?.mockImplementation(() => ({
      select: vi.fn(() => makeBuilder({
        data: { id: 'biz-2', category: 'Ferretería', category_ref: null },
        error: null,
      })),
    }));

    const { data, error } = await businessService?.getById('biz-2');

    expect(error)?.toBeNull();
    expect(data?.category)?.toBe('Ferretería');
    expect(data?.category_ref)?.toBeNull();
  });
});
