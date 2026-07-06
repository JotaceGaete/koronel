import { describe, expect, it } from 'vitest';
import {
  buildWalinkaCreateCatalogUrl,
  getBusinessCatalogUrl,
  isWalinkaCatalogUrl,
} from './walinkaCatalog';

describe('walinka catalog helpers', () => {
  it('buildWalinkaCreateCatalogUrl encodes business name, address, and WhatsApp', () => {
    const url = buildWalinkaCreateCatalogUrl({
      id: 'biz-123',
      name: 'Café & Panadería Ñuble',
      whatsapp: '+56 9 1234 5678',
      address: 'Av. Prat 123, Local 4',
      city: 'Coronel',
      category: 'Restaurantes y café',
    });

    expect(url).toContain('source=koronel');
    expect(url).toContain('koronel_business_id=biz-123');
    expect(url).toContain('name=Caf%C3%A9%20%26%20Panader%C3%ADa%20%C3%91uble');
    expect(url).toContain('whatsapp=%2B56%209%201234%205678');
    expect(url).toContain('address=Av.%20Prat%20123%2C%20Local%204');
  });

  it('does not break query params without WhatsApp', () => {
    const url = buildWalinkaCreateCatalogUrl({
      id: 'biz-456',
      name: 'Negocio sin WhatsApp',
      address: 'Centro',
    });

    expect(url).toContain('koronel_business_id=biz-456');
    expect(url).not.toContain('whatsapp=');
  });

  it('accepts Walinka and Ventalink domains only', () => {
    expect(isWalinkaCatalogUrl('https://go.ventalink.app/catalogo/mi-negocio')).toBe(true);
    expect(isWalinkaCatalogUrl('https://tienda.walinka.app/catalogo/mi-negocio')).toBe(true);
    expect(isWalinkaCatalogUrl('https://example.com/catalogo/mi-negocio')).toBe(false);
  });

  it('gets catalog URL from future catalog_url or current website field', () => {
    expect(getBusinessCatalogUrl({ catalog_url: 'https://go.ventalink.app/catalogo/a' })).toBe('https://go.ventalink.app/catalogo/a');
    expect(getBusinessCatalogUrl({ website: 'https://go.ventalink.app/catalogo/b' })).toBe('https://go.ventalink.app/catalogo/b');
    expect(getBusinessCatalogUrl({ website: 'https://example.com' })).toBeNull();
  });
});
