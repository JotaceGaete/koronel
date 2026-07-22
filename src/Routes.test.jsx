import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import App from './App';

// Same minimal supabase stand-in as App.test.jsx. Only `auth` is mocked — every
// service in the app already degrades gracefully (empty data, no throw) when
// `supabase.from` is missing, which is exactly what happens here.
vi.mock('./lib/supabase', () => ({
  supabase: {
    auth: {
      getSession: () => Promise.resolve({ data: { session: null } }),
      onAuthStateChange: () => ({ data: { subscription: { unsubscribe: () => {} } } }),
    },
  },
}));

function renderAt(path) {
  window.history.pushState({}, '', path);
  return render(<App />);
}

afterEach(() => {
  window.history.pushState({}, '', '/');
});

describe('Pre-existing routes keep resolving after adding /servicios', () => {
  it.each([
    ['/', 'Negocios'],
    ['/directorio-negocios', 'Negocios'],
    ['/comunidad', 'Comunidad'],
    ['/eventos', 'Eventos'],
    ['/mapa', 'Mapa'],
    ['/profesionales', 'Profesionales'],
  ])('%s still renders the main nav without crashing', async (path) => {
    renderAt(path);
    // "Negocios" (and the other nav labels) render once per breakpoint (desktop nav +
    // mobile nav), so assert presence rather than uniqueness.
    expect((await screen.findAllByText('Negocios'))?.length)?.toBeGreaterThan(0);
    expect(screen.getAllByText('Servicios')?.length)?.toBeGreaterThan(0);
  });

  it('an unknown route still falls through to NotFound', async () => {
    renderAt('/esto-no-existe');
    expect(await screen.findByText('Page Not Found'))?.toBeInTheDocument();
  });
});

describe('New /servicios routes resolve', () => {
  it('renders the public services listing at /servicios', async () => {
    renderAt('/servicios');
    expect(await screen.findByText('Servicios para la comunidad'))?.toBeInTheDocument();
  });

  it('renders the detail page shell at /servicios/:id without crashing', async () => {
    renderAt('/servicios/some-id');
    expect(await screen.findByText('Volver a Servicios'))?.toBeInTheDocument();
  });
});
