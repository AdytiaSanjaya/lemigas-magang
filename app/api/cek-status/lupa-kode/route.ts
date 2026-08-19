import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { rateLimiter, getClientIp } from "@/lib/rate-limit";
import { lupaKodeSchema } from "@/lib/validation/cek-status";

export const runtime = "nodejs";
export const maxDuration = 20;

// Endpoint publik "Lupa Kode Pendaftaran": mencari kembali nomor pendaftaran
// berdasarkan email yang dipakai saat mendaftar.
// AMAN: hanya mengembalikan noPendaftaran + status (data publik milik pemohon
// itu sendiri), tidak pernah membocorkan email/no.HP/berkas/data pendaftar lain.
export async function POST(req: NextRequest) {
  // Rate limit untuk mencegah pencarian acak/spam per IP.
  const ip = getClientIp(req);
  const rate = await rateLimiter.consume(`lupa-kode:${ip}`);
  if (!rate.success) {
    return NextResponse.json(
      { error: "Terlalu banyak permintaan. Ulangi dalam 1 menit." },
      { status: 429 }
    );
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Body tidak valid." }, { status: 400 });
  }

  const parsed = lupaKodeSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validasi gagal.", fieldErrors: parsed.error.flatten().fieldErrors },
      { status: 422 }
    );
  }

  const email = parsed.data.email.trim().toLowerCase();

  const pendaftar = await prisma.pendaftar.findMany({
    where: { email },
    orderBy: { createdAt: "desc" },
    select: {
      noPendaftaran: true,
      nama: true,
      status: true,
      createdAt: true,
      unitMinat: { select: { nama: true } },
    },
  });

  if (pendaftar.length === 0) {
    return NextResponse.json(
      { error: "Email tidak ditemukan. Pastikan menggunakan email yang sama saat mendaftar." },
      { status: 404 }
    );
  }

  return NextResponse.json({ pendaftar });
}