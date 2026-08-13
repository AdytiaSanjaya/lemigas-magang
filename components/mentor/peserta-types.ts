export type StatusHariIni = "HADIR" | "IZIN" | "SAKIT" | "BELUM ABSEN";

export interface EvaluasiRecord {
  id: string;
  kedisiplinan: number;
  keaktifan: number;
  kinerja: number;
  catatan: string | null;
  createdAt: string;
  dinilaiOlehNama: string | null;
}

export interface AttendanceRecord {
  id: string;
  date: string;
  status: string;
  checkIn: string | null;
  checkOut: string | null;
}

export interface PesertaRow {
  id: string;
  nama: string;
  instansi: string;
  jurusan: string | null;
  jenisKelamin: string | null;
  email: string;
  noHp: string;
  unitNama: string;
  tanggalMulai: string;
  tanggalSelesai: string;
  progress: number;
  statusHariIni: StatusHariIni;
  checkIn: string | null;
  checkOut: string | null;
  attendance30: AttendanceRecord[];
  evaluasi: EvaluasiRecord[];
}
