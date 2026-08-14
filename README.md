# CBT App — Ujian Online Sederhana

Aplikasi Computer Based Test untuk kebutuhan pribadi guru SMK. 1 guru, beberapa kelas, tanpa akun untuk siswa, nilai otomatis muncul setelah ujian selesai.

**Stack:** React (Vite) + Tailwind CSS + Supabase (Auth, Database, Storage) + library `xlsx` untuk import/export Excel.

---

## 1. Struktur Folder

```
cbt-app/
├── supabase/
│   └── schema.sql          # skema database + RLS, jalankan sekali di Supabase
├── src/
│   ├── main.jsx             # entry point React
│   ├── App.jsx               # routing halaman
│   ├── supabaseClient.js     # koneksi ke Supabase
│   ├── index.css             # styling global (Tailwind)
│   ├── pages/
│   │   ├── TeacherLogin.jsx      # login guru
│   │   ├── TeacherDashboard.jsx  # dashboard guru (tab: Bank Soal / Buat Ujian / Rekap)
│   │   ├── StudentEntry.jsx      # halaman awal siswa (isi nama, kelas, kode ujian)
│   │   ├── ExamPage.jsx          # halaman pengerjaan soal (timer, autosave, navigasi)
│   │   └── ResultPage.jsx        # halaman nilai setelah submit
│   ├── components/
│   │   ├── QuestionForm.jsx      # form tambah/edit 1 soal + upload gambar
│   │   ├── QuestionBank.jsx      # daftar bank soal + cari/filter/hapus
│   │   ├── ImportExcel.jsx       # import soal massal dari file Excel
│   │   ├── ExamBuilder.jsx       # buat ujian (acak / paket tetap)
│   │   ├── PackageBuilder.jsx    # atur soal untuk Paket A/B/C/D
│   │   ├── Recap.jsx             # rekap nilai + export Excel
│   │   ├── Timer.jsx             # komponen countdown
│   │   └── ProtectedRoute.jsx    # proteksi halaman guru (wajib login)
│   └── utils/
│       ├── shuffle.js        # acak soal & acak pilihan jawaban
│       └── grading.js        # hitung nilai otomatis
├── .env.example
├── package.json
└── tailwind.config.js
```

---

## 2. Setup Supabase (Database + Auth + Storage)

1. Buat project baru di [supabase.com](https://supabase.com) (gratis, cukup untuk 1 guru & 2–3 kelas).
2. Buka **SQL Editor** → tempel seluruh isi `supabase/schema.sql` → klik **Run**.
   Ini akan membuat semua tabel (`questions`, `exams`, `exam_packages`, `package_questions`, `students`, `attempts`, `results`), mengaktifkan Row Level Security, dan membuat storage bucket `question-images` untuk gambar soal.
3. Buat akun guru: buka **Authentication → Users → Add user**, isi email & password guru (misal `guru@sekolah.sch.id`). Akun ini yang dipakai untuk login di halaman guru — tidak perlu halaman signup terpisah karena hanya dipakai 1 guru.
4. Ambil kredensial API: buka **Project Settings → API**, salin:
   - `Project URL` → jadi `VITE_SUPABASE_URL`
   - `anon public key` → jadi `VITE_SUPABASE_ANON_KEY`

> Catatan keamanan: RLS sudah diatur supaya guru hanya bisa mengelola soal & ujian miliknya sendiri (`auth.uid()`), sementara siswa (anonymous/tanpa login) hanya bisa membuat data siswa, mengerjakan attempt miliknya, dan submit nilai — tidak bisa membaca/mengubah bank soal guru.

---

## 3. Instalasi Lokal

```bash
# 1. Masuk ke folder project
cd cbt-app

# 2. Install dependencies
npm install

# 3. Salin file environment lalu isi dengan kredensial Supabase kamu
cp .env.example .env
# edit .env, isi VITE_SUPABASE_URL dan VITE_SUPABASE_ANON_KEY

# 4. Jalankan mode development
npm run dev
```

Buka `http://localhost:5173`.
- Halaman `/` = halaman siswa (isi nama, kelas, kode ujian)
- Halaman `/guru/login` = login guru

---

## 4. Cara Pakai (Alur Guru)

1. **Login** di `/guru/login` dengan email/password yang dibuat di Supabase Auth.
2. **Bank Soal** — tambah soal satu-satu, atau **Import Excel** dengan format kolom persis:

   | No | Soal | A | B | C | D | E | Kunci |
   |----|------|---|---|---|---|---|-------|

   Tombol **Unduh Template** di halaman Bank Soal menyediakan file Excel contoh siap isi.
3. **Buat Ujian** — isi nama ujian, mapel, kelas, durasi, jumlah soal ditampilkan, lalu pilih mode:
   - **Acak Otomatis**: sistem otomatis mengambil N soal acak dari bank soal mapel tersebut, urutan soal & pilihan jawaban diacak per siswa.
   - **Paket Tetap**: buat Paket A/B/C/D, lalu pilih soal mana saja yang masuk ke tiap paket lewat menu **Kelola Paket**. Saat siswa mulai ujian, sistem memilih satu paket secara acak untuknya.
4. Setiap ujian otomatis mendapat **Kode Ujian** (6 karakter, contoh `AB12CD`). Bagikan kode ini ke siswa (tulis di papan tulis / share manual — tidak perlu link khusus per siswa).
5. **Rekap Nilai** — lihat, cari nama, filter kelas/ujian, dan **Export Excel** kapan saja.

## 5. Alur Siswa

1. Buka alamat web (tanpa perlu login).
2. Isi Nama, Kelas, dan Kode Ujian dari guru → klik **Mulai Ujian**.
3. Kerjakan soal: klik nomor untuk lompat ke soal tertentu (kotak hijau = sudah dijawab), timer di kanan atas otomatis mundur, jawaban otomatis tersimpan setiap kali memilih (autosave ke database + localStorage untuk jaga-jaga koneksi putus).
4. Jika waktu habis, ujian **otomatis submit**. Jika selesai lebih awal, klik **Selesai & Submit**.
5. Nilai (jumlah benar, salah, nilai akhir) langsung tampil di layar.

---

## 6. Deploy ke Vercel (disarankan, gratis)

```bash
npm install -g vercel
cd cbt-app
vercel
```

Saat proses `vercel`, tambahkan Environment Variables:
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`

Atau lewat dashboard Vercel: **Project → Settings → Environment Variables**, lalu redeploy.

**Alternatif Netlify:**
1. Push folder `cbt-app` ke GitHub.
2. Di Netlify, **Add new site → Import from Git**.
3. Build command: `npm run build`, Publish directory: `dist`.
4. Tambahkan environment variables yang sama seperti di atas.

Karena ini Single Page App dengan routing (`react-router-dom`), tambahkan rule redirect supaya refresh di URL seperti `/ujian/xxxx` tidak 404:

- **Vercel**: otomatis ditangani (framework preset Vite terdeteksi otomatis).
- **Netlify**: buat file `public/_redirects` berisi:
  ```
  /*  /index.html  200
  ```

---

## 7. Catatan & Batasan (sesuai kebutuhan "sederhana")

- Tidak ada sistem multi-guru/sekolah — semua data terikat ke 1 akun guru lewat `auth.uid()`.
- Siswa tidak login/akun permanen; setiap kali mulai ujian, baris baru dibuat di tabel `students`. Ini cukup untuk kebutuhan ulangan harian dan tetap tercatat rapi di rekap nilai berdasarkan nama+kelas.
- Soal snapshot disimpan di tabel `attempts` saat siswa mulai ujian — supaya kalau guru mengedit bank soal saat ujian sedang berlangsung, siswa yang sudah mulai tidak terganggu.
- Kolom pilihan **E** boleh dikosongkan (soal 4 pilihan A–D tetap didukung).
- Untuk mencegah siswa membuka banyak tab dan mengulang ujian: sistem tidak mengunci berdasarkan nama (karena tanpa akun), jadi kontrol kedisiplinan tetap perlu diawasi guru secara langsung — sesuai kebutuhan "sederhana" dan skala kelas kecil.
- Biaya: Supabase free tier (500MB database, 1GB storage) dan Vercel free tier lebih dari cukup untuk 2–3 kelas.

---

## 8. Troubleshooting Singkat

| Masalah | Penyebab Umum | Solusi |
|---|---|---|
| Login guru gagal | Akun belum dibuat di Supabase Auth | Buat lewat Authentication → Users |
| "Kode ujian tidak ditemukan" | Ujian belum diaktifkan / salah ketik kode | Cek tombol Aktifkan di Buat Ujian |
| Gambar soal tidak muncul | Bucket storage belum public | Pastikan bagian storage di `schema.sql` sudah dijalankan |
| Import Excel gagal | Header kolom tidak persis "Soal, A, B, C, D, E, Kunci" | Pakai tombol Unduh Template sebagai acuan |
| Refresh halaman ujian 404 di Netlify | Belum ada `_redirects` | Tambahkan file `public/_redirects` seperti di atas |
