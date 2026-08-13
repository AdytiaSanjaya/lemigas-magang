import { prisma } from "@/lib/prisma";
import type { Session } from "next-auth";

// Mencari data Peserta aktif yang terhubung dengan akun yang sedang login.
// Penghubungnya adalah email: User.email (akun Google/kredensial) sama dengan
// Pendaftar.email, lalu Peserta terhubung via pendaftarId.
export async function getPesertaBySession(session: Session | null) {
  const email = session?.user?.email;
  if (!email) return null;

  return prisma.peserta.findFirst({
    where: { pendaftar: { email: email.toLowerCase().trim() } },
    include: { pendaftar: true, unit: true, mentor: true },
  });
}
