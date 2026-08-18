import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { kehadiranSchema } from "@/lib/validation/presensi";
import { getPesertaBySession } from "@/lib/peserta";
import { todayString, toUtcDate } from "@/lib/dates";
import {
  KANTOR_LEMIGAS,
  ABSEN_RADIUS_METERS,
  haversineMeters,
} from "@/lib/geo";

export const runtime = "nodejs";
export const maxDuration = 20;

// Check-in / check-out presensi harian peserta.
// Endpoint ini hanya untuk role PENDAFTAR yang tercatat sebagai peserta aktif.
export async function POST(req: NextRequest) {
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

  const { action, latitude, longitude } = parsed.data;

  // Validasi radius lokasi: presensi hanya sah bila peserta berada dalam
  // radius maksimal 200 meter dari kantor LEMIGAS.
  const jarak = haversineMeters(
    latitude,
    longitude,
    KANTOR_LEMIGAS.latitude,
    KANTOR_LEMIGAS.longitude
  );
  if (jarak > ABSEN_RADIUS_METERS) {
    return NextResponse.json(
      { error: "Anda berada di luar radius kantor LEMIGAS." },
      { status: 422 }
    );
  }

  const date = toUtcDate(todayString());

  const existing = await prisma.attendance.findUnique({
    where: { userId_date: { userId: session.user.id, date } },
  });

  if (action === "CHECK_IN") {
    if (existing) {
      return NextResponse.json(
        { error: "Anda sudah melakukan check-in hari ini." },
        { status: 409 }
      );
    }
    const record = await prisma.attendance.create({
      data: { userId: session.user.id, date, checkIn: now, latitude, longitude },
    });
    return NextResponse.json(
      { message: "Check-in berhasil. Selamat bekerja!", record },
      { status: 201 }
    );
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
}
