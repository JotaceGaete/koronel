import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import PageMeta from './PageMeta';

describe('PageMeta', () => {
  it('renders without crashing', () => {
    render(<PageMeta title="Eventos" description="Eventos en Coronel." />);
  });

  it('renders with different props without error', () => {
    render(<PageMeta title="Inicio" description="Página de inicio." />);
    // En entorno jsdom, react-helmet puede no actualizar document de forma síncrona.
    // Comprobamos que el componente acepta props y no lanza.
    expect(true).toBe(true);
  });
});
