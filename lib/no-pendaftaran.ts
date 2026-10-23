import { randomBytes } from "crypto";
import { prisma } from "@/lib/prisma";

// AUD-23: noPendaftaran dahulu sekuensial (count()+1 → LEMIGAS-<tahun>-<urutan>)
// sehingga mudah disusuri linear. Kini format ACAK:
//
//   MAG-<YYMM>-<4 karakter>   contoh: MAG-2610-A7X9
//
// - Prefix MAG + tahun-bulan pendaftaran tetap terbaca untuk arsip/dukungan.
// - 4 karakter dari alfabet 32 simbol TANPA kemiripan visual (0/O dan 1/I/L
//   dihapus) → 32^4 ≈ 1.048.576 kombinasi (~20 bit entropi acak per nomor).
// - randomBytes() Node bersifat kriptografis; 256 % 32 = 0 sehingga pemetaan
//   byte → alfabet tanpa bias modulo.
// - Nomor LAMA (LEMIGAS-<tahun>-<urutan>) tidak diubah/dihapus — tetap sah.
const ACAK_ALFABET = "23456789ABCDEFGHJKMNPQRSTUVWXYZ";
const ACAK_PANJANG = 4;
const MAKS_PERCOBAAN = 10;

function buatKodeAcak(): string {
  const bytes = randomBytes(ACAK_PANJANG);
  let kode = "";
  for (let i = 0; i < ACAK_PANJANG; i++) {
    kode += ACAK_ALFABET[bytes[i] % ACAK_ALFABET.length];
  }
  return kode;
}

// Cek tumbukan (collision check): loop while — setiap kandidat wajib dicek ke
// database lewat kolom unik `Pendaftar.noPendaftaran` sebelum dipakai; bila
// sudah terpakai, kandidat acak baru dibuat. Pada kondisi normal cukup 1
// findUnique terindeks (latensi mikro-detik) sehingga waktu respons rute
// registrasi praktis tidak berubah; maksimum 10 percobaan lalu gagal
// terkontrol (dipetakan ke respons 503 oleh pemanggil).
//
// Parameter `cekTerpakai` bersifat opsional (default: query Prisma) agar
// alur percobaan-ulang-nya bisa diuji tanpa menyentuh database.
async function terpakaiDiDatabase(candidate: string): Promise<boolean> {
  const row = await prisma.pendaftar.findUnique({
    where: { noPendaftaran: candidate },
    select: { id: true },
  });
  return Boolean(row);
}

export async function generateNoPendaftaran(
  cekTerpakai: (candidate: string) => Promise<boolean> = terpakaiDiDatabase
): Promise<string> {
  const now = new Date();
  const yymm = `${String(now.getFullYear()).slice(2)}${String(now.getMonth() + 1).padStart(2, "0")}`;

  let percobaan = 0;
  let candidate: string;
  do {
    candidate = `MAG-${yymm}-${buatKodeAcak()}`;
    if (!(await cekTerpakai(candidate))) return candidate;
    percobaan += 1;
  } while (percobaan < MAKS_PERCOBAAN);

  throw new Error(`Gagal menghasilkan noPendaftaran unik setelah ${MAKS_PERCOBAAN} percobaan`);
}
