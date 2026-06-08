# ANALISIS FUNGSIONALITAS SISTEM SILABLING

## 📊 RINGKASAN EKSEKUTIF

**Total Fungsionalitas: 87 fitur** (BUKAN 42!)

Ini adalah hasil analisis kode backend yang menunjukkan **jauh lebih banyak fitur** daripada yang dinyatakan dalam list awal. Banyak fitur CRUD, manajemen detail, dan fitur sistem yang terlewat.

---

## 🔐 1. USER (General) - 5 Fitur

| No | Fitur | Endpoint | HTTP Method | Deskripsi |
|---|---|---|---|---|
| 1 | Login | `/auth/login` | POST | Autentikasi user |
| 2 | Register Account | `/auth/register` | POST | Registrasi pelanggan baru |
| 3 | Refresh Token | `/auth/refresh` | POST | Refresh session token |
| 4 | Logout | `/auth/logout` | POST | Logout user |
| 5 | Get My Profile | `/auth/me` | GET | Melihat profil user yang login |
| 6 | Forgot Password | `/auth/forgot-password` | POST | Permintaan reset password |
| 7 | Reset Password | `/auth/reset-password` | POST | Reset password dengan token |

**Total: 7 fitur**

---

## 👥 2. PELANGGAN (Customer) - 12 Fitur

| No | Fitur | Endpoint | HTTP Method | Notes |
|---|---|---|---|---|
| 1 | Registrasi Akun | `/auth/register` | POST | ✓ Sudah terdokumentasi |
| 2 | Membuat Permohonan Pengujian | `/requests` | POST | ✓ Sudah terdokumentasi |
| 3 | Melihat Daftar Permohonan | `/requests` | GET | Lihat semua request milik customer |
| 4 | Melihat Detail Permohonan | `/requests/:id` | GET | ✓ Sudah terdokumentasi |
| 5 | Update Permohonan | `/requests/:id` | PUT | Fitur baru: Edit request sebelum verifikasi |
| 6 | Melihat Riwayat Permohonan | `/requests/:id/activity-logs` | GET | ✓ Sudah terdokumentasi |
| 7 | Melihat Invoice | `/requests/:id/invoice/pdf` | GET | ✓ Sudah terdokumentasi |
| 8 | Melakukan Pembayaran | `/requests/:id/payment` | POST | ✓ Sudah terdokumentasi |
| 9 | Mengajukan Perubahan Jadwal | `/requests/schedule-changes` | POST | ✓ Sudah terdokumentasi |
| 10 | Menanggapi Perubahan Jadwal | `/requests/schedule-changes/:idPengajuan/cancel` | POST | Bisa batal/tolak perubahan |
| 11 | Konfirmasi Jadwal Pickup | `/requests/:id/schedule-confirmation` | POST | Fitur baru: Confirm schedule change approval |
| 12 | Melihat Dashboard | `/requests` | GET | Lihat overview request |
| 13 | Melihat Jadwal Pengambilan LHU | `/requests/:id/sampling-schedule` | GET | Implied from sampling-schedule endpoint |
| 14 | Melihat Profil Perusahaan Saya | `/me/customers` | GET | Fitur baru: Get my customer/company profiles |

**Total: 14 fitur** (2 fitur tambahan dari yang dideklarasikan)

---

## 🛡️ 3. ADMIN - 20+ Fitur

### A. Account Management (9 fitur)

| No | Fitur | Endpoint | HTTP Method |
|---|---|---|---|
| 1 | Melihat Daftar Role | `/admin/accounts/roles` | GET |
| 2 | Melihat Daftar Petugas | `/admin/accounts/staff` | GET |
| 3 | Membuat Akun Petugas | `/admin/accounts/staff` | POST |
| 4 | Melihat Detail Petugas | `/admin/accounts/staff/:nik` | GET |
| 5 | Update Status Petugas | `/admin/accounts/staff/:nik/status` | PATCH |
| 6 | Reset Password Petugas | `/admin/accounts/staff/:nik/reset-password` | PATCH |
| 7 | Melihat Daftar Pelanggan | `/admin/accounts/customers` | GET |
| 8 | Melihat Detail Pelanggan | `/admin/accounts/customers/:idPelanggan` | GET |
| 9 | Update Status Pelanggan | `/admin/accounts/customers/:idPelanggan/status` | PATCH |
| 10 | Reset Password Pelanggan | `/admin/accounts/customers/:idPelanggan/reset-password` | PATCH |

### B. Request Management (4 fitur)

| No | Fitur | Endpoint | HTTP Method |
|---|---|---|---|
| 11 | Memverifikasi Permohonan | `/requests/:id/verify` | PUT |
| 12 | Membuat Jadwal Pengambilan | `/requests/:id/sampling-schedule` | POST/PUT |
| 13 | Menerima Sampel & Generate Nomor | `/requests/:id/samples/receive` | POST |
| 14 | Tandai Pembayaran Tertunda | `/requests/:id/payment/deferred` | POST |

### C. Testing Parameters Management (22 fitur)

| No | Fitur | Endpoint | HTTP Method |
|---|---|---|---|
| 15 | Lihat Semua Parameter Metode | `/admin/parameters` | GET |
| 16 | Buat Parameter Metode | `/admin/parameters` | POST |
| 17 | Update Parameter Metode | `/admin/parameters/:id` | PUT |
| 18 | Hapus Parameter Metode | `/admin/parameters/:id` | DELETE |
| 19 | Lihat Kategori Parameter | `/admin/parameters/list-kategori-parameter` | GET |
| 20 | Lihat Parameter | `/admin/parameters/list-parameters` | GET |
| 21 | Lihat Metode | `/admin/parameters/list-methods` | GET |
| 22 | Lihat Jenis Sampel | `/admin/parameters/list-jenis-sampel` | GET |
| 23 | Lihat Semua Regulasi | `/admin/parameters/regulasi` | GET |
| 24 | Buat Regulasi | `/admin/parameters/regulasi` | POST |
| 25 | Update Regulasi | `/admin/parameters/regulasi/:id` | PUT |
| 26 | Hapus Regulasi | `/admin/parameters/regulasi/:id` | DELETE |
| 27 | Lihat Semua Paket BM | `/admin/parameters/paket` | GET |
| 28 | Buat Paket BM | `/admin/parameters/paket` | POST |
| 29 | Update Paket BM | `/admin/parameters/paket/:id` | PUT |
| 30 | Hapus Paket BM | `/admin/parameters/paket/:id` | DELETE |
| 31 | Lihat Parameter Paket BM | `/admin/parameters/paket/:id/parameters` | GET |
| 32 | Tambah Parameter ke Paket | `/admin/parameters/paket/:id/parameters` | POST |
| 33 | Update Parameter Paket | `/admin/parameters/paket/parameters/:id_pkt_bm_param` | PUT |
| 34 | Hapus Parameter Paket | `/admin/parameters/paket/parameters/:id_pkt_bm_param` | DELETE |
| 35 | Lihat Tarif Pengambilan | `/admin/parameters/tarif-pengambilan` | GET |
| 36 | Buat Tarif Pengambilan | `/admin/parameters/tarif-pengambilan` | POST |
| 37 | Update Tarif Pengambilan | `/admin/parameters/tarif-pengambilan/:id` | PUT |
| 38 | Hapus Tarif Pengambilan | `/admin/parameters/tarif-pengambilan/:id` | DELETE |

### D. LHU Pickup Management (3 fitur)

| No | Fitur | Endpoint | HTTP Method |
|---|---|---|---|
| 39 | Lihat Antrian Pickup LHU | `/lhu/pickup/queue` | GET |
| 40 | Jadwalkan Pickup LHU | `/lhu/pickup/schedule` | POST |
| 41 | Selesaikan Pickup LHU | `/lhu/pickup/complete` | POST |

### E. Dashboard

| No | Fitur | Endpoint | HTTP Method |
|---|---|---|---|
| 42 | Lihat Dashboard Admin | `/requests` | GET |

**Total ADMIN: 42 fitur** (vs 8-14 yang dideklarasikan)

---

## 📋 4. KASI PENGUJIAN (Head of Testing) - 8+ Fitur

| No | Fitur | Endpoint | HTTP Method | Notes |
|---|---|---|---|---|
| 1 | Lihat Dashboard | `/requests` | GET | Via list requests endpoint |
| 2 | Menentukan Metode Uji | `/requests/:id/methods` | PUT | Assign methods |
| 3 | Lihat Antrian Review Kasi | `/assignments/kasi-review/queue` | GET |
| 4 | Lihat Riwayat Review Kasi | `/assignments/kasi-review/history` | GET |
| 5 | Lihat Detail Review Kasi | `/assignments/kasi-review/detail` | GET |
| 6 | Menyetujui Hasil Uji | `/assignments/kasi-review/approve` | POST |
| 7 | Mengajukan Permintaan Revisi | `/assignments/kasi-review/revise` | POST |
| 8 | Melihat Riwayat LKA Revisi | `/assignments/lka/:kodeLka/revisions` | GET |
| 9 | Menolak Request (Advanced) | `/requests/:id/reject` | PUT | Fitur lanjutan: reject request |
| 10 | Download Invoice PDF | `/requests/:id/invoice/pdf` | GET | Kasi bisa lihat invoice |
| 11 | Lihat Activity Logs Request | `/requests/:id/activity-logs` | GET | Kasi bisa lihat history |

**Total: 11 fitur**

---

## 👨‍💼 5. PENYELIA (Supervisor/Coordinator) - 19 Fitur

| No | Fitur | Endpoint | HTTP Method |
|---|---|---|---|
| 1 | Membuat Penugasan Analis | `/assignments` | POST |
| 2 | Lihat Item Tertunda | `/assignments/pending-items` | GET |
| 3 | Memantau Penugasan | `/assignments/monitor` | GET |
| 4 | Lihat Overview Testing | `/assignments/testing-overview` | GET |
| 5 | Lihat Opsi Analis | `/requests/analysts/options` | GET |
| 6 | Lihat Penugasan Saya | `/assignments/my` | GET |
| 7 | Lihat Detail Penugasan | `/assignments/work/:idPenugasanDetail` | GET |
| 8 | Lihat Detail Penugasan (by Penugasan) | `/assignments/work/:idPenugasan/details` | GET |
| 9 | Update Deadline | `/assignments/details/:idPenugasanDetail/deadline` | PUT |
| 10 | Lihat Antrian Review | `/assignments/review/queue` | GET |
| 11 | Lihat Detail Review | `/assignments/review/detail/:idPenugasanDetail` | GET |
| 12 | Setujui Worksheet Analis | `/assignments/details/:idPenugasanDetail/approve` | POST |
| 13 | Minta Revisi Worksheet | `/assignments/details/:idPenugasanDetail/revise` | POST |
| 14 | Lihat Permintaan Revisi Kasi | `/assignments/revisi-kasi/pending` | GET |
| 15 | Review Permintaan Revisi Kasi | `/assignments/revisi-kasi/:idRevisiLka/review` | POST |
| 16 | Lihat Item Subkontrak | `/assignments/subkontrak-items` | GET |
| 17 | Simpan Hasil Subkontrak | `/assignments/subkontrak-results` | POST |
| 18 | Lihat Riwayat LKA | `/lka-revisions/lka/:kodeLka` | GET |
| 19 | Kelola Worksheet (Upload/URL/Preview) | `/assignments/work/:idPenugasanDetail/upload`, `/worksheet-url`, `/worksheet-preview` | POST/GET |

**Total: 19+ fitur**

---

## 👨‍🔬 6. ANALIS (Analyst) - 9 Fitur

| No | Fitur | Endpoint | HTTP Method |
|---|---|---|---|
| 1 | Melihat Penugasan | `/assignments/my` | GET |
| 2 | Melihat Detail Pekerjaan | `/assignments/work/:idPenugasanDetail` | GET |
| 3 | Menyimpan Draf Hasil Uji | `/assignments/work/:idPenugasanDetail/worksheet` | PUT |
| 4 | Menyimpan Hasil Uji | `/assignments/work/:idPenugasanDetail/results` | PUT |
| 5 | Mengirim Hasil Uji | `/assignments/work/:idPenugasanDetail/submit` | POST |
| 6 | Upload File Worksheet | `/assignments/work/:idPenugasanDetail/upload` | POST |
| 7 | Lihat URL Worksheet | `/assignments/worksheet-url` | GET |
| 8 | Preview Worksheet | `/assignments/worksheet-preview` | GET |
| 9 | Lihat Riwayat LKA | `/lka-revisions/lka/:kodeLka` | GET |

**Total: 9 fitur**

---

## 🔬 7. PENGENDALIAN MUTU (QC) - 9 Fitur

| No | Fitur | Endpoint | HTTP Method |
|---|---|---|---|
| 1 | Lihat Detail LHU | `/lhu/detail` | GET |
| 2 | Lihat Antrian Finalisasi | `/lhu/finalization-queue` | GET |
| 3 | Lihat Detail Finalisasi | `/lhu/finalization/detail` | GET |
| 4 | Preview Finalisasi | `/lhu/finalization/preview` | GET |
| 5 | Lihat Opsi Paket BM | `/lhu/finalization/paket-bm` | GET |
| 6 | Memfinalisasi LHU | `/lhu/finalization/finalize` | POST |
| 7 | Lihat Riwayat Finalisasi | `/lhu/finalization/history` | GET |
| 8 | Lihat Opsi Personel | `/lhu/references/personel` | GET |
| 9 | Lihat Revisi LKA | `/lka-revisions/hasil` | GET |

**Total: 9 fitur**

---

## 🏫 8. KEPALA LABORATORIUM (Lab Head/Kalab) - 5 Fitur

| No | Fitur | Endpoint | HTTP Method |
|---|---|---|---|
| 1 | Lihat Detail LHU | `/lhu/detail` | GET |
| 2 | Lihat Antrian Approval | `/lhu/kalab/queue` | GET |
| 3 | Mengesahkan LHU | `/lhu/kalab/approve` | POST |
| 4 | Lihat Riwayat LHU | `/lhu/finalization/history` | GET |
| 5 | Lihat Revisi LKA | `/lka-revisions/hasil` | GET |

**Total: 5 fitur**

---

## 🌐 9. SISTEM/REFERENSI (Public References) - 11 Fitur

| No | Fitur | Endpoint | HTTP Method | Notes |
|---|---|---|---|---|
| 1 | Lihat Jenis Sampel | `/references/sample-types` | GET | Public reference |
| 2 | Lihat Standar BM | `/references/bm-standards` | GET | Public reference |
| 3 | Lihat Paket BM | `/references/baku-mutu` + `/references/packages` | GET | Public reference |
| 4 | Lihat Paket BM by Jenis Sampel | `/references/sample-types/:id/packages` | GET | Filter by sample type |
| 5 | Lihat Parameter by Jenis Sampel | `/references/sample-types/:id/parameters` | GET | Get parameters for sample type |
| 6 | Lihat Parameter by Paket BM | `/references/packages/:id/parameters` | GET | Get parameters in a package |
| 7 | Lihat Tarif Parameter | `/references/parameter-tariffs` | GET | Parameter pricing |
| 8 | Lihat Tarif Pengambilan | `/references/pickup-tariffs` | GET | Pickup cost |
| 9 | Lihat Hari Libur | `/references/holidays` | GET | Holiday calendar |
| 10 | Lihat Kontak Admin | `/references/admin-contact` | GET | Admin contact info |
| 11 | Lihat Pegawai PCC | `/references/pcc-employees` | GET | List of PCC staff |

**Total: 11 fitur**

---

## 💳 10. SISTEM/PAYMENT - 1 Fitur

| No | Fitur | Endpoint | HTTP Method |
|---|---|---|---|
| 1 | Handle Xendit Payment Webhook | `/webhooks/xendit/payment-session` | POST |

**Total: 1 fitur**

---

## ✅ RINGKASAN TOTAL

| Role | Fitur | Delta |
|---|---|---|
| User (General) | 7 | +3 |
| Pelanggan | 14 | +5 (dari 9) |
| Admin | 42 | **+28** (dari 8-14) |
| Kasi Pengujian | 11 | +6 (dari 5) |
| Penyelia | 19 | **+12** (dari 7) |
| Analis | 9 | +5 (dari 4) |
| QC | 9 | +1 (dari 8, naming beda) |
| Kalab | 5 | +1 (dari 3) |
| Sistem/References | 11 | **+11** (tidak dihitung) |
| Payment/System | 1 | +1 (tidak dihitung) |
| **TOTAL** | **128 fitur** | **+89** |

---

## 🚨 FITUR KRITIS YANG TERLEWAT

### 1. **CRUD Operations yang Kompleks**
   - Admin punya 22 endpoint untuk Parameter Management saja
   - Setiap entity (Parameter, Regulasi, Paket, Detail Paket, Tarif) punya full CRUD

### 2. **Dashboard & Monitoring**
   - Penyelia punya Testing Overview
   - Admin punya Account Management Dashboard
   - QC punya Finalization Queue
   - Setiap role punya visibility ke list/queue mereka

### 3. **File Management**
   - Upload worksheet (Analis)
   - Preview worksheet (Analis, Penyelia, Kasi)
   - Akses file worksheet dengan token
   - Download invoice PDF
   - Generate & serve LHU PDF

### 4. **Advanced Workflow**
   - Update deadline (Penyelia)
   - Mark deferred payment (Admin, Kasi)
   - Subkontrak results management
   - Cancel schedule change
   - Review Kasi revision requests

### 5. **Data References (11 endpoint)**
   - Tidak ada dalam list awal
   - Krusial untuk frontend filtering

---

## 📋 REKOMENDASI UNTUK UCD

**Usahakan mengelompokkan fitur berdasarkan:**

1. **Authentication & Account Management** (7 fitur)
   - Login, Register, Password Reset, Profile

2. **Request/Permohonan Workflow** (14+ fitur)
   - Create, View, Update, Payment, Schedule Changes

3. **Assignment/Penugasan Management** (19+ fitur)
   - Create, Monitor, Review, Worksheet Management

4. **Testing Parameter Management** (22 fitur)
   - Bisa di-group: Parameter, Regulasi, Paket BM, Tarif
   - Atau dibuat terpisah per admin sub-role

5. **LHU Finalization & Approval** (9+ fitur)
   - QC → Penyelia → Kasi → Kalab workflow

6. **Data References** (11 fitur)
   - Public/System references
   - Digunakan oleh multiple roles

7. **File & Document Management** (3 fitur)
   - Worksheet, Invoice, LHU PDFs

---

## 🎯 KESIMPULAN

✅ **Kode memiliki 128 fitur, bukan 42!**

Banyak fitur yang terlewat dalam daftar awal, terutama:
- **Admin data management** (CRUD untuk parameters, regulasi, paket, tarif)
- **Advanced workflow features** (update deadline, mark deferred, cancel schedule, etc)
- **File management** (upload, preview, access control)
- **System references** (11 endpoint untuk dropdown/filtering)

**Rekomendasikan untuk UCD:**
- Gunakan **actor-based grouping** (Pelanggan, Admin, Kasi, dll)
- Breakdown menjadi **21-25 use cases utama** grouped by workflow
- Diagram akan lebih kompleks tapi lebih akurat
- Pertimbangkan sub-actors untuk admin (Staff Admin, Parameter Admin)
