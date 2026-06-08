# Lampiran I - Tabel Integration Testing Jest + Supertest

Pengujian integrasi dilakukan untuk memastikan route, middleware autentikasi/otorisasi, controller, validator, service boundary, dan respons API berjalan terpadu sesuai alur bisnis utama SILABLING. Pengujian payment gateway dilakukan melalui pembuatan payment session dan simulasi webhook status pembayaran.

**Hasil eksekusi:** 6 test suites passed, 30 tests passed.

| No | Kode | Kategori | Skenario Integration Test | Endpoint | Data Masukan | Hasil yang Diharapkan | Hasil Sebenarnya | Status |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | IT-001 | Auth | Login berhasil dengan akun valid | POST /auth/login | identifier dan password valid | Sistem mengembalikan token, user, dan status login berhasil | Login berhasil dan token dikembalikan | Lulus |
| 2 | IT-002 | Auth | Login gagal dengan password salah | POST /auth/login | identifier valid, password salah | Sistem menolak login dengan status error | Sistem mengembalikan respons gagal login | Lulus |
| 3 | IT-003 | Auth & Role | Endpoint menolak request tanpa token | GET /requests | Tanpa Authorization Bearer token | Sistem mengembalikan status 401 | Akses ditolak karena token tidak ditemukan | Lulus |
| 4 | IT-004 | Auth & Role | Endpoint menolak akses role yang tidak sesuai | GET /admin/accounts/roles | Token pelanggan ke endpoint admin | Sistem mengembalikan status 403 | Akses ditolak karena role tidak sesuai | Lulus |
| 5 | IT-005 | Permohonan | Pelanggan membuat permohonan valid | POST /requests | Data pelanggan, sampel, parameter, dan jadwal valid | Permohonan tersimpan dengan status menunggu verifikasi admin | Permohonan berhasil dibuat | Lulus |
| 6 | IT-006 | Permohonan | Sistem menolak permohonan jika field wajib kosong | POST /requests | Email PIC kosong | Sistem menolak request dan menampilkan pesan data tidak lengkap | Request ditolak sebelum masuk service | Lulus |
| 7 | IT-007 | Permohonan | Pelanggan melihat riwayat permohonan sendiri | GET /requests | Token pelanggan valid | Sistem menampilkan daftar permohonan milik pelanggan | Riwayat permohonan tampil sesuai user | Lulus |
| 8 | IT-008 | Verifikasi Admin | Admin melihat daftar permohonan masuk | GET /requests?status=Menunggu Verifikasi Admin | Token admin valid dan filter status | Sistem menampilkan daftar permohonan masuk | Daftar permohonan masuk tampil | Lulus |
| 9 | IT-009 | Verifikasi Admin | Admin memverifikasi permohonan | PUT /requests/:id/verify | action approve dan catatan admin | Status permohonan berubah ke menunggu penentuan metode | Permohonan berhasil disetujui admin | Lulus |
| 10 | IT-010 | Verifikasi Admin | Admin menolak atau meminta revisi permohonan dengan catatan | PUT /requests/:id/verify | action reject dan catatan penolakan | Status permohonan berubah menjadi ditolak/perlu revisi | Permohonan berhasil ditolak dengan catatan | Lulus |
| 11 | IT-011 | Kasi Metode & Pembayaran | Kasi menetapkan metode atau parameter uji | PUT /requests/:id/methods | Pilihan fpmId, capabilityStatus, methodId, isInsitu valid | Metode uji tersimpan dan lanjut ke pembayaran | Metode berhasil ditentukan | Lulus |
| 12 | IT-012 | Kasi Metode & Pembayaran | Kasi menetapkan rincian biaya atau tagihan | PUT /requests/:id/methods | Pilihan metode valid dan tagihan disiapkan | Sistem menghasilkan invoice/tagihan pembayaran | Tagihan terbentuk dengan total biaya | Lulus |
| 13 | IT-013 | Payment Gateway | Pelanggan membuat transaksi pembayaran melalui payment gateway | POST /requests/:id/payment | action approve dan paymentMethodCode valid | Sistem membuat payment session dan payment URL | Payment URL gateway dikembalikan | Lulus |
| 14 | IT-014 | Payment Gateway | Sistem menerima status pembayaran sukses dari payment gateway | POST /webhooks/xendit/payment-session | Payload webhook payment_session.succeeded | Status pembayaran diperbarui otomatis menjadi sukses | Webhook pembayaran diproses | Lulus |
| 15 | IT-015 | Workflow Guard | Sistem menolak pemrosesan jika status pembayaran belum sukses | POST /requests/:id/samples/receive | Admin mencoba menerima sampel saat pembayaran belum sukses | Sistem menolak proses penerimaan sampel | Request ditolak dengan pesan pembayaran belum sukses | Lulus |
| 16 | IT-016 | Jadwal & Sampel | Admin menentukan jadwal pengambilan sampel | POST /requests/:id/sampling-schedule | Tanggal, jam kerja, dan petugas PCC valid | Jadwal pengambilan sampel tersimpan | Jadwal berhasil disimpan | Lulus |
| 17 | IT-017 | Jadwal & Sampel | Sistem menolak jadwal di luar jam kerja | POST /requests/:id/sampling-schedule | Jam pengambilan 17:15 | Sistem menolak jadwal di luar jam operasional | Request ditolak oleh validasi jadwal | Lulus |
| 18 | IT-018 | Jadwal & Sampel | Admin menerima dan generate sampel setelah pembayaran sukses | POST /requests/:id/samples/receive | Data sampel, tanggal, kondisi, acuan, lokasi, koordinat valid | Sampel diterima dan nomor sampel digenerate | Sampel berhasil diterima | Lulus |
| 19 | IT-019 | Penugasan | Penyelia melihat sampel siap ditugaskan | GET /assignments/pending-items | Token penyelia valid | Sistem menampilkan sampel siap ditugaskan | Daftar sampel siap tugas tampil | Lulus |
| 20 | IT-020 | Penugasan | Penyelia membuat penugasan analis | POST /assignments | Analis, sampel, parameter/metode, tenggat valid | Penugasan analis tersimpan | Penugasan berhasil dibuat | Lulus |
| 21 | IT-021 | Workflow Guard | Sistem menolak penugasan jika sampel belum diterima | POST /assignments | Penyelia membuat penugasan untuk sampel belum diterima | Sistem menolak penugasan | Request ditolak dengan pesan sampel belum diterima | Lulus |
| 22 | IT-022 | Hasil Pengujian | Analis melihat penugasan miliknya | GET /assignments/my | Token analis valid | Sistem menampilkan penugasan milik analis | Daftar penugasan analis tampil | Lulus |
| 23 | IT-023 | Hasil Pengujian | Analis menginputkan hasil pengujian | PUT /assignments/work/:id/results | Nomor sampel dan hasil pengujian valid | Hasil pengujian tersimpan | Hasil pengujian tersimpan | Lulus |
| 24 | IT-024 | Hasil Pengujian | Analis mengirim hasil pengujian ke Penyelia | POST /assignments/work/:id/submit | Worksheet dan hasil pengujian lengkap | Status berubah menjadi menunggu review penyelia | Hasil berhasil dikirim | Lulus |
| 25 | IT-025 | Review Penyelia | Penyelia menyetujui hasil pengujian | POST /assignments/details/:id/approve | Token penyelia dan id detail valid | Status hasil berubah menjadi disetujui penyelia | Hasil disetujui penyelia | Lulus |
| 26 | IT-026 | Review Penyelia | Penyelia meminta revisi hasil pengujian dengan catatan | POST /assignments/details/:id/revise | Target hasil dan catatan revisi valid | Status hasil berubah menjadi perlu revisi hasil | Permintaan revisi hasil dikirim | Lulus |
| 27 | IT-027 | Review Kasi | Kasi hanya melihat hasil yang sudah disetujui Penyelia | GET /assignments/kasi-review/queue | Token Kasi valid | Sistem hanya menampilkan antrean hasil approved penyelia | Antrean review Kasi tampil sesuai filter | Lulus |
| 28 | IT-028 | Review Kasi | Kasi menyetujui hasil pengujian | POST /assignments/kasi-review/approve | Nomor sampel valid | Status hasil berubah menjadi disetujui Kasi | Hasil disetujui Kasi | Lulus |
| 29 | IT-029 | LHU & Approval | QC menyusun LHU dari hasil yang sudah disetujui Kasi | POST /lhu/finalization/finalize | ID registrasi, paket baku mutu, daftar sampel valid | Draft LHU dibuat dan dikirim ke Kalab | LHU berhasil dibuat | Lulus |
| 30 | IT-030 | LHU & Approval | Kalab menyetujui LHU dan jadwal pengambilan LHU disimpan | POST /lhu/kalab/approve + POST /lhu/pickup/schedule | Nomor LHU valid, lalu jadwal pengambilan valid | LHU disahkan dan jadwal pengambilan tersimpan | LHU disahkan dan jadwal pengambilan disimpan | Lulus |

File spreadsheet: `docs/lampiran_i_integration_testing_jest.xlsx`.
