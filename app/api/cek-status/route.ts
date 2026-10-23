import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { rateLimiter, getClientIp } from "@/lib/rate-limit";

// Endpoint publik untuk mengecek status lamaran sendiri.
// AMAN: hanya memberikan data pendaftar yang cocok (no. pendaftaran + email),
// dan TIDAK pernah mengembalikan data sensitif pendaftar lain.
export async function POST(req: NextRequest) {
  // Rate limit untuk mencegah pencarian acak/spam.
  const ip = getClientIp(req);
  const rate = await rateLimiter.consume(`cek-status:${ip}`);
  if (!rate.success) {
    return NextResponse.json(
      { error: "Terlalu banyak permintaan. Ulangi dalam 1 menit." },
      { status: 429 }
    );
  }

  const { noPendaftaran, email } = (await req.json()) as {
    noPendaftaran?: string;
    email?: string;
  };
  if (!noPendaftaran || !email) {
    return NextResponse.json({ error: "Lengkapi nomor pendaftaran dan email." }, { status: 422 });
  }

  const pendaftar = await prisma.pendaftar.findUnique({
    where: { noPendaftaran: noPendaftaran.trim().toUpperCase() },
    // AUD-14: loaUrl (data URL PDF Base64) TIDAK ikut di-select — keberadaannya
    // cukup dicek lewat query terpisah yang hanya mengembalikan id (lihat bawah).
    select: {
      id: true,
      noPendaftaran: true,
      nama: true,
      email: true, // dipakai hanya untuk mencocokkan; tidak dikembalikan ke klien
      status: true,
      catatan: true,
      createdAt: true,
      unitMinat: { select: { nama: true } },
      statusHistories: {
        orderBy: { createdAt: "desc" },
        take: 1,
        select: { status: true, createdAt: true },
      },
      peserta: {
        select: { tanggalMulai: true, tanggalSelesai: true },
      },
    },
  });

  if (!pendaftar || pendaftar.email.toLowerCase() !== email.trim().toLowerCase()) {
    // Konsisten: jangan bocorkan apakah data ada/email valid.
    return NextResponse.json(
      { error: "Nomor pendaftaran dan email tidak cocok." },
      { status: 404 }
    );
  }

  // Keberadaan LoA: cukup boolean (query id saja) — isi berkas tidak dimuat.
  const loaTersedia = await prisma.pendaftar
    .findFirst({
      where: { id: pendaftar.id, NOT: { OR: [{ loaUrl: null }, { loaUrl: "" }] } },
      select: { id: true },
    })
    .catch(() => null);

  // Hanya kembalikan data status yang aman (tanpa email/no.HP/isi berkas).
  // loaUrl tidak dikirim utuh — cukup boolean keberadaannya untuk merender
  // tombol unduh; berkasnya diambil lewat POST /api/loa.
  const { email: _email, id: _id, ...safeData } = pendaftar;
  void _email;
  void _id;
  return NextResponse.json({
    pendaftar: { ...safeData, loaTersedia: Boolean(loaTersedia) },
  });
}