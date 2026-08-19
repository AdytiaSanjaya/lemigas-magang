"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import RealtimeClock from "@/components/peserta/realtime-clock";
import {
  KANTOR_LEMIGAS,
  ABSEN_RADIUS_METERS,
  ACCURACY_TOLERANCE_METERS,
  haversineMeters,
  adjustedJarakMeters,
  formatJarakMeters,
} from "@/lib/geo";
import { LogIn, LogOut, Loader2, CheckCircle2, CircleAlert } from "lucide-react";

export interface KehadiranState {
  checkedIn: boolean;
  checkedOut: boolean;
  checkInTime: string | null;
  checkOutTime: string | null;
}

const STATUS_PILL = {
  idle: {
    label: "Belum check-in",
    cls: "bg-slate-100 text-slate-600 ring-slate-200",
    dot: "bg-slate-400",
  },
  working: {
    label: "Sedang bekerja",
    cls: "bg-navy-50 text-navy-700 ring-navy-100",
    dot: "bg-navy-500",
  },
  done: {
    label: "Presensi selesai",
    cls: "bg-emerald-50 text-emerald-700 ring-emerald-200",
    dot: "bg-emerald-500",
  },
} as const;

export default function CheckInWidget({
  initialState,
}: {
  initialState: KehadiranState;
}) {
  const router = useRouter();
  const [state, setState] = useState<KehadiranState>(initialState);
  const [loading, setLoading] = useState<"CHECK_IN" | "CHECK_OUT" | null>(null);
  const [notice, setNotice] = useState<{ ok: boolean; text: string } | null>(null);
  const [locInfo, setLocInfo] = useState<{
    jarak: number;
    accuracy: number | null;
  } | null>(null);

  const status = state.checkedOut
    ? "done"
    : state.checkedIn
      ? "working"
      : "idle";
  const pill = STATUS_PILL[status];

  // Minta izin GPS browser; resolve koordinat, reject dengan alasan error.
  function getCurrentPosition(): Promise<GeolocationPosition> {
    return new Promise((resolve, reject) => {
      if (!("geolocation" in navigator)) {
        reject(new Error("unsupported"));
        return;
      }
      navigator.geolocation.getCurrentPosition(resolve, reject, {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0,
      });
    });
  }

  async function act(action: "CHECK_IN" | "CHECK_OUT") {
    setLoading(action);
    setNotice(null);
    setLocInfo(null);
    try {
      // 1) Ambil koordinat GPS pengguna.
      let latitude: number;
      let longitude: number;
      let accuracy: number;
      try {
        const pos = await getCurrentPosition();
        latitude = pos.coords.latitude;
        longitude = pos.coords.longitude;
        accuracy = pos.coords.accuracy ?? 0;
      } catch (geoErr) {
        const denied =
          !!geoErr &&
          typeof geoErr === "object" &&
          "code" in geoErr &&
          (geoErr as GeolocationPositionError).code ===
            GeolocationPositionError.PERMISSION_DENIED;
        setNotice({
          ok: false,
          text: denied
            ? "Izin lokasi ditolak. Aktifkan GPS/lokasi untuk presensi."
            : "Tidak dapat memperoleh lokasi Anda. Coba lagi.",
        });
        setLoading(null);
        return;
      }

      // 2) Validasi radius: maksimal 3000 meter (3 km) dari kantor LEMIGAS.
      //    Deviasi akurasi browser (> 500 m) dikurangi dari jarak Haversine
      //    agar pengguna yang berada di area kantor tidak terblokir.
      const jarak = haversineMeters(
        latitude,
        longitude,
        KANTOR_LEMIGAS.latitude,
        KANTOR_LEMIGAS.longitude
      );
      const jarakEfektif = adjustedJarakMeters(jarak, accuracy);
      setLocInfo({
        jarak: jarakEfektif,
        accuracy: accuracy > ACCURACY_TOLERANCE_METERS ? accuracy : null,
      });
      if (jarakEfektif > ABSEN_RADIUS_METERS) {
        setNotice({
          ok: false,
          text: "Anda berada di luar radius kantor LEMIGAS.",
        });
        setLoading(null);
        return;
      }

      const res = await fetch("/api/peserta/kehadiran", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, latitude, longitude, accuracy }),
      });
      const data = await res.json();
      if (!res.ok) {
        setNotice({ ok: false, text: data.error ?? "Terjadi kesalahan." });
        setLoading(null);
        return;
      }
      setNotice({ ok: true, text: data.message ?? "Berhasil." });
      setState(
        action === "CHECK_IN"
          ? {
              checkedIn: true,
              checkedOut: false,
              checkInTime: data.record?.checkIn ?? null,
              checkOutTime: null,
            }
          : {
              checkedIn: true,
              checkedOut: true,
              checkInTime: state.checkInTime,
              checkOutTime: data.record?.checkOut ?? null,
            }
      );
      router.refresh();
    } catch {
      setNotice({ ok: false, text: "Gagal terhubung ke server. Coba lagi." });
    }
    setLoading(null);
  }

  const fmt = (iso: string | null) =>
    iso
      ? new Date(iso).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" })
      : "-";

  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      {/* Header berwarna dengan jam */}
      <div className="relative overflow-hidden bg-gradient-to-br from-navy-700 via-navy-800 to-navy-950 px-6 py-7 text-white">
        <div
          className="pointer-events-none absolute -right-10 -top-14 h-44 w-44 rounded-full bg-navy-400/20 blur-2xl"
          aria-hidden="true"
        />
        <div
          className="pointer-events-none absolute -bottom-16 left-1/3 h-40 w-40 rounded-full bg-navy-300/10 blur-2xl"
          aria-hidden="true"
        />
        <div className="relative flex items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="relative flex h-2.5 w-2.5">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-emerald-400" />
              </span>
              <span className="text-xs font-semibold uppercase tracking-wider text-navy-100">
                Jam Kerja Real-time
              </span>
            </div>
            <RealtimeClock size="lg" className="mt-3" />
          </div>
          <span
            className={`inline-flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold ring-1 ${pill.cls}`}
          >
            <span className={`h-1.5 w-1.5 rounded-full ${pill.dot}`} />
            {pill.label}
          </span>
        </div>
      </div>

      {/* Body: aksi check-in/out */}
      <div className="p-6">
        <div className="grid grid-cols-2 gap-4">
          <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
            <div className="text-[11px] font-medium uppercase tracking-wide text-slate-400">
              Check-in
            </div>
            <div className="mt-1 font-mono text-2xl font-bold tabular-nums text-navy-700">
              {fmt(state.checkInTime)}
            </div>
          </div>
          <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
            <div className="text-[11px] font-medium uppercase tracking-wide text-slate-400">
              Check-out
            </div>
            <div className="mt-1 font-mono text-2xl font-bold tabular-nums text-navy-700">
              {fmt(state.checkOutTime)}
            </div>
          </div>
        </div>

        <div className="mt-5 grid grid-cols-2 gap-3">
          <button
            type="button"
            onClick={() => act("CHECK_IN")}
            disabled={state.checkedIn || loading !== null}
            className="flex items-center justify-center gap-2 rounded-xl bg-navy-600 px-4 py-3 text-sm font-semibold text-white shadow-sm transition-all duration-200 hover:bg-navy-700 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-40"
          >
            {loading === "CHECK_IN" ? (
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
            ) : (
              <LogIn className="h-4 w-4" aria-hidden="true" />
            )}
            {state.checkedIn ? "Sudah Check-in" : "Check-in"}
          </button>
          <button
            type="button"
            onClick={() => act("CHECK_OUT")}
            disabled={!state.checkedIn || state.checkedOut || loading !== null}
            className="flex items-center justify-center gap-2 rounded-xl border-2 border-navy-600 px-4 py-3 text-sm font-semibold text-navy-700 transition-all duration-200 hover:bg-navy-50 active:scale-[0.98] disabled:cursor-not-allowed disabled:border-slate-200 disabled:text-slate-400"
          >
            {loading === "CHECK_OUT" ? (
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
            ) : (
              <LogOut className="h-4 w-4" aria-hidden="true" />
            )}
            {state.checkedOut ? "Sudah Check-out" : "Check-out"}
          </button>
        </div>

        {notice && (
          <div
            role="status"
            className={`mt-4 flex items-start gap-2 rounded-xl border px-4 py-3 text-sm ${
              notice.ok
                ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                : "border-rose-200 bg-rose-50 text-rose-700"
            }`}
          >
            {notice.ok ? (
              <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
            ) : (
              <CircleAlert className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
            )}
            {notice.text}
          </div>
        )}

        {locInfo && (
          <p className="mt-2 rounded-lg bg-slate-50 px-3 py-2 text-xs text-slate-500">
            Jarak terdeteksi:{" "}
            <span className="font-semibold text-slate-700">
              {formatJarakMeters(locInfo.jarak)}
            </span>{" "}
            dari LEMIGAS (Maks: {formatJarakMeters(ABSEN_RADIUS_METERS)})
            {locInfo.accuracy !== null && (
              <span className="mt-0.5 block text-slate-400">
                Akurasi GPS ±{formatJarakMeters(locInfo.accuracy)} — deviasi sudah
                dikompensasi.
              </span>
            )}
          </p>
        )}
      </div>
    </div>
  );
}
