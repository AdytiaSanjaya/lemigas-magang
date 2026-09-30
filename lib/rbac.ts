import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { isEmailTerdaftar } from "@/lib/peserta";

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
// login, berperan peserta/pendaftar, DAN emailnya sudah tercatat di database
// pendaftar/peserta. Akun Google yang belum mendaftar diarahkan ke halaman
// intersepsi /unauthorized sehingga tidak bisa menembus /peserta/dashboard.
export async function requirePeserta() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const role = session.user.role;
  if (role !== "PENDAFTAR") redirect("/login");

  const terdaftar = await isEmailTerdaftar(session.user.email ?? null);
  if (!terdaftar) redirect("/unauthorized");

  return session;
}

export function can(role: string | undefined, allowed: Array<string>) {
  return !!role && allowed.includes(role);
}