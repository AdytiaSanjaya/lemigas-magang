import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";

// Guard untuk halaman panel. Memastikan user sudah login dan role sesuai.
export async function requireAuth(roles: Array<"ADMIN" | "MENTOR"> = ["ADMIN", "MENTOR"]) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const role = session.user.role as "ADMIN" | "MENTOR";
  if (!roles.includes(role)) redirect("/login");

  return session;
}

export async function requireAdmin() {
  return requireAuth(["ADMIN"]);
}

export async function requireMentor() {
  return requireAuth(["MENTOR"]);
}

// Guard untuk halaman portal peserta (role PENDAFTAR). Memastikan user sudah
// login dan berperan peserta/pendaftar. Keanggotaan sebagai "peserta aktif"
// diverifikasi lebih lanjut di halaman masing-masing.
export async function requirePeserta() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const role = session.user.role;
  if (role !== "PENDAFTAR") redirect("/login");

  return session;
}

export function can(role: string | undefined, allowed: Array<string>) {
  return !!role && allowed.includes(role);
}