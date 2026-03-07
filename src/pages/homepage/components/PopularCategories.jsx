import React from 'react';
import { Link } from 'react-router-dom';
import Icon from 'components/AppIcon';

// name_key debe coincidir con categorías en BD (categories.name_key)
const CATEGORIES = [
  { label: 'Restaurantes', icon: 'UtensilsCrossed', color: '#C53030', bg: '#FED7D7', value: 'restaurantes' },
  { label: 'Mecánica', icon: 'Car', color: '#B7791F', bg: '#FEFCBF', value: 'automotriz-mecanica' },
  { label: 'Veterinarias', icon: 'Heart', color: '#276749', bg: '#C6F6D5', value: 'salud-veterinaria' },
  { label: 'Farmacias', icon: 'Pill', color: '#2B6CB0', bg: '#BEE3F8', value: 'salud-farmacia' },
  { label: 'Electricistas', icon: 'Zap', color: '#B7791F', bg: '#FEFCBF', value: 'servicios-electricidad' },
  { label: 'Panaderías', icon: 'Cookie', color: '#9C4221', bg: '#FEEBC8', value: 'restaurantes-panaderia' },
  { label: 'Abogados', icon: 'Scale', color: '#2A4365', bg: '#BEE3F8', value: 'servicios-negocio' },
  { label: 'Ferreterías', icon: 'Wrench', color: '#4A5568', bg: '#E2E8F0', value: 'ferreterias' },
  { label: 'Supermercados', icon: 'ShoppingCart', color: '#276749', bg: '#C6F6D5', value: 'supermercados' },
  { label: 'Educación', icon: 'GraduationCap', color: '#553C9A', bg: '#E9D8FD', value: 'educacion' },
  { label: 'Belleza', icon: 'Sparkles', color: '#97266D', bg: '#FED7E2', value: 'belleza' },
  { label: 'Tecnología', icon: 'Monitor', color: '#2C5282', bg: '#BEE3F8', value: 'tecnologia-negocio' },
];

export default function PopularCategories() {
  return (
    <section className="w-full py-12 md:py-14 lg:py-16 px-4 md:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-4 md:mb-6">
          <h2 className="font-heading font-bold text-xl md:text-3xl text-foreground">
            Categorías Populares
          </h2>
          <Link
            to="/directorio-negocios"
            className="min-h-[44px] min-w-[44px] flex items-center justify-center sm:min-w-0 sm:min-h-0 text-sm font-caption font-semibold gap-1 hover:underline py-2 pr-1"
            style={{ color: 'var(--color-primary)' }}
            aria-label="Ver todas las categorías"
          >
            Ver todas
            <Icon name="ChevronRight" size={16} color="var(--color-primary)" />
          </Link>
        </div>

        {/* Mobile: solo scroll horizontal. Desktop: grid */}
        <div className="flex gap-3 overflow-x-auto overflow-y-hidden pb-3 -mx-4 px-4 md:mx-0 md:px-0 md:pb-0 scrollbar-hide snap-x snap-mandatory md:grid md:grid-cols-4 lg:grid-cols-6 md:overflow-visible" style={{ WebkitOverflowScrolling: 'touch' }}>
          {CATEGORIES?.map((cat) => (
            <Link
              key={cat?.label}
              to={`/directorio-negocios?category=${cat?.value}`}
              className="flex flex-col items-center justify-center gap-2 p-4 rounded-2xl border border-border bg-card hover:shadow-lg active:scale-[0.98] transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring shrink-0 w-[100px] min-h-[44px] min-w-[44px] cursor-pointer snap-start md:w-auto md:min-h-[120px] md:min-w-0"
              style={{ minHeight: '88px' }}
            >
              <div
                className="flex items-center justify-center w-12 h-12 md:w-16 md:h-16 rounded-2xl transition-all duration-200 shrink-0"
                style={{ background: cat?.bg }}
              >
                <Icon name={cat?.icon} size={26} color={cat?.color} />
              </div>
              <span className="text-xs md:text-sm font-caption font-semibold text-card-foreground text-center leading-tight line-clamp-2">
                {cat?.label}
              </span>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}