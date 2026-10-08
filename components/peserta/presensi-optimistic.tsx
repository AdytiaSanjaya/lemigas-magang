"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";

/**
 * Kehadiran "optimistic": baris presensi yang disisipkan ke tabel Riwayat
 * Kehadiran begitu tombol check-in/check-out ditekan, tanpa menunggu request
 * network (dan GPS) selesai.
 *
 * Manajemen state lokal (bukan `useOptimistic`) dipilih secara sengaja:
 * `useOptimistic` otomatis di-*rollback* begitu transisi async selesai, yang
 * terjadi SEBELUM `router.refresh()` membawa data segar dari server — di
 * jaringan lambat baris akan kedip "hilang lalu muncul lagi". Dengan state
 * lokal, baris optimistic bertahan sampai data server benar-benar memuat
 * record yang sama (diserap otomatis) atau request dinyatakan gagal (dihapus).
 */
export type PendingPresensi = {
  action: "CHECK_IN" | "CHECK_OUT";
  /** Tanggal kalender UTC "YYYY-MM-DD" — sama dengan `Attendance.date`. */
  date: string;
  /** Waktu check-in ISO (optimistic: jam klien; dikonfirmasi server setelah respon). */
  checkIn: string | null;
  /** Waktu check-out ISO. */
  checkOut: string | null;
};

type PresensiOptimisticValue = {
  pending: PendingPresensi | null;
  setPending: (next: PendingPresensi | null) => void;
};

const PresensiOptimisticContext = createContext<PresensiOptimisticValue | null>(
  null
);

export function PresensiOptimisticProvider({
  children,
}: {
  children: ReactNode;
}) {
  const [pending, setPendingState] = useState<PendingPresensi | null>(null);
  const setPending = useCallback(
    (next: PendingPresensi | null) => setPendingState(next),
    []
  );
  const value = useMemo(
    () => ({ pending, setPending }),
    [pending, setPending]
  );

  return (
    <PresensiOptimisticContext.Provider value={value}>
      {children}
    </PresensiOptimisticContext.Provider>
  );
}

export function usePresensiOptimistic(): PresensiOptimisticValue {
  const ctx = useContext(PresensiOptimisticContext);
  if (!ctx) {
    throw new Error(
      "usePresensiOptimistic harus dipakai di dalam <PresensiOptimisticProvider>."
    );
  }
  return ctx;
}
