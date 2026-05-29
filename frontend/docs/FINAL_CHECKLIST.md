# Checklist Final SILABLING

Gunakan checklist ini setelah backend dan frontend berhasil dijalankan di lokal.

## Validasi teknis

Backend:

```bash
npm install
npm run check:syntax
npm run check:imports
npm run check:workflow
npm run check:package
npm run dev
```

Frontend:

```bash
npm install
npm run check:imports
npm run check:workflow
npm run check:package
npm run build
npm run dev
```

## Smoke test alur bisnis

1. Login sebagai pelanggan dan buat permohonan baru.
2. Login admin dan verifikasi permohonan.
3. Tetapkan parameter, metode, tarif, dan invoice.
4. Proses pembayaran sesuai mode yang dipakai.
5. Admin generate sampel/barcode.
6. Penyelia buat penugasan analis.
7. Analis isi LKA dan submit.
8. Penyelia review LKA; uji skenario setuju dan revisi.
9. Kasi review hasil; uji skenario setuju dan revisi.
10. QC/Kalab proses LHU sesuai alur final aplikasi.
11. Admin jadwalkan pengambilan LHU.
12. Pelanggan ajukan perubahan jadwal.
13. Admin tandai LHU sudah diambil.
14. Pastikan pengajuan perubahan jadwal yang masih pending otomatis tertutup.
15. Pastikan permohonan tidak muncul lagi di daftar Perlu Pengambilan.
16. Pastikan timeline/aktivitas mencatat perubahan status penting.

## Prinsip final yang harus dipertahankan

- Status aktif tetap di tabel utama masing-masing.
- `aktivitas_sistem_log` hanya menjadi histori/audit trail.
- Admin tidak membuat pelanggan; pelanggan mendaftar sendiri.
- File `.env`, `node_modules`, hasil upload, invoice, LHU, worksheet, dan `dist` tidak ikut paket final.
