# System Testing SILABLING

Folder ini memisahkan dua bentuk pengujian sistem.

## 1. Automated system smoke testing

File `system-smoke.test.js` menguji perilaku sistem yang dapat diverifikasi tanpa database uji dan tanpa akun pengguna, yaitu health check, security headers, CORS, fallback 404, pembatasan ukuran request, keamanan akses file lama, redirect pembayaran, dan waktu respons endpoint health.

Jalankan dari folder backend:

```bash
npx cross-env NODE_ENV=test jest tests/system/system-smoke.test.js --runInBand
```

## 2. Full system testing manual

Empat puluh skenario black-box lengkap terdapat pada workbook:

`backend/docs/Lampiran_Pengujian_Unit_Integration_System_SILABLING.xlsx`

Pengujian penuh harus dijalankan pada aplikasi yang aktif dengan:

- frontend dan backend berjalan;
- database khusus pengujian;
- akun Pelanggan, Admin, Analis, Penyelia, Kasi Pengujian, dan Pengendalian Mutu;
- data master parameter, metode, tarif, dan paket baku mutu;
- Xendit sandbox atau callback pembayaran yang terkontrol;
- bukti screenshot untuk ST-001 sampai ST-040.

Status pada Lampiran J sengaja tetap `Belum Diuji` sampai skenario benar-benar dijalankan melalui antarmuka sistem.
