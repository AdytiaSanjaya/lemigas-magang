import { NextResponse } from "next/server";

// AUD-28 (DITUTUP): Endpoint bootstrap/reset sandi default DINONAKTIFKAN.
// Sebelumnya handler ini meng-upsert akun admin@lemigas.example dengan
// DEFAULT_ADMIN_PASSWORD dari environment — sebuah "pintu belakang" yang bisa
// mengembalikan akun admin ke kata sandi default bersama kapan pun dari internet
// (bahkan oleh sesi admin yang dikompromikan), tanpa jejak audit.
//
// Kini SEMUA method (GET/POST) langsung menolak dengan 403 Forbidden.
// Pembuatan awal akun admin hanya boleh dilakukan lewat skrip lokal/CLI yang
// dijalankan dari terminal oleh operator, bukan lewat endpoint HTTP.
//
// CATATAN: jangan dipulihkan tanpa pengganti yang aman (shared secret +
// audit log + blokir bila sudah ada ADMIN aktif).

const FORBIDDEN = {
  error: "Akses Ditolak.",
} as const;

export async function GET() {
  return NextResponse.json(FORBIDDEN, { status: 403 });
}

export async function POST() {
  return NextResponse.json(FORBIDDEN, { status: 403 });
}
