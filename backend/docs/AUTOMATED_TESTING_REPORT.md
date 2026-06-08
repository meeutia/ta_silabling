# Ringkasan Automated Testing Backend SILABLING

Pengujian otomatis backend dilakukan menggunakan Jest dan Supertest. Pengujian ini melengkapi pengujian manual/system testing yang dilakukan melalui browser.

## 1. Unit Testing

Unit testing dilakukan dengan Jest untuk menguji fungsi individual yang dapat dipisahkan dari database atau dependensi eksternal. Cakupan unit testing meliputi:

| File Test | Modul yang Diuji | Fokus Pengujian |
|---|---|---|
| `schedule-policy.util.test.js` | `schedule-policy.util.js` | Validasi tanggal, jam operasional, tanggal merah, dan opsi jam kerja |
| `business-day.util.test.js` | `business-day.util.js` | Format tanggal, hari kerja, timeline pengujian, dan batas rentang tanggal |
| `password-policy.util.test.js` | `password-policy.util.js` | Validasi username, password, dan temporary password |
| `file-signature.util.test.js` | `file-signature.util.js` | Validasi file upload berdasarkan magic number |
| `file-access-token.util.test.js` | `file-access-token.util.js` | Pembuatan, verifikasi, scope, kedaluwarsa, dan manipulasi token file |
| `auth.service.unit.test.js` | `auth.service.js` | Generate JWT, refresh token, hash token, expiry, dan payload user |
| `auth.middleware.test.js` | `middlewares/auth.js` | Verifikasi access token dan otorisasi role |
| `assignment-status.service.test.js` | `assignment-status.helper.js` | Status workflow LKA, revisi aktif, fallback status, dan status monitoring penugasan |
| `lhu-status.service.test.js` | `lhu-status.helper.js` | Status LHU final dan status pengambilan LHU |
| `request-business-flow.service.test.js` | `request-transform.util.js`, `request-schedule-fields.util.js`, `request-sample-code.util.js` | Pengajuan permohonan, jadwal sampel, status riwayat pelanggan, penerimaan sampel, dan nomor sampel |
| `payment-business-flow.service.test.js` | `payment-policy.util.js`, `payment-session-payload.util.js` | Metode pembayaran, lifecycle payment, payload Xendit, URL status pembayaran, dan status pascapembayaran |
| `assignment-business-flow.service.test.js` | `assignment-fpm.helper.js`, `assignment-object.helper.js`, `assignment-scope.helper.js`, `assignment-lka-result.service.js` | Pengelompokan penugasan analis, scope internal/subkontrak, urutan sampel, dan hasil LKA per sampel |
| `lhu-business-flow.service.test.js` | `lhu-data-utils.js`, `lhu-detail-row.mapper.js`, `lhu-payload.mapper.js` | Sumber hasil LKA yang sudah disetujui Kasi, detail LHU, urutan parameter, statistik akreditasi, dan payload LHU |
| `workflow-guard.service.test.js` | `workflow-guard.service.js` | Proteksi alur final agar permohonan selesai/LHU sudah diambil tidak diproses ulang |

## 2. Integration Testing

Integration testing dilakukan dengan Jest dan Supertest untuk menguji endpoint Express secara langsung. Cakupan awal integration testing meliputi:

| File Test | Endpoint/Modul | Fokus Pengujian |
|---|---|---|
| `app-health.test.js` | Express app | Endpoint health check, 404 handler, dan blokir akses file invoice legacy |

## 3. Posisi Service dalam Testing

Service dapat masuk unit testing apabila logikanya dapat diisolasi dari database dan dependensi eksternal. Pada patch ini, service yang diuji sebagai unit test adalah service/helper yang berisi logika deterministik, seperti `auth.service`, `request-transform`, `payment-policy`, `assignment` helper, `lhu` mapper/helper, dan `workflow-guard`. Service yang bergantung database tetap diuji dengan mock model hanya pada bagian kontrak input-output yang diperlukan untuk alur bisnis utama.

Service yang melakukan query database, transaksi, atau memanggil banyak model lebih tepat diuji sebagai integration testing dengan database testing atau mock repository.

## 4. Alur Bisnis Utama yang Tercakup

Automated unit test tambahan mengikuti alur utama SILABLING:

1. Pelanggan membuat permohonan pengujian.
2. Admin memverifikasi permohonan.
3. Kasi memproses metode dan pembayaran.
4. Pelanggan melakukan pembayaran.
5. Admin menentukan jadwal dan menerima sampel, lalu sistem membentuk nomor sampel.
6. Penyelia membuat penugasan analis dan sistem mengelompokkan sampel/metode.
7. Analis mengisi LKA.
8. Penyelia melakukan review hasil LKA.
9. Kasi melakukan review hasil.
10. QC menyusun LHU hanya dari hasil yang sudah disetujui Kasi.
11. Kalab menyetujui/mengesahkan LHU.
12. Pelanggan mengambil LHU berdasarkan jadwal yang telah ditentukan.
13. Guard workflow mencegah proses ulang pada permohonan selesai atau LHU sudah diambil.

## 5. Hasil Eksekusi Terakhir

```txt
Test Suites: 15 passed, 15 total
Tests:       138 passed, 138 total
Snapshots:   0 total
```

## 6. Perintah Pengujian

```bash
npm test
npm run test:unit
npm run test:integration
npm run test:coverage
```


## 7. Lampiran Tabel Pengujian

Tabel pengujian bergaya lampiran tersedia pada:

- `backend/docs/LAMPIRAN_H_TABEL_PENGUJIAN_JEST.md`
- `backend/docs/lampiran_h_tabel_pengujian_jest.xlsx`
