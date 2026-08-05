-- Migrasi: Sederhanakan tabel permintaan_subkontrak
-- Tanggal: 2026-08-03
-- Perubahan:
--   1. Ubah ENUM status menjadi hanya 3 nilai: MENUNGGU_ADMIN, SELESAI, DITOLAK
--   2. Hapus kolom id_metode_parameter (admin tambah metode langsung via kelola-parameter)
--   3. Hapus kolom pending_fpm_key (tidak diperlukan)
-- Catatan: catatan_kasi dan catatan_admin sudah dihapus di migrasi sebelumnya (2026-08-02)

-- Langkah 1: Ubah ENUM status (MySQL tidak bisa langsung ubah ENUM, harus MODIFY)
ALTER TABLE permintaan_subkontrak
    MODIFY COLUMN status_permintaan ENUM('MENUNGGU_ADMIN', 'SELESAI', 'DITOLAK')
        NOT NULL DEFAULT 'MENUNGGU_ADMIN';

-- Langkah 2: Hapus kolom yang tidak diperlukan
-- 2a: Hapus foreign key dulu sebelum drop kolom
ALTER TABLE permintaan_subkontrak DROP FOREIGN KEY fk_permintaan_subkontrak_metode;
ALTER TABLE permintaan_subkontrak DROP COLUMN id_metode_parameter;

-- 2b & 2c: Hapus kolom lain (abaikan error jika sudah tidak ada)
ALTER TABLE permintaan_subkontrak DROP COLUMN pending_fpm_key;
ALTER TABLE permintaan_subkontrak DROP COLUMN catatan_kasi;
