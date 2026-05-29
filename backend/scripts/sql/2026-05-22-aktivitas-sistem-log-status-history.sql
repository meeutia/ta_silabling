-- =========================================================
-- PATCH: Aktivitas Sistem Log sebagai histori status terpusat
-- Aman dijalankan berkali-kali secara manual dengan cek kolom/index di bawah.
-- Status aktif TETAP berada di tabel transaksi masing-masing.
-- Tabel ini hanya menjadi audit trail/timeline perubahan status.
-- =========================================================

-- Struktur minimal yang harus ada:
-- id_aktivitas_log, entity_type, entity_id, aksi, status_sebelumnya,
-- status_baru, sumber_aksi, catatan, dibuat_oleh, dibuat_pada.

-- Jalankan blok ALTER berikut hanya jika kolomnya belum ada di DB lokalmu.
-- Jika dump DB kamu sudah sama dengan silabling (17).sql, patch ini tidak perlu dijalankan.

-- ALTER TABLE aktivitas_sistem_log
--   ADD COLUMN entity_type VARCHAR(30) NOT NULL AFTER id_aktivitas_log,
--   ADD COLUMN entity_id VARCHAR(30) NOT NULL AFTER entity_type,
--   ADD COLUMN aksi VARCHAR(50) NOT NULL AFTER entity_id,
--   ADD COLUMN status_sebelumnya VARCHAR(50) NULL AFTER aksi,
--   ADD COLUMN status_baru VARCHAR(50) NULL AFTER status_sebelumnya,
--   ADD COLUMN sumber_aksi ENUM('Pelanggan','Admin','Kasi','Penyelia','Analis','QC','Kalab','Sistem') NOT NULL DEFAULT 'Sistem' AFTER status_baru,
--   ADD COLUMN catatan TEXT NULL AFTER sumber_aksi,
--   ADD COLUMN dibuat_oleh VARCHAR(16) NULL AFTER catatan,
--   ADD COLUMN dibuat_pada DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP AFTER dibuat_oleh;

-- Jalankan index berikut hanya jika belum ada.
-- CREATE INDEX idx_aktivitas_entity ON aktivitas_sistem_log (entity_type, entity_id);
-- CREATE INDEX idx_aktivitas_dibuat_pada ON aktivitas_sistem_log (dibuat_pada);
-- CREATE INDEX idx_aktivitas_dibuat_oleh ON aktivitas_sistem_log (dibuat_oleh);
-- CREATE INDEX idx_aktivitas_aksi ON aktivitas_sistem_log (aksi);

-- Catatan desain:
-- 1. Jangan hapus status_fppl, status_payment, status_lhu, status_pengajuan, dst.
-- 2. Business rule tetap membaca status aktif dari tabel transaksi.
-- 3. aktivitas_sistem_log dipakai untuk timeline, audit trail, dan pembuktian perubahan status.
