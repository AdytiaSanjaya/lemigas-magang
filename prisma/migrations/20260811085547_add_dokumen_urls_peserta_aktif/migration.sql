-- AlterEnum
ALTER TYPE "StatusPendaftar" ADD VALUE 'PESERTA_AKTIF';

-- AlterTable
ALTER TABLE "Pendaftar" ADD COLUMN     "cvUrl" TEXT,
ADD COLUMN     "ktpKtmUrl" TEXT,
ADD COLUMN     "suratPengantarUrl" TEXT,
ADD COLUMN     "transkripUrl" TEXT;
