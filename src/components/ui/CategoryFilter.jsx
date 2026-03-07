import React, { useState, useRef, useEffect } from 'react';
import Icon from 'components/AppIcon';

const BUSINESS_CATEGORIES = [
  { value: 'all', label: 'Todos', icon: 'LayoutGrid' },
  { value: 'restaurants', label: 'Restaurantes', icon: 'UtensilsCrossed' },
  { value: 'health', label: 'Salud', icon: 'Heart' },
  { value: 'education', label: 'Educación', icon: 'GraduationCap' },
  { value: 'automotive', label: 'Automotriz', icon: 'Car' },
  { value: 'hardware', label: 'Ferreterías', icon: 'Wrench' },
  { value: 'supermarkets', label: 'Supermercados', icon: 'ShoppingCart' },
  { value: 'beauty', label: 'Belleza', icon: 'Sparkles' },
  { value: 'services', label: 'Servicios', icon: 'Briefcase' },
  { value: 'technology', label: 'Tecnología', icon: 'Monitor' },
];

const CLASSIFIED_CATEGORIES = [
  { value: 'all', label: 'Todos', icon: 'LayoutGrid' },
  { value: 'vehicles', label: 'Vehículos', icon: 'Car' },
  { value: 'real-estate', label: 'Inmuebles', icon: 'Home' },
  { value: 'electronics', label: 'Electrónica', icon: 'Smartphone' },
  { value: 'clothing', label: 'Ropa', icon: 'Shirt' },
  { value: 'jobs', label: 'Empleos', icon: 'Briefcase' },
  { value: 'services', label: 'Servicios', icon: 'Wrench' },
  { value: 'furniture', label: 'Muebles', icon: 'Sofa' },
  { value: 'sports', label: 'Deportes', icon: 'Dumbbell' },
];

export default function CategoryFilter({
  type = 'businesses', // 'businesses' | 'classified-ads'
  selected = 'all',
  onChange,
  className = '',
}) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const panelRef = useRef(null);
  const categories = type === 'classified-ads' ? CLASSIFIED_CATEGORIES : BUSINESS_CATEGORIES;
  const selectedCategory = categories?.find((c) => c?.value === selected) || categories?.[0];

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (panelRef?.current && !panelRef?.current?.contains(e?.target)) {
        setMobileOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelect = (value) => {
    onChange?.(value);
    setMobileOpen(false);
  };

  return (
    <div className={`w-full ${className}`}>
      {/* Desktop: Horizontal scrollable pills */}
      <div className="hidden sm:flex items-center gap-2 overflow-x-auto pb-1 scrollbar-hide">
        {categories?.map((cat) => (
          <button
            key={cat?.value}
            onClick={() => handleSelect(cat?.value)}
            className={`
              flex items-center gap-1.5 px-3 py-2 rounded-md text-sm font-caption font-medium
              whitespace-nowrap shrink-0 transition-all duration-250 ease-smooth min-h-[44px]
              focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring
              ${selected === cat?.value
                ? 'bg-primary text-primary-foreground shadow-sm'
                : 'bg-card border border-border text-secondary hover:bg-muted hover:text-foreground'
              }
            `}
            aria-pressed={selected === cat?.value}
          >
            <Icon name={cat?.icon} size={15} color="currentColor" />
            {cat?.label}
          </button>
        ))}
      </div>
      {/* Mobile: Trigger button */}
      <div className="sm:hidden" ref={panelRef}>
        <button
          onClick={() => setMobileOpen((v) => !v)}
          className="w-full flex items-center justify-between px-4 py-3 bg-card border border-border rounded-md text-sm font-caption font-medium text-foreground transition-all duration-250 min-h-[44px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          aria-expanded={mobileOpen}
          aria-haspopup="listbox"
        >
          <div className="flex items-center gap-2">
            <Icon name={selectedCategory?.icon} size={16} color="var(--color-primary)" />
            <span>{selectedCategory?.label}</span>
          </div>
          <div className="flex items-center gap-1 text-muted-foreground">
            <span className="text-xs">Categoría</span>
            <Icon name={mobileOpen ? 'ChevronUp' : 'ChevronDown'} size={16} color="currentColor" />
          </div>
        </button>

        {/* Mobile slide-out panel */}
        {mobileOpen && (
          <div
            className="mt-1 bg-popover border border-border rounded-md shadow-lg z-[150] overflow-hidden"
            role="listbox"
            aria-label="Seleccionar categoría"
          >
            <div className="grid grid-cols-2 gap-1 p-2">
              {categories?.map((cat) => (
                <button
                  key={cat?.value}
                  onClick={() => handleSelect(cat?.value)}
                  className={`
                    flex items-center gap-2 px-3 py-2.5 rounded-md text-sm font-caption font-medium
                    transition-all duration-150 min-h-[44px] text-left
                    focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring
                    ${selected === cat?.value
                      ? 'bg-primary text-primary-foreground'
                      : 'text-card-foreground hover:bg-muted'
                    }
                  `}
                  role="option"
                  aria-selected={selected === cat?.value}
                >
                  <Icon name={cat?.icon} size={16} color="currentColor" />
                  {cat?.label}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}