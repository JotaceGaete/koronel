import React, { useEffect, useRef } from 'react';
import { MapContainer, TileLayer, Marker, useMapEvents, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { siteConfig } from '../../config/siteConfig';
import { useCity } from '../../contexts/CityContext';

// Fix Leaflet default icon with bundlers
delete L?.Icon?.Default?.prototype?._getIconUrl;
L?.Icon?.Default?.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

// Inner component: handles map click in picker mode
function PickerEvents({ onChange }) {
  useMapEvents({
    click(e) {
      onChange?.({ lat: e?.latlng?.lat, lng: e?.latlng?.lng });
    },
  });
  return null;
}

// Inner component: recenter map when lat/lng change
function MapRecenter({ lat, lng }) {
  const map = useMap();
  const prevRef = useRef({ lat, lng });
  useEffect(() => {
    if (lat == null || lng == null) return;
    if (prevRef?.current?.lat !== lat || prevRef?.current?.lng !== lng) {
      map?.setView([lat, lng], map?.getZoom());
      prevRef.current = { lat, lng };
    }
  }, [lat, lng, map]);
  return null;
}

export default function OSMMap({
  lat,
  lng,
  onChange,
  height = '300px',
  zoom = 15,
  readonly = true,
}) {
  const { city } = useCity();
  const cityDefault = [
    city?.default_lat ?? siteConfig?.map?.defaultCenter?.lat,
    city?.default_lng ?? siteConfig?.map?.defaultCenter?.lng,
  ];

  const hasCoords = lat != null && lng != null && !isNaN(parseFloat(lat)) && !isNaN(parseFloat(lng));
  const center = hasCoords ? [parseFloat(lat), parseFloat(lng)] : cityDefault;

  const markerPosition = hasCoords ? [parseFloat(lat), parseFloat(lng)] : null;

  const handleDragEnd = (e) => {
    const { lat: newLat, lng: newLng } = e?.target?.getLatLng();
    onChange?.({ lat: newLat, lng: newLng });
  };

  return (
    <MapContainer
      center={center}
      zoom={zoom}
      style={{ width: '100%', height }}
      scrollWheelZoom={true}
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      {!readonly && <PickerEvents onChange={onChange} />}
      {/* Siempre montado (no solo cuando hasCoords): así, si no hay coords
          explícitas y el centro por defecto cambia porque CityContext
          resuelve la ciudad activa después del primer render, el mapa
          también se reposiciona — no solo cuando el usuario mueve el pin. */}
      <MapRecenter lat={center?.[0]} lng={center?.[1]} />
      {markerPosition && (
        <Marker
          position={markerPosition}
          draggable={!readonly}
          eventHandlers={!readonly ? { dragend: handleDragEnd } : {}}
        />
      )}
    </MapContainer>
  );
}
