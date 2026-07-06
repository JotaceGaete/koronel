import React from 'react';
import { Marker, Popup } from 'react-leaflet';
import L from 'leaflet';
import { isValidCoordinate } from '../../../utils/nearbyLocation';

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
export const userLocationIcon = L?.divIcon({
  className: '',
  html: `
    <div style="
      width: 24px;
      height: 24px;
      background: #10b981;
      border: 3px solid white;
      border-radius: 999px;
      box-shadow: 0 0 0 8px rgba(16,185,129,0.22), 0 2px 10px rgba(0,0,0,0.3);
    "></div>
  `,
  iconSize: [24, 24],
  iconAnchor: [12, 12],
  popupAnchor: [0, -14],
});

export function BusinessMarker({ business, isSelected, onClick }) {
  if (!isValidCoordinate(business?.lat, business?.lng)) return null;
  return (
    <Marker
      position={[Number(business?.lat), Number(business?.lng)]}
      icon={isSelected ? selectedBusinessIcon : businessIcon}
      eventHandlers={{ click: () => onClick?.(business) }}
    />
  );
}

export function EventMarker({ event, isSelected, onClick }) {
  if (!isValidCoordinate(event?.resolvedLat, event?.resolvedLng)) return null;
  return (
    <Marker
      position={[Number(event?.resolvedLat), Number(event?.resolvedLng)]}
      icon={isSelected ? selectedEventIcon : eventIcon}
      eventHandlers={{ click: () => onClick?.(event) }}
    />
  );
}

export function CommunityPostMarker({ post, isSelected, onClick }) {
  if (!isValidCoordinate(post?.lat, post?.lng)) return null;
  return (
    <Marker
      position={[Number(post?.lat), Number(post?.lng)]}
      icon={isSelected ? selectedCommunityPostIcon : communityPostIcon}
      eventHandlers={{ click: () => onClick?.(post) }}
    />
  );
}

export function UserLocationMarker({ position }) {
  if (!isValidCoordinate(position?.lat, position?.lng)) return null;
  return (
    <Marker position={[Number(position?.lat), Number(position?.lng)]} icon={userLocationIcon}>
      <Popup>Tú estás aquí</Popup>
    </Marker>
  );
}
