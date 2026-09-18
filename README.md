# Sistem Absensi Training Karyawan

Monorepo untuk aplikasi internal dengan **NestJS + Prisma + PostgreSQL** di `backend/` dan **Next.js + TypeScript** di `frontend/`.

## Persiapan lokal

1. Siapkan Node.js dan npm. Fondasi ini telah dijalankan dengan Node.js 24.14.1 dan npm 11.11.0.
2. Salin `.env.example` menjadi `.env`.
3. Jalankan `npm install` dari direktori ini.
4. Jalankan PostgreSQL dengan `npm run db:up` (membutuhkan Docker Desktop yang aktif).
5. Terapkan skema dan isi data demo:

   ```sh
   npm run db:migrate
   npm run db:seed
   ```

6. Jalankan aplikasi dengan `npm run dev`. Frontend tersedia di `http://localhost:3000` dan API di `http://localhost:3001/api`.

Login belum tersedia pada tahap fondasi ini. Seed menyiapkan akun untuk tahap autentikasi berikutnya; semua akun demo memakai kata sandi `TrainingDemo123!`:

- `admin@example.com` — ADMIN
- `trainer@example.com` — TRAINER
- `karyawan1@example.com`, `karyawan2@example.com`, `karyawan3@example.com` — KARYAWAN

Ganti rahasia dan kredensial demo sebelum memakai konfigurasi ini di lingkungan selain lokal.

## Perintah utama

- `npm run db:generate` — generate Prisma Client
- `npm run db:migrate` — buat/terapkan migration pengembangan
- `npm run db:status` — periksa status migration
- `npm run db:validate` — validasi skema Prisma
- `npm run db:seed` — upsert departemen dan akun demo
- `npm run db:down` — hentikan container PostgreSQL
- `npm run lint` — jalankan lint frontend dan backend
- `npm run build` — build semua workspace
