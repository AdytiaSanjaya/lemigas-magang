import { NextResponse } from "next/server";

// AUD-28 (DITUTUP): Endpoint reset massal kredensial DINONAKTIFKAN.
// Sebelumnya handler ini menimpa passwordHash, role, dan isAktif=true pada
// akun admin & mentor ke DEFAULT_ADMIN_PASSWORD (satu kata sandi bersama)
// kapan pun dipanggil — termasuk kemungkinan mengaktifkan kembali akun yang
// sudah dinonaktifkan. Selain mempertahankan sandi default, endpoint ini juga
// menjadi jalur eskalasi/putar-balik kontrol autentikasi.
//
// Kini SEMUA method (GET/POST) langsung menolak dengan 403 Forbidden.
// Rotasi kata sandi harus dilakukan per-akun melalui prosedur manual/CLI oleh
// operator (kata sandi unik & panjang), bukan endpoint HTTP massal.
//
// CATATAN: jangan dipulihkan tanpa pengganti yang aman (shared secret +
// audit log + tanpa konsep DEFAULT_ADMIN_PASSWORD bersama).

const FORBIDDEN = {
  error: "Akses Ditolak.",
} as const;

export async function GET() {
  return NextResponse.json(FORBIDDEN, { status: 403 });
}

export async function POST() {
  return NextResponse.json(FORBIDDEN, { status: 403 });
}

export const runtime = "nodejs";
export const maxDuration = 30;
