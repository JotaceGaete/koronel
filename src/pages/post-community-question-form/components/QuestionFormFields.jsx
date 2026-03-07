import React from 'react';


const SECTORS = ['Centro', 'Lagunillas', 'Schwager', 'Puchoco', 'Las Higueras', 'Punta de Parra', 'Otro'];

export default function QuestionFormFields({ values, errors, onChange, titleCount, bodyCount }) {
  return (
    <div className="space-y-5">
      {/* Title */}
      <div>
        <label className="block text-sm font-medium text-foreground mb-1.5">
          Título <span style={{ color: 'var(--color-error)' }}>*</span>
        </label>
        <input
          type="text"
          value={values?.title || ''}
          onChange={e => onChange?.('title', e?.target?.value)}
          placeholder="¿Cuál es tu pregunta o recomendación?"
          maxLength={120}
          className={`w-full px-4 py-2.5 text-sm border rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring transition-colors ${
            errors?.title ? 'border-red-400' : 'border-border'
          }`}
        />
        <div className="flex justify-between mt-1">
          {errors?.title
            ? <p className="text-xs" style={{ color: 'var(--color-error)' }}>{errors?.title}</p>
            : <span />}
          <p className="text-xs text-muted-foreground">{titleCount}/120</p>
        </div>
      </div>

      {/* Body */}
      <div>
        <label className="block text-sm font-medium text-foreground mb-1.5">
          Descripción <span style={{ color: 'var(--color-error)' }}>*</span>
        </label>
        <textarea
          value={values?.body || ''}
          onChange={e => onChange?.('body', e?.target?.value)}
          placeholder="Describe tu pregunta con más detalle..."
          rows={5}
          maxLength={1000}
          className={`w-full px-4 py-2.5 text-sm border rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring transition-colors resize-none ${
            errors?.body ? 'border-red-400' : 'border-border'
          }`}
        />
        <div className="flex justify-between mt-1">
          {errors?.body
            ? <p className="text-xs" style={{ color: 'var(--color-error)' }}>{errors?.body}</p>
            : <span />}
          <p className="text-xs text-muted-foreground">{bodyCount}/1000</p>
        </div>
      </div>

      {/* Sector */}
      <div>
        <label className="block text-sm font-medium text-foreground mb-1.5">
          Sector <span style={{ color: 'var(--color-error)' }}>*</span>
        </label>
        <select
          value={values?.sector || ''}
          onChange={e => onChange?.('sector', e?.target?.value)}
          className={`w-full px-4 py-2.5 text-sm border rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring ${
            errors?.sector ? 'border-red-400' : 'border-border'
          }`}
        >
          <option value="">Selecciona un sector</option>
          {SECTORS?.map(s => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
        {errors?.sector && (
          <p className="text-xs mt-1" style={{ color: 'var(--color-error)' }}>{errors?.sector}</p>
        )}
      </div>
    </div>
  );
}
