# 🎓 SIKAP - Sistem Informasi Konsultasi Akademik Terpadu

Backend API untuk sistem pemesanan jadwal konsultasi akademik (Bimbingan PA) yang terintegrasi dengan simulasi SSO Kampus. Dibuat untuk mempermudah pertemuan antara Dosen dan Mahasiswa.

## 🚀 Fitur Utama (Sprint 1)

* **SSO Pass-through Authentication:** Login menggunakan NIM/NIDN tanpa menyimpan password user.
* **JIT (Just-In-Time) Synchronization:** Otomatis sinkronisasi data profil dan role saat user login pertama kali.
* **Auto-Mapping PA:** Otomatis memetakan Mahasiswa ke Dosen PA mereka berdasarkan data akademik.
* **Secure Authorization:** Menggunakan JWT (JSON Web Token) untuk sesi aplikasi.
* **Mock SSO Server:** Server simulasi untuk environment development.

## 🛠️ Tech Stack

* **Runtime:** Node.js
* **Framework:** Express.js
* **Database:** PostgreSQL (via Supabase)
* **ORM:** Prisma
* **Validation:** Zod
* **Deployment:** Vercel (Serverless)

## 📂 Struktur Project

```bash
├── api/                # Vercel serverless entry point
├── prisma/             # Schema database & Seeding
├── src/
│   ├── controllers/    # HTTP Request Handlers
│   ├── services/       # Business Logic & Sync
│   ├── middlewares/    # Auth & Error Handling
│   └── routes/         # API Routes
├── mock-sso-server.js  # Server simulasi API Kampus
└── ...