import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { kehadiranSchema } from "@/lib/validation/presensi";
import { getPesertaBySession } from "@/lib/peserta";
import { todayString, toUtcDate } from "@/lib/dates";
import {
  KANTOR_LEMIGAS,
  ABSEN_RADIUS_METERS,
  haversineMeters,
  adjustedJarakMeters,
} from "@/lib/geo";

export const runtime = "nodejs";
export const maxDuration = 20;

// Check-in / check-out presensi harian peserta.
// Endpoint ini hanya untuk role PENDAFTAR yang tercatat sebagai peserta aktif.
//
// Seluruh handler dibungkus try-catch global: setiap error validasi, relasi
// database, atau koneksi dikembalikan sebagai JSON `{ error }` dengan status
// HTTP yang sesuai (bukan unhandled error/non-JSON) agar klien tidak pernah
// menerima body yang tidak bisa di-parse JSON.
export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user || session.user.role !== "PENDAFTAR") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const peserta = await getPesertaBySession(session);
    if (!peserta) {
      return NextResponse.json(
        { error: "Akun Anda belum terdaftar sebagai peserta aktif." },
        { status: 403 }
      );
    }

    let body: unknown;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ error: "Body tidak valid." }, { status: 400 });
    }

    const parsed = kehadiranSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validasi gagal.", fieldErrors: parsed.error.flatten().fieldErrors },
        { status: 422 }
      );
    }

    // Presensi hanya diperbolehkan dalam rentang tanggal masa magang.
    const now = new Date();
    const mulai = new Date(peserta.tanggalMulai);
    mulai.setHours(0, 0, 0, 0);
    const selesai = new Date(peserta.tanggalSelesai);
    selesai.setHours(0, 0, 0, 0);
    if (now < mulai || now > selesai) {
      return NextResponse.json(
        { error: "Presensi hanya dapat dilakukan dalam rentang masa magang Anda." },
        { status: 422 }
      );
    }

    const { action, latitude, longitude, accuracy } = parsed.data;

    // Validasi radius lokasi (sinkron dengan lib/geo.ts: koordinat pusat LEMIGAS
    // -6.2361, 106.7725; radius maksimal ABSEN_RADIUS_METERS = 3000 m). Deviasi
    // akurasi browser (> 500 m) dikompensasi agar pengguna di area kantor tidak
    // terblokir oleh geolokasi berbasis Wi-Fi/IP.
    const jarak = haversineMeters(
      latitude,
      longitude,
      KANTOR_LEMIGAS.latitude,
      KANTOR_LEMIGAS.longitude
    );
    const jarakEfektif = adjustedJarakMeters(jarak, accuracy ?? 0);
    if (jarakEfektif > ABSEN_RADIUS_METERS) {
      return NextResponse.json(
        { error: "Anda berada di luar radius kantor LEMIGAS." },
        { status: 422 }
      );
    }

    const date = toUtcDate(todayString());
    const userId = session.user.id;

    const existing = await prisma.attendance.findUnique({
      where: { userId_date: { userId, date } },
    });

    if (action === "CHECK_IN") {
      if (existing) {
        return NextResponse.json(
          { error: "Anda sudah melakukan check-in hari ini." },
          { status: 409 }
        );
      }
      try {
        const record = await prisma.attendance.create({
          data: { userId, date, checkIn: now, latitude, longitude },
        });
        return NextResponse.json(
          { message: "Check-in berhasil. Selamat bekerja!", record },
          { status: 201 }
        );
      } catch (err) {
        // Race condition: dua request check-in bersamaan pada hari yang sama
        // → unik constraint (userId, date) P2002. Bukan error 500.
        if (
          err instanceof Prisma.PrismaClientKnownRequestError &&
          err.code === "P2002"
        ) {
          return NextResponse.json(
            { error: "Anda sudah melakukan check-in hari ini." },
            { status: 409 }
          );
        }
        throw err;
      }
    }

    // CHECK_OUT
    if (!existing?.checkIn) {
      return NextResponse.json(
        { error: "Anda belum melakukan check-in hari ini." },
        { status: 422 }
      );
    }
    if (existing.checkOut) {
      return NextResponse.json(
        { error: "Anda sudah melakukan check-out hari ini." },
        { status: 409 }
      );
    }
    if (now < existing.checkIn) {
      return NextResponse.json(
        { error: "Waktu check-out tidak valid." },
        { status: 422 }
      );
    }

    const record = await prisma.attendance.update({
      where: { id: existing.id },
      data: { checkOut: now, latitude, longitude },
    });
    return NextResponse.json({ message: "Check-out berhasil. Sampai jumpa!", record });
  } catch (err) {
    // Selalu kembalikan JSON error (bukan unhandled error) agar klien tidak
    // menerima body non-JSON dan menampilkan "Gagal terhubung ke server".
    console.error("[kehadiran] error tak terduga:", err);
    return NextResponse.json(
      { error: "Terjadi kesalahan saat memproses presensi. Coba lagi." },
      { status: 500 }
    );
  }
}
