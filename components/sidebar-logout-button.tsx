"use client";

import { useState } from "react";
import { signOut } from "next-auth/react";
import { LogOut, Loader2 } from "lucide-react";

export default function SidebarLogoutButton() {
  const [loading, setLoading] = useState(false);

  return (
    <form
      onSubmit={async (e) => {
        e.preventDefault();
        setLoading(true);
        // Hancurkan sesi & cookie di server terlebih dahulu
        // (POST /api/auth/signout menghapus cookie sesi HttpOnly).
        try {
          await signOut({ redirect: false });
        } finally {
          // Hard navigation (BUKAN router.push): memaksa browser reload penuh
          // dan membuang seluruh state/memori klien — termasuk sesi UI nama
          // peserta yang lengket di header/sidebar.
          window.location.href = "/";
        }
      }}
    >
      <button
        type="submit"
        disabled={loading}
        className="mt-2 flex w-full items-center justify-center gap-2 rounded-xl border border-slate-300 px-3 py-2.5 text-sm font-medium text-slate-600 transition-all duration-200 hover:border-rose-200 hover:bg-rose-50 hover:text-rose-600 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {loading ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <LogOut size={16} />
        )}
        Keluar
      </button>
    </form>
  );
}
