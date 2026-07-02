import React, { createContext, useContext, useEffect, useState } from 'react';
import { CITY_CONFIG, setActiveCityConfig } from '../config/city';
import { resolveActiveCity } from '../services/cityService';

/**
 * Fuente única de "cuál es la ciudad activa" para toda la app.
 *
 * Siempre arranca con el valor estático de CITY_CONFIG (idéntico al
 * comportamiento actual) y, en segundo plano, intenta resolverla desde
 * community_cities. Si la tabla no existe todavía o no hay una ciudad
 * activa que matchee el dominio actual, se queda con CITY_CONFIG para
 * siempre — cero cambio visible hasta que exista una fila real que
 * matchear.
 */
const CityContext = createContext(CITY_CONFIG);

export function CityProvider({ children }) {
  const [city, setCity] = useState(CITY_CONFIG);

  useEffect(() => {
    let cancelled = false;
    resolveActiveCity()?.then((resolved) => {
      if (!cancelled && resolved) {
        setCity(resolved);
        setActiveCityConfig(resolved);
      }
    });
    return () => {
      cancelled = true;
    };
  }, []);

  return <CityContext.Provider value={city}>{children}</CityContext.Provider>;
}

export function useCity() {
  return useContext(CityContext);
}
