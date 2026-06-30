import React from 'react';
import { Link } from 'react-router-dom';
import Icon from 'components/AppIcon';
import Logo from 'components/Logo';
import { cityConfig } from 'config/cityConfig';

export default function FooterSection() {
  const currentYear = new Date()?.getFullYear();

  return (
    <footer className="w-full bg-card border-t border-border py-8 md:py-10 px-4 md:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 md:gap-8 mb-8">
          {/* Brand */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <Logo variant="footer" />
            </div>
            <p className="text-sm font-caption text-muted-foreground leading-relaxed">
              {cityConfig.footerTagline}
            </p>
          </div>

          {/* Negocios y emprendimientos */}
          <div>
            <h4 className="font-heading font-semibold text-sm text-foreground mb-3 uppercase tracking-wider">Negocios</h4>
            <ul className="space-y-2">
              {[
                { label: 'Directorio', path: '/directorio-negocios' },
                { label: 'Publicar negocio', path: '/publicar-negocio' },
                { label: 'Mapa', path: '/mapa' },
              ]?.map((item) => (
                <li key={item?.label}>
                  <Link to={item?.path} className="text-sm font-caption text-muted-foreground hover:text-foreground transition-colors duration-150">
                    {item?.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Comunidad */}
          <div>
            <h4 className="font-heading font-semibold text-sm text-foreground mb-3 uppercase tracking-wider">Comunidad</h4>
            <ul className="space-y-2">
              {[
                { label: 'Preguntas y respuestas', path: '/comunidad' },
                { label: 'Hacer una pregunta', path: '/comunidad/nueva' },
                { label: 'Eventos', path: '/eventos' },
              ]?.map((item) => (
                <li key={item?.label}>
                  <Link to={item?.path} className="text-sm font-caption text-muted-foreground hover:text-foreground transition-colors duration-150">
                    {item?.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Mi Cuenta */}
          <div>
            <h4 className="font-heading font-semibold text-sm text-foreground mb-3 uppercase tracking-wider">Mi Cuenta</h4>
            <ul className="space-y-2">
              {[
                { label: 'Panel de usuario', path: '/user-account-dashboard' },
                { label: 'Mis negocios', path: '/user-account-dashboard' },
              ]?.map((item) => (
                <li key={item?.label}>
                  <Link to={item?.path} className="text-sm font-caption text-muted-foreground hover:text-foreground transition-colors duration-150">
                    {item?.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="border-t border-border pt-5 flex flex-col sm:flex-row items-center justify-between gap-3">
          <p className="text-xs font-caption text-muted-foreground">
            &copy; {currentYear} Koronel. Todos los derechos reservados.
          </p>
          <div className="flex items-center gap-1 text-xs font-caption text-muted-foreground">
            <Icon name="MapPin" size={12} color="var(--color-primary)" />
            <span>{cityConfig.name}, Región del {cityConfig.region}, {cityConfig.country}</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
