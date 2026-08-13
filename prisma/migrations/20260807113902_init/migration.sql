-- CreateEnum
CREATE TYPE "Role" AS ENUM ('ADMIN', 'MENTOR');

-- CreateEnum
CREATE TYPE "StatusPendaftar" AS ENUM ('MENUNGGU', 'DITERIMA', 'DITOLAK');

-- CreateEnum
CREATE TYPE "TipePeriode" AS ENUM ('GENAP', 'GANJIL');

-- CreateTable
CREATE TABLE "Unit" (
    "id" TEXT NOT NULL,
    "nama" TEXT NOT NULL,
    "deskripsi" TEXT,
    "aktif" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Unit_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "nama" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "role" "Role" NOT NULL DEFAULT 'ADMIN',
    "unitId" TEXT,
    "isAktif" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Pendaftar" (
    "id" TEXT NOT NULL,
    "noPendaftaran" TEXT NOT NULL,
    "nama" TEXT NOT NULL,
    "asalInstansi" TEXT NOT NULL,
    "jurusan" TEXT,
    "jenisKelamin" TEXT,
    "noHp" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "unitMinatId" TEXT NOT NULL,
    "berkasCV" TEXT NOT NULL,
    "berkasSurat" TEXT,
    "status" "StatusPendaftar" NOT NULL DEFAULT 'MENUNGGU',
    "catatan" TEXT,
    "diprosesAdminId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Pendaftar_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StatusHistory" (
    "id" TEXT NOT NULL,
    "pendaftarId" TEXT NOT NULL,
    "status" "StatusPendaftar" NOT NULL,
    "catatan" TEXT,
    "diubahOlehId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "StatusHistory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Peserta" (
    "id" TEXT NOT NULL,
    "pendaftarId" TEXT NOT NULL,
    "unitId" TEXT NOT NULL,
    "tanggalMulai" TIMESTAMP(3) NOT NULL,
    "tanggalSelesai" TIMESTAMP(3) NOT NULL,
    "mentorId" TEXT,
    "catatan" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Peserta_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InfoProgram" (
    "id" TEXT NOT NULL,
    "judul" TEXT NOT NULL,
    "isi" TEXT NOT NULL,
    "aktif" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "InfoProgram_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Unit_nama_key" ON "Unit"("nama");

-- CreateIndex
CREATE INDEX "Unit_aktif_idx" ON "Unit"("aktif");

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE INDEX "User_role_idx" ON "User"("role");

-- CreateIndex
CREATE INDEX "User_unitId_idx" ON "User"("unitId");

-- CreateIndex
CREATE UNIQUE INDEX "Pendaftar_noPendaftaran_key" ON "Pendaftar"("noPendaftaran");

-- CreateIndex
CREATE INDEX "Pendaftar_email_idx" ON "Pendaftar"("email");

-- CreateIndex
CREATE INDEX "Pendaftar_status_idx" ON "Pendaftar"("status");

-- CreateIndex
CREATE INDEX "Pendaftar_unitMinatId_idx" ON "Pendaftar"("unitMinatId");

-- CreateIndex
CREATE INDEX "Pendaftar_createdAt_idx" ON "Pendaftar"("createdAt");

-- CreateIndex
CREATE INDEX "Pendaftar_noPendaftaran_idx" ON "Pendaftar"("noPendaftaran");

-- CreateIndex
CREATE INDEX "StatusHistory_pendaftarId_idx" ON "StatusHistory"("pendaftarId");

-- CreateIndex
CREATE INDEX "StatusHistory_status_idx" ON "StatusHistory"("status");

-- CreateIndex
CREATE INDEX "StatusHistory_createdAt_idx" ON "StatusHistory"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "Peserta_pendaftarId_key" ON "Peserta"("pendaftarId");

-- CreateIndex
CREATE INDEX "Peserta_unitId_idx" ON "Peserta"("unitId");

-- CreateIndex
CREATE INDEX "Peserta_mentorId_idx" ON "Peserta"("mentorId");

-- CreateIndex
CREATE INDEX "Peserta_tanggalMulai_idx" ON "Peserta"("tanggalMulai");

-- CreateIndex
CREATE INDEX "Peserta_tanggalSelesai_idx" ON "Peserta"("tanggalSelesai");

-- CreateIndex
CREATE INDEX "InfoProgram_aktif_idx" ON "InfoProgram"("aktif");

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_unitId_fkey" FOREIGN KEY ("unitId") REFERENCES "Unit"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Pendaftar" ADD CONSTRAINT "Pendaftar_unitMinatId_fkey" FOREIGN KEY ("unitMinatId") REFERENCES "Unit"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Pendaftar" ADD CONSTRAINT "Pendaftar_diprosesAdminId_fkey" FOREIGN KEY ("diprosesAdminId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StatusHistory" ADD CONSTRAINT "StatusHistory_pendaftarId_fkey" FOREIGN KEY ("pendaftarId") REFERENCES "Pendaftar"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StatusHistory" ADD CONSTRAINT "StatusHistory_diubahOlehId_fkey" FOREIGN KEY ("diubahOlehId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Peserta" ADD CONSTRAINT "Peserta_pendaftarId_fkey" FOREIGN KEY ("pendaftarId") REFERENCES "Pendaftar"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Peserta" ADD CONSTRAINT "Peserta_unitId_fkey" FOREIGN KEY ("unitId") REFERENCES "Unit"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Peserta" ADD CONSTRAINT "Peserta_mentorId_fkey" FOREIGN KEY ("mentorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
