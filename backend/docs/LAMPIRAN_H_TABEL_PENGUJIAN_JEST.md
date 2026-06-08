# LAMPIRAN H
# TABEL PENGUJIAN UNIT DAN INTEGRASI BACKEND

Lampiran ini disusun mengikuti format tabel pengujian yang memuat kolom No, Nama Test Case, Input, Hasil yang Diharapkan, Hasil Sebenarnya, dan Status. Pengujian otomatis dilakukan menggunakan Jest untuk unit testing serta Jest dan Supertest untuk integration testing.

## Alur Bisnis Utama Sistem

Pelanggan buat permohonan -> Admin memverifikasi -> Kasi proses metode dan pembayaran -> Pelanggan bayar -> Admin menentukan jadwal/terima sampel -> Penyelia buat penugasan -> Analis isi LKA -> Penyelia review -> Kasi review -> QC susun LHU -> Kalab approve -> Pelanggan ambil LHU berdasarkan jadwal.

## 1. Schedule Policy Utility

| No | Nama Test Case | Input | Hasil yang Diharapkan | Hasil Sebenarnya | Status |
|---:|---|---|---|---|---|
| 1 | menerima tanggal dengan format YYYY-MM-DD | Tanggal '2026-05-11' | Sistem menerima format tanggal valid | Tanggal dinormalisasi dan diterima | Lulus |
| 2 | memotong nilai datetime menjadi tanggal saja | Datetime '2026-05-11T08:00:00.000Z' | Sistem mengambil bagian tanggal saja | Menghasilkan '2026-05-11' | Lulus |
| 3 | menolak tanggal kosong | Nilai tanggal kosong/null | Sistem menolak input tanggal kosong | Validasi error ditampilkan | Lulus |
| 4 | menolak format tanggal selain YYYY-MM-DD | Tanggal '11/05/2026' | Sistem menolak format selain YYYY-MM-DD | Validasi error ditampilkan | Lulus |
| 5 | menolak tanggal kalender yang tidak valid | Tanggal '2026-02-30' | Sistem menolak tanggal tidak valid | Validasi error ditampilkan | Lulus |
| 6 | menormalisasi jam 1 digit menjadi format database HH:mm:ss | Jam '8:00' | Sistem mengubah ke format HH:mm:ss | Menghasilkan '08:00:00' | Lulus |
| 7 | menerima jam batas awal operasional | Jam '08:00' | Sistem menerima jam awal operasional | Jam diterima | Lulus |
| 8 | menerima jam batas akhir operasional | Jam '16:00' | Sistem menerima jam akhir operasional | Jam diterima | Lulus |
| 9 | menolak jam kosong | Nilai jam kosong/null | Sistem menolak input jam kosong | Validasi error ditampilkan | Lulus |
| 10 | menolak jam di luar format HH:mm | Jam '8 pagi' | Sistem menolak format jam tidak sesuai | Validasi error ditampilkan | Lulus |
| 11 | menolak nilai jam kalender yang tidak valid | Jam '25:70' | Sistem menolak nilai jam tidak valid | Validasi error ditampilkan | Lulus |
| 12 | menolak detik selain 00 | Jam '08:00:30' | Sistem menolak detik selain 00 | Validasi error ditampilkan | Lulus |
| 13 | menolak jam sebelum operasional | Jam '07:59' | Sistem menolak jam sebelum jam kerja | Validasi error ditampilkan | Lulus |
| 14 | menolak jam setelah operasional | Jam '16:01' | Sistem menolak jam setelah jam kerja | Validasi error ditampilkan | Lulus |
| 15 | mengembalikan string kosong untuk jam operasional valid | Jam '09:00' | Sistem tidak mengembalikan pesan error | String kosong dikembalikan | Lulus |
| 16 | mengembalikan pesan error untuk jam operasional tidak valid | Jam '17:00' | Sistem mengembalikan pesan error | Pesan error dikembalikan | Lulus |
| 17 | menerima hari kerja yang tidak termasuk tanggal merah | Tanggal Senin bukan libur | Sistem menerima tanggal hari kerja | Tanggal diterima | Lulus |
| 18 | menolak Sabtu atau Minggu | Tanggal pada akhir pekan | Sistem menolak akhir pekan | Validasi error ditampilkan | Lulus |
| 19 | menolak tanggal merah dari daftar libur | Tanggal yang ada di daftar libur | Sistem menolak tanggal merah | Validasi error ditampilkan | Lulus |
| 20 | findHoliday menemukan tanggal merah dari bentuk data berbeda | Data libur string/object | Sistem menemukan tanggal libur | Tanggal libur ditemukan | Lulus |
| 21 | menghasilkan opsi per menit dari 08:00 sampai 16:00 | Rentang jam kerja | Sistem menghasilkan opsi jam kerja per menit | Opsi 08:00 sampai 16:00 terbentuk | Lulus |

## 2. Business Day Utility

| No | Nama Test Case | Input | Hasil yang Diharapkan | Hasil Sebenarnya | Status |
|---:|---|---|---|---|---|
| 1 | formatYmd mengubah Date valid menjadi YYYY-MM-DD | Date object valid | Sistem menghasilkan format YYYY-MM-DD | Format tanggal sesuai | Lulus |
| 2 | toDateObject menerima format YYYY-MM-DD, ISO, dan tanggal Indonesia | String tanggal valid | Sistem mengubah input menjadi Date object | Date object terbentuk | Lulus |
| 3 | parseYmd menolak format selain YYYY-MM-DD | Tanggal '11 Mei 2026' | Sistem menolak format tidak sesuai | Validasi error ditampilkan | Lulus |
| 4 | asYmd mengembalikan string kosong untuk nilai tidak valid | Nilai invalid/null | Sistem mengembalikan string kosong | String kosong dikembalikan | Lulus |
| 5 | isBusinessDay menerima hari kerja dan menolak akhir pekan | Tanggal hari kerja dan akhir pekan | Sistem membedakan hari kerja dan akhir pekan | Hasil boolean sesuai | Lulus |
| 6 | isBusinessDay menolak tanggal merah dari daftar libur | Tanggal libur nasional | Sistem menolak tanggal merah | Hasil false | Lulus |
| 7 | addBusinessDays melewati Sabtu dan Minggu | Tanggal awal + jumlah hari kerja | Sistem menghitung melewati akhir pekan | Tanggal hasil sesuai | Lulus |
| 8 | addBusinessDays melewati tanggal merah | Tanggal awal + daftar libur | Sistem menghitung melewati tanggal merah | Tanggal hasil sesuai | Lulus |
| 9 | getBusinessDayNumber menghitung nomor hari kerja dari tanggal mulai | Tanggal mulai dan tanggal target | Sistem menghitung urutan hari kerja | Nomor hari kerja sesuai | Lulus |
| 10 | buildTestingBusinessTimeline membuat batas fase pengujian dan pelaporan | Tanggal sampel diterima | Sistem membuat timeline batas pengujian | Timeline terbentuk | Lulus |
| 11 | validateWithinBusinessWindow menerima tanggal dalam rentang bisnis | Tanggal di dalam rentang | Sistem menerima tanggal valid | Tanggal diterima | Lulus |
| 12 | validateWithinBusinessWindow menolak tanggal sebelum sampel diterima | Tanggal sebelum penerimaan sampel | Sistem menolak tanggal di luar rentang | Validasi error ditampilkan | Lulus |
| 13 | validateTestingPhaseDate menolak tanggal setelah batas fase pengujian | Tanggal melewati batas pengujian | Sistem menolak tanggal terlambat | Validasi error ditampilkan | Lulus |

## 3. Password Policy Utility

| No | Nama Test Case | Input | Hasil yang Diharapkan | Hasil Sebenarnya | Status |
|---:|---|---|---|---|---|
| 1 | menerima password minimal 8 karakter berisi huruf dan angka | Password 'Sila2026' | Sistem menerima password sesuai policy | Password valid | Lulus |
| 2 | menolak password kurang dari 8 karakter | Password 'Silab1' | Sistem menolak password terlalu pendek | Validasi error ditampilkan | Lulus |
| 3 | menolak password tanpa angka | Password 'silabling' | Sistem menolak password tanpa angka | Validasi error ditampilkan | Lulus |
| 4 | menolak password tanpa huruf | Password '12345678' | Sistem menolak password tanpa huruf | Validasi error ditampilkan | Lulus |
| 5 | assertPasswordPolicy melempar error untuk password tidak sesuai policy | Password tidak memenuhi policy | Sistem melempar validation error | Error ditangkap | Lulus |
| 6 | generateTemporaryPassword selalu memenuhi policy | Generate temporary password | Sistem menghasilkan password sementara valid | Password memenuhi policy | Lulus |
| 7 | menerima username valid | Username 'admin.lab-01' | Sistem menerima username valid | Username valid | Lulus |
| 8 | menghapus spasi di awal dan akhir username | Username '  admin_lab  ' | Sistem melakukan trim username | Username menjadi 'admin_lab' | Lulus |
| 9 | menolak username kosong | Username kosong | Sistem menolak username kosong | Validasi error ditampilkan | Lulus |
| 10 | menolak username yang mengandung spasi | Username 'admin lab' | Sistem menolak spasi di tengah username | Validasi error ditampilkan | Lulus |
| 11 | menolak username diawali titik, strip, atau underscore | Username '.admin', '-admin', '_admin' | Sistem menolak awalan tidak valid | Validasi error ditampilkan | Lulus |
| 12 | menolak username diakhiri titik, strip, atau underscore | Username 'admin.', 'admin-', 'admin_' | Sistem menolak akhiran tidak valid | Validasi error ditampilkan | Lulus |
| 13 | menolak karakter selain huruf, angka, titik, underscore, dan strip | Username 'admin@lab' | Sistem menolak karakter tidak diperbolehkan | Validasi error ditampilkan | Lulus |

## 4. File Signature Utility

| No | Nama Test Case | Input | Hasil yang Diharapkan | Hasil Sebenarnya | Status |
|---:|---|---|---|---|---|
| 1 | menerima PDF berdasarkan magic number %PDF | File .pdf dengan magic number %PDF | Sistem menerima file PDF asli | File diterima | Lulus |
| 2 | menolak file PDF palsu yang isinya bukan PDF | File .pdf dengan isi bukan PDF | Sistem menolak file palsu | Validasi error ditampilkan | Lulus |
| 3 | menerima XLSX/DOCX berbasis ZIP | File Office modern berbasis ZIP | Sistem menerima file valid | File diterima | Lulus |
| 4 | menerima XLS/DOC lama berbasis OLE | File Office lama berbasis OLE | Sistem menerima file valid | File diterima | Lulus |
| 5 | menerima CSV berbasis teks | File .csv teks | Sistem menerima file CSV | File diterima | Lulus |
| 6 | menolak ekstensi yang tidak didukung | File .exe/.bat | Sistem menolak ekstensi tidak didukung | Validasi error ditampilkan | Lulus |

## 5. File Access Token Utility

| No | Nama Test Case | Input | Hasil yang Diharapkan | Hasil Sebenarnya | Status |
|---:|---|---|---|---|---|
| 1 | membuat dan memverifikasi token akses file dengan scope yang benar | Scope dan path file valid | Sistem membuat token dan memverifikasi scope | Token valid | Lulus |
| 2 | menolak token dengan scope yang tidak sesuai | Token scope invoice dipakai untuk LHU | Sistem menolak scope yang salah | Token ditolak | Lulus |
| 3 | menolak token yang sudah kedaluwarsa | Token expired | Sistem menolak token expired | Token ditolak | Lulus |
| 4 | menolak token yang diubah signature-nya | Token dimodifikasi | Sistem menolak signature tidak valid | Token ditolak | Lulus |
| 5 | menolak pembuatan token tanpa scope atau path | Scope/path kosong | Sistem menolak pembuatan token tidak lengkap | Validasi error ditampilkan | Lulus |

## 6. Auth Service

| No | Nama Test Case | Input | Hasil yang Diharapkan | Hasil Sebenarnya | Status |
|---:|---|---|---|---|---|
| 1 | generateToken menghasilkan JWT berisi NIK dan role | Payload user berisi NIK dan role | Sistem menghasilkan JWT dengan claim sesuai | Token terbentuk | Lulus |
| 2 | generateRefreshToken menghasilkan token acak yang panjang | Request refresh token | Sistem menghasilkan token acak panjang | Refresh token terbentuk | Lulus |
| 3 | hashRefreshToken menghasilkan hash sha256 deterministik | Refresh token valid | Sistem menghasilkan hash SHA-256 konsisten | Hash sesuai | Lulus |
| 4 | getRefreshExpiryDate menghasilkan tanggal kedaluwarsa di masa depan | Durasi expiry refresh token | Sistem menghitung tanggal kedaluwarsa | Tanggal expiry valid | Lulus |
| 5 | buildUserPayload menyusun payload user dengan role dan profil pelanggan | Data user + role + profil | Sistem membentuk payload login | Payload sesuai | Lulus |

## 7. Auth Middleware

| No | Nama Test Case | Input | Hasil yang Diharapkan | Hasil Sebenarnya | Status |
|---:|---|---|---|---|---|
| 1 | verifyToken menerima token valid dan mengisi req.user | Request dengan bearer token valid | Middleware mengisi req.user dan melanjutkan request | Request diteruskan | Lulus |
| 2 | verifyToken menolak request tanpa token | Request tanpa bearer token | Middleware menolak request | Status unauthorized dikembalikan | Lulus |
| 3 | authorizeRoles mengizinkan role yang sesuai | User role sesuai whitelist | Middleware melanjutkan request | Request diteruskan | Lulus |
| 4 | authorizeRoles menolak role yang tidak sesuai | User role tidak sesuai whitelist | Middleware menolak request | Status forbidden dikembalikan | Lulus |

## 8. Request Business Flow Service

| No | Nama Test Case | Input | Hasil yang Diharapkan | Hasil Sebenarnya | Status |
|---:|---|---|---|---|---|
| 1 | resolveSamplingType membedakan pengambilan petugas dan mandiri | Jenis pengambilan sampel | Sistem menentukan tipe sampling | Tipe sampling sesuai | Lulus |
| 2 | resolveSamplingSchedule mengisi jadwal pengambilan untuk petugas | Jadwal petugas tersedia | Sistem membaca jadwal pengambilan petugas | Jadwal sesuai | Lulus |
| 3 | resolveSamplingSchedule mengisi estimasi pengantaran untuk sampel mandiri | Estimasi pengantaran pelanggan | Sistem membaca estimasi pengantaran mandiri | Estimasi sesuai | Lulus |
| 4 | resolveSamplingLocation menolak lokasi kosong sesuai jenis pengambilan | Lokasi kosong | Sistem menolak lokasi yang wajib diisi | Validasi error ditampilkan | Lulus |
| 5 | resolveSampleQuantity memakai fallback 1 untuk jumlah sampel kosong atau tidak valid | Jumlah sampel kosong/invalid | Sistem memakai nilai default 1 | Jumlah sampel menjadi 1 | Lulus |
| 6 | deriveCustomerHistoryStatus menjadi menunggu penjadwalan LHU jika semua LHU sudah disahkan | Semua LHU final disahkan | Sistem menampilkan status menunggu penjadwalan LHU | Status sesuai | Lulus |
| 7 | deriveCustomerHistoryStatus menjadi menunggu pengambilan LHU jika jadwal aktif sudah dibuat | Jadwal pengambilan LHU aktif | Sistem menampilkan status menunggu pengambilan LHU | Status sesuai | Lulus |
| 8 | deriveCustomerHistoryStatus menjadi selesai jika LHU sudah diambil | Status LHU sudah diambil | Sistem menampilkan status selesai | Status sesuai | Lulus |
| 9 | deriveCustomerHistoryStatus tidak menimpa status final ditolak/dibatalkan | Permohonan ditolak/dibatalkan | Sistem mempertahankan status final | Status tidak berubah | Lulus |
| 10 | buildPenyeliaRequestSummary merangkum jenis sampel, parameter, dan penugasan | Data permohonan lengkap | Sistem membentuk ringkasan untuk penyelia | Ringkasan sesuai | Lulus |
| 11 | getActiveScheduleFromPayload mengambil jadwal terbaru dan mengabaikan jadwal dibatalkan | Payload berisi jadwal aktif dan batal | Sistem memilih jadwal aktif terbaru | Jadwal sesuai | Lulus |
| 12 | decorateScheduleFields menambahkan jadwal_sampling dari jadwal aktif | Payload permohonan + jadwal aktif | Sistem menambahkan field jadwal sampling | Field jadwal terbentuk | Lulus |
| 13 | decorateSampleReceiptFields menurunkan tanggal dan jam penerimaan dari diterima_pada | Nilai diterima_pada | Sistem menurunkan tanggal dan jam penerimaan | Tanggal/jam sesuai | Lulus |
| 14 | stripCustomerSensitiveLhuData menghapus data LHU dan hasil uji dari payload pelanggan | Payload pelanggan berisi hasil uji | Sistem menghapus data sensitif | Data sensitif tidak tampil | Lulus |
| 15 | buildNoSampel membentuk nomor sampel dengan singkatan jenis sampel dan angka romawi bulan | Jenis sampel + bulan + urutan | Sistem membentuk nomor sampel | Nomor sampel sesuai format | Lulus |
| 16 | resolveTanggalPengambilanSampel memakai tanggal eksplisit sebelum jadwal petugas | Tanggal eksplisit + jadwal petugas | Sistem memprioritaskan tanggal eksplisit | Tanggal sesuai | Lulus |
| 17 | getNextSampleSequence mengambil nomor urut berikutnya dari data sampel existing | Data sampel existing | Sistem menghitung urutan berikutnya | Nomor urut sesuai | Lulus |
| 18 | assertRequestReadyForSampleReceipt menolak jika pembayaran belum selesai | Permohonan belum lunas | Sistem menolak penerimaan sampel | Validasi error ditampilkan | Lulus |
| 19 | assertRequestReadyForSampleReceipt menerima invoice Lunas saat status sudah menunggu sampel | Invoice lunas + status menunggu sampel | Sistem mengizinkan penerimaan sampel | Permohonan diterima | Lulus |

## 9. Payment Business Flow Service

| No | Nama Test Case | Input | Hasil yang Diharapkan | Hasil Sebenarnya | Status |
|---:|---|---|---|---|---|
| 1 | resolvePaymentMethod mengenali QRIS, DANA, dan Bayar Nanti internal | Kode metode pembayaran | Sistem mengenali metode pembayaran | Metode sesuai | Lulus |
| 2 | getAvailablePaymentMethods mengikuti channel Xendit yang dibuka | Daftar channel Xendit | Sistem menampilkan metode tersedia | Metode tersedia sesuai channel | Lulus |
| 3 | getPaymentLifecycleState membedakan pembayaran deferred, settled, expired, active, dan inactive | Status pembayaran berbeda | Sistem memetakan lifecycle pembayaran | Lifecycle sesuai | Lulus |
| 4 | status permohonan hanya boleh maju ke menunggu sampel dari status pembayaran yang benar | Status pembayaran tidak valid/valid | Sistem hanya memajukan status jika pembayaran benar | Status workflow sesuai | Lulus |
| 5 | getLatestPaymentRow mengambil payment terbaru berdasarkan angka ID | Beberapa payment row | Sistem memilih payment terbaru | Payment terbaru sesuai | Lulus |
| 6 | deriveCustomerDecisionStatus menampilkan keputusan pelanggan sesuai status FPPL | Status FPPL | Sistem menampilkan keputusan pembayaran pelanggan | Status sesuai | Lulus |
| 7 | normalizePhoneForXendit mengubah nomor lokal menjadi format +62 | Nomor lokal 08xxxxxxxx | Sistem mengubah menjadi +62 | Nomor sesuai format | Lulus |
| 8 | buildPaymentGatewayPayload mengubah payment row menjadi payload frontend | Payment row database | Sistem membentuk payload frontend | Payload sesuai | Lulus |
| 9 | buildFrontendPaymentStatusUrl membentuk URL kembali ke halaman status pelanggan | Base URL + id pembayaran | Sistem membentuk return URL frontend | URL sesuai | Lulus |
| 10 | buildXenditPaymentSessionPayload membentuk payload sesi QRIS dengan return URL HTTPS | Data invoice/payment | Sistem membentuk payload Xendit QRIS | Payload sesuai | Lulus |

## 10. Assignment Business Flow Service

| No | Nama Test Case | Input | Hasil yang Diharapkan | Hasil Sebenarnya | Status |
|---:|---|---|---|---|---|
| 1 | assertFpmParameterMethodConsistency menerima FPM dengan metode sama | FPM dengan metode uji konsisten | Sistem menerima FPM valid | FPM diterima | Lulus |
| 2 | assertFpmParameterMethodConsistency menolak sampel dalam satu detail dengan metode berbeda | FPM berisi metode berbeda | Sistem menolak FPM tidak konsisten | Validasi error ditampilkan | Lulus |
| 3 | assignmentGroupKey mengelompokkan penugasan berdasarkan registrasi dan metode | Data registrasi + metode | Sistem membuat key pengelompokan penugasan | Key sesuai | Lulus |
| 4 | sortSamplesForAssignment mengurutkan nomor sampel secara numerik | Daftar nomor sampel acak | Sistem mengurutkan sampel | Urutan sesuai | Lulus |
| 5 | getActiveJadwalFromFppl mengambil jadwal aktif terbaru dan mengabaikan yang dibatalkan | FPPL dengan jadwal aktif/batal | Sistem memilih jadwal aktif terbaru | Jadwal sesuai | Lulus |
| 6 | isSubkontrakFpm dan isInternalCapableFpm membaca status subkontrak dari FPM atau parameter metode | FPM internal/subkontrak | Sistem membedakan scope pengujian | Scope sesuai | Lulus |
| 7 | normalizeIdList membersihkan ID duplikat dari array dan string CSV | Array/CSV berisi ID duplikat | Sistem menghapus duplikat | Daftar ID unik | Lulus |
| 8 | uniqueText menggabungkan teks unik untuk tampilan ringkas penugasan | Daftar teks berulang | Sistem menggabungkan teks unik | Teks unik terbentuk | Lulus |
| 9 | isSubkontrakAssignment membedakan penugasan internal dan subkontrak | Data penugasan | Sistem menentukan penugasan subkontrak/internal | Hasil sesuai | Lulus |
| 10 | internalAssignmentWhere dan subkontrakAssignmentWhere membentuk kondisi query scope penugasan | Scope query penugasan | Sistem membentuk kondisi query sesuai scope | Kondisi query sesuai | Lulus |
| 11 | getLkaResultRowsForSample mengambil kode LKA dan detail dari hasil sampel | Nomor sampel valid | Sistem mengambil detail hasil LKA | Data hasil sesuai | Lulus |
| 12 | getLkaResultRowsForSample menolak nomor sampel kosong | Nomor sampel kosong | Sistem menolak input tidak lengkap | Validasi error ditampilkan | Lulus |

## 11. Assignment Status Service

| No | Nama Test Case | Input | Hasil yang Diharapkan | Hasil Sebenarnya | Status |
|---:|---|---|---|---|---|
| 1 | getLkaHasilStatus membaca status camelCase, snake_case, dan fallback | Objek hasil dengan variasi nama status | Sistem membaca status LKA hasil | Status sesuai | Lulus |
| 2 | mapStatusLkaToHasilStatus memetakan status LKA ke status hasil | Status LKA | Sistem memetakan status hasil | Status hasil sesuai | Lulus |
| 3 | hasActiveRevisionForMonitorDetail mendeteksi revisi aktif dari status hasil | Status hasil perlu revisi | Sistem mendeteksi revisi aktif | Revisi terdeteksi | Lulus |
| 4 | hasActiveRevisionForMonitorDetail mengabaikan revisi yang sudah selesai | Status revisi selesai | Sistem tidak menganggap revisi aktif | Revisi diabaikan | Lulus |
| 5 | resolveMonitorDisplayStatus menampilkan Perlu Revisi jika ada revisi aktif | Monitoring dengan revisi aktif | Sistem menampilkan status Perlu Revisi | Status sesuai | Lulus |
| 6 | resolveMonitorDisplayStatus menampilkan Worksheet Terkirim untuk LKA menunggu penyelia | LKA menunggu penyelia | Sistem menampilkan status Worksheet Terkirim | Status sesuai | Lulus |
| 7 | resolveLkaHasilStatus memakai status eksplisit jika tersedia | Hasil dengan status eksplisit | Sistem memakai status eksplisit | Status sesuai | Lulus |
| 8 | resolveLkaHasilStatus menganggap hasil lama yang sudah terisi sebagai disetujui penyelia pada status campuran | Data lama berisi hasil tanpa status lengkap | Sistem memberi fallback status approved penyelia | Status fallback sesuai | Lulus |

## 12. LHU Business Flow Service

| No | Nama Test Case | Input | Hasil yang Diharapkan | Hasil Sebenarnya | Status |
|---:|---|---|---|---|---|
| 1 | isResultApprovedByKasi hanya menerima hasil yang sudah disetujui Kasi Pengujian | Status hasil LKA | Sistem hanya menerima hasil approved Kasi | Hasil approved diterima | Lulus |
| 2 | findApprovedResultForExpectedParameter memilih hasil Kasi terbaru dan mengabaikan hasil belum disetujui Kasi | Beberapa hasil parameter | Sistem memilih hasil approved Kasi terbaru | Hasil sesuai | Lulus |
| 3 | findApprovedResultForExpectedParameter mengembalikan null jika hasil kosong atau belum approved Kasi | Hasil kosong/belum approved | Sistem tidak memakai hasil | Menghasilkan null | Lulus |
| 4 | mapDetailRow membawa hasil, baku mutu, akreditasi, insitu, subkontrak, dan tanggal sampling | Data hasil + parameter | Sistem membentuk detail row LHU | Detail row sesuai | Lulus |
| 5 | groupLhuDetailRowsByParameter menggabungkan hasil beberapa sampel untuk parameter yang sama | Beberapa sampel parameter sama | Sistem mengelompokkan hasil per parameter | Grouping sesuai | Lulus |
| 6 | applyDetailOrder mengurutkan detail berdasarkan urutan_lhu dari payload QC | Payload QC berisi urutan LHU | Sistem mengurutkan detail LHU | Urutan sesuai | Lulus |
| 7 | isEditableByQcStatus hanya true sebelum LHU masuk approval Kalab | Status LHU sebelum/sesudah approval Kalab | Sistem membatasi edit QC | Hak edit sesuai | Lulus |
| 8 | buildDefaultDetailRows membentuk detail awal LHU dari hasil LKA approved | Hasil LKA approved Kasi | Sistem membentuk detail awal LHU | Detail awal sesuai | Lulus |
| 9 | countDetailStats dan calculateAccreditationStats menghitung parameter unik dan logo KAN | Detail parameter LHU | Sistem menghitung statistik akreditasi/logo KAN | Statistik sesuai | Lulus |
| 10 | mapLhuHeaderPayload menggabungkan data LHU, sampel, pelanggan, baku mutu, QC, dan Kalab | Data header LHU | Sistem membentuk payload header LHU | Payload sesuai | Lulus |

## 13. LHU Status Service

| No | Nama Test Case | Input | Hasil yang Diharapkan | Hasil Sebenarnya | Status |
|---:|---|---|---|---|---|
| 1 | isFinalLhuStatus true hanya untuk status LHU final disetujui | Status LHU final/nonfinal | Sistem mengenali status final disetujui | Hasil boolean sesuai | Lulus |
| 2 | isPickedUpStatus true hanya untuk status Sudah Diambil | Status pengambilan LHU | Sistem mengenali status sudah diambil | Hasil boolean sesuai | Lulus |

## 14. Workflow Guard Service

| No | Nama Test Case | Input | Hasil yang Diharapkan | Hasil Sebenarnya | Status |
|---:|---|---|---|---|---|
| 1 | normalizeStatus mengubah alias lama menjadi status aktif | Status lama/alias | Sistem menormalisasi status workflow | Status normal sesuai | Lulus |
| 2 | assertRequestNotCompleted menolak proses ulang permohonan selesai | Permohonan selesai | Sistem menolak proses ulang | Validasi error ditampilkan | Lulus |
| 3 | assertLhuNotPickedUp menolak perubahan saat LHU sudah diambil | LHU sudah diambil pelanggan | Sistem menolak perubahan LHU | Validasi error ditampilkan | Lulus |
| 4 | assertScheduleChangePending hanya menerima pengajuan perubahan jadwal yang masih pending | Perubahan jadwal pending/nonpending | Sistem hanya menerima status pending | Validasi sesuai | Lulus |
| 5 | assertCanApproveScheduleChange menolak approval jadwal LHU jika permohonan selesai | Permohonan selesai | Sistem menolak approval jadwal LHU | Validasi error ditampilkan | Lulus |
| 6 | assertCanApproveScheduleChange menolak approval jadwal LHU jika LHU sudah diambil | LHU sudah diambil | Sistem menolak approval perubahan jadwal | Validasi error ditampilkan | Lulus |
| 7 | assertCanApproveScheduleChange mengizinkan perubahan jadwal sampel ketika permohonan belum selesai | Permohonan belum selesai | Sistem mengizinkan perubahan jadwal sampel | Perubahan diizinkan | Lulus |

## 15. App Health Integration Test

| No | Nama Test Case | Input | Hasil yang Diharapkan | Hasil Sebenarnya | Status |
|---:|---|---|---|---|---|
| 1 | GET /health mengembalikan status OK | Request GET /health | Endpoint mengembalikan status OK | Response OK diterima | Lulus |
| 2 | GET endpoint yang tidak terdaftar mengembalikan 404 JSON | Request ke endpoint tidak terdaftar | Aplikasi mengembalikan 404 JSON | Response 404 sesuai | Lulus |
| 3 | akses langsung ke file invoice lama diblokir saat ENABLE_LEGACY_FILE_STATIC tidak aktif | Request file invoice legacy | Aplikasi memblokir akses file legacy | Akses diblokir | Lulus |

## Rekapitulasi Hasil

| Jenis Pengujian | Jumlah Test Case | Lulus | Gagal |
|---|---:|---:|---:|
| Unit Testing | 135 | 135 | 0 |
| Integration Testing | 3 | 3 | 0 |
| Total | 138 | 138 | 0 |