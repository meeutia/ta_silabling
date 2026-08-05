-- Migrasi penyederhanaan: hanya simpan file_lhu_signed_path di tabel lhu
ALTER TABLE lhu
    ADD COLUMN file_lhu_signed_path VARCHAR(255) NULL
        AFTER file_lhu_path;
