import { describe, it, expect, vi } from 'vitest';
import { render } from '@testing-library/react';
import App from './App';

vi.mock('./lib/supabase', () => ({
  supabase: {
    auth: {
      getSession: () => Promise.resolve({ data: { session: null } }),
      onAuthStateChange: () => ({ data: { subscription: { unsubscribe: () => {} } } }),
    },
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
