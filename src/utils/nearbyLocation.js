export function isValidCoordinate(lat, lng) {
  if (lat == null || lng == null || lat === '' || lng === '') return false;

  const parsedLat = Number(lat);
  const parsedLng = Number(lng);

  return (
    Number.isFinite(parsedLat) &&
    Number.isFinite(parsedLng) &&
    parsedLat >= -90 &&
    parsedLat <= 90 &&
    parsedLng >= -180 &&
    parsedLng <= 180
  );
}

export function calculateDistanceKm(fromLat, fromLng, toLat, toLng) {
  if (!isValidCoordinate(fromLat, fromLng) || !isValidCoordinate(toLat, toLng)) {
    return null;
  }

  const earthRadiusKm = 6371;
  const toRadians = (degrees) => (Number(degrees) * Math.PI) / 180;
  const startLat = toRadians(fromLat);
  const endLat = toRadians(toLat);
  const deltaLat = toRadians(Number(toLat) - Number(fromLat));
  const deltaLng = toRadians(Number(toLng) - Number(fromLng));

  const a =
    Math.sin(deltaLat / 2) ** 2 +
    Math.cos(startLat) * Math.cos(endLat) * Math.sin(deltaLng / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return earthRadiusKm * c;
}

export function formatDistance(km) {
  if (km == null || km === '') return null;

  const parsedKm = Number(km);
  if (!Number.isFinite(parsedKm) || parsedKm < 0) return null;

  if (parsedKm < 1) {
    return `A ${Math.round(parsedKm * 1000)} m`;
  }

  const formattedKm = new Intl.NumberFormat('es-CL', {
    maximumFractionDigits: 1,
  }).format(parsedKm);

  return `A ${formattedKm} km`;
}

export function getDirectionsUrl(lat, lng) {
  if (!isValidCoordinate(lat, lng)) return null;
  return `https://www.google.com/maps/dir/?api=1&destination=${Number(lat)},${Number(lng)}`;
}
