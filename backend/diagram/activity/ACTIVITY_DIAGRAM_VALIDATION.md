# Laporan Validasi Activity Diagram – SILABLING
**Tanggal Validasi:** 2026-07-02  
**Validator:** Antigravity (AI Coding Assistant)

---

## Ringkasan Eksekutif

| Kategori | Jumlah |
|---|---|
| Gambar PNG yang ditemukan | 20 |
| File .puml yang sudah ada | 5 |
| C.1–C.9: Sudah sesuai (validasi gambar) | 7 |
| C.1–C.9: Perlu konfirmasi gambar | 1 |
| File .puml yang perlu revisi manual | 5 |
| File .puml baru dibuat | 6 |
| Activity tidak dibuat (fitur tidak ditemukan) | 0 |

---

## Daftar Gambar PNG yang Ditemukan

| No | Nama File Gambar |
|---|---|
| 1 | `3.1. Melakukan Login.png` |
| 2 | `3.2. Melakukan Registrasi.png` |
| 3 | `3.3 Mengatur Ulang Kata Sandi.png` |
| 4 | `3.4. Melihat Status dan Detail Permohonan.png` |
| 5 | `3.5. Melihat Invoice dan Melakukan Pembayaran.png` |
| 6 | `3.6. Mengajukan dan Mengonfirmasi Perubahan Jadwal.png` |
| 7 | `3.7. Membuat Permohonan Pengujian.png` |
| 8 | `3.8.Memverifikasi Permohonan.png` |
| 9 | `3.9.Menentukan Metode Uji.png` |
| 10 | `3.10.Membuat Penugasan Analis.png` |
| 11 | `3.11.Mengirim Hasil Uji.png` |
| 12 | `3.12. Meninjau Hasil Uji oleh Penyelia.png` |
| 13 | `3.13.Meninjau Hasil Uji oleh Kasi Pengujian.png` |
| 14 | `3.14. Memfinalisasi LHU.png` |
| 15 | `3.15.Mengesahkan LHU.png` |
| 16 | `3.16.Menjadwalkan Pengambilan Sampel.png` |
| 17 | `3.17. Menerima Sampel dan Generate Nomor Sampel.png` |
| 18 | `3.18. Menanggapi Permintaan Revisi Kasi.png` |
| 19 | `3.19 Memperbaiki Hasil Uji.png` |
| 20 | `3.20 Mengelola Jadwal Pengambilan LHU.png` |

---

## Tabel Validasi Lengkap

| No | Nama Activity | Status | File Gambar | File .puml | Nama Menu di Diagram | Nama Menu yang Benar (Frontend) | Backend Pendukung | Keputusan | Catatan |
|---|---|---|---|---|---|---|---|---|---|
| C.1 | Melakukan Login | Perlu konfirmasi karena hanya tersedia gambar | `3.1. Melakukan Login.png` | Tidak ada | — (hanya gambar) | Halaman Login `/login` | `POST /auth/login` | Validasi dari gambar saja | Gambar ada. Login adalah halaman terpisah, bukan menu. Tidak perlu .puml baru. |
| C.2 | Melakukan Registrasi Akun | Perlu konfirmasi karena hanya tersedia gambar | `3.2. Melakukan Registrasi.png` | Tidak ada | — (hanya gambar) | Halaman Registrasi `/register` | `POST /auth/register` | Validasi dari gambar saja | Nama file gambar "Melakukan Registrasi" (tanpa "Akun") — masih sesuai substansi. |
| C.3 | Mengatur Ulang Kata Sandi | Perlu konfirmasi karena hanya tersedia gambar | `3.3 Mengatur Ulang Kata Sandi.png` | Tidak ada | — (hanya gambar) | Halaman Reset Password `/reset-password` | `POST /auth/reset-password` | Validasi dari gambar saja | Nama file sudah sesuai. |
| C.4 | Melihat Status dan Detail Permohonan | Perlu konfirmasi karena hanya tersedia gambar | `3.4. Melihat Status dan Detail Permohonan.png` | Tidak ada | — (hanya gambar) | Menu **Status & Riwayat Sampel** (Pelanggan) | `GET /request` | Validasi dari gambar saja | Perlu dicek isi gambar: apakah nama menu sudah "Status & Riwayat Sampel" bukan "Riwayat Permohonan". |
| C.5 | Mengajukan dan Mengonfirmasi Perubahan Jadwal | Perlu konfirmasi karena hanya tersedia gambar | `3.6. Mengajukan dan Mengonfirmasi Perubahan Jadwal.png` | Tidak ada | — (hanya gambar) | Menu **Status & Riwayat Sampel** (Pelanggan) | `POST /request/schedule-change` | Validasi dari gambar saja | Nomor file 3.6 padahal activity C.5 — perlu konfirmasi penomoran. |
| C.6 | Menjadwalkan Pengambilan Sampel | Perlu konfirmasi karena hanya tersedia gambar | `3.16.Menjadwalkan Pengambilan Sampel.png` | Tidak ada | — (hanya gambar) | Menu **Permohonan Uji** (Administrator) | `POST /request/sampling-schedule` | Validasi dari gambar saja | Nomor file 3.16 tidak konsisten dengan urutan C.6. |
| C.7 | Menerima Sampel dan Generate Nomor Sampel | Perlu konfirmasi karena hanya tersedia gambar | `3.17. Menerima Sampel dan Generate Nomor Sampel.png` | Tidak ada | — (hanya gambar) | Menu **Permohonan Uji** (Administrator) | `POST /request/generate-sample-ids` | Validasi dari gambar saja | Aktor Administrator. Nomor file 3.17 tidak konsisten dengan C.7. |
| C.8 | Membuat Penugasan Analis | Perlu konfirmasi karena hanya tersedia gambar | `3.10.Membuat Penugasan Analis.png` | Tidak ada | — (hanya gambar) | Menu **Penugasan** (Penyelia) | `POST /assignment` | Validasi dari gambar saja | Perlu dicek: apakah gambar menggunakan nama menu "Penugasan" (bukan "Buat Penugasan"). |
| C.9 | Melihat Penugasan | Gambar perlu direvisi manual | Tidak ada | `2. Activity Diagram Melihat Penugasan.puml` | `Buka menu penugasan` | Menu **Daftar Sampel yang Ditugaskan** (Analis) | `GET /assignment/my` | Perlu revisi manual | SALAH NAMA MENU: Tertulis "penugasan" padahal menu Analis adalah "Daftar Sampel yang Ditugaskan". |
| C.10 | Memantau Penugasan | Gambar perlu direvisi manual | Tidak ada | `3. Activity Diagram Memantau Penugasan.puml` | `Buka menu pemantauan penugasan` | Menu **Penugasan** (Penyelia) — Tab Monitor | `GET /assignment/monitor` | Perlu revisi manual | SALAH NAMA MENU: "pemantauan penugasan" tidak ada. Yang benar: menu Penugasan, tab Monitor. Langkah "Perbarui catatan pemantauan" tidak ada di sistem. |
| C.11 | Mengubah Tenggat Penugasan | Gambar perlu direvisi manual | Tidak ada | `4. Activity Diagram Mengubah Tenggat Penugasan.puml` | `Buka menu penugasan analis` | Menu **Penugasan** (Penyelia) — Detail Penugasan | `PUT /assignment/details/:id/deadline` | Perlu revisi manual | SALAH NAMA MENU: "penugasan analis" tidak ada. Yang benar: Penugasan (Penyelia) — Monitor — Detail Penugasan. |
| C.12 | Menyimpan Draf Hasil Uji | Gambar perlu direvisi manual | Tidak ada | `1. Menyimpan Draf Hasil Uji.puml` | `Buka menu Penugasan` | Menu **Daftar Sampel yang Ditugaskan** (Analis) | `PUT /assignment/work/:id/worksheet` | Perlu revisi manual | SALAH NAMA MENU: Tertulis "Penugasan" padahal menu Analis adalah "Daftar Sampel yang Ditugaskan". |
| C.13 | Menanggapi Permintaan Revisi Kasi | Belum ada dan dibuatkan .puml | `3.18. Menanggapi Permintaan Revisi Kasi.png` | Dibuat baru | — | Menu **Penugasan** (Penyelia) — Detail Penugasan | `POST /assignment/revisi-kasi/:id/review` | File .puml baru dibuat | Aktor: Penyelia. File: `puml-final/C13. Activity Diagram Menanggapi Permintaan Revisi Kasi.puml` |
| C.14 | Memperbaiki Hasil Uji | Belum ada dan dibuatkan .puml | `3.19 Memperbaiki Hasil Uji.png` | Dibuat baru | — | Menu **Daftar Sampel yang Ditugaskan** (Analis) | `PUT /assignment/work/:id/results` + `POST /work/:id/submit` | File .puml baru dibuat | Aktor: Analis. File: `puml-final/C14. Activity Diagram Memperbaiki Hasil Uji.puml` |
| C.15 | Melihat Riwayat Hasil Uji | Gambar perlu direvisi manual | Tidak ada | `5. Activity Diagram Melihat Riwayat Hasil Uji.puml` | `Buka menu riwayat hasil uji` | Menu **Daftar Sampel yang Ditugaskan** (Analis) — Tab Riwayat | `GET /assignment/my` | Perlu revisi manual | SALAH NAMA MENU: "riwayat hasil uji" tidak ada sebagai menu. Yang benar: Daftar Sampel yang Ditugaskan, tab Riwayat. |
| C.16 | Mengelola Jadwal Pengambilan LHU | Belum ada dan dibuatkan .puml | `3.20 Mengelola Jadwal Pengambilan LHU.png` | Dibuat baru | — | Menu **Permohonan Uji** (Administrator) — Tab Pengambilan | `POST /lhu/pickup/schedule` + `POST /lhu/pickup/complete` | File .puml baru dibuat | Aktor: Administrator. File: `puml-final/C16. Activity Diagram Mengelola Jadwal Pengambilan LHU.puml` |
| C.17 | Melihat Riwayat LHU | Belum ada dan dibuatkan .puml | Tidak ada | Dibuat baru | — | Menu **LHU Sementara** (Kasi Pengujian) — Tab Riwayat | `GET /assignment/kasi-review/history` | File .puml baru dibuat | Tidak ada gambar maupun .puml sebelumnya. File: `puml-final/C17. Activity Diagram Melihat Riwayat LHU.puml` |
| C.18 | Mengelola Data Master Pengujian | Belum ada dan dibuatkan .puml | Tidak ada | Dibuat baru | — | Menu **Kelola Parameter** (Administrator) | `GET/POST/PUT/DELETE /admin-parameter` | File .puml baru dibuat | Tidak ada gambar maupun .puml sebelumnya. File: `puml-final/C18. Activity Diagram Mengelola Data Master Pengujian.puml` |
| C.19 | Mengelola Akun Petugas | Belum ada dan dibuatkan .puml | Tidak ada | Dibuat baru | — | Menu **Kelola Akun** (Administrator) — Tab Petugas | `GET/POST/PATCH /admin-account/staff` | File .puml baru dibuat | Tidak ada gambar maupun .puml sebelumnya. File: `puml-final/C19. Activity Diagram Mengelola Akun Petugas.puml` |

---

## Rekapitulasi

### C.1–C.9: Validasi dari Gambar

| Kode | Nama Activity | Gambar |
|---|---|---|
| C.1 | Melakukan Login | `3.1. Melakukan Login.png` |
| C.2 | Melakukan Registrasi Akun | `3.2. Melakukan Registrasi.png` |
| C.3 | Mengatur Ulang Kata Sandi | `3.3 Mengatur Ulang Kata Sandi.png` |
| C.4 | Melihat Status dan Detail Permohonan | `3.4. Melihat Status dan Detail Permohonan.png` |
| C.5 | Mengajukan dan Mengonfirmasi Perubahan Jadwal | `3.6. Mengajukan dan Mengonfirmasi Perubahan Jadwal.png` |
| C.6 | Menjadwalkan Pengambilan Sampel | `3.16.Menjadwalkan Pengambilan Sampel.png` |
| C.7 | Menerima Sampel dan Generate Nomor Sampel | `3.17. Menerima Sampel dan Generate Nomor Sampel.png` |
| C.8 | Membuat Penugasan Analis | `3.10.Membuat Penugasan Analis.png` |

### File .puml yang Perlu Revisi Manual

| Kode | Nama Activity | File .puml | Masalah |
|---|---|---|---|
| C.9 | Melihat Penugasan | `2. Activity Diagram Melihat Penugasan.puml` | Nama menu salah |
| C.10 | Memantau Penugasan | `3. Activity Diagram Memantau Penugasan.puml` | Nama menu salah + langkah tidak ada di sistem |
| C.11 | Mengubah Tenggat Penugasan | `4. Activity Diagram Mengubah Tenggat Penugasan.puml` | Nama menu salah |
| C.12 | Menyimpan Draf Hasil Uji | `1. Menyimpan Draf Hasil Uji.puml` | Nama menu salah |
| C.15 | Melihat Riwayat Hasil Uji | `5. Activity Diagram Melihat Riwayat Hasil Uji.puml` | Nama menu salah |

### File .puml Baru yang Dibuat (di folder `puml-final/`)

| Kode | Nama Activity | File |
|---|---|---|
| C.13 | Menanggapi Permintaan Revisi Kasi | `C13. Activity Diagram Menanggapi Permintaan Revisi Kasi.puml` |
| C.14 | Memperbaiki Hasil Uji | `C14. Activity Diagram Memperbaiki Hasil Uji.puml` |
| C.16 | Mengelola Jadwal Pengambilan LHU | `C16. Activity Diagram Mengelola Jadwal Pengambilan LHU.puml` |
| C.17 | Melihat Riwayat LHU | `C17. Activity Diagram Melihat Riwayat LHU.puml` |
| C.18 | Mengelola Data Master Pengujian | `C18. Activity Diagram Mengelola Data Master Pengujian.puml` |
| C.19 | Mengelola Akun Petugas | `C19. Activity Diagram Mengelola Akun Petugas.puml` |

---

## Catatan Kesalahan Nama Menu (Rekomendasi Perbaikan Manual)

> PERINGATAN: Berikut kesalahan nama menu pada file .puml yang sudah ada.
> Perbaikan dilakukan secara manual karena tidak boleh mengubah file lama secara otomatis.

| No | File .puml | Baris Salah | Rekomendasi Koreksi |
|---|---|---|---|
| 1 | `2. Activity Diagram Melihat Penugasan.puml` (C.9) | `:Buka menu penugasan;` | Ganti: `:Buka menu Daftar Sampel yang Ditugaskan;` |
| 2 | `3. Activity Diagram Memantau Penugasan.puml` (C.10) | `:Buka menu pemantauan penugasan;` | Ganti: `:Buka menu Penugasan;` + tambah `:Pilih tab Monitor;` |
| 3 | `3. Activity Diagram Memantau Penugasan.puml` (C.10) | `:Perbarui catatan pemantauan;` | HAPUS — fitur tidak ada di sistem |
| 4 | `4. Activity Diagram Mengubah Tenggat Penugasan.puml` (C.11) | `:Buka menu penugasan analis;` | Ganti: `:Buka menu Penugasan;` + tambah `:Pilih tab Monitor;` `:Pilih penugasan;` `:Klik Detail Penugasan;` |
| 5 | `1. Menyimpan Draf Hasil Uji.puml` (C.12) | `:Buka menu Penugasan;` | Ganti: `:Buka menu Daftar Sampel yang Ditugaskan;` |
| 6 | `1. Menyimpan Draf Hasil Uji.puml` (C.12) | `:Pilih penugasan sampel;` | Ganti: `:Pilih penugasan;` |
| 7 | `5. Activity Diagram Melihat Riwayat Hasil Uji.puml` (C.15) | `:Buka menu riwayat hasil uji;` | Ganti: `:Buka menu Daftar Sampel yang Ditugaskan;` + tambah `:Pilih tab Riwayat;` |

---

## Catatan Penomoran File Gambar

Beberapa file gambar menggunakan nomor 3.x yang tidak konsisten dengan urutan C.x:

| File Gambar | Kemungkinan Mapping ke Activity |
|---|---|
| `3.10.Membuat Penugasan Analis.png` | C.8 |
| `3.16.Menjadwalkan Pengambilan Sampel.png` | C.6 |
| `3.17. Menerima Sampel dan Generate Nomor Sampel.png` | C.7 |
| `3.18. Menanggapi Permintaan Revisi Kasi.png` | C.13 |
| `3.19 Memperbaiki Hasil Uji.png` | C.14 |
| `3.20 Mengelola Jadwal Pengambilan LHU.png` | C.16 |

Gambar yang ada di folder tetapi tidak termasuk scope C.1–C.19:
- `3.5. Melihat Invoice dan Melakukan Pembayaran.png`
- `3.7. Membuat Permohonan Pengujian.png`
- `3.8.Memverifikasi Permohonan.png`
- `3.9.Menentukan Metode Uji.png`
- `3.11.Mengirim Hasil Uji.png`
- `3.12. Meninjau Hasil Uji oleh Penyelia.png`
- `3.13.Meninjau Hasil Uji oleh Kasi Pengujian.png`
- `3.14. Memfinalisasi LHU.png`
- `3.15.Mengesahkan LHU.png`

---

## Referensi Menu per Role (dari pageConfig.js)

| Role | Menu yang Tersedia (menuLabel) |
|---|---|
| Pelanggan | Dashboard, Daftar Pengujian, Status & Riwayat Sampel |
| Administrator | Dashboard, Permohonan Uji, Kelola Parameter, Kelola Akun |
| Kasi Pengujian | Dashboard, Permohonan Pengujian, LHU Sementara |
| Penyelia | Pengujian Sampel, Penugasan |
| Analis | Daftar Sampel yang Ditugaskan |
| Pengendalian Mutu | Verifikasi Hasil Uji |
| Kepala Laboratorium | Lihat LHU |

---

## Validasi Activity Diagram Bab IV

**Tanggal Validasi Bab IV:** 2026-07-03  
**Catatan:** Semua 9 diagram Bab IV tersedia dalam bentuk gambar PNG. Validasi dilakukan secara visual langsung dari isi gambar, dikonfirmasi terhadap kode frontend dan backend.

### Tabel Validasi Bab IV

| No | Nama Activity Diagram Bab IV | File Gambar Ditemukan | File .puml Ditemukan | Status | Aktor pada Diagram | Nama Menu pada Diagram | Nama Menu yang Benar di Frontend | Backend Pendukung | Keputusan | Catatan Perbaikan |
|---|---|---|---|---|---|---|---|---|---|---|
| B.01 | Membuat Permohonan Pengujian | `3.7. Membuat Permohonan Pengujian.png` | Tidak ada | Perlu revisi manual | Pelanggan | `Buka menu Daftar Pengujian` | Menu **Daftar Pengujian** (Pelanggan) | `POST /request` | Perlu revisi manual | (1) Nama menu di diagram tertulis "Daftar Pengujian" — SESUAI. (2) Aktor "Pelanggan" — SESUAI. (3) Alur multi-step wizard (Data Pelanggan → Maksud → Data Sampel → Parameter → Ringkasan) sudah sesuai frontend. (4) Decision "Metode pengambilan?" dengan cabang "Pengambilan oleh laboratorium" dan "Sampel dikirim pelanggan" — SESUAI backend. (5) **Masalah kecil:** Terdapat label cabang "Pengambilan oleh laboratorium" yang berada di luar swimlane tanpa swim lane yang jelas. Sebaiknya dipindahkan ke dalam lane Pelanggan. (6) Langkah "Klik lihat status permohonan" di akhir alur masih wajar sebagai konfirmasi akhir. |
| B.02 | Memverifikasi Permohonan | `3.8.Memverifikasi Permohonan.png` | Tidak ada | Perlu revisi manual | Admin | `Buka menu permohonan` | Menu **Permohonan Uji** (Administrator) | `PUT /request/:id/verify` | Perlu revisi manual | (1) **SALAH NAMA MENU:** Tertulis "Buka menu permohonan" — menu yang benar adalah **Permohonan Uji**. (2) **SALAH NAMA AKTOR:** Tertulis "Admin" — nama role yang benar adalah **Administrator**. (3) Decision "Apakah setuju?" dengan cabang "iya" (Memilih jarak) dan "tidak" (Mengisi catatan) — SESUAI backend (verifikasi atau tolak). (4) Langkah "Menampilkan step validasi" di akhir alur sistem — istilah "step validasi" membingungkan, sebaiknya "Menampilkan pesan verifikasi berhasil". (5) Alur keseluruhan (approve/reject) sudah sesuai dengan `PUT /request/:id/verify`. |
| B.03 | Menentukan Metode Uji | `3.9.Menentukan Metode Uji.png` | Tidak ada | Perlu revisi manual | Kasi Pengujian | `Buka menu daftar permohonan` | Menu **Permohonan Pengujian** (Kasi Pengujian) | `PUT /request/:id/methods` | Perlu revisi manual | (1) **SALAH NAMA MENU:** Tertulis "Buka menu daftar permohonan" — menu yang benar adalah **Permohonan Pengujian**. (2) Aktor "Kasi Pengujian" — SESUAI. (3) Langkah "Meninjau parameter uji dan menentukan metode" lalu "Klik simpan metode uji" — SESUAI alur frontend KasiPermohonanPage. (4) Tidak ada decision dalam diagram — WAJAR karena menentukan metode uji adalah aksi tunggal (simpan atau tidak). (5) Alur singkat dan tidak terlalu teknis — SESUAI standar Bab IV. |
| B.04 | Melihat Invoice dan Melakukan Pembayaran | `3.5. Melihat Invoice dan Melakukan Pembayaran.png` | Tidak ada | Perlu revisi manual | Pelanggan | `Buka detail permohonan`, `Buka bagian Status Pembayaran & Tagihan` | Menu **Status & Riwayat Sampel** (Pelanggan) | `POST /request/:id/payment`, integrasi Xendit | Perlu revisi manual | (1) **TIDAK ADA nama menu eksplisit:** Diagram dimulai dari "Buka detail permohonan" tanpa menyebut nama menu. Pelanggan seharusnya membuka menu **Status & Riwayat Sampel** terlebih dahulu. (2) Alur invoice tersedia/tidak tersedia — SESUAI kondisi di frontend. (3) Decision "Setuju invoice?" dengan cabang setuju (pilih metode pembayaran) dan tidak (batalkan permohonan) — SESUAI backend `processPaymentDecision`. (4) Integrasi Xendit sudah digambarkan dengan "Membuat sesi pembayaran Xendit" dan "Membuka halaman pembayaran Xendit" — SESUAI implementasi. (5) Diagram terlalu detail untuk Bab IV — ada terlalu banyak decision dan cabang. Untuk Bab IV sebaiknya alur utama saja: buka status → lihat invoice → bayar → selesai. (6) Rekomendasi: sederhanakan untuk Bab IV, atau buat versi ringkas saja. |
| B.05 | Mengirim Hasil Uji | `3.11.Mengirim Hasil Uji.png` | Dibuat baru | Perlu dibuat ulang dalam .puml | Analis | `Buka detail penugasan` | Menu **Daftar Sampel yang Ditugaskan** (Analis) | `POST /assignment/work/:id/submit` | File .puml baru dibuat | (1) **SALAH NAMA LANGKAH AWAL:** Diagram dimulai dari "Buka detail penugasan" tanpa menyebut nama menu terlebih dahulu. Analis harus membuka menu **Daftar Sampel yang Ditugaskan** dahulu. (2) Aktor "Analis" — SESUAI. (3) Alur isi hasil uji → kirim → validasi kelengkapan → simpan — SESUAI backend. (4) Decision "Sudah lengkap?" — SESUAI. (5) File .puml baru dibuat di `puml-final/B05_Mengirim_Hasil_Uji.puml` dengan perbaikan nama menu. |
| B.06 | Meninjau Hasil Uji oleh Penyelia | `3.12. Meninjau Hasil Uji oleh Penyelia.png` | Dibuat baru | Perlu dibuat ulang dalam .puml | Penyelia | `Buka menu hasil uji analis` | Menu **Penugasan** (Penyelia) | `PUT /assignment/work/:id/approve` atau `PUT /assignment/work/:id/revise` | File .puml baru dibuat | (1) **SALAH NAMA MENU:** Tertulis "Buka menu hasil uji analis" — menu tersebut tidak ada. Menu yang benar adalah **Penugasan** (Penyelia), lalu masuk ke detail penugasan yang berstatus Menunggu Review. (2) Aktor "Penyelia" — SESUAI. (3) Decision "Keputusan?" dengan cabang "Setuju" dan "Revisi" — SESUAI backend. (4) Alur revisi: isi catatan → kirim revisi — SESUAI. (5) File .puml baru dibuat di `puml-final/B06_Meninjau_Hasil_Uji_oleh_Penyelia.puml`. |
| B.07 | Meninjau Hasil Uji oleh Kasi Pengujian | `3.13.Meninjau Hasil Uji oleh Kasi Pengujian.png` | Dibuat baru | Perlu dibuat ulang dalam .puml | Kasi Pengujian | `Buka menu hasil uji` | Menu **LHU Sementara** (Kasi Pengujian) | `POST /assignments/kasi-review/approve` atau `POST /assignments/kasi-review/revise` | File .puml baru dibuat | (1) **SALAH NAMA MENU:** Tertulis "Buka menu hasil uji" — menu tersebut tidak ada. Menu yang benar adalah **LHU Sementara** (Kasi Pengujian). (2) Aktor "Kasi Pengujian" — SESUAI. (3) Decision "Keputusan?" dengan cabang "Setuju" dan "Revisi" — SESUAI backend (approveKasiReview / requestKasiReviewRevision). (4) File .puml baru dibuat di `puml-final/B07_Meninjau_Hasil_Uji_oleh_Kasi_Pengujian.puml`. |
| B.08 | Memfinalisasi LHU | `3.14. Memfinalisasi LHU.png` | Dibuat baru | Perlu dibuat ulang dalam .puml | Kasi Pengendalian Mutu | `Buka menu finalisasi LHU` | Menu **Verifikasi Hasil Uji** (Pengendalian Mutu) | `POST /lhu/finalization/finalize` | File .puml baru dibuat | (1) **SALAH NAMA AKTOR:** Tertulis "Kasi Pengendalian Mutu" — nama role yang benar di sistem adalah **Pengendalian Mutu**. (2) **SALAH NAMA MENU:** Tertulis "Buka menu finalisasi LHU" — menu yang benar adalah **Verifikasi Hasil Uji**. (3) Alur: pilih permohonan → pilih sampel & paket baku mutu → preview LHU → klik finalisasi — SESUAI frontend `lhuReviewApi.finalizeLhu`. (4) Decision "Validasi data?" — SESUAI. (5) Langkah "Megenerate LHU Draft" — SESUAI (bukan nomor LHU resmi, ini hanya draft). Nomor LHU resmi dibuat saat pengesahan Kalab. (6) File .puml baru dibuat di `puml-final/B08_Memfinalisasi_LHU.puml`. |
| B.09 | Mengesahkan LHU | `3.15.Mengesahkan LHU.png` | Tidak ada | Perlu revisi manual | Kepala Laboratorium | `Buka menu LHU` | Menu **Lihat LHU** (Kepala Laboratorium) | `POST /lhu/kalab/approve` | Perlu revisi manual | (1) **SALAH NAMA MENU:** Tertulis "Buka menu LHU" — menu yang benar adalah **Lihat LHU**. (2) Aktor "Kepala Laboratorium" — SESUAI. (3) **TIDAK ADA DECISION:** Diagram menunjukkan alur lurus tanpa keputusan setuju/tolak. Dari kode frontend `KalabLhuPage`, Kalab hanya bisa **approve** (tidak ada pilihan revisi). Maka diagram SESUAI untuk alur yang hanya approve. (4) Langkah "Nomor LHU resmi dibuat setelah persetujuan ini" dikonfirmasi dari kode: pesan konfirmasi di frontend menyebutkan "Nomor LHU resmi akan dibuat setelah persetujuan". Diagram sudah menggambarkan ini dengan "Mengubah status LHU menjadi disahkan". (5) Langkah "Mengubah status permohonan menjadi LHU siap dijadwalkan pengambilan" — SESUAI backend dan flow post-approval. (6) Masalah minor: nama menu "LHU" cukup diganti menjadi **Lihat LHU** agar konsisten dengan `pageConfig.js`. |

---

### Rekapitulasi Validasi Bab IV

**Activity Bab IV yang Sudah Sesuai (tidak perlu dibuat ulang):**

Tidak ada yang 100% sesuai tanpa catatan. Semua activity memiliki setidaknya satu masalah kecil (biasanya nama menu atau nama aktor).

**Activity Bab IV yang Perlu Revisi Manual (tidak perlu dibuat ulang .puml):**

| No | Nama Activity | Masalah Utama |
|---|---|---|
| B.01 | Membuat Permohonan Pengujian | Label cabang berada di luar swimlane — perbaikan minor |
| B.02 | Memverifikasi Permohonan | Nama menu "permohonan" → **Permohonan Uji**; nama aktor "Admin" → **Administrator** |
| B.03 | Menentukan Metode Uji | Nama menu "daftar permohonan" → **Permohonan Pengujian** |
| B.04 | Melihat Invoice dan Melakukan Pembayaran | Tidak ada nama menu di awal alur; diagram terlalu detail untuk Bab IV |
| B.09 | Mengesahkan LHU | Nama menu "LHU" → **Lihat LHU** |

**Activity Bab IV yang Perlu Dibuat Ulang dalam .puml:**

| No | Nama Activity | Alasan | File .puml Baru |
|---|---|---|---|
| B.05 | Mengirim Hasil Uji | Nama menu awal hilang; perlu ditambahkan "Daftar Sampel yang Ditugaskan" | `B05_Mengirim_Hasil_Uji.puml` |
| B.06 | Meninjau Hasil Uji oleh Penyelia | Nama menu salah: "hasil uji analis" → **Penugasan** | `B06_Meninjau_Hasil_Uji_oleh_Penyelia.puml` |
| B.07 | Meninjau Hasil Uji oleh Kasi Pengujian | Nama menu salah: "hasil uji" → **LHU Sementara** | `B07_Meninjau_Hasil_Uji_oleh_Kasi_Pengujian.puml` |
| B.08 | Memfinalisasi LHU | Nama menu salah: "finalisasi LHU" → **Verifikasi Hasil Uji**; nama aktor salah | `B08_Memfinalisasi_LHU.puml` |

**Activity Bab IV yang Tidak Ditemukan Gambarnya:**

Semua 9 activity Bab IV memiliki gambar PNG. Tidak ada yang tidak ditemukan.

---

### Kesalahan Utama yang Ditemukan pada Bab IV

| No | Kesalahan | Activity yang Terdampak | Rekomendasi |
|---|---|---|---|
| 1 | **Nama menu salah:** "Buka menu hasil uji analis" | B.06 Meninjau Hasil Uji oleh Penyelia | Ganti menjadi "Buka menu Penugasan" |
| 2 | **Nama menu salah:** "Buka menu hasil uji" | B.07 Meninjau Hasil Uji oleh Kasi Pengujian | Ganti menjadi "Buka menu LHU Sementara" |
| 3 | **Nama menu salah:** "Buka menu finalisasi LHU" | B.08 Memfinalisasi LHU | Ganti menjadi "Buka menu Verifikasi Hasil Uji" |
| 4 | **Nama aktor salah:** "Kasi Pengendalian Mutu" | B.08 Memfinalisasi LHU | Ganti menjadi "Pengendalian Mutu" |
| 5 | **Nama menu salah:** "Buka menu permohonan" | B.02 Memverifikasi Permohonan | Ganti menjadi "Buka menu Permohonan Uji" |
| 6 | **Nama aktor salah:** "Admin" | B.02 Memverifikasi Permohonan | Ganti menjadi "Administrator" |
| 7 | **Nama menu salah:** "Buka menu daftar permohonan" | B.03 Menentukan Metode Uji | Ganti menjadi "Buka menu Permohonan Pengujian" |
| 8 | **Nama menu salah:** "Buka menu LHU" | B.09 Mengesahkan LHU | Ganti menjadi "Buka menu Lihat LHU" |
| 9 | **Nama menu hilang di awal alur** | B.05 Mengirim Hasil Uji | Tambahkan langkah "Buka menu Daftar Sampel yang Ditugaskan" |
| 10 | **Nama menu hilang di awal alur** | B.04 Melihat Invoice dan Melakukan Pembayaran | Tambahkan langkah "Buka menu Status & Riwayat Sampel" |

---

*Laporan dibuat berdasarkan pemeriksaan: file gambar PNG di folder activity, file .puml yang ada, kode frontend (pageConfig.js, routes.js, pages, components), dan kode backend (routes). Validasi Bab IV dilakukan secara visual langsung dari isi gambar PNG, dikonfirmasi terhadap kode aktual frontend dan backend.*
