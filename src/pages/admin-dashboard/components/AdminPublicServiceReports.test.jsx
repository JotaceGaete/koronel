import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';

vi.mock('../../../services/publicServicesService', () => ({
  publicServicesService: {
    adminGetReports: vi.fn(),
    adminUpdateReportStatus: vi.fn(),
  },
  PUBLIC_SERVICE_REPORT_STATUSES: [
    { key: 'pending', label: 'Pendiente' },
    { key: 'reviewed', label: 'Revisado' },
    { key: 'resolved', label: 'Resuelto' },
    { key: 'dismissed', label: 'Descartado' },
  ],
}));

import { publicServicesService } from '../../../services/publicServicesService';
import AdminPublicServiceReports from './AdminPublicServiceReports';

const pendingReport = {
  id: 'report-1',
  status: 'pending',
  message: 'El teléfono ya no funciona',
  issue_type: null,
  source_url: null,
  reporter_email: 'vecino@example.com',
  created_at: '2026-07-22T00:00:00Z',
  service: { id: 'svc-1', name: 'Hospital San José de Coronel', slug: 'hospital-san-jose' },
};

beforeEach(() => {
  vi.clearAllMocks();
});

describe('AdminPublicServiceReports', () => {
  it('carga y muestra los reportes con el servicio relacionado, mensaje, correo y fecha', async () => {
    publicServicesService?.adminGetReports?.mockResolvedValue({ data: [pendingReport], error: null });
    render(<AdminPublicServiceReports onEditService={vi.fn()} />);

    expect(await screen.findByText('Hospital San José de Coronel'))?.toBeInTheDocument();
    expect(screen.getByText('El teléfono ya no funciona'))?.toBeInTheDocument();
    expect(screen.getByText(/vecino@example.com/))?.toBeInTheDocument();
  });

  it('"Ver servicio" enlaza a la ficha pública, nunca a un endpoint admin', async () => {
    publicServicesService?.adminGetReports?.mockResolvedValue({ data: [pendingReport], error: null });
    render(<AdminPublicServiceReports onEditService={vi.fn()} />);

    const link = await screen.findByText('Ver servicio');
    expect(link?.closest('a'))?.toHaveAttribute('href', '/servicios/svc-1');
  });

  it('"Editar ficha" llama a onEditService con el id del servicio', async () => {
    publicServicesService?.adminGetReports?.mockResolvedValue({ data: [pendingReport], error: null });
    const onEditService = vi.fn();
    render(<AdminPublicServiceReports onEditService={onEditService} />);

    fireEvent.click(await screen.findByText('Editar ficha'));

    expect(onEditService)?.toHaveBeenCalledWith('svc-1');
  });

  it('marcar como "Resuelto" llama a adminUpdateReportStatus con el estado correcto', async () => {
    publicServicesService?.adminGetReports?.mockResolvedValue({ data: [pendingReport], error: null });
    publicServicesService?.adminUpdateReportStatus?.mockResolvedValue({ data: { ...pendingReport, status: 'resolved' }, error: null });
    render(<AdminPublicServiceReports onEditService={vi.fn()} />);
    await screen.findByText(pendingReport?.message);

    // "Resuelto" también es la etiqueta del filtro superior — el botón de
    // acción de la tarjeta es el último de los dos.
    const resolveButtons = screen.getAllByRole('button', { name: 'Resuelto' });
    fireEvent.click(resolveButtons?.[resolveButtons?.length - 1]);

    await waitFor(() => {
      expect(publicServicesService?.adminUpdateReportStatus)?.toHaveBeenCalledWith('report-1', 'resolved');
    });
  });

  it('descartar un reporte llama a adminUpdateReportStatus con "dismissed"', async () => {
    publicServicesService?.adminGetReports?.mockResolvedValue({ data: [pendingReport], error: null });
    publicServicesService?.adminUpdateReportStatus?.mockResolvedValue({ data: { ...pendingReport, status: 'dismissed' }, error: null });
    render(<AdminPublicServiceReports onEditService={vi.fn()} />);

    fireEvent.click(await screen.findByText('Descartar'));

    await waitFor(() => {
      expect(publicServicesService?.adminUpdateReportStatus)?.toHaveBeenCalledWith('report-1', 'dismissed');
    });
  });

  it('muestra un estado vacío sin romper cuando no hay reportes', async () => {
    publicServicesService?.adminGetReports?.mockResolvedValue({ data: [], error: null });
    render(<AdminPublicServiceReports onEditService={vi.fn()} />);

    expect(await screen.findByText(/No hay reportes/))?.toBeInTheDocument();
  });
});
