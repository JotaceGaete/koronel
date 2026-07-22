import React, { useState } from 'react';
import Icon from 'components/AppIcon';
import Button from 'components/ui/Button';
import { publicServicesService } from '../../../services/publicServicesService';

export default function ReportIssueLink({ serviceId }) {
  const [open, setOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState('');
  const [form, setForm] = useState({ name: '', email: '', message: '' });

  if (submitted) {
    return (
      <p className="text-xs font-caption text-success flex items-center gap-1.5">
        <Icon name="CheckCircle" size={14} color="currentColor" />
        Gracias, recibimos tu reporte.
      </p>
    );
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="text-xs font-caption text-muted-foreground underline underline-offset-2 hover:text-foreground transition-colors"
      >
        ¿Encontraste información incorrecta?
      </button>
    );
  }

  const handleSubmit = async (e) => {
    e?.preventDefault();
    if (!form?.message?.trim()) {
      setError('Cuéntanos qué dato está incorrecto.');
      return;
    }
    setSubmitting(true);
    setError('');
    const { error: submitError } = await publicServicesService?.submitReport({
      serviceId,
      name: form?.name,
      email: form?.email,
      message: form?.message,
    });
    setSubmitting(false);
    if (submitError) {
      setError('No pudimos enviar tu reporte. Intenta de nuevo.');
    } else {
      setSubmitted(true);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="bg-muted/50 border border-border rounded-md p-3 space-y-2 max-w-md">
      <p className="text-xs font-caption font-medium text-foreground">¿Qué dato está incorrecto?</p>
      <textarea
        value={form?.message}
        onChange={(e) => setForm((f) => ({ ...f, message: e?.target?.value }))}
        placeholder="Ej: el teléfono cambió, la dirección ya no es esa..."
        rows={2}
        className="w-full text-sm font-caption bg-card border border-border rounded-md px-2.5 py-2 focus:outline-none focus:ring-2 focus:ring-ring"
      />
      <input
        type="email"
        value={form?.email}
        onChange={(e) => setForm((f) => ({ ...f, email: e?.target?.value }))}
        placeholder="Tu correo (opcional)"
        className="w-full text-sm font-caption bg-card border border-border rounded-md px-2.5 py-2 focus:outline-none focus:ring-2 focus:ring-ring"
      />
      {error && <p className="text-xs font-caption text-error">{error}</p>}
      <div className="flex items-center gap-2">
        <Button type="submit" variant="default" size="xs" loading={submitting}>
          Enviar reporte
        </Button>
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="text-xs font-caption text-muted-foreground hover:text-foreground"
        >
          Cancelar
        </button>
      </div>
    </form>
  );
}
