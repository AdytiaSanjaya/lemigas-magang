// Geometri geolokasi presensi: koordinat kantor LEMIGAS + jarak (Haversine).
// Digunakan bersama oleh klien (widget absensi) dan server (API presensi).

export const KANTOR_LEMIGAS = {
  latitude: -6.362,
  longitude: 106.832,
};

// Radius maksimum jarak presensi dari kantor LEMIGAS (meter).
export const ABSEN_RADIUS_METERS = 200;

export function haversineMeters(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371000; // jari-jari bumi (meter)
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}

// Nilai maksimum koordinat valid untuk validasi Zod.
export const COORD_BOUNDS = {
  lat: { min: -90, max: 90 },
  lon: { min: -180, max: 180 },
} as const;
