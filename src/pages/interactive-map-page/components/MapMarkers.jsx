import React from 'react';
import { Marker } from 'react-leaflet';
import L from 'leaflet';

// Create custom colored markers
const createMarkerIcon = (color, size = 28) => {
  return L?.divIcon({
    className: '',
    html: `
      <div style="
        width: ${size}px;
        height: ${size}px;
        background: ${color};
        border: 2.5px solid white;
        border-radius: 50% 50% 50% 0;
        transform: rotate(-45deg);
        box-shadow: 0 2px 8px rgba(0,0,0,0.3);
      "></div>
    `,
    iconSize: [size, size],
    iconAnchor: [size / 2, size],
    popupAnchor: [0, -size],
  });
};

export const businessIcon = createMarkerIcon('#2563eb');
export const eventIcon = createMarkerIcon('#ea580c');
export const selectedBusinessIcon = createMarkerIcon('#1d4ed8', 34);
export const selectedEventIcon = createMarkerIcon('#c2410c', 34);
export const communityPostIcon = createMarkerIcon('#7c3aed');
export const selectedCommunityPostIcon = createMarkerIcon('#5b21b6', 34);

export function BusinessMarker({ business, isSelected, onClick }) {
  return (
    <Marker
      position={[business?.lat, business?.lng]}
      icon={isSelected ? selectedBusinessIcon : businessIcon}
      eventHandlers={{ click: () => onClick?.(business) }}
    />
  );
}

export function EventMarker({ event, isSelected, onClick }) {
  if (!event?.resolvedLat || !event?.resolvedLng) return null;
  return (
    <Marker
      position={[event?.resolvedLat, event?.resolvedLng]}
      icon={isSelected ? selectedEventIcon : eventIcon}
      eventHandlers={{ click: () => onClick?.(event) }}
    />
  );
}

export function CommunityPostMarker({ post, isSelected, onClick }) {
  if (!post?.lat || !post?.lng) return null;
  return (
    <Marker
      position={[post?.lat, post?.lng]}
      icon={isSelected ? selectedCommunityPostIcon : communityPostIcon}
      eventHandlers={{ click: () => onClick?.(post) }}
    />
  );
}
