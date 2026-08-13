import { PrismaClient, StatusPendaftar } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

function pad(n: number, len = 4): string {
  return n.toString().padStart(len, "0");
}

async function main() {
  console.log("Menghapus data lama (jika ada) ...");
  await prisma.$transaction([
    prisma.statusHistory.deleteMany(),
    prisma.peserta.deleteMany(),
    prisma.pendaftar.deleteMany(),
    prisma.user.deleteMany(),
    prisma.unit.deleteMany(),
    prisma.infoProgram.deleteMany(),
  ]);

  console.log("Membuat unit-unit LEMIGAS ...");
  const units = [
    { nama: "Laboratorium Pengujian Migas", deskripsi: "Uji mutu produk minyak & gas" },
    { nama: "SPBE & Teknologi Migas", deskripsi: "Sistem & proses bisnis energi" },
    { nama: "Pusat Riset & Pengembangan", deskripsi: "Litbang migas" },
    { nama: "Bagian SDM & Umum", deskripsi: "Administrasi & kepegawaian" },
  ];
  await prisma.unit.createMany({ data: units.map((u) => ({ nama: u.nama, deskripsi: u.deskripsi })) });
  const unitRows = await prisma.unit.findMany({ orderBy: { nama: "asc" } });

  // --- User: Admin & Mentor (semua password: Magang123) ---
  console.log("Membuat user admin & mentor ...");
  const passwordHash = await bcrypt.hash("Magang123", 10);

  await prisma.user.create({
    data: { nama: "Admin LEMIGAS", email: "admin@lemigas.example", passwordHash, role: "ADMIN" },
  });

  const mentorLab = await prisma.user.create({
    data: {
      nama: "Dewi Rahmawati (Mentor Lab)",
      email: "mentor.lab@lemigas.example",
      passwordHash,
      role: "MENTOR",
      unitId: unitRows[0].id,
    },
  });

  await prisma.user.create({
    data: {
      nama: "Budi Santoso (Mentor Litbang)",
      email: "mentor.litbang@lemigas.example",
      passwordHash,
      role: "MENTOR",
      unitId: unitRows[2].id,
    },
  });

  console.log("Membuat contoh data pendaftar ...");
  const admin = await prisma.user.findUnique({ where: { email: "admin@lemigas.example" } });

  const now = new Date();
  const samples: Array<{
    nama: string; asal: string; jurusan?: string; noHp: string;
    email: string; unitIdx: number; status: StatusPendaftar;
  }> = [
    { nama: "Andi Wijaya", asal: "Universitas Indonesia", jurusan: "Teknik Kimia", noHp: "081234560001", email: "andi.w@mail.com", unitIdx: 0, status: "MENUNGGU" },
    { nama: "Sari Puspita", asal: "Politeknik Negeri Bandung", jurusan: "Teknik Pengolahan Migas", noHp: "081234560002", email: "sari.p@mail.com", unitIdx: 1, status: "DITERIMA" },
    { nama: "Rizky Pratama", asal: "Universitas Gadjah Mada", jurusan: "Geofisika", noHp: "081234560003", email: "rizky.p@mail.com", unitIdx: 2, status: "DITOLAK" },
    { nama: "Lina Marlina", asal: "STT Migas Balikpapan", jurusan: "Teknik Keselamatan", noHp: "081234560004", email: "lina.m@mail.com", unitIdx: 0, status: "MENUNGGU" },
  ];

  let seq = 1;
  for (const s of samples) {
    const noPendaftaran = `LEMIGAS-${now.getFullYear()}-${pad(seq)}`;
    await prisma.pendaftar.create({
      data: {
        noPendaftaran,
        nama: s.nama,
        asalInstansi: s.asal,
        jurusan: s.jurusan,
        noHp: s.noHp,
        email: s.email,
        unitMinatId: unitRows[s.unitIdx].id,
        berkasCV: "/uploads/sample-cv.pdf",
        status: s.status,
        createdAt: new Date(now.getTime() - seq * 86400000),
        ...(s.status === "DITERIMA"
          ? {
              diprosesAdminId: admin?.id ?? null,
              peserta: {
                create: {
                  unitId: unitRows[s.unitIdx].id,
                  tanggalMulai: new Date(now.getTime() + 7 * 86400000),
                  tanggalSelesai: new Date(now.getTime() + 97 * 86400000),
                  mentorId: s.unitIdx === 0 ? mentorLab.id : null,
                },
              },
            }
          : {}),
      },
    });
    seq++;
  }

  // Info program (alaman yang di-cache ISR).
  await prisma.infoProgram.create({
    data: {
      judul: "Program Magang & PKL LEMIGAS 2026",
      isi: "Program magang/PKL terbuka untuk pelajar dan mahasiswa. Meliputi pengujian migas, litbang, dan administrasi. Durasi umumnya 2-6 bulan sesuai kurikulum.",
      aktif: true,
    },
  });

  console.log("\nSeed selesai ✔");
  console.log("  ▪ Admin :  admin@lemigas.example / Magang123");
  console.log("  ▪ Mentor:  mentor.lab@lemigas.example  / Magang123");
  console.log("  ▪ Mentor:  mentor.litbang@lemigas.example / Magang123");
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); });