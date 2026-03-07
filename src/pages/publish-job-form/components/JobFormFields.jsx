import React from 'react';
import { jobService } from '../../../services/jobService';

function FieldError({ msg }) {
  if (!msg) return null;
  return <p className="text-xs mt-1" style={{ color: '#dc2626' }}>{msg}</p>;
}

function Label({ children, required }) {
  return (
    <label className="block text-sm font-caption font-semibold text-foreground mb-1">
      {children}{required && <span className="ml-0.5" style={{ color: '#dc2626' }}>*</span>}
    </label>
  );
}

const inputCls = (hasError) =>
  `w-full px-3 py-2.5 rounded-lg border text-sm text-foreground bg-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary transition-all ${
    hasError ? 'border-red-400' : 'border-border'
  }`;

export default function JobFormFields({ form, errors, onChange }) {
  return (
    <div className="space-y-5">
      {/* Section: Información básica */}
      <div className="bg-card border border-border rounded-xl p-5">
        <h2 className="text-base font-heading font-semibold text-foreground mb-4">Información básica</h2>
        <div className="space-y-4">
          <div>
            <Label required>Título del cargo</Label>
            <input
              type="text"
              value={form?.titulo}
              onChange={e => onChange('titulo', e?.target?.value)}
              placeholder="Ej: Desarrollador Web Full Stack"
              className={inputCls(!!errors?.titulo)}
            />
            <FieldError msg={errors?.titulo} />
          </div>
          <div>
            <Label required>Empresa</Label>
            <input
              type="text"
              value={form?.empresa}
              onChange={e => onChange('empresa', e?.target?.value)}
              placeholder="Nombre de la empresa"
              className={inputCls(!!errors?.empresa)}
            />
            <FieldError msg={errors?.empresa} />
          </div>
          <div>
            <Label required>Descripción del cargo</Label>
            <textarea
              value={form?.descripcion}
              onChange={e => onChange('descripcion', e?.target?.value)}
              placeholder="Describe las responsabilidades y el rol..."
              rows={5}
              className={inputCls(!!errors?.descripcion)}
            />
            <FieldError msg={errors?.descripcion} />
          </div>
          <div>
            <Label>Requisitos</Label>
            <textarea
              value={form?.requisitos}
              onChange={e => onChange('requisitos', e?.target?.value)}
              placeholder="Experiencia, estudios, habilidades requeridas..."
              rows={4}
              className={inputCls(false)}
            />
          </div>
        </div>
      </div>
      {/* Section: Clasificación */}
      <div className="bg-card border border-border rounded-xl p-5">
        <h2 className="text-base font-heading font-semibold text-foreground mb-4">Clasificación</h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <Label required>Categoría</Label>
            <select
              value={form?.categoria}
              onChange={e => onChange('categoria', e?.target?.value)}
              className={inputCls(false)}
            >
              {jobService?.CATEGORIES?.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div>
            <Label required>Modalidad</Label>
            <select
              value={form?.modalidad}
              onChange={e => onChange('modalidad', e?.target?.value)}
              className={inputCls(false)}
            >
              {jobService?.MODALITIES?.map(m => <option key={m} value={m}>{m}</option>)}
            </select>
          </div>
          <div>
            <Label required>Tipo</Label>
            <select
              value={form?.tipo}
              onChange={e => onChange('tipo', e?.target?.value)}
              className={inputCls(false)}
            >
              {jobService?.TYPES?.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
        </div>
      </div>
      {/* Section: Ubicación y salario */}
      <div className="bg-card border border-border rounded-xl p-5">
        <h2 className="text-base font-heading font-semibold text-foreground mb-4">Ubicación y compensación</h2>
        <div className="space-y-4">
          <div>
            <Label required>Ubicación</Label>
            <input
              type="text"
              value={form?.ubicacion}
              onChange={e => onChange('ubicacion', e?.target?.value)}
              placeholder="Ej: Coronel, Biobío"
              className={inputCls(!!errors?.ubicacion)}
            />
            <FieldError msg={errors?.ubicacion} />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <Label>Salario mínimo (CLP)</Label>
              <input
                type="number"
                value={form?.salario_min}
                onChange={e => onChange('salario_min', e?.target?.value)}
                placeholder="Ej: 500000"
                min="0"
                className={inputCls(false)}
              />
            </div>
            <div>
              <Label>Salario máximo (CLP)</Label>
              <input
                type="number"
                value={form?.salario_max}
                onChange={e => onChange('salario_max', e?.target?.value)}
                placeholder="Ej: 800000"
                min="0"
                className={inputCls(!!errors?.salario_max)}
              />
              <FieldError msg={errors?.salario_max} />
            </div>
          </div>
        </div>
      </div>
      {/* Section: Contacto */}
      <div className="bg-card border border-border rounded-xl p-5">
        <h2 className="text-base font-heading font-semibold text-foreground mb-4">Información de contacto</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <Label required>Email de contacto</Label>
            <input
              type="email"
              value={form?.email_contacto}
              onChange={e => onChange('email_contacto', e?.target?.value)}
              placeholder="contacto@empresa.cl"
              className={inputCls(!!errors?.email_contacto)}
            />
            <FieldError msg={errors?.email_contacto} />
          </div>
          <div>
            <Label>WhatsApp (opcional)</Label>
            <input
              type="text"
              value={form?.whatsapp_contacto}
              onChange={e => onChange('whatsapp_contacto', e?.target?.value)}
              placeholder="+56 9 1234 5678"
              className={inputCls(false)}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
