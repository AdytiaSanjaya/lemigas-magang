"use client";

import { useEffect, useState } from "react";
import { CheckCircle2 } from "lucide-react";

export default function ActiveParticipantBlockToast({
  redirectUrl = "/peserta/dashboard",
  message = "Akun Google Anda sudah terdaftar sebagai peserta aktif.",
}: {
  redirectUrl?: string;
  message?: string;
}) {
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      window.location.assign(redirectUrl);
    }, 4000);
    return () => clearTimeout(timer);
  }, [redirectUrl]);

  if (!visible) return null;

  return (
    <div className="fixed inset-x-0 top-4 z-50 flex justify-center px-4">
      <div className="flex w-full max-w-md items-center gap-3 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800 shadow-lg ring-1 ring-emerald-100">
        <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-600" aria-hidden="true" />
        <p className="flex-1 font-medium">{message}</p>
        <button
          type="button"
          onClick={() => {
            setVisible(false);
            window.location.assign(redirectUrl);
          }}
          className="ml-2 shrink-0 rounded-md bg-emerald-100 px-2.5 py-1 text-xs font-semibold text-emerald-700 transition hover:bg-emerald-200"
        >
          OK
        </button>
      </div>
    </div>
  );
}
