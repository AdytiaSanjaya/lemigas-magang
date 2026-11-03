"use client";

import { useState } from "react";
import { signOut } from "next-auth/react";
import { LogOut, Loader2 } from "lucide-react";

export default function SignOutButton({
  className = "",
}: {
  className?: string;
}) {
  const [loading, setLoading] = useState(false);

  return (
    <button
      type="button"
      disabled={loading}
      onClick={async () => {
        setLoading(true);
        // Hancurkan sesi & cookie di server terlebih dahulu
        // (POST /api/auth/signout menghapus cookie sesi HttpOnly).
        try {
          await signOut({ redirect: false });
        } finally {
          // Hard navigation (BUKAN router.push): memaksa browser reload penuh
          // dan membuang seluruh state/memori klien — termasuk sesi UI nama
          // yang lengket di header.
          window.location.href = "/";
        }
      }}
      className={`inline-flex items-center gap-1.5 rounded-lg px-4 py-2 text-sm font-medium transition disabled:cursor-not-allowed disabled:opacity-60 ${className}`}
    >
      {loading ? (
        <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
      ) : (
        <LogOut className="h-4 w-4" aria-hidden="true" />
      )}
      Keluar
    </button>
  );
}
