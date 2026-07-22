import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';

vi.mock('../../../services/adminService', () => ({
  adminClaimService: {
    getAll: vi.fn(),
    updateStatus: vi.fn(),
  },
}));

import { adminClaimService } from '../../../services/adminService';
import AdminClaimRequests from './AdminClaimRequests';

// Forma real de una fila devuelta tras el fix: incluye el embed `business` (FK
// business_id) y el embed `claimant` (FK user_id, ahora desambiguado) — dos
// relaciones distintas hacia dos tablas, más los campos propios de la tabla
// (claimant_name/email/phone/role) que la pantalla realmente usa para mostrar
// el contacto.
const pendingClaim = {
  id: 'claim-1',
  claim_status: 'pending',
  claimant_name: 'Ana Pérez',
  claimant_email: 'ana@example.com',
  claimant_phone: '+56911111111',
  claimant_role: 'Dueña',
  created_at: '2026-07-22T00:00:00Z',
  business: { name: 'Panadería Don José', category: 'Alimentos', address: 'Centro, Coronel' },
  claimant: { full_name: 'Ana Pérez', email: 'ana@example.com' },
};

beforeEach(() => {
  vi.clearAllMocks();
});

describe('AdminClaimRequests — carga correcta', () => {
  it('carga y muestra las reclamaciones, incluida la relación embebida del negocio y del reclamante', async () => {
    adminClaimService?.getAll?.mockResolvedValue([pendingClaim]);
    render(<AdminClaimRequests />);

    expect(await screen.findByText('Panadería Don José'))?.toBeInTheDocument();
    expect(screen.getByText(/Alimentos/))?.toBeInTheDocument();
    expect(screen.getByText('Ana Pérez'))?.toBeInTheDocument();
    expect(screen.getByText(/ana@example.com/))?.toBeInTheDocument();
  });

  it('no rompe el render cuando hay múltiples relaciones hacia user_profiles en la fila (business_id y user_id/reviewed_by)', async () => {
    // Una fila ya revisada trae además reviewed_by poblado en la base — el
    // embed de esta pantalla no lo trae (no lo necesita), y eso no debe
    // romper nada.
    adminClaimService?.getAll?.mockResolvedValue([
      { ...pendingClaim, id: 'claim-2', claim_status: 'approved', reviewed_by: 'admin-user-id' },
    ]);
    render(<AdminClaimRequests />);

    const heading = await screen.findByText('Panadería Don José');
    // "Aprobado" también es la etiqueta del filtro superior — se busca el badge
    // de estado dentro de la tarjeta de la solicitud, no en toda la página.
    const card = heading?.closest('.bg-card');
    expect(within(card)?.getByText('Aprobado'))?.toBeInTheDocument();
  });
});

describe('AdminClaimRequests — estado vacío real', () => {
  it('muestra "No hay solicitudes" solo cuando la consulta fue exitosa y no hay resultados', async () => {
    adminClaimService?.getAll?.mockResolvedValue([]);
    render(<AdminClaimRequests />);

    expect(await screen.findByText(/No hay solicitudes/))?.toBeInTheDocument();
  });
});

describe('AdminClaimRequests — estado de error', () => {
  it('cuando la consulta falla (embed ambiguo u otro error), muestra solo el error — nunca "No hay solicitudes"', async () => {
    adminClaimService?.getAll?.mockRejectedValue(
      new Error("Could not embed because more than one relationship was found for 'business_claims' and 'user_profiles'")
    );
    render(<AdminClaimRequests />);

    expect(await screen.findByText(/more than one relationship was found/))?.toBeInTheDocument();
    expect(screen.queryByText(/No hay solicitudes/))?.not?.toBeInTheDocument();
  });

  it('un error en una recarga posterior tampoco muestra el estado vacío, aunque ya hubiera datos previos', async () => {
    adminClaimService?.getAll?.mockResolvedValueOnce([pendingClaim]);
    render(<AdminClaimRequests />);
    await screen.findByText('Panadería Don José');

    adminClaimService?.getAll?.mockRejectedValueOnce(new Error('Error de red'));
    fireEvent.click(screen.getByText('Aprobado'));

    expect(await screen.findByText('Error de red'))?.toBeInTheDocument();
    expect(screen.queryByText(/No hay solicitudes/))?.not?.toBeInTheDocument();
  });
});

describe('AdminClaimRequests — aprobar y rechazar siguen funcionando', () => {
  it('aprobar llama a adminClaimService.updateStatus(id, "approved") y recarga', async () => {
    adminClaimService?.getAll?.mockResolvedValue([pendingClaim]);
    adminClaimService?.updateStatus?.mockResolvedValue({ id: 'claim-1', claim_status: 'approved' });
    render(<AdminClaimRequests />);
    await screen.findByText('Panadería Don José');

    fireEvent.click(screen.getByText('Aprobar'));

    await waitFor(() => {
      expect(adminClaimService?.updateStatus)?.toHaveBeenCalledWith('claim-1', 'approved');
    });
    expect(adminClaimService?.getAll)?.toHaveBeenCalledTimes(2);
  });

  it('rechazar llama a adminClaimService.updateStatus(id, "rejected") y recarga', async () => {
    adminClaimService?.getAll?.mockResolvedValue([pendingClaim]);
    adminClaimService?.updateStatus?.mockResolvedValue({ id: 'claim-1', claim_status: 'rejected' });
    render(<AdminClaimRequests />);
    await screen.findByText('Panadería Don José');

    fireEvent.click(screen.getByText('Rechazar'));

    await waitFor(() => {
      expect(adminClaimService?.updateStatus)?.toHaveBeenCalledWith('claim-1', 'rejected');
    });
    expect(adminClaimService?.getAll)?.toHaveBeenCalledTimes(2);
  });

  it('si falla la acción de aprobar/rechazar, muestra el error sin romper la página', async () => {
    adminClaimService?.getAll?.mockResolvedValue([pendingClaim]);
    adminClaimService?.updateStatus?.mockRejectedValue(new Error('No se pudo actualizar'));
    render(<AdminClaimRequests />);
    await screen.findByText('Panadería Don José');

    fireEvent.click(screen.getByText('Aprobar'));

    expect(await screen.findByText('No se pudo actualizar'))?.toBeInTheDocument();
  });
});
