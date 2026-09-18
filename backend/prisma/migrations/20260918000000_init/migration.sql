-- CreateEnum
CREATE TYPE "Role" AS ENUM ('ADMIN', 'TRAINER', 'KARYAWAN');

-- CreateEnum
CREATE TYPE "StatusSesi" AS ENUM ('DRAFT', 'DIBUKA', 'DITUTUP');

-- CreateEnum
CREATE TYPE "StatusAssignment" AS ENUM ('DITUGASKAN', 'SELESAI', 'DIBATALKAN');

-- CreateEnum
CREATE TYPE "StatusAbsensi" AS ENUM ('HADIR', 'ALPHA');

-- CreateTable
CREATE TABLE "departemen" (
    "id" UUID NOT NULL,
    "nama" VARCHAR(120) NOT NULL,

    CONSTRAINT "departemen_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "karyawan" (
    "id" UUID NOT NULL,
    "nama" VARCHAR(150) NOT NULL,
    "email" VARCHAR(255) NOT NULL,
    "password_hash" VARCHAR(255) NOT NULL,
    "departemen_id" UUID NOT NULL,
    "role" "Role" NOT NULL DEFAULT 'KARYAWAN',
    "aktif" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "karyawan_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "training" (
    "id" UUID NOT NULL,
    "nama" VARCHAR(180) NOT NULL,
    "deskripsi" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "training_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sesi" (
    "id" UUID NOT NULL,
    "training_id" UUID NOT NULL,
    "trainer_id" UUID NOT NULL,
    "waktu_buka" TIMESTAMPTZ(6),
    "waktu_tutup" TIMESTAMPTZ(6),
    "durasi_jam" DECIMAL(7,2),
    "status" "StatusSesi" NOT NULL DEFAULT 'DRAFT',

    CONSTRAINT "sesi_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "assignment" (
    "id" UUID NOT NULL,
    "karyawan_id" UUID NOT NULL,
    "sesi_id" UUID NOT NULL,
    "status" "StatusAssignment" NOT NULL DEFAULT 'DITUGASKAN',

    CONSTRAINT "assignment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "absensi" (
    "id" UUID NOT NULL,
    "karyawan_id" UUID NOT NULL,
    "sesi_id" UUID NOT NULL,
    "waktu_scan" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "latitude" DECIMAL(9,6),
    "longitude" DECIMAL(9,6),
    "status" "StatusAbsensi" NOT NULL DEFAULT 'HADIR',

    CONSTRAINT "absensi_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "departemen_nama_key" ON "departemen"("nama");

-- CreateIndex
CREATE UNIQUE INDEX "karyawan_email_key" ON "karyawan"("email");

-- CreateIndex
CREATE INDEX "karyawan_departemen_id_idx" ON "karyawan"("departemen_id");

-- CreateIndex
CREATE INDEX "karyawan_role_aktif_idx" ON "karyawan"("role", "aktif");

-- CreateIndex
CREATE INDEX "training_nama_idx" ON "training"("nama");

-- CreateIndex
CREATE INDEX "sesi_training_id_idx" ON "sesi"("training_id");

-- CreateIndex
CREATE INDEX "sesi_trainer_id_idx" ON "sesi"("trainer_id");

-- CreateIndex
CREATE INDEX "sesi_status_idx" ON "sesi"("status");

-- CreateIndex
CREATE INDEX "assignment_sesi_id_idx" ON "assignment"("sesi_id");

-- CreateIndex
CREATE UNIQUE INDEX "assignment_karyawan_id_sesi_id_key" ON "assignment"("karyawan_id", "sesi_id");

-- CreateIndex
CREATE INDEX "absensi_sesi_id_idx" ON "absensi"("sesi_id");

-- CreateIndex
CREATE INDEX "absensi_waktu_scan_idx" ON "absensi"("waktu_scan");

-- CreateIndex
CREATE UNIQUE INDEX "absensi_karyawan_id_sesi_id_key" ON "absensi"("karyawan_id", "sesi_id");

-- AddForeignKey
ALTER TABLE "karyawan" ADD CONSTRAINT "karyawan_departemen_id_fkey" FOREIGN KEY ("departemen_id") REFERENCES "departemen"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sesi" ADD CONSTRAINT "sesi_training_id_fkey" FOREIGN KEY ("training_id") REFERENCES "training"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sesi" ADD CONSTRAINT "sesi_trainer_id_fkey" FOREIGN KEY ("trainer_id") REFERENCES "karyawan"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "assignment" ADD CONSTRAINT "assignment_karyawan_id_fkey" FOREIGN KEY ("karyawan_id") REFERENCES "karyawan"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "assignment" ADD CONSTRAINT "assignment_sesi_id_fkey" FOREIGN KEY ("sesi_id") REFERENCES "sesi"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "absensi" ADD CONSTRAINT "absensi_karyawan_id_fkey" FOREIGN KEY ("karyawan_id") REFERENCES "karyawan"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "absensi" ADD CONSTRAINT "absensi_sesi_id_fkey" FOREIGN KEY ("sesi_id") REFERENCES "sesi"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
