import type { Session } from "next-auth";

// Tipe dokumen pendaftar (berasal dari kolom berkas pada model Pendaftar).
export type TipeDokumen = "cv" | "surat" | "ktp" | "transkrip" | "loa";

// AUD-01/AUD-02: klasifikasi privasi dokumen.
// - "cv" & "surat"     : dokumen penilaian/bimbingan → boleh diakses MENTOR
//                        yang membimbing peserta tersebut.
// - "ktp", "transkrip", "loa" : dokumen identitas/nilai/berkas resmi → hanya
//                        ADMIN atau pemiliknya sendiri (PENDAFTAR/PESERTA).
const TPE_MENTOR_DIIZINKAN: ReadonlySet<TipeDokumen> = new Set(["cv", "surat"]);

export type HasilAksesBerkas =
  | { ok: true }
  | { ok: false; status: 403; error: string };

// Pemeriksaan otorisasi wajib untuk SEMUA rute penyaji berkas privasi, dipanggil
// sebelum isi berkas dibaca/dikirim (fail-closed: gagal = 403).
//
// Urutan keputusan:
// 1. ADMIN        → akses penuh semua dokumen semua pendaftar.
// 2. Pemilik      → PENDAFTAR/PESERTA hanya dokumen miliknya sendiri
//                   (pencocokan email session dengan pemilik, case-insensitive).
// 3. MENTOR       → hanya dokumen penilaian (cv/surat) milik peserta
//                   bimbingannya sendiri (scoping via peserta.mentorId).
// 4. Selain itu    → 403 Forbidden.
export function authorizeBerkasAccess(input: {
  session: Session;
  ownerEmail?: string | null;
  mentorId?: string | null;
  tipe: TipeDokumen;
}): HasilAksesBerkas {
  const { session, ownerEmail, mentorId, tipe } = input;
  const tolak: HasilAksesBerkas = { ok: false, status: 403, error: "Forbidden" };

  // 1) ADMIN: akses penuh.
  if (session.user?.role === "ADMIN") return { ok: true };

  // 2) Pemilik dokumen (PENDAFTAR / PESERTA): hanya dokumen milik sendiri.
  const emailSession = session.user?.email?.toLowerCase().trim() ?? "";
  const emailPemilik = ownerEmail?.toLowerCase().trim() ?? "";
  if (emailSession && emailPemilik && emailSession === emailPemilik) {
    return { ok: true };
  }

  // 3) MENTOR: scoping vertikal (peserta bimbingan) + batas jenis dokumen.
  if (session.user?.role === "MENTOR") {
    const membimbing = Boolean(mentorId) && mentorId === session.user.id;
    if (membimbing && TPE_MENTOR_DIIZINKAN.has(tipe)) return { ok: true };
    return tolak;
  }

  // 4) Role lain / bukan pemilik: tolak.
  return tolak;
}
