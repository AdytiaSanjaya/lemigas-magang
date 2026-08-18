import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";

// Helper satu kali pakai: memperbaiki hash password kredensial default
// (admin & mentor) TANPA menghapus user maupun data terkait. Upsert hanya
// memperbarui kolom kredensial bila akun sudah ada, atau membuatnya bila belum.

const CREDENTIALS: Array<{ email: string; nama: string; password: string; role: "ADMIN" | "MENTOR" }> = [
  { email: "admin@lemigas.example", nama: "Admin LEMIGAS", password: "Magang123", role: "ADMIN" },
  { email: "mentor.lab@lemigas.example", nama: "Dewi Rahmawati (Mentor Lab)", password: "Magang123", role: "MENTOR" },
];

export async function GET() {
  const passwordHash = await bcrypt.hash("Magang123", 10);
  const results: Array<{ email: string; role: string; ok: boolean; created?: boolean }> = [];

  for (const cred of CREDENTIALS) {
    const existing = await prisma.user.findUnique({ where: { email: cred.email } });
    if (existing) {
      await prisma.user.update({
        where: { id: existing.id },
        data: {
          passwordHash,
          role: cred.role,
          isAktif: true,
          ...(existing.nama !== cred.nama ? { nama: cred.nama } : {}),
        },
      });
      results.push({ email: cred.email, role: cred.role, ok: true, created: false });
    } else {
      await prisma.user.create({
        data: {
          email: cred.email,
          nama: cred.nama,
          passwordHash,
          role: cred.role,
          isAktif: true,
        },
      });
      results.push({ email: cred.email, role: cred.role, ok: true, created: true });
    }
  }

  return NextResponse.json({ success: true, results });
}

export const runtime = "nodejs";
export const maxDuration = 30;