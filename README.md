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

6. Jalankan aplikasi dengan `npm run dev`. Frontend tersedia di `http://localhost:3000` dan API di `http://localhost:3001/api`. Docker Compose pada fondasi ini hanya menjalankan PostgreSQL; backend dan frontend berjalan sebagai proses npm agar hot reload tetap sederhana.

Login melalui `http://localhost:3000/login`. Admin dapat membuka dashboard di `/admin/compliance` dan Assignment di `/admin/sesi`; Trainer mengelola QR melalui `/trainer`; karyawan melihat progress tahunan di `/karyawan`, memindai QR setelah login melalui `/karyawan/scan`, atau membuka URL hasil scan `/absen/:token`.

Seed menyiapkan akun demo; semua akun memakai kata sandi `TrainingDemo123!`:

- `admin@example.com` — ADMIN
- `trainer@example.com` — TRAINER
- `karyawan1@example.com`, `karyawan2@example.com`, `karyawan3@example.com` — KARYAWAN

Login mengembalikan JWT access token dan menaruh refresh token JWT pada cookie `HttpOnly` yang dirotasi saat refresh. Ganti rahasia JWT dan kredensial demo sebelum memakai konfigurasi di lingkungan selain lokal.

## Endpoint yang tersedia

- `POST /api/auth/login`, `POST /api/auth/refresh`, `POST /api/auth/logout`, `GET /api/auth/me`
- CRUD Admin: `/api/departemen`, `/api/karyawan`, `/api/training`
- Sesi dasar: `POST /api/sesi` (Admin), `GET /api/sesi` dan `GET /api/sesi/:id` (Admin/Trainer)
- Assignment dan absensi: `GET/POST/DELETE /api/sesi/:id/assignments`, `GET /api/sesi/:id/participants`, `POST /api/sesi/:id/buka`, `POST /api/sesi/:id/tutup`, `GET /api/sesi/:id/stream`, `GET /api/absen/:token`, `GET /api/absen/:token/status`, `POST /api/absen/:token/confirm`
- Compliance: `GET /api/compliance/me?year=2026` (user terautentikasi), `GET /api/compliance?year=2026` (dashboard Admin; filter `departemenId` dan `status`), `GET` dan `PUT /api/compliance/setting` (Admin)
- Semua endpoint list menerima `page` dan `limit`; daftar karyawan juga menerima filter `departemenId`.

Perhitungan compliance menjumlahkan `durasi_jam` dari sesi bertanggal `waktu_buka` pada tahun kalender WIB yang dipilih, hanya jika karyawan memiliki Absensi `HADIR`. Target awal 6 jam disimpan di database dan dapat diubah Admin melalui endpoint pengaturan.

QR aktif berganti setiap 15 detik secara default melalui SSE. Atur `QR_TOKEN_INTERVAL_SECONDS` untuk mengubah interval tersebut.

Untuk testing scan dari HP di jaringan Wi-Fi yang sama:

1. Cari alamat IPv4 komputer (contoh `192.168.1.10`).
2. Di `.env`, ubah `NEXT_PUBLIC_API_URL` menjadi `http://192.168.1.10:3001/api` dan `FRONTEND_URL` menjadi `http://localhost:3000,http://192.168.1.10:3000`.
3. Jalankan ulang `npm run dev`, lalu buka `http://192.168.1.10:3000` di HP. QR yang tampil akan memakai alamat yang bisa dijangkau HP.

Pemindai kamera di dalam aplikasi memerlukan HTTPS pada browser HP. Pada HTTP lokal, gunakan kamera bawaan HP untuk membuka link QR atau salin link QR ke kolom manual pada `/karyawan/scan`.

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
