# Sequence Diagram PlantUML - Class Based

Folder ini berisi sequence diagram yang sudah disusun ulang mengikuti struktur sistem sekarang yang memakai controller/service class di backend.

## Urutan wajib Bab 4

1. `01_BAB4_Membuat_Permohonan_Pengujian.puml`
2. `02_BAB4_Memverifikasi_Permohonan.puml`
3. `03_BAB4_Menentukan_Metode_Uji.puml`
4. `04_BAB4_Melihat_Invoice_dan_Melakukan_Pembayaran.puml`
5. `05_BAB4_Mengirim_Hasil_Uji.puml`
6. `06_BAB4_Memfinalisasi_LHU.puml`
7. `07_BAB4_Mengesahkan_LHU.puml`
8. `08_BAB4_Mengelola_Jadwal_Pengambilan_LHU.puml`

Urutan ini mengikuti alur bisnis utama: pelanggan membuat permohonan, admin memverifikasi, Kasi menentukan metode, pelanggan membayar, hasil uji dikirim dan direview, QC memfinalisasi LHU, Kalab mengesahkan, lalu admin mengatur pengambilan LHU.

## Sequence detail untuk lampiran

Folder `lampiran-detail` berisi sequence tambahan dan pecahan detail dari proses utama, termasuk login, register, perubahan jadwal, penjadwalan sampel, penerimaan sampel, penugasan analis, review Penyelia, review Kasi, revisi Kasi, perbaikan hasil, reset password, dan melihat status/detail permohonan.

## Catatan pemodelan

- Diagram tidak lagi memakai gaya struktural lama seperti `routes -> function -> query` sebagai fokus utama.
- Diagram menampilkan kelas utama backend: `AuthController`, `CustomerRequestController`, `RequestWorkflowController`, `AssignmentController`, `LhuController`, `LhuPickupController`, serta service class terkait.
- Model database diringkas sebagai `Sequelize Models` supaya diagram tidak terlalu padat, tetapi model penting tetap disebutkan pada masing-masing diagram.
- Untuk Bab 4 utama, gunakan folder `bab4-wajib`. Untuk lampiran, gunakan folder `lampiran-detail`.
