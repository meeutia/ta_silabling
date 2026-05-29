# Smoke Test Lokal SILABLING

Gunakan checklist ini setelah backend dan frontend berjalan.

## 1. Validasi teknis

Backend:

```bash
npm install
npm run check:syntax
npm run check:imports
npm run check:workflow
npm run check:structure
npm run check:package
npm run dev
```

Frontend:

```bash
npm install
npm run check:imports
npm run check:workflow
npm run check:structure
npm run check:package
npm run build
npm run dev
```

## 2. Smoke test alur utama

1. Login pelanggan.
2. Buat permohonan baru.
3. Login admin.
4. Verifikasi permohonan.
5. Tetapkan parameter, metode, tarif, dan invoice.
6. Proses pembayaran sesuai mode yang dipakai.
7. Generate sampel dan barcode.
8. Login penyelia.
9. Buat penugasan analis.
10. Login analis.
11. Isi hasil LKA dan submit.
12. Login penyelia.
13. Review hasil LKA. Uji minimal satu skenario setuju dan satu skenario revisi.
14. Login kasi.
15. Review hasil. Uji skenario setuju dan revisi bila datanya tersedia.
16. Finalisasi/QC/Kalab sesuai alur final aplikasi.
17. Admin jadwalkan pengambilan LHU.
18. Pelanggan ajukan perubahan jadwal.
19. Admin tandai LHU sudah diambil.
20. Pastikan pengajuan perubahan jadwal yang masih pending otomatis tertutup.
21. Pastikan permohonan tidak muncul lagi di daftar Perlu Pengambilan.
22. Pastikan timeline/aktivitas menampilkan perubahan status penting.

## 3. Smoke test negatif yang wajib

1. Setelah LHU sudah diambil, coba setujui pengajuan perubahan jadwal lama.
2. Sistem harus menolak atau pengajuan sudah tertutup otomatis.
3. Setelah LHU sudah diambil, cek daftar Perlu Pengambilan.
4. Permohonan tersebut tidak boleh muncul lagi.
5. Cek `aktivitas_sistem_log` untuk memastikan ada histori status.

## 4. Jika terjadi error

Prioritaskan baca error dari terminal backend dulu. Jika error muncul saat halaman dibuka, cek Network tab browser untuk melihat endpoint dan response backend. Jangan langsung ubah frontend sebelum memastikan response backend benar.
