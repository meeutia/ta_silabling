# Automated Testing Backend SILABLING

Folder ini berisi pengujian otomatis berbasis Jest.

## Level pengujian

- `tests/unit`: unit testing untuk fungsi kecil, utility, middleware, dan service/helper yang dapat diuji terpisah dari database atau dengan mock model.
- `tests/integration`: integration testing untuk endpoint Express dan integrasi middleware dasar.

## Cakupan unit test saat ini

- `schedule-policy.util`: validasi tanggal, jam operasional, tanggal merah, dan opsi jam kerja.
- `business-day.util`: format tanggal, perhitungan hari kerja, timeline pengujian, dan validasi rentang hari kerja.
- `password-policy.util`: validasi username dan password.
- `file-signature.util`: validasi magic number file worksheet.
- `file-access-token.util`: pembuatan dan verifikasi token akses file aman.
- `auth.service`: fungsi token, refresh token, hash refresh token, dan payload user.
- `auth middleware`: verifikasi token dan otorisasi role.
- `request-business-flow.service`: pengajuan permohonan, jadwal sampel, status riwayat pelanggan, penerimaan sampel, dan nomor sampel.
- `payment-business-flow.service`: metode pembayaran, lifecycle payment, payload Xendit, dan status pascapembayaran.
- `assignment-business-flow.service`: pengelompokan penugasan analis, scope internal/subkontrak, urutan sampel, dan hasil LKA per sampel.
- `assignment-status.helper`: status workflow LKA, revisi hasil, dan monitoring penugasan.
- `lhu-business-flow.service`: validasi sumber hasil approved Kasi, detail LHU, urutan parameter, statistik akreditasi, dan payload LHU.
- `lhu-status.helper`: status LHU final dan pengambilan LHU.
- `workflow-guard.service`: proteksi proses ulang permohonan selesai dan LHU yang sudah diambil.

## Cakupan integration test saat ini

- `app-health.test`: endpoint health check, handler 404, dan blokir akses file invoice legacy.

## Perintah

```bash
npm test
npm run test:unit
npm run test:integration
npm run test:coverage
```

## Hasil eksekusi terakhir

```txt
Test Suites: 15 passed, 15 total
Tests:       138 passed, 138 total
Snapshots:   0 total
```

## Catatan laporan

- Jest digunakan sebagai alat untuk unit testing.
- Jest + Supertest digunakan sebagai alat untuk integration testing endpoint API.
- Service yang diuji pada unit test adalah service/helper yang logikanya dapat diisolasi dari database atau diuji dengan mock model.
- Service yang sangat bergantung database transaksi penuh lebih tepat diuji sebagai integration test lanjutan dengan database testing.
- System testing dan acceptance testing tetap dilakukan dari browser/manual/UAT karena mencakup alur end-to-end antar role.


## Lampiran tabel pengujian

Tabel pengujian siap salin ke laporan tersedia pada `backend/docs/LAMPIRAN_H_TABEL_PENGUJIAN_JEST.md` dan versi spreadsheet pada `backend/docs/lampiran_h_tabel_pengujian_jest.xlsx`.
