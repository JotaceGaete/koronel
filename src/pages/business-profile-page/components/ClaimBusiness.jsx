import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Icon from 'components/AppIcon';
import Button from 'components/ui/Button';
import Input from 'components/ui/Input';
import { useAuth } from '../../../contexts/AuthContext';
import { businessService } from '../../../services/businessService';

export default function ClaimBusiness({ businessId, businessName, claimed }) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [showForm, setShowForm] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [form, setForm] = useState({ name: '', email: user?.email || '', phone: '', role: '' });

  const handleReclaimClick = () => {
    if (!user) {
      navigate('/login', { state: { from: `/business-profile-page?id=${businessId || ''}` } });
      return;
    }
    setShowForm(true);
  };

  if (claimed) {
    return (
      <div className="bg-card border border-border rounded-lg p-4 md:p-5">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-full bg-success/10 flex items-center justify-center shrink-0">
            <Icon name="BadgeCheck" size={22} color="var(--color-success)" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-caption font-semibold text-success">Negocio verificado</p>
            <p className="text-xs font-caption text-muted-foreground mt-0.5">Este negocio tiene propietario y ha sido reclamado o publicado por él.</p>
            <p className="text-xs font-caption text-muted-foreground mt-2">Si crees que es un error, puedes solicitar revisión manual contactando al equipo.</p>
          </div>
        </div>
      </div>
    );
  }

  if (submitted) {
    return (
      <div className="bg-primary/5 border border-primary/20 rounded-lg p-4 flex items-center gap-3">
        <Icon name="CheckCircle" size={22} color="var(--color-primary)" />
        <div>
          <p className="text-sm font-caption font-semibold text-primary">Solicitud enviada</p>
          <p className="text-xs font-caption text-muted-foreground">Revisaremos tu solicitud y te contactaremos pronto.</p>
        </div>
      </div>
    );
  }

  const handleSubmit = async () => {
    if (!form?.name || !form?.email) return;
    setSubmitting(true);
    setSubmitError('');
    const { error } = await businessService?.submitClaim({
      businessId: businessId || null,
      userId: user?.id || null,
      name: form?.name,
      email: form?.email,
      phone: form?.phone,
      role: form?.role,
    });
    setSubmitting(false);
    if (error) {
      setSubmitError('Error al enviar la solicitud. Por favor intenta de nuevo.');
    } else {
      setSubmitted(true);
    }
  };

  return (
    <div className="bg-card border border-border rounded-lg p-4 md:p-5">
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 rounded-full bg-accent/10 flex items-center justify-center shrink-0">
          <Icon name="Building2" size={20} color="var(--color-accent)" />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="font-heading font-semibold text-base text-foreground">¿Es tu negocio?</h3>
          <p className="text-sm font-caption text-muted-foreground mt-0.5">
            Reclama <strong>{businessName}</strong> para gestionar la información y responder reseñas.
          </p>
          {!showForm && (
            <Button
              variant="outline"
              size="sm"
              iconName="Flag"
              iconPosition="left"
              iconSize={14}
              onClick={handleReclaimClick}
              className="mt-3"
            >
              Reclamar este negocio
            </Button>
          )}
        </div>
      </div>
      {showForm && (
        <div className="mt-4 space-y-3 border-t border-border pt-4">
          <Input
            label="Nombre completo"
            type="text"
            placeholder="Tu nombre"
            value={form?.name}
            onChange={(e) => setForm((f) => ({ ...f, name: e?.target?.value }))}
            required
          />
          <Input
            label="Correo electrónico"
            type="email"
            placeholder="tu@email.com"
            value={form?.email}
            onChange={(e) => setForm((f) => ({ ...f, email: e?.target?.value }))}
            required
          />
          <Input
            label="Teléfono"
            type="tel"
            placeholder="+56 9 XXXX XXXX"
            value={form?.phone}
            onChange={(e) => setForm((f) => ({ ...f, phone: e?.target?.value }))}
          />
          <Input
            label="Tu rol en el negocio"
            type="text"
            placeholder="Ej: Propietario, Gerente"
            value={form?.role}
            onChange={(e) => setForm((f) => ({ ...f, role: e?.target?.value }))}
          />
          {submitError && (
            <p className="text-sm font-caption" style={{ color: 'var(--color-error)' }}>{submitError}</p>
          )}
          <div className="flex gap-2 pt-1">
            <Button
              variant="default"
              size="sm"
              loading={submitting}
              onClick={handleSubmit}
              disabled={!form?.name || !form?.email}
            >
              Enviar solicitud
            </Button>
            <Button variant="ghost" size="sm" onClick={() => setShowForm(false)}>
              Cancelar
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}