import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";

const ADMIN_EMAIL = "admin@lemigas.example";
const ADMIN_NAME = "Admin LEMIGAS";
const ADMIN_PASSWORD = "Magang123";

export async function GET() {
  const passwordHash = await bcrypt.hash(ADMIN_PASSWORD, 10);

  await prisma.user.upsert({
    where: { email: ADMIN_EMAIL },
    update: {
      nama: ADMIN_NAME,
      passwordHash,
      role: "ADMIN",
      isAktif: true,
    },
    create: {
      email: ADMIN_EMAIL,
      nama: ADMIN_NAME,
      passwordHash,
      role: "ADMIN",
      isAktif: true,
    },
  });

  return NextResponse.json({ success: true, message: "Admin account ready" });
}