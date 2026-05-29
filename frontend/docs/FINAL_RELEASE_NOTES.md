# Catatan Rilis Final Refactor SILABLING Frontend

Dokumen ini merangkum paket final frontend setelah perbaikan prioritas dan struktur folder.

## Scope yang sudah diterapkan

1. `.env`, `node_modules`, dan `dist` tidak ikut paket final.
2. Struktur frontend diarahkan ke `app`, `api`, `pages`, `components`, `hooks`, `constants`, `utils`, dan `assets`.
3. Halaman utama berada di `src/pages`.
4. File lama `src/components/*Page.jsx` tetap menjadi wrapper pendek agar import lama tidak rusak.
5. Layout berada di `src/components/layout`.
6. API barrel tersedia di `src/api/index.js`.
7. Hook barrel tersedia di `src/hooks/index.js`.
8. Util barrel tersedia di `src/utils/index.js`.
9. Constants barrel tersedia di `src/constants/index.js`.
10. Folder `src/helpers` global tidak dipakai.
11. Utility aktivitas log tersedia di `src/utils/activityLog.util.js`.
12. Checker import, workflow, structure, dan package sudah tersedia.

## Keputusan desain final

Frontend boleh membaca timeline dari data aktivitas/log yang diberikan backend, tetapi status aktif tetap harus dianggap berasal dari field transaksi utama. Timeline adalah histori, bukan sumber tunggal status aktif.

## Perintah validasi frontend

Jalankan dari folder frontend:

```bash
npm install
npm run check:imports
npm run check:workflow
npm run check:structure
npm run check:package
npm run build
npm run dev
```

Jika dependency lengkap dan ingin menjalankan semua checker sekaligus:

```bash
npm run check
```

## Catatan wrapper

Wrapper lama sengaja dipertahankan. Jangan hapus wrapper sebelum seluruh import lama dipastikan sudah pindah ke struktur final dan aplikasi sudah lolos smoke test lokal.
