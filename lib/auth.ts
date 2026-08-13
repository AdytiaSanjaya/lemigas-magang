import { randomBytes } from "crypto";
import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import Google from "next-auth/providers/google";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { loginSchema } from "@/lib/validation/auth";

// Role untuk pendaftar/peserta magang yang login via Google OAuth.
export const ROLE_PENDAFTAR = "PENDAFTAR";

// Google OAuth hanya diaktifkan bila GOOGLE_CLIENT_ID/SECRET tersedia.
// Dengan begitu aplikasi tetap berjalan meskipun env belum diset.
const useGoogleAuth = Boolean(
  process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET
);

export const isGoogleAuthEnabled = useGoogleAuth;

export const { handlers, auth, signIn, signOut } = NextAuth({
  trustHost: true,
  secret: process.env.NEXTAUTH_SECRET,
  session: { strategy: "jwt" },
  pages: {
    signIn: "/login",
    // Semua error autentikasi (termasuk Google ditolak/DB gagal) dipetakan
    // kembali ke halaman login, bukan halaman error bawaan.
    error: "/login",
  },
  providers: [
    Credentials({
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      // authorize tidak boleh membuat session; hanya memvalidasi kredensial.
      async authorize(credentials) {
        const parsed = loginSchema.safeParse(credentials);
        if (!parsed.success) return null;

        const { email, password } = parsed.data;
        const user = await prisma.user.findUnique({
          where: { email: email.toLowerCase().trim() },
          include: { unit: true },
        });

        if (!user || !user.isAktif) return null;

        const valid = await bcrypt.compare(password, user.passwordHash);
        if (!valid) return null;

        return {
          id: user.id,
          name: user.nama,
          email: user.email,
          role: user.role,
          unitId: user.unitId,
          unitNama: user.unit?.nama ?? null,
        };
      },
    }),
    // Google OAuth untuk pendaftar/peserta magang.
    ...(useGoogleAuth
      ? [
          Google({
            clientId: process.env.GOOGLE_CLIENT_ID || "",
            clientSecret: process.env.GOOGLE_CLIENT_SECRET || "",
          }),
        ]
      : []),
  ],
  callbacks: {
    // Google OAuth (JIT provisioning): pastikan email sudah ada di database
    // Prisma. Jika belum, buat User baru dengan role PENDAFTAR secara otomatis.
    // Error ditangkap dan dikembalikan agar tidak melempar error server.
    async signIn({ account, user }) {
      if (account?.provider !== "google") return true;

      const email = (user?.email ?? "").toLowerCase().trim();
      if (!email) return false;

      try {
        const existing = await prisma.user.findUnique({ where: { email } });
        if (existing) {
          // Akun non-aktif tidak boleh login (konsisten dengan credentials).
          if (!existing.isAktif) return false;
          return true;
        }
        // passwordHash diisi acak: akun Google tidak pernah login via
        // kredensial, jadi password ini hanya untuk memenuhi kolom NOT NULL.
        const passwordHash = await bcrypt.hash(randomBytes(32).toString("hex"), 10);
        await prisma.user.create({
          data: {
            nama: user.name?.trim() || email.split("@")[0] || "Peserta Magang",
            email,
            passwordHash,
            role: ROLE_PENDAFTAR,
          },
        });
        return true;
      } catch {
        return false;
      }
    },
    // Masukkan id & role ke dalam token JWT agar tersedia di server & middleware.
    async jwt({ token, user, account }) {
      if (account?.provider === "google") {
        // Ambil data User dari DB (dijamin sudah dibuat di callback signIn).
        const email = (user?.email ?? "").toLowerCase().trim();
        const dbUser = email
          ? await prisma.user.findUnique({
              where: { email },
              include: { unit: true },
            })
          : null;

        if (!dbUser) {
          token.uid = undefined;
          token.role = "GUEST";
          token.unitId = null;
          token.unitNama = null;
          return token;
        }

        token.uid = dbUser.id;
        token.role = dbUser.role;
        token.unitId = dbUser.unitId ?? null;
        token.unitNama = dbUser.unit?.nama ?? null;
        token.name = dbUser.nama;
        return token;
      }

      if (user) {
        token.role = (user as { role?: string }).role ?? "ADMIN";
        token.uid = user.id;
        token.unitId = (user as { unitId?: string }).unitId ?? null;
        token.unitNama = (user as { unitNama?: string }).unitNama ?? null;
      }
      return token;
    },
    session({ session, token }) {
      if (session.user) {
        session.user.id = (token.uid as string | undefined) ?? token.sub ?? "";
        session.user.role = (token.role as string | undefined) ?? "GUEST";
        session.user.unitId = (token.unitId as string | null) ?? null;
        session.user.unitNama = (token.unitNama as string | null) ?? null;
      }
      return session;
    },
  },
});

export type SessionRole = "ADMIN" | "MENTOR" | "PENDAFTAR";