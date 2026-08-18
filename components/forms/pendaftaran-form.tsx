"use client";

import { useState } from "react";
import { User, Users, UserPlus, UserRound, GraduationCap, UploadCloud, Send, Loader2, CheckCircle2, FileText, FileCheck2, Lock, Trash2 } from "lucide-react";
import { pendaftarSchema, type PendaftarInput } from "@/lib/validation/pendaftar";

type Unit = { id: string; nama: string };

type UploadKey = "cvUrl" | "suratPengantarUrl" | "ktpKtmUrl" | "transkripUrl";

type GroupMember = { name: string; identifier: string; major: string };

const uploadConfig: {
  key: UploadKey;
  label: string;
  format: string;
  accept: string;
  required: boolean;
}[] = [
  {
    key: "cvUrl",
    label: "Curriculum Vitae (CV)",
    format: "PDF",
    accept: "application/pdf",
    required: true,
  },
  {
    key: "suratPengantarUrl",
    label: "Surat Pengantar Sekolah/Kampus",
    format: "PDF",
    accept: "application/pdf",
    required: false,
  },
  {
    key: "ktpKtmUrl",
    label: "KTP / Kartu Tanda Mahasiswa (KTM)",
    format: "PDF/JPG",
    accept: "application/pdf,image/jpeg",
    required: false,
  },
  {
    key: "transkripUrl",
    label: "Transkrip Nilai Akademik",
    format: "PDF",
    accept: "application/pdf",
    required: false,
  },
];

const inputClass =
  "mt-1.5 w-full rounded-xl border border-zinc-200 bg-zinc-50/30 px-3.5 py-2.5 text-sm text-zinc-900 placeholder:text-zinc-400 transition outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20";

export default function PendaftaranForm({
  units,
  initialEmail = "",
}: {
  units: Unit[];
  initialEmail?: string;
}) {
  const [form, setForm] = useState<PendaftarInput>({
    nama: "",
    asalInstansi: "",
    jurusan: "",
    jenisKelamin: undefined,
    noHp: "",
    email: initialEmail,
    unitMinatId: "",
    applicationType: "INDIVIDUAL",
  });
  const [files, setFiles] = useState<Partial<Record<UploadKey, File | null>>>({});
  const [errors, setErrors] = useState<Partial<PendaftarInput>>({});
  const [fileErrors, setFileErrors] = useState<Partial<Record<UploadKey, string>>>({});
  const [groupMembers, setGroupMembers] = useState<GroupMember[]>([]);
  const [memberErrors, setMemberErrors] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ ok: boolean; message?: string; noPendaftaran?: string; errors?: string } | null>(null);

  function handleChange(e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
    setErrors((prev) => ({ ...prev, [name]: undefined }));
    setResult(null);
  }

  function handleFile(e: React.ChangeEvent<HTMLInputElement>, which: UploadKey) {
    const file = e.target.files?.[0] ?? null;
    setFiles((prev) => ({ ...prev, [which]: file }));
    setFileErrors((prev) => ({ ...prev, [which]: undefined }));
    setResult(null);
  }

  function selectApplicationType(type: "INDIVIDUAL" | "GROUP") {
    setForm((prev) => ({ ...prev, applicationType: type }));
    setMemberErrors(null);
    if (type === "GROUP") {
      setGroupMembers((prev) => (prev.length > 0 ? prev : [{ name: "", identifier: "", major: "" }]));
    }
    setResult(null);
  }

  function handleMemberChange(index: number, field: keyof GroupMember, value: string) {
    setGroupMembers((prev) => prev.map((m, i) => (i === index ? { ...m, [field]: value } : m)));
    setMemberErrors(null);
  }

  function addMember() {
    setGroupMembers((prev) =>
      prev.length < 4 ? [...prev, { name: "", identifier: "", major: "" }] : prev
    );
  }

  function removeMember(index: number) {
    setGroupMembers((prev) => prev.filter((_, i) => i !== index));
  }

  function validateMembers(): boolean {
    if (form.applicationType !== "GROUP") return true;
    if (groupMembers.length === 0) {
      setMemberErrors("Tambahkan minimal 1 anggota kelompok.");
      return false;
    }
    for (const m of groupMembers) {
      if (!m.name.trim() || !m.identifier.trim() || !m.major.trim()) {
        setMemberErrors("Lengkapi nama, NIM/NIS, dan jurusan setiap anggota kelompok.");
        return false;
      }
    }
    return true;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setResult(null);

    // Validasi field dengan Zod.
    const parsed = pendaftarSchema.safeParse({
      ...form,
      groupMembers: form.applicationType === "GROUP" ? groupMembers : undefined,
    });
    if (!parsed.success) {
      const fe = parsed.error.flatten().fieldErrors;
      setErrors({
        nama: fe.nama?.[0],
        asalInstansi: fe.asalInstansi?.[0],
        jurusan: fe.jurusan?.[0],
        noHp: fe.noHp?.[0],
        email: fe.email?.[0],
        unitMinatId: fe.unitMinatId?.[0],
      });
      return;
    }
    if (!validateMembers()) return;

    // Validasi ringan file di klien (persyaratan juga diverifikasi server).
    const fileIssues: Partial<Record<UploadKey, string>> = {};
    for (const cfg of uploadConfig) {
      const file = files[cfg.key];
      if (cfg.required && !file) {
        fileIssues[cfg.key] = `${cfg.label} wajib diunggah.`;
      } else if (file) {
        const allowed = cfg.accept.split(",").map((m) => m.trim());
        if (!allowed.some((m) => file.type === m)) {
          fileIssues[cfg.key] = `Hanya file ${cfg.format} yang diizinkan.`;
        } else if (file.size > 2_000_000) {
          fileIssues[cfg.key] = `Ukuran ${cfg.label} maksimal 2MB.`;
        }
      }
    }
    if (Object.keys(fileIssues).length) {
      setFileErrors(fileIssues);
      return;
    }

    setLoading(true);
    const fd = new FormData();
    Object.entries(form).forEach(([k, v]) => {
      if (v !== undefined && v !== "") fd.append(k, v as string);
    });
    if (form.applicationType === "GROUP" && groupMembers.length > 0) {
      fd.append("groupMembers", JSON.stringify(groupMembers));
    }
    for (const cfg of uploadConfig) {
      const file = files[cfg.key];
      if (file) fd.append(cfg.key, file);
    }

    try {
      const res = await fetch("/api/registrasi", { method: "POST", body: fd });
      const data = await res.json();
      if (!res.ok) {
        setResult({ ok: false, errors: data.error ?? "Terjadi kesalahan." });
        setLoading(false);
        return;
      }
      setResult({ ok: true, message: data.message, noPendaftaran: data.noPendaftaran });
      setForm({ nama: "", asalInstansi: "", jurusan: "", jenisKelamin: undefined, noHp: "", email: initialEmail, unitMinatId: "", applicationType: "INDIVIDUAL" });
      setGroupMembers([]);
      setMemberErrors(null);
      setFiles({});
    } catch {
      setResult({ ok: false, errors: "Gagal mengirim. Coba lagi nanti." });
    }
    setLoading(false);
  }

  if (result?.ok) {
    return (
      <div className="rounded-2xl border border-emerald-200/80 bg-white p-8 text-center shadow-sm md:p-10">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-emerald-100">
          <CheckCircle2 className="h-7 w-7 text-emerald-600" aria-hidden="true" />
        </div>
        <h2 className="text-xl font-bold text-zinc-900">Pendaftaran Berhasil</h2>
        <p className="mt-2 text-sm text-zinc-500">
          Simpan nomor pendaftaran berikut untuk mengecek status lamaran Anda:
        </p>
        <div className="mt-4 inline-block rounded-xl border border-zinc-200 bg-zinc-50 px-6 py-3 font-mono text-lg font-bold tracking-wider text-zinc-900">
          {result.noPendaftaran}
        </div>
        <div className="mt-6">
          <a
            href="/cek-status"
            className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-6 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700"
          >
            Cek Status Lamaran
          </a>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="w-full" noValidate>
      {result?.ok === false && (
        <div className="mb-6 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
          {result.errors}
        </div>
      )}

      {/* Jenis Pendaftaran */}
      <div>
        <div className="flex items-center gap-2.5">
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-blue-600">
            <Users className="h-4 w-4" aria-hidden="true" />
          </span>
          <div>
            <h3 className="text-sm font-semibold text-zinc-900">Jenis Pendaftaran</h3>
            <p className="text-xs text-zinc-400">Pilih jenis pendaftaran Anda.</p>
          </div>
        </div>

        <div className="mt-4 grid gap-3 sm:grid-cols-2" role="radiogroup" aria-label="Jenis pendaftaran">
          <button
            type="button"
            role="radio"
            aria-checked={form.applicationType === "INDIVIDUAL"}
            onClick={() => selectApplicationType("INDIVIDUAL")}
            className={`flex items-start gap-3 rounded-xl border-2 p-4 text-left transition-all ${
              form.applicationType === "INDIVIDUAL"
                ? "border-blue-600 bg-blue-50/60 ring-1 ring-blue-600/20"
                : "border-zinc-200 bg-white hover:border-blue-300"
            }`}
          >
            <span
              className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg transition ${
                form.applicationType === "INDIVIDUAL"
                  ? "bg-blue-600 text-white"
                  : "bg-zinc-100 text-zinc-500"
              }`}
            >
              <UserRound className="h-5 w-5" aria-hidden="true" />
            </span>
            <span>
              <span className="block text-sm font-semibold text-zinc-900">
                Pendaftaran Individu
              </span>
              <span className="mt-0.5 block text-xs leading-5 text-zinc-500">
                Daftar sebagai satu orang peserta magang/PKL.
              </span>
            </span>
          </button>

          <button
            type="button"
            role="radio"
            aria-checked={form.applicationType === "GROUP"}
            onClick={() => selectApplicationType("GROUP")}
            className={`flex items-start gap-3 rounded-xl border-2 p-4 text-left transition-all ${
              form.applicationType === "GROUP"
                ? "border-blue-600 bg-blue-50/60 ring-1 ring-blue-600/20"
                : "border-zinc-200 bg-white hover:border-blue-300"
            }`}
          >
            <span
              className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg transition ${
                form.applicationType === "GROUP"
                  ? "bg-blue-600 text-white"
                  : "bg-zinc-100 text-zinc-500"
              }`}
            >
              <Users className="h-5 w-5" aria-hidden="true" />
            </span>
            <span>
              <span className="block text-sm font-semibold text-zinc-900">
                Pendaftaran Kelompok (Maks. 5 Orang)
              </span>
              <span className="mt-0.5 block text-xs leading-5 text-zinc-500">
                1 ketua + hingga 4 anggota tambahan.
              </span>
            </span>
          </button>
        </div>
      </div>

      {/* Anggota Kelompok */}
      {form.applicationType === "GROUP" && (
        <div className="mt-10 border-t border-slate-200 pt-8">
          <div className="flex items-center gap-2.5">
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-blue-600">
              <Users className="h-4 w-4" aria-hidden="true" />
            </span>
            <div>
              <h3 className="text-sm font-semibold text-zinc-900">Anggota Kelompok</h3>
              <p className="text-xs text-zinc-400">
                Data ketua diisi pada bagian Informasi Pribadi di bawah. Lengkapi anggota
                tambahan (maksimal 4 orang).
              </p>
            </div>
          </div>

          {memberErrors && (
            <div className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
              {memberErrors}
            </div>
          )}

          <div className="mt-4 space-y-4">
            {groupMembers.map((member, index) => (
              <div key={index} className="rounded-xl border border-zinc-200 bg-zinc-50/40 p-4">
                <div className="flex items-center justify-between gap-3">
                  <span className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
                    Anggota {index + 1}
                  </span>
                  <button
                    type="button"
                    onClick={() => removeMember(index)}
                    className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium text-red-600 transition hover:bg-red-50 hover:text-red-700"
                  >
                    <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                    Hapus
                  </button>
                </div>

                <div className="mt-3 grid gap-3 sm:grid-cols-2">
                  <div className="sm:col-span-2">
                    <label className="block text-sm font-medium text-zinc-700">
                      Nama Lengkap Anggota
                      <input
                        name="name"
                        value={member.name}
                        onChange={(e) => handleMemberChange(index, "name", e.target.value)}
                        placeholder="Nama lengkap anggota"
                        className={inputClass}
                      />
                    </label>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-zinc-700">
                      NIM / NIS Anggota
                      <input
                        name="identifier"
                        value={member.identifier}
                        onChange={(e) => handleMemberChange(index, "identifier", e.target.value)}
                        placeholder="NIM / NIS anggota"
                        className={inputClass}
                      />
                    </label>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-zinc-700">
                      Jurusan Anggota
                      <input
                        name="major"
                        value={member.major}
                        onChange={(e) => handleMemberChange(index, "major", e.target.value)}
                        placeholder="Jurusan / program studi"
                        className={inputClass}
                      />
                    </label>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {groupMembers.length < 4 && (
            <button
              type="button"
              onClick={addMember}
              className="mt-6 inline-flex items-center gap-2 rounded-xl border border-dashed border-blue-300 bg-blue-50/40 px-4 py-2.5 text-sm font-medium text-blue-700 transition hover:bg-blue-50 hover:ring-1 hover:ring-blue-300"
            >
              <UserPlus className="h-4 w-4" aria-hidden="true" />
              Tambah Anggota Kelompok
            </button>
          )}
        </div>
      )}

      {/* Informasi Pribadi */}
      <div className="mt-10 border-t border-slate-200 pt-8">
        <div className="flex items-center gap-2.5">
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-blue-600">
            <User className="h-4 w-4" aria-hidden="true" />
          </span>
          <div>
            <h3 className="text-sm font-semibold text-zinc-900">Informasi Pribadi</h3>
            <p className="text-xs text-zinc-400">
              {form.applicationType === "GROUP"
                ? "Data ketua kelompok. Nama Anda tercatat sebagai ketua tim."
                : "Data dasar yang menghubungi Anda."}
            </p>
          </div>
        </div>

        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <div>
            <label className="block text-sm font-medium text-zinc-700">
              {form.applicationType === "GROUP" ? "Nama Lengkap (Ketua Kelompok)" : "Nama Lengkap"}
              <input name="nama" value={form.nama} onChange={handleChange} placeholder="Nama lengkap Anda"
                className={inputClass} />
            </label>
            {errors.nama && <p className="mt-1 text-xs text-red-600">{errors.nama}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium text-zinc-700">
              Asal Instansi (Sekolah/Kampus)
              <input name="asalInstansi" value={form.asalInstansi} onChange={handleChange}
                className={inputClass} />
            </label>
            {errors.asalInstansi && <p className="mt-1 text-xs text-red-600">{errors.asalInstansi}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium text-zinc-700">
              Jenis Kelamin
              <select name="jenisKelamin" value={form.jenisKelamin ?? ""} onChange={handleChange}
                className={inputClass}>
                <option value="">-- Pilih --</option>
                <option value="L">Laki-laki</option>
                <option value="P">Perempuan</option>
              </select>
            </label>
          </div>

          <div>
            <label className="block text-sm font-medium text-zinc-700">
              No. HP
              <input name="noHp" value={form.noHp} onChange={handleChange} placeholder="08xxxxxxxxxx"
                className={inputClass} />
            </label>
            {errors.noHp && <p className="mt-1 text-xs text-red-600">{errors.noHp}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium text-zinc-700">
              Email
              {initialEmail ? (
                <>
                  <span className="relative mt-1.5 block">
                    <input
                      name="email"
                      type="email"
                      value={initialEmail}
                      readOnly
                      aria-readonly="true"
                      tabIndex={-1}
                      className={`${inputClass} cursor-not-allowed bg-zinc-100/80 pr-10 text-zinc-500`}
                    />
                    <span className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 text-zinc-400">
                      <Lock className="h-4 w-4" aria-hidden="true" />
                    </span>
                  </span>
                  <span className="mt-1.5 flex items-center gap-1.5 text-xs text-zinc-400">
                    <Lock className="h-3 w-3" aria-hidden="true" />
                    Terisi otomatis dari akun Google Anda.
                  </span>
                </>
              ) : (
                <input
                  name="email"
                  type="email"
                  value={form.email}
                  onChange={handleChange}
                  placeholder="nama@email.com"
                  className={inputClass}
                />
              )}
            </label>
            {errors.email && <p className="mt-1 text-xs text-red-600">{errors.email}</p>}
          </div>
        </div>
      </div>

      {/* Pendidikan & Unit */}
      <div className="mt-10 border-t border-slate-200 pt-8">
        <div className="flex items-center gap-2.5">
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-blue-600">
            <GraduationCap className="h-4 w-4" aria-hidden="true" />
          </span>
          <div>
            <h3 className="text-sm font-semibold text-zinc-900">Pendidikan &amp; Unit</h3>
            <p className="text-xs text-zinc-400">Latar belakang pendidikan dan unit tujuan.</p>
          </div>
        </div>

        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <div>
            <label className="block text-sm font-medium text-zinc-700">
              Jurusan
              <input name="jurusan" value={form.jurusan ?? ""} onChange={handleChange}
                className={inputClass} />
            </label>
            {errors.jurusan && <p className="mt-1 text-xs text-red-600">{errors.jurusan}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium text-zinc-700">
              Unit yang Diminati
              <select name="unitMinatId" value={form.unitMinatId} onChange={handleChange}
                className={inputClass}>
                <option value="">-- Pilih Unit --</option>
                {units.map((u) => (
                  <option key={u.id} value={u.id}>{u.nama}</option>
                ))}
              </select>
            </label>
            {errors.unitMinatId && <p className="mt-1 text-xs text-red-600">{errors.unitMinatId}</p>}
          </div>
        </div>
      </div>

      {/* Dokumen Pendukung */}
      <div className="mt-10 border-t border-slate-200 pt-8">
        <div className="flex items-center gap-2.5">
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-blue-600">
            <UploadCloud className="h-4 w-4" aria-hidden="true" />
          </span>
          <div>
            <h3 className="text-sm font-semibold text-zinc-900">Dokumen Pendukung</h3>
            <p className="text-xs text-zinc-400">
              Unggah CV (wajib) dan dokumen pelengkap. Masing-masing maks. 2MB.
            </p>
          </div>
        </div>

        <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
          {uploadConfig.map((cfg) => {
            const file = files[cfg.key];
            return (
              <div key={cfg.key}>
                <span className="mb-2 flex h-10 items-end text-sm font-medium text-zinc-700">
                  {cfg.label}{" "}
                  <span className="font-normal text-zinc-400">
                    ({cfg.format}
                    {cfg.required ? ", wajib" : ", opsional"})
                  </span>
                </span>
                <label
                  className={`group flex min-h-[132px] cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed p-5 text-center transition-all ${
                    file
                      ? "border-emerald-300 bg-emerald-50/50 hover:border-emerald-400"
                      : "border-slate-200 bg-slate-50/80 hover:border-blue-500/50 hover:bg-blue-50/50"
                  }`}
                >
                  <input
                    type="file"
                    accept={cfg.accept}
                    onChange={(e) => handleFile(e, cfg.key)}
                    className="sr-only"
                  />
                  {file ? (
                    <div className="flex flex-col items-center gap-2.5">
                      <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-700 ring-1 ring-emerald-200">
                        <FileCheck2 className="h-3.5 w-3.5" aria-hidden="true" />
                        Siap diunggah
                      </span>
                      <span
                        title={file.name}
                        className="flex w-full max-w-[220px] items-center justify-center gap-1.5 text-sm font-medium text-zinc-700"
                      >
                        <FileText className="h-4 w-4 shrink-0 text-emerald-600" aria-hidden="true" />
                        <span className="truncate">{file.name}</span>
                      </span>
                      <span className="text-xs text-zinc-400">Klik untuk mengganti berkas</span>
                    </div>
                  ) : (
                    <>
                      <span className="flex h-11 w-11 items-center justify-center rounded-full bg-blue-50 text-blue-500 transition group-hover:bg-blue-100/70">
                        <UploadCloud className="h-5 w-5" aria-hidden="true" />
                      </span>
                      <p className="mt-2.5 text-sm font-medium text-zinc-700">
                        Klik untuk memilih file
                      </p>
                      <p className="mt-1 text-xs text-zinc-400">
                        Format {cfg.format}, maks 2MB
                      </p>
                    </>
                  )}
                </label>
                {fileErrors[cfg.key] && (
                  <p className="mt-1.5 text-xs text-red-600">{fileErrors[cfg.key]}</p>
                )}
              </div>
            );
          })}
        </div>
      </div>

      <button
        type="submit"
        disabled={loading}
        className="mt-8 flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 py-3.5 text-sm font-medium text-white shadow-sm transition-all hover:bg-blue-700 hover:shadow-md active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-60"
      >
        {loading ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
            Mengirim...
          </>
        ) : (
          <>
            Kirim Pendaftaran
            <Send className="h-4 w-4" aria-hidden="true" />
          </>
        )}
      </button>
      <p className="mt-3 text-center text-xs text-zinc-400">
        Memuat data Anda berarti menyetujui ketentuan program magang LEMIGAS.
      </p>
    </form>
  );
}
