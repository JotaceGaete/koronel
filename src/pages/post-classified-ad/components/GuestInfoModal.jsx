import React, { useState } from 'react';
import Icon from 'components/AppIcon';
import Button from 'components/ui/Button';
import Input from 'components/ui/Input';

export default function GuestInfoModal({ onConfirm, onCancel, isSubmitting }) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [captchaAnswer, setCaptchaAnswer] = useState('');
  const [errors, setErrors] = useState({});

  // Simple math CAPTCHA
  const [captcha] = useState(() => {
    const a = Math.floor(Math.random() * 9) + 1;
    const b = Math.floor(Math.random() * 9) + 1;
    return { a, b, answer: a + b };
  });

  const validate = () => {
    const errs = {};
    if (!name?.trim()) errs.name = 'El nombre es obligatorio';
    if (!email?.trim()) errs.email = 'El email es obligatorio';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/?.test(email)) errs.email = 'Ingresa un email válido';
    if (!phone?.trim()) errs.phone = 'El teléfono es obligatorio';
    if (!captchaAnswer?.trim()) errs.captcha = 'Resuelve el captcha';
    else if (parseInt(captchaAnswer) !== captcha?.answer) errs.captcha = 'Respuesta incorrecta';
    return errs;
  };

  const handleSubmit = (e) => {
    e?.preventDefault();
    const errs = validate();
    if (Object.keys(errs)?.length > 0) {
      setErrors(errs);
      return;
    }
    onConfirm({ name, email, phone });
  };

  return (
    <div className="fixed inset-0 z-[300] flex items-center justify-center p-4"
      role="dialog" aria-modal="true" aria-label="Datos de contacto">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black bg-opacity-50" onClick={onCancel} />
      {/* Modal */}
      <div className="relative bg-card rounded-md shadow-xl w-full max-w-md p-6 md:p-8">
        {/* Header */}
        <div className="flex items-start justify-between mb-5">
          <div>
            <h2 className="font-heading font-bold text-xl text-foreground">Casi listo</h2>
            <p className="text-sm font-body text-muted-foreground mt-1">
              Ingresa tus datos para publicar el aviso. Te enviaremos un correo para activarlo.
            </p>
          </div>
          <button onClick={onCancel} className="p-1.5 rounded hover:bg-muted transition-colors text-muted-foreground">
            <Icon name="X" size={18} color="currentColor" />
          </button>
        </div>

        {/* Info banner */}
        <div className="flex items-start gap-2 p-3 rounded-md mb-5 text-sm font-caption"
          style={{ background: 'rgba(44,82,130,0.07)', borderLeft: '3px solid var(--color-primary)' }}>
          <Icon name="Info" size={15} color="var(--color-primary)" className="shrink-0 mt-0.5" />
          <span className="text-foreground">
            Tu aviso quedará en estado <strong>pendiente</strong> hasta que confirmes tu email.
            Se creará una cuenta automáticamente con tu correo.
          </span>
        </div>

        <form onSubmit={handleSubmit} noValidate className="space-y-4">
          {/* Name */}
          <div>
            <Input
              label="Nombre"
              type="text"
              placeholder="Tu nombre completo"
              value={name}
              onChange={(e) => { setName(e?.target?.value); setErrors(p => ({ ...p, name: undefined })); }}
              required
              error={errors?.name}
            />
          </div>

          {/* Email */}
          <div>
            <Input
              label="Email"
              type="email"
              placeholder="tu@email.com"
              value={email}
              onChange={(e) => { setEmail(e?.target?.value); setErrors(p => ({ ...p, email: undefined })); }}
              required
              error={errors?.email}
            />
          </div>

          {/* Phone */}
          <div>
            <Input
              label="Teléfono"
              type="tel"
              placeholder="+56 9 1234 5678"
              value={phone}
              onChange={(e) => { setPhone(e?.target?.value); setErrors(p => ({ ...p, phone: undefined })); }}
              required
              error={errors?.phone}
            />
          </div>

          {/* CAPTCHA */}
          <div>
            <label className="block text-sm font-caption font-semibold text-foreground mb-1.5">
              Verificación anti-spam <span className="text-error">*</span>
            </label>
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2 px-4 py-2.5 rounded-md border border-border bg-muted select-none">
                <Icon name="Shield" size={15} color="var(--color-primary)" />
                <span className="font-data font-bold text-foreground text-base">
                  {captcha?.a} + {captcha?.b} = ?
                </span>
              </div>
              <input
                type="number"
                inputMode="numeric"
                placeholder="Respuesta"
                value={captchaAnswer}
                onChange={(e) => { setCaptchaAnswer(e?.target?.value); setErrors(p => ({ ...p, captcha: undefined })); }}
                className={`w-28 h-11 px-3 text-sm font-data rounded-md border bg-card text-foreground focus:outline-none focus:ring-2 focus:ring-ring transition-all duration-200
                  ${errors?.captcha ? 'border-error' : 'border-border'}`}
              />
            </div>
            {errors?.captcha && <p className="mt-1 text-xs font-caption text-error">{errors?.captcha}</p>}
          </div>

          {/* Actions */}
          <div className="flex flex-col sm:flex-row gap-3 pt-2">
            <Button
              type="submit"
              variant="default"
              size="lg"
              loading={isSubmitting}
              iconName="Send"
              iconPosition="left"
              iconSize={16}
              className="flex-1"
            >
              {isSubmitting ? 'Publicando...' : 'Publicar aviso'}
            </Button>
            <Button
              type="button"
              variant="outline"
              size="lg"
              onClick={onCancel}
              className="flex-1 sm:flex-none"
            >
              Cancelar
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
