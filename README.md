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

Seed menyiapkan akun demo; semua akun memakai kata sandi `TrainingDemo123!`:

- `admin@example.com` — ADMIN
- `trainer@example.com` — TRAINER
- `karyawan1@example.com`, `karyawan2@example.com`, `karyawan3@example.com` — KARYAWAN

Login mengembalikan JWT access token dan menaruh refresh token JWT pada cookie `HttpOnly` yang dirotasi saat refresh. Ganti rahasia JWT dan kredensial demo sebelum memakai konfigurasi di lingkungan selain lokal.

## Endpoint yang tersedia

- `POST /api/auth/login`, `POST /api/auth/refresh`, `POST /api/auth/logout`, `GET /api/auth/me`
- CRUD Admin: `/api/departemen`, `/api/karyawan`, `/api/training`
- Sesi dasar: `POST /api/sesi` (Admin), `GET /api/sesi` dan `GET /api/sesi/:id` (Admin/Trainer)
- Compliance dasar: `GET /api/compliance/me?year=2026` (user terautentikasi; default tahun berjalan WIB), `GET` dan `PUT /api/compliance/setting` (Admin)
- Semua endpoint list menerima `page` dan `limit`; daftar karyawan juga menerima filter `departemenId`.

Perhitungan compliance menjumlahkan `durasi_jam` dari sesi bertanggal `waktu_buka` pada tahun kalender WIB yang dipilih, hanya jika karyawan memiliki Absensi `HADIR`. Target awal 6 jam disimpan di database dan dapat diubah Admin melalui endpoint pengaturan.

## Perintah utama

- `npm run db:generate` — generate Prisma Client
- `npm run db:migrate` — buat/terapkan migration pengembangan
- `npm run db:status` — periksa status migration
- `npm run db:validate` — validasi skema Prisma
- `npm run db:seed` — upsert departemen dan akun demo
- `npm run db:down` — hentikan container PostgreSQL
- `npm test` — jalankan unit test backend
- `npm run test:e2e` — jalankan smoke test backend dengan database lokal
- `npm run lint` — jalankan lint frontend dan backend
- `npm run build` — build semua workspace
