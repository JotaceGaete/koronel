import { describe, it, expect, vi } from 'vitest';
import { render } from '@testing-library/react';
import App from './App';

vi.mock('./lib/supabase', () => ({
  supabase: {
    auth: {
      getSession: () => Promise.resolve({ data: { session: null } }),
      onAuthStateChange: () => ({ data: { subscription: { unsubscribe: () => {} } } }),
    },
    // CityProvider consulta la tabla `cities` al montar; sin filas, cae al
    // fallback seguro (ver src/contexts/CityContext.jsx).
    from: () => ({
      select: () => ({
        eq: () => Promise.resolve({ data: [], error: null }),
      }),
    }),
  },
}));

describe('App', () => {
  it('renders without crashing', () => {
    render(<App />);
  });

  it('mounts and renders the app tree', () => {
    const { container } = render(<App />);
    expect(container).toBeInTheDocument();
    expect(container.firstChild).toBeTruthy();
  });
});
