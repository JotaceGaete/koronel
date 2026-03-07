import React, { useEffect, useRef, forwardRef, useImperativeHandle } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import { useNavigate } from 'react-router-dom';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

const CORONEL_CENTER = [-37.0298, -73.1429];
const DEFAULT_ZOOM = 13;

// Inner component to expose map instance via ref
function MapController({ flyTarget, onMapReady }) {
  const map = useMap();
  useEffect(() => {
    if (onMapReady) onMapReady(map);
  }, [map]);
  useEffect(() => {
    if (flyTarget?.lat && flyTarget?.lng) {
      map?.flyTo([flyTarget?.lat, flyTarget?.lng], 16, { duration: 1.0 });
    }
  }, [flyTarget, map]);
  return null;
}

export default function SearchMapRightPanel({ businesses, selectedId, onMarkerClick, flyTarget, onMapReady }) {
  const navigate = useNavigate();
  const markerRefs = useRef({});

  // Open popup when selectedId changes
  useEffect(() => {
    if (selectedId && markerRefs?.current?.[selectedId]) {
      setTimeout(() => {
        markerRefs?.current?.[selectedId]?.openPopup();
      }, 400);
    }
  }, [selectedId]);

  const businessesWithCoords = businesses?.filter(
    (b) => b?.lat != null && b?.lng != null && !isNaN(parseFloat(b?.lat)) && !isNaN(parseFloat(b?.lng))
  );

  const renderStars = (rating) =>
    Array.from({ length: 5 }, (_, i) => (
      <span key={i} style={{ color: i < Math.floor(rating || 0) ? '#F59E0B' : '#D1D5DB', fontSize: '12px' }}>★</span>
    ));

  return (
    <div className="w-full h-full">
      <MapContainer
        center={CORONEL_CENTER}
        zoom={DEFAULT_ZOOM}
        style={{ width: '100%', height: '100%' }}
        scrollWheelZoom={true}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <MapController flyTarget={flyTarget} onMapReady={onMapReady} />
        {businessesWithCoords?.map((business) => {
          const lat = parseFloat(business?.lat ?? business?.latitude);
          const lng = parseFloat(business?.lng ?? business?.longitude);
          const isActive = selectedId === business?.id;
          return (
            <Marker
              key={business?.id}
              position={[lat, lng]}
              icon={isActive ? createOrangeIcon() : createBlueIcon()}
              ref={(ref) => { if (ref) markerRefs.current[business?.id] = ref; }}
              eventHandlers={{
                click: () => onMarkerClick(business),
              }}
            >
              <Popup>
                <div style={{ minWidth: '160px', maxWidth: '200px', fontFamily: 'inherit' }}>
                  <p style={{ fontWeight: '700', fontSize: '13px', marginBottom: '4px', lineHeight: '1.3' }}>
                    {business?.name}
                  </p>
                  {(business?.parentCategoryName || business?.category) && (
                    <span style={{
                      display: 'inline-block',
                      background: 'var(--color-primary, #2563EB)',
                      color: 'white',
                      fontSize: '10px',
                      padding: '1px 6px',
                      borderRadius: '999px',
                      marginBottom: '4px',
                    }}>
                      {business?.parentCategoryName || business?.category}
                    </span>
                  )}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '2px', marginBottom: '6px' }}>
                    {renderStars(business?.rating)}
                    <span style={{ fontSize: '11px', marginLeft: '3px', color: '#6B7280' }}>{business?.rating || '—'}</span>
                  </div>
                  <button
                    onClick={() => navigate(`/negocios/${business?.id}`)}
                    style={{
                      width: '100%',
                      padding: '5px 10px',
                      background: 'var(--color-primary, #2563EB)',
                      color: 'white',
                      border: 'none',
                      borderRadius: '6px',
                      fontSize: '12px',
                      fontWeight: '600',
                      cursor: 'pointer',
                    }}
                  >
                    Ver negocio
                  </button>
                </div>
              </Popup>
            </Marker>
          );
        })}
      </MapContainer>
    </div>
  );
}

const createBlueIcon = () => L?.divIcon({
  className: '',
  html: `<div style="width:28px;height:36px;position:relative">
    <svg viewBox="0 0 28 36" fill="none" xmlns="http://www.w3.org/2000/svg" width="28" height="36">
      <path d="M14 0C6.268 0 0 6.268 0 14c0 9.333 14 22 14 22S28 23.333 28 14C28 6.268 21.732 0 14 0z" fill="#2563EB"/>
      <circle cx="14" cy="14" r="6" fill="white"/>
    </svg>
  </div>`,
  iconSize: [28, 36],
  iconAnchor: [14, 36],
  popupAnchor: [0, -38],
});

const createOrangeIcon = () => L?.divIcon({
  className: '',
  html: `<div style="width:32px;height:42px;position:relative">
    <svg viewBox="0 0 32 42" fill="none" xmlns="http://www.w3.org/2000/svg" width="32" height="42">
      <path d="M16 0C7.163 0 0 7.163 0 16c0 10.667 16 26 16 26S32 26.667 32 16C32 7.163 24.837 0 16 0z" fill="#F97316"/>
      <circle cx="16" cy="16" r="7" fill="white"/>
    </svg>
  </div>`,
  iconSize: [32, 42],
  iconAnchor: [16, 42],
  popupAnchor: [0, -44],
});
