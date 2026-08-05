-- Migrasi penyederhanaan tabel permintaan_subkontrak
-- Hapus kolom catatan_kasi, catatan_admin, diajukan_oleh, diproses_oleh

ALTER TABLE permintaan_subkontrak
    DROP FOREIGN KEY fk_permintaan_subkontrak_pengaju,
    DROP FOREIGN KEY fk_permintaan_subkontrak_pemroses,
    DROP COLUMN catatan_kasi,
    DROP COLUMN catatan_admin,
    DROP COLUMN diajukan_oleh,
    DROP COLUMN diproses_oleh;
