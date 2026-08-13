export const STATUS_LABEL: Record<string, string> = {
  MENUNGGU: "Menunggu",
  DITERIMA: "Diterima",
  DITOLAK: "Ditolak",
  PESERTA_AKTIF: "Peserta Aktif",
  // Presensi kehadiran
  HADIR: "Hadir",
  IZIN: "Izin",
  SAKIT: "Sakit",
  // Pengajuan izin
  PENDING: "Menunggu Persetujuan",
  APPROVED: "Disetujui",
  REJECTED: "Ditolak",
};

export const STATUS_BADGE: Record<string, string> = {
  MENUNGGU: "bg-amber-100 text-amber-700",
  DITERIMA: "bg-emerald-100 text-emerald-700",
  DITOLAK: "bg-red-100 text-red-700",
  PESERTA_AKTIF: "bg-sky-100 text-sky-700",
  // Presensi kehadiran
  HADIR: "bg-emerald-100 text-emerald-700",
  IZIN: "bg-amber-100 text-amber-700",
  SAKIT: "bg-rose-100 text-rose-700",
  // Pengajuan izin
  PENDING: "bg-amber-100 text-amber-700",
  APPROVED: "bg-emerald-100 text-emerald-700",
  REJECTED: "bg-red-100 text-red-700",
};

export const TIPE_IZIN_LABEL: Record<string, string> = {
  IZIN: "Izin",
  SAKIT: "Sakit",
};

export function formatTanggal(d: Date | string | null | undefined): string {
  if (!d) return "-";
  const date = typeof d === "string" ? new Date(d) : d;
  if (isNaN(date.getTime())) return "-";
  return date.toLocaleDateString("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}
