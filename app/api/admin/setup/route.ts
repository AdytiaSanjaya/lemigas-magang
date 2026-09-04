import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

const ADMIN_EMAIL = "admin@lemigas.example";
const ADMIN_NAME = "Admin LEMIGAS";

export async function POST() {
  const session = await auth();
  if (!session?.user || (session.user.role !== "ADMIN" && session.user.role !== "MENTOR")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const defaultPassword = process.env.DEFAULT_ADMIN_PASSWORD;
  if (!defaultPassword) {
    return NextResponse.json(
      { error: "Konfigurasi DEFAULT_ADMIN_PASSWORD belum diset di environment." },
      { status: 500 }
    );
  }

  const passwordHash = await bcrypt.hash(defaultPassword, 10);

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