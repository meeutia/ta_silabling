-- 1. Tambah atribut file_lhu_signed_path pada tabel lhu
ALTER TABLE `lhu`
ADD COLUMN `file_lhu_signed_path` VARCHAR(255) NULL DEFAULT NULL AFTER `file_lhu_path`;

-- 2. Buat tabel permintaan_subkontrak dengan struktur terbaru (disederhanakan)
CREATE TABLE `permintaan_subkontrak` (
  `id_permintaan_subkontrak` varchar(16) NOT NULL,
  `id_registrasi` varchar(10) NOT NULL,
  `id_fppl_parameter_metode` varchar(15) NOT NULL,
  `id_parameter` varchar(10) NOT NULL,
  `status_permintaan` enum('MENUNGGU_ADMIN','DISETUJUI','DITOLAK','DIBATALKAN') NOT NULL DEFAULT 'MENUNGGU_ADMIN',
  `diajukan_pada` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `id_metode_parameter` varchar(6) DEFAULT NULL,
  `diproses_pada` datetime DEFAULT NULL,
  `pending_fpm_key` varchar(15) DEFAULT NULL,
  PRIMARY KEY (`id_permintaan_subkontrak`),
  KEY `fk_permintaan_subkontrak_fppl` (`id_registrasi`),
  KEY `fk_permintaan_subkontrak_fpm` (`id_fppl_parameter_metode`),
  KEY `fk_permintaan_subkontrak_parameter` (`id_parameter`),
  KEY `fk_permintaan_subkontrak_metode` (`id_metode_parameter`),
  CONSTRAINT `fk_permintaan_subkontrak_fpm` FOREIGN KEY (`id_fppl_parameter_metode`) REFERENCES `fppl_parameter_metode` (`id_fppl_parameter_metode`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_permintaan_subkontrak_fppl` FOREIGN KEY (`id_registrasi`) REFERENCES `fppl` (`id_registrasi`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_permintaan_subkontrak_metode` FOREIGN KEY (`id_metode_parameter`) REFERENCES `parameter_metode` (`id_metode_parameter`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `fk_permintaan_subkontrak_parameter` FOREIGN KEY (`id_parameter`) REFERENCES `parameter` (`id_parameter`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
