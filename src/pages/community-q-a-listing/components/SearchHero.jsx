import React, { useRef } from 'react';
import Icon from 'components/AppIcon';
import Button from 'components/ui/Button';

export default function SearchHero({ value, onChange, onAskQuestion }) {
  const inputRef = useRef(null);

  return (
    <div
      className="w-full py-10 md:py-14"
      style={{ background: 'linear-gradient(135deg, var(--color-primary) 0%, var(--color-accent) 100%)' }}
    >
      <div className="max-w-3xl mx-auto px-4 md:px-6 text-center">
        <h1 className="text-2xl md:text-3xl font-heading font-bold text-white mb-1">
          Pregúntale a Coronel
        </h1>
        <p className="text-sm mb-6" style={{ color: 'rgba(255,255,255,0.75)' }}>
          Lo que tu ciudad ya sabe
        </p>

        <div className="relative max-w-xl mx-auto">
          <Icon
            name="Search"
            size={18}
            color="var(--color-muted-foreground)"
            className="absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none"
          />
          <input
            ref={inputRef}
            type="text"
            value={value}
            onChange={e => onChange(e.target.value)}
            placeholder="¿Qué necesitas saber en Coronel?"
            className="w-full pl-11 pr-4 py-3.5 text-sm md:text-base rounded-xl bg-white shadow-lg focus:outline-none focus:ring-2"
            style={{ color: 'var(--color-foreground)', focusRingColor: 'rgba(255,255,255,0.5)' }}
          />
          {value && (
            <button
              onClick={() => onChange('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded-full hover:bg-muted transition-colors"
              aria-label="Limpiar búsqueda"
            >
              <Icon name="X" size={14} color="var(--color-muted-foreground)" />
            </button>
          )}
        </div>

        <div className="mt-5">
          <button
            onClick={onAskQuestion}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full text-sm font-medium border transition-all duration-150 hover:bg-white/20"
            style={{ color: 'white', borderColor: 'rgba(255,255,255,0.4)', background: 'rgba(255,255,255,0.1)' }}
          >
            <Icon name="Plus" size={15} color="white" />
            Hacer una pregunta
          </button>
        </div>
      </div>
    </div>
  );
}
