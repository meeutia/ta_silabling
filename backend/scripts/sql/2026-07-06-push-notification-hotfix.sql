-- =============================================================================
-- SILABLING — Push Notification Hotfix
-- File   : 2026-07-06-push-notification-hotfix.sql
-- Dibuat : 2026-07-06
-- Tujuan : Menambahkan index pada kolom push notification di tabel
--          notifikasi_email untuk meningkatkan performa query.
--          Tidak membuat tabel baru. Semua perubahan bersifat ADDITIVE ONLY.
-- Kompatibel: MySQL 8.0+
-- =============================================================================

-- Jalankan di phpMyAdmin: pilih database SILABLING, buka tab SQL, paste lalu Execute.
-- Atau via terminal:
--   mysql -u root -p SILABLING < backend/scripts/sql/2026-07-06-push-notification-hotfix.sql

-- Verifikasi tabel ada sebelum lanjut
SELECT TABLE_NAME, ENGINE
FROM INFORMATION_SCHEMA.TABLES
WHERE TABLE_SCHEMA = DATABASE()
  AND TABLE_NAME = 'notifikasi_email';

-- -----------------------------------------------------------------------------
-- 1. Index pada nik_penerima + id_tipe_notifikasi + push_aktif
--    Digunakan oleh: getActiveSubscriptionRows()
--    Query: WHERE nik_penerima = ? AND id_tipe_notifikasi = 'TN999' AND push_aktif = 1
-- -----------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_push_active_user
  ON notifikasi_email (nik_penerima, id_tipe_notifikasi, push_aktif);

-- -----------------------------------------------------------------------------
-- 2. Index pada push_endpoint (prefix 255 karakter)
--    Digunakan oleh: findExistingSubscriptionRow() dan unsubscribe()
--    Query: WHERE push_endpoint = ?
-- -----------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_push_endpoint
  ON notifikasi_email (push_endpoint(255));

-- -----------------------------------------------------------------------------
-- 3. Index pada nik_penerima + id_tipe_notifikasi + status_pengiriman + dibuat_pada
--    Digunakan oleh: listForCurrentUser() dan countUnreadForCurrentUser()
--    Query: WHERE nik_penerima = ? AND id_tipe_notifikasi != 'TN999' AND status_pengiriman IN (...)
-- -----------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_web_notification_list
  ON notifikasi_email (nik_penerima, id_tipe_notifikasi, status_pengiriman, dibuat_pada);

-- Verifikasi semua index berhasil dibuat
SELECT INDEX_NAME, COLUMN_NAME, SEQ_IN_INDEX, NON_UNIQUE
FROM INFORMATION_SCHEMA.STATISTICS
WHERE TABLE_SCHEMA = DATABASE()
  AND TABLE_NAME = 'notifikasi_email'
  AND INDEX_NAME IN (
    'idx_push_active_user',
    'idx_push_endpoint',
    'idx_web_notification_list'
  )
ORDER BY INDEX_NAME, SEQ_IN_INDEX;
