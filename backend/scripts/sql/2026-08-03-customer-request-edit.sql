ALTER TABLE fppl
    ADD COLUMN versi_data INT UNSIGNED NOT NULL DEFAULT 1
        AFTER status_fppl,

    ADD COLUMN terakhir_diubah_pada DATETIME NULL
        AFTER versi_data,

    ADD COLUMN terakhir_diubah_oleh VARCHAR(16) NULL
        AFTER terakhir_diubah_pada,

    ADD KEY idx_fppl_terakhir_diubah_oleh (
        terakhir_diubah_oleh
    ),

    ADD CONSTRAINT fk_fppl_terakhir_diubah_oleh
        FOREIGN KEY (terakhir_diubah_oleh)
        REFERENCES `user` (nik);
