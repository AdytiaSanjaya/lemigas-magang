// Geometri geolokasi presensi: koordinat kantor LEMIGAS + jarak (Haversine).
// Digunakan bersama oleh klien (widget absensi) dan server (API presensi).

// Titik akurat Balai Besar Pelayanan dan Pengujian Minyak dan Gas Bumi
// (Jl. Ciledug Raya No.10, Kebayoran Lama, Jakarta Selatan).
export const KANTOR_LEMIGAS = {
  latitude: -6.2361,
  longitude: 106.7725,
};

// Radius maksimum jarak presensi dari kantor LEMIGAS (meter).
// 3000 m (3 km) untuk mengakomodasi deviasi/ketidakakuratan lokasi dari
// Wi-Fi/IP browser laptop Windows (geolokasi berbasis jaringan, bukan GPS chip).
export const ABSEN_RADIUS_METERS = 3000;

// Ambang akurasi browser (meter). Di atas nilai ini deviasi lokasi dianggap
// signifikan dan dikurangi dari jarak kalkulasi agar pengguna yang benar-benar
// berada di area kantor tidak terblokir oleh akurasi rendah (laptop/Wi-Fi).
export const ACCURACY_TOLERANCE_METERS = 500;

// Jarak efektif setelah kompensasi deviasi akurasi browser.
// Jika akurasi > 500 m, kurangi deviasi tersebut dari jarak Haversine (min 0).
export function adjustedJarakMeters(jarak: number, accuracy: number): number {
  const deviasi = accuracy > ACCURACY_TOLERANCE_METERS ? accuracy : 0;
  return Math.max(0, jarak - deviasi);
}

// Format jarak (meter) menjadi label singkat: "800 m" / "1.2 km" / "3 km".
export function formatJarakMeters(meters: number): string {
  if (meters >= 1000) {
    const km = meters / 1000;
    return Number.isInteger(km) ? `${km} km` : `${km.toFixed(1)} km`;
  }
  return `${Math.round(meters)} m`;
}

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
