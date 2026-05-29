# Status Refactor Frontend SILABLING

Frontend diarahkan ke struktur:

- `app/` untuk layout, renderer, konfigurasi halaman, dan route utility
- `api/` untuk komunikasi backend
- `pages/` untuk halaman utama
- `components/` untuk bagian UI dan component reusable
- `hooks/` untuk React hook reusable
- `constants/` untuk status, role, route, dan label tetap
- `utils/` untuk fungsi murni/non-JSX
- `assets/` untuk aset statis

## Keputusan penting

1. Halaman utama berada di `src/pages`.
2. File lama `src/components/*Page.jsx` sengaja tetap ada sebagai wrapper pendek.
3. Wrapper dipertahankan agar import lama tidak rusak saat refactor bertahap.
4. Folder `src/helpers` global tidak dipakai.
5. Utility JSX mulai dipisah menjadi component, sedangkan fungsi murni diarahkan ke `.js`/`utils`.

## Cara validasi

Jalankan:

```bash
npm run check:imports
npm run check:workflow
npm run check:structure
npm run check:package
```

Setelah dependency tersedia, lanjutkan:

```bash
npm run build
```
