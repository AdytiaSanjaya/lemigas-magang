"use client";

import { useState } from "react";
import { signIn, getSession } from "next-auth/react";
import { Mail, Lock, ArrowRight, Loader2 } from "lucide-react";
import { loginSchema, type LoginInput } from "@/lib/validation/auth";

// Halaman beranda per role saat login berhasil tanpa callbackUrl.
const ROLE_HOME: Record<string, string> = {
  ADMIN: "/admin/dashboard",
  MENTOR: "/mentor/peserta",
  PENDAFTAR: "/peserta/dashboard",
};

// Hanya terima redirect tujuan internal.
function safeCallbackUrl(): string | null {
  const cb = new URLSearchParams(window.location.search).get("callbackUrl");
  if (cb && cb.startsWith("/") && !cb.startsWith("//")) return cb;
  return null;
}

export default function LoginForm() {
  const [form, setForm] = useState<LoginInput>({ email: "", password: "" });
  const [errors, setErrors] = useState<Partial<LoginInput>>({});
  const [loading, setLoading] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
    setErrors((prev) => ({ ...prev, [e.target.name]: undefined }));
    setFormError(null);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setFormError(null);

    // Validasi Zod sebelum dikirim.
    const parsed = loginSchema.safeParse(form);
    if (!parsed.success) {
      const fe = parsed.error.flatten().fieldErrors;
      setErrors({
        email: fe.email?.[0],
        password: fe.password?.[0],
      });
      return;
    }

    setLoading(true);
    const res = await signIn("credentials", {
      email: form.email.toLowerCase().trim(),
      password: form.password,
      redirect: false,
    });
    setLoading(false);

    if (res?.error) {
      setFormError("Email atau password salah.");
      return;
    }

    // Setelah login, arahkan ke callbackUrl (mis. dari portal peserta) atau ke
    // dashboard sesuai role. getSession() memastikan role yang dibaca sudah baru.
    // Menggunakan window.location.replace() alih-alih router.push() + router.refresh()
    // untuk melakukan hard navigasi yang melewati Client-Side Router Cache sepenuhnya,
    // mencegah race condition yang menyebabkan data stale (angka 0) pada kartu ringkasan.
    const callbackUrl = safeCallbackUrl();
    const fresh = await getSession();
    const role = (fresh?.user as { role?: string } | undefined)?.role ?? "";
    const target = callbackUrl ?? ROLE_HOME[role] ?? "/peserta/dashboard";
    window.location.replace(target);
  }

  return (
    <form onSubmit={handleSubmit} noValidate>
      {formError && (
        <div className="mb-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
          {formError}
        </div>
      )}

      <label className="block text-sm font-medium text-zinc-700">
        Email
        <div className="relative mt-2">
          <Mail className="pointer-events-none absolute left-4 top-1/2 h-[18px] w-[18px] -translate-y-1/2 text-zinc-400" />
          <input
            type="email"
            name="email"
            autoComplete="email"
            value={form.email}
            onChange={handleChange}
            className="w-full rounded-xl border border-zinc-200 bg-zinc-50/50 py-3 pl-11 pr-4 text-sm text-zinc-900 outline-none transition placeholder:text-zinc-400 focus:border-blue-600 focus:ring-2 focus:ring-blue-500/25"
            placeholder="nama@email.com"
          />
        </div>
      </label>
      {errors.email && <p className="mt-1 text-xs text-red-600">{errors.email}</p>}

      <label className="mt-5 block text-sm font-medium text-zinc-700">
        Password
        <div className="relative mt-2">
          <Lock className="pointer-events-none absolute left-4 top-1/2 h-[18px] w-[18px] -translate-y-1/2 text-zinc-400" />
          <input
            type="password"
            name="password"
            autoComplete="current-password"
            value={form.password}
            onChange={handleChange}
            className="w-full rounded-xl border border-zinc-200 bg-zinc-50/50 py-3 pl-11 pr-4 text-sm text-zinc-900 outline-none transition placeholder:text-zinc-400 focus:border-blue-600 focus:ring-2 focus:ring-blue-500/25"
            placeholder="••••••••"
          />
        </div>
      </label>
      {errors.password && <p className="mt-1 text-xs text-red-600">{errors.password}</p>}

      <button
        type="submit"
        disabled={loading}
        className="mt-6 flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 py-3 font-medium text-white shadow-md shadow-blue-500/20 transition-all hover:bg-blue-700 active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-60"
      >
        {loading ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" />
            Memproses...
          </>
        ) : (
          <>
            Masuk
            <ArrowRight className="h-4 w-4" />
          </>
        )}
      </button>
    </form>
  );
}