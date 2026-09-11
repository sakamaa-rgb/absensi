# PPLG 3 SMART ATTENDANCE (XI PPLG 3 SMKN 1 CIOMAS)

Sistem Absensi Digital Cerdas dan Aman khusus untuk 45 siswa kelas **XI PPLG 3 SMKN 1 Ciomas**. Dibangun menggunakan arsitektur modern berbasis **React, TypeScript, Vite, Tailwind CSS, Supabase PostgreSQL, RLS, Edge Functions, Dynamic QR, Browser Geolocation API, Device Fingerprint Binding, dan Excel/PDF Reporting**.

---

## Fitur Utama

- **Role Khusus Siswa & Admin**:
  - **Siswa**: Login menggunakan **email akun kelas** dan **NISN** sebagai password. Absensi mandiri via Dynamic QR, deteksi GPS, device fingerprint, cek bukti absensi, riwayat kehadiran.
  - **Admin / Ketua Kelas**: Dashboard 45 siswa, **Scan Siswa Langsung di Kelas** (Ketua Kelas Mode), kelola status kehadiran manual (Hanya Admin yang berwenang mengubah Hadir/Sakit/Izin/Alpha), **Export & Import Excel/PDF** (Hanya Admin), Reset Device siswa, dan Projector Mode.
- **Multi-Layer Anti-Titip Absen**:
  1. **Dynamic QR Token**: Berubah otomatis setiap 30–60 detik, divalidasi server-side.
  2. **GPS Geolocation & Radius SMKN 1 Ciomas**: Menggunakan rumus Haversine server-side untuk memastikan siswa benar-benar berada di sekolah (default radius 100m).
  3. **Device Binding (Fingerprint)**: Akun siswa terkunci pada perangkat HP pertama. Admin dapat mereset device jika siswa berganti HP.
  4. **Duplicate Prevention**: Constraint unik database mencegah absensi ganda pada sesi yang sama.
  5. **Optional Face Verification**: Integrasi `@vladmandic/face-api` (opsional via setting admin).
  6. **Server-Side Asia/Jakarta Time**: Status `HADIR` vs `TERLAMBAT` ditentukan berdasarkan jam server (batas terlambat 06:45 WIB).
- **Export & Pelaporan Resmi**:
  - **Excel (`.xlsx`) & CSV**: Kolom lengkap (Nomor Absen, NIS, Nama, Tanggal, Jam, Status, Koordinat, Jarak, Device Status, Keterangan).
  - **PDF Resmi SMKN 1 Ciomas (`.pdf`)**: Lengkap dengan kop sekolah, statistik ringkasan kehadiran (Hadir, Terlambat, Izin, Sakit, Alpha, Belum Absen), tabel siswa, dan kolom tanda tangan Wali Kelas / Admin.
  - **Bukti Digital Absensi (`/verify/:attendanceId`)**: QR pass slip untuk verifikasi keaslian kehadiran secara publik.

---

## Kredensial Pengujian (Demo / Default)

### 1. Akun Siswa (Contoh: Rajib)
- **Email**: `rajibjugi02@gmail.com`
- **Password**: `0109463616` (Menggunakan NISN)
- **NIS**: `232410025`
- **Nomor Absen**: `25`
- **Kelas**: `XI PPLG 3`

*(Tersedia tombol satu-klik "Akun Siswa (Rajib)" pada halaman login)*

### 2. Akun Admin / Ketua Kelas
- **Email**: `admin.pplg3@smkn1ciomas.sch.id` *(atau ketuakelas.pplg3@gmail.com)*
- **Password**: `admin123` *(atau pplg3ciomas)*
- **Role**: `admin`

*(Tersedia tombol satu-klik "Admin / Ketua Kelas" pada halaman login)*

---

## 1. Instalasi & Local Development

```bash
# Clone repository atau buka folder project
cd c:/xampp/htdocs/Absensi

# Install dependencies
npm install

# Jalankan server development Vite
npm run dev

# Aplikasi berjalan di: http://localhost:5173
```

---

## 2. Environment Variables

Buat file `.env` di root project:

```env
# Supabase Project Configuration
VITE_SUPABASE_URL=https://your-project-id.supabase.co
VITE_SUPABASE_ANON_KEY=your-supabase-anon-key

# Konfigurasi Sekolah
VITE_SCHOOL_NAME="SMKN 1 Ciomas"
VITE_CLASS_NAME="XI PPLG 3"
```

> **Catatan**: Jika environment Supabase belum diisi, aplikasi secara otomatis berjalan menggunakan reactive local state store yang sudah terisi data 45 siswa XI PPLG 3, sesi aktif, dan simulasi Dynamic QR.

---

## 3. Setup Supabase & Database Migration

1. Buka dashboard [Supabase](https://supabase.com) dan buat project baru.
2. Buka menu **SQL Editor** pada dashboard Supabase.
3. Jalankan script migrasi berikut secara berurutan:
   - File [20260908000000_init_schema.sql](file:///c:/xampp/htdocs/Absensi/supabase/migrations/20260908000000_init_schema.sql): Membuat tabel `profiles`, `students`, `attendance_sessions`, `qr_tokens`, `attendance`, `activity_logs`, `system_settings`, fungsi Haversine, stored procedures, dan aturan RLS.
   - File [20260908000001_seed_45_students.sql](file:///c:/xampp/htdocs/Absensi/supabase/migrations/20260908000001_seed_45_students.sql): Mengisi template 45 siswa XI PPLG 3 dan akun demo Rajib.

---

## 4. Row Level Security (RLS)

- Siswa hanya dapat membaca profil dan data absensi miliknya sendiri (`user_id = auth.uid()`).
- Admin memiliki akses penuh (`is_admin() = true`) untuk mengelola sesi, memantau absensi seluruh siswa, mereset device, dan mengubah status kehadiran.

---

## 5. Supabase Edge Functions

Tersedia di direktori `supabase/functions/`:
- `generate-qr`: Menghasilkan token acak yang berlaku 30–60 detik.
- `validate-qr`: Memvalidasi token dan waktu kedaluwarsa.
- `submit-attendance`: Validasi server-side menyeluruh (QR, GPS, Device, Duplicate, Time).
- `verify-attendance`: Endpoint publik untuk pengecekan bukti absensi.

Untuk mendeploy Edge Functions via Supabase CLI:

```bash
supabase functions deploy generate-qr
supabase functions deploy validate-qr
supabase functions deploy submit-attendance
supabase functions deploy verify-attendance
```

---

## 6. Alur Kehadiran & Validasi Anti-Titip Absen

```text
[MODE 1: SISWA SCAN MANDIRI]
Siswa Login (Email + NISN) 
   → Buka Kamera Scan QR 
   → Scan Dynamic QR di Layar Kelas 
   → Validasi Expiration Token (30-60s)
   → Deteksi Geolocation Browser GPS 
   → Server-side Haversine Distance (Max 100m ke SMKN 1 Ciomas)
   → Verifikasi Browser Device Token
   → Cek Duplikat Absen (unique student_id + session_id)
   → Tentukan Status (HADIR atau TERLAMBAT jika lewat 06:45 WIB)
   → Simpan Attendance Record & Log Aktivitas
   → Generate ATT-ID & Cetak Bukti Digital

[MODE 2: KETUA KELAS / ADMIN SCAN SISWA]
Admin / Ketua Kelas Buka Panel "/admin/scan"
   → Arahkan Kamera ke QR Siswa (di HP/Kartu)
   → Auto-scan & Verifikasi Siswa
   → Pilih Status Kehadiran (HADIR / SAKIT / IZIN / ALPHA)
   → Absensi Tercatat & Feedback Audio / Visual
```

---

## 7. Penanganan 8 Error State

Aplikasi menyediakan modal dan feedback visual untuk:
1. `QR_EXPIRED`: QR Code sudah tidak berlaku (>30 detik).
2. `QR_INVALID`: Token QR tidak terdaftar atau rusak.
3. `LOCATION_DENIED`: Izin akses lokasi GPS ditolak oleh pengguna.
4. `OUTSIDE_RADIUS`: Berada di luar radius toleransi (contoh: 237m dari SMKN 1 Ciomas).
5. `GPS_ACCURACY_LOW`: Akurasi sinyal GPS terlalu rendah (>150m).
6. `DEVICE_REJECTED`: Perangkat HP tidak cocok dengan HP yang terdaftar.
7. `FACE_FAILED`: Wajah tidak terdeteksi atau tidak cocok.
8. `ALREADY_ATTENDED`: Siswa sudah melakukan absensi untuk sesi ini.

---

## 8. Deployment ke Vercel

Aplikasi telah dilengkapi dengan [vercel.json](file:///c:/xampp/htdocs/Absensi/vercel.json) yang mengatur SPA rewrite agar navigasi React Router tidak mengalami error 404 saat di-refresh.

Langkah deploy:
1. Push project ke GitHub/GitLab.
2. Impor repository di [Vercel](https://vercel.com).
3. Masukkan Environment Variables:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
4. Deploy! Build command `npm run build` dan Output directory `dist` akan terdeteksi otomatis.
