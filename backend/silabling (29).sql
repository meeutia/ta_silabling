-- phpMyAdmin SQL Dump
-- version 5.2.0
-- https://www.phpmyadmin.net/
--
-- Host: localhost:3306
-- Generation Time: Aug 02, 2026 at 02:50 PM
-- Server version: 8.0.30
-- PHP Version: 8.1.10

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
START TRANSACTION;
SET time_zone = "+00:00";


/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;

--
-- Database: `silabling`
--

-- --------------------------------------------------------

--
-- Table structure for table `aktivitas_sistem_log`
--

CREATE TABLE `aktivitas_sistem_log` (
  `id_aktivitas_log` varchar(13) NOT NULL,
  `entity_type` varchar(30) NOT NULL,
  `entity_id` varchar(30) NOT NULL,
  `aksi` varchar(50) NOT NULL,
  `status_sebelumnya` varchar(50) DEFAULT NULL,
  `status_baru` varchar(50) DEFAULT NULL,
  `sumber_aksi` enum('Pelanggan','Admin','Kasi','Penyelia','Analis','QC','Sistem') NOT NULL DEFAULT 'Sistem',
  `catatan` text,
  `dibuat_oleh` varchar(16) DEFAULT NULL,
  `dibuat_pada` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

--
-- Dumping data for table `aktivitas_sistem_log`
--

INSERT INTO `aktivitas_sistem_log` (`id_aktivitas_log`, `entity_type`, `entity_id`, `aksi`, `status_sebelumnya`, `status_baru`, `sumber_aksi`, `catatan`, `dibuat_oleh`, `dibuat_pada`) VALUES
('LOG-000000001', 'FPPL', 'REG-001', 'MEMBUAT_PERMOHONAN', NULL, 'Menunggu Verifikasi', 'Pelanggan', 'Permohonan dibuat oleh pelanggan.', '1146658392983864', '2026-07-09 20:10:36'),
('LOG-000000002', 'FPPL', 'REG-001', 'MEMVERIFIKASI_PERMOHONAN', 'Menunggu Verifikasi', 'Menunggu Penentuan Metode', 'Admin', 'Permohonan disetujui admin dan dilanjutkan ke penentuan metode.', '3171075704040002', '2026-07-09 20:17:15'),
('LOG-000000003', 'FPPL', 'REG-001', 'MEMPERBARUI_STATUS_PERMOHONAN', 'Menunggu Verifikasi', 'Menunggu Penentuan Metode', 'Sistem', NULL, NULL, '2026-07-09 20:17:15'),
('LOG-000000004', 'FPPL', 'REG-001', 'MENETAPKAN_METODE_DAN_INVOICE', 'Menunggu Penentuan Metode', 'Menunggu Pembayaran', 'Kasi', 'Kasi Pengujian menetapkan metode uji dan sistem menerbitkan invoice.', '3171075704040009', '2026-07-09 20:52:59'),
('LOG-000000005', 'INVOICE', 'INV-001', 'MEMBUAT_INVOICE', NULL, 'Belum Dibayar', 'Sistem', 'Invoice dibuat untuk permohonan.', NULL, '2026-07-09 20:52:59'),
('LOG-000000006', 'INVOICE', 'INV-001', 'MEMPERBARUI_INVOICE', NULL, 'Belum Dibayar', 'Sistem', 'Invoice diperbarui untuk permohonan.', NULL, '2026-07-09 20:52:59'),
('LOG-000000007', 'PAYMENT', 'PAY-001', 'MEMBAYAR_INVOICE', NULL, NULL, 'Pelanggan', 'Pelanggan melakukan pembayaran.', '1146658392983864', '2026-07-09 20:58:22'),
('LOG-000000008', 'FPPL', 'REG-001', 'PEMBAYARAN_DIKONFIRMASI', 'Menunggu Pembayaran', 'Menunggu Pengambilan Sampel', 'Sistem', 'Pembayaran dikonfirmasi otomatis oleh payment gateway.', NULL, '2026-07-09 20:59:08'),
('LOG-000000009', 'JADWAL_SAMPEL', 'JDW-001', 'MEMBUAT_JADWAL_SAMPEL', NULL, 'Terjadwal', 'Admin', 'Jadwal pengambilan sampel dibuat.', NULL, '2026-07-09 21:03:27'),
('LOG-000000010', 'SAMPEL', '1/DN/VII/2026', 'MENERIMA_SAMPEL', NULL, 'Diterima', 'Admin', 'Sampel diterima oleh laboratorium.', '3171075704040002', '2026-07-09 21:39:16'),
('LOG-000000011', 'JADWAL_SAMPEL', 'JDW-001', 'MENYELESAIKAN_JADWAL_SAMPEL', 'Terjadwal', 'Selesai', 'Admin', 'Jadwal sampel diselesaikan saat sampel diterima.', '3171075704040002', '2026-07-09 21:39:17'),
('LOG-000000012', 'FPPL', 'REG-001', 'MENERIMA_SAMPEL', 'Menunggu Pengambilan Sampel', 'Proses Pengujian', 'Admin', 'Sampel diterima dan nomor sampel dibuat.', '3171075704040002', '2026-07-09 21:39:17'),
('LOG-000000013', 'FPPL', 'REG-002', 'MEMBUAT_PERMOHONAN', NULL, 'Menunggu Verifikasi', 'Pelanggan', 'Permohonan dibuat oleh pelanggan.', '1146658392983864', '2026-07-09 22:05:12'),
('LOG-000000014', 'FPPL', 'REG-002', 'MEMVERIFIKASI_PERMOHONAN', 'Menunggu Verifikasi', 'Menunggu Penentuan Metode', 'Admin', 'Permohonan disetujui admin dan dilanjutkan ke penentuan metode.', '3171075704040002', '2026-07-09 22:07:55'),
('LOG-000000015', 'FPPL', 'REG-002', 'MEMVERIFIKASI_PERMOHONAN', 'Menunggu Verifikasi', 'Menunggu Penentuan Metode', 'Admin', 'Permohonan disetujui admin dan dilanjutkan ke penentuan metode.', '3171075704040002', '2026-07-09 22:17:51'),
('LOG-000000016', 'FPPL', 'REG-002', 'MEMVERIFIKASI_PERMOHONAN', 'Menunggu Verifikasi', 'Menunggu Penentuan Metode', 'Admin', 'Permohonan disetujui admin dan dilanjutkan ke penentuan metode.', '3171075704040002', '2026-07-09 22:23:59'),
('LOG-000000017', 'FPPL', 'REG-002', 'MENETAPKAN_METODE_DAN_INVOICE', 'Menunggu Penentuan Metode', 'Menunggu Pembayaran', 'Kasi', 'Kasi Pengujian menetapkan metode uji dan sistem menerbitkan invoice.', '3171075704040009', '2026-07-09 22:25:27'),
('LOG-000000018', 'INVOICE', 'INV-002', 'MEMBUAT_INVOICE', NULL, 'Belum Dibayar', 'Sistem', 'Invoice dibuat untuk permohonan.', NULL, '2026-07-09 22:25:27'),
('LOG-000000019', 'FPPL', 'REG-002', 'MEMPERBARUI_STATUS_PERMOHONAN', 'Menunggu Verifikasi', 'Menunggu Pembayaran', 'Sistem', NULL, NULL, '2026-07-09 22:23:59'),
('LOG-000000020', 'INVOICE', 'INV-002', 'MEMPERBARUI_INVOICE', NULL, 'Belum Dibayar', 'Sistem', 'Invoice diperbarui untuk permohonan.', NULL, '2026-07-09 22:25:27'),
('LOG-000000021', 'PAYMENT', 'PAY-002', 'MEMBAYAR_INVOICE', NULL, NULL, 'Pelanggan', 'Pelanggan melakukan pembayaran.', '1146658392983864', '2026-07-09 22:47:17'),
('LOG-000000022', 'FPPL', 'REG-002', 'PEMBAYARAN_DIKONFIRMASI', 'Menunggu Pembayaran', 'Menunggu Pengambilan Sampel', 'Sistem', 'Pembayaran dikonfirmasi otomatis oleh payment gateway.', NULL, '2026-07-09 22:47:31'),
('LOG-000000023', 'JADWAL_SAMPEL', 'JDW-002', 'MEMBUAT_JADWAL_SAMPEL', NULL, 'Terjadwal', 'Admin', 'Jadwal pengambilan sampel dibuat.', NULL, '2026-07-09 22:48:32'),
('LOG-000000024', 'SAMPEL', '2/DN/VII/2026', 'MENERIMA_SAMPEL', NULL, 'Diterima', 'Admin', 'Sampel diterima oleh laboratorium.', '3171075704040002', '2026-07-09 22:51:35'),
('LOG-000000025', 'SAMPEL', '3/DN/VII/2026', 'MENERIMA_SAMPEL', NULL, 'Diterima', 'Admin', 'Sampel diterima oleh laboratorium.', '3171075704040002', '2026-07-09 22:51:35'),
('LOG-000000026', 'SAMPEL', '4/LT/VII/2026', 'MENERIMA_SAMPEL', NULL, 'Diterima', 'Admin', 'Sampel diterima oleh laboratorium.', '3171075704040002', '2026-07-09 22:51:35'),
('LOG-000000027', 'JADWAL_SAMPEL', 'JDW-002', 'MENYELESAIKAN_JADWAL_SAMPEL', 'Terjadwal', 'Selesai', 'Admin', 'Jadwal sampel diselesaikan saat sampel diterima.', '3171075704040002', '2026-07-09 22:51:35'),
('LOG-000000028', 'FPPL', 'REG-002', 'MENERIMA_SAMPEL', 'Menunggu Pengambilan Sampel', 'Proses Pengujian', 'Admin', 'Sampel diterima dan nomor sampel dibuat.', '3171075704040002', '2026-07-09 22:51:35'),
('LOG-000000029', 'FPPL', 'REG-003', 'MEMBUAT_PERMOHONAN', NULL, 'Menunggu Verifikasi', 'Pelanggan', 'Permohonan dibuat oleh pelanggan.', '1146658392983864', '2026-07-10 05:41:14'),
('LOG-000000030', 'FPPL', 'REG-003', 'MEMVERIFIKASI_PERMOHONAN', 'Menunggu Verifikasi', 'Menunggu Penentuan Metode', 'Admin', 'Permohonan disetujui admin dan dilanjutkan ke penentuan metode.', '3171075704040002', '2026-07-10 05:41:49'),
('LOG-000000031', 'FPPL', 'REG-003', 'MEMPERBARUI_STATUS_PERMOHONAN', 'Menunggu Verifikasi', 'Menunggu Penentuan Metode', 'Sistem', NULL, NULL, '2026-07-10 05:41:49'),
('LOG-000000032', 'PENUGASAN', 'PNG-0001', 'MEMBUAT_PENUGASAN', NULL, 'Aktif', 'Penyelia', 'Penugasan pengujian dibuat.', '3171075704040004', '2026-07-10 06:01:53'),
('LOG-000000033', 'PENUGASAN_DETAIL', 'PD-00001', 'MEMBUAT_DETAIL_PENUGASAN', NULL, 'Ditugaskan', 'Penyelia', 'Detail penugasan dibuat untuk 1 sampel.', '3171075704040004', '2026-07-10 06:01:53'),
('LOG-000000034', 'PENUGASAN_DETAIL', 'PD-00002', 'MEMBUAT_DETAIL_PENUGASAN', NULL, 'Ditugaskan', 'Penyelia', 'Detail penugasan dibuat untuk 1 sampel.', '3171075704040004', '2026-07-10 06:01:53'),
('LOG-000000035', 'PENUGASAN_DETAIL', 'PD-00003', 'MEMBUAT_DETAIL_PENUGASAN', NULL, 'Ditugaskan', 'Penyelia', 'Detail penugasan dibuat untuk 1 sampel.', '3171075704040004', '2026-07-10 06:01:53'),
('LOG-000000036', 'PENUGASAN_DETAIL', 'PD-00004', 'MEMBUAT_DETAIL_PENUGASAN', NULL, 'Ditugaskan', 'Penyelia', 'Detail penugasan dibuat untuk 1 sampel.', '3171075704040004', '2026-07-10 06:01:53'),
('LOG-000000037', 'PENUGASAN_DETAIL', 'PD-00005', 'MEMBUAT_DETAIL_PENUGASAN', NULL, 'Ditugaskan', 'Penyelia', 'Detail penugasan dibuat untuk 1 sampel.', '3171075704040004', '2026-07-10 06:01:53'),
('LOG-000000038', 'PENUGASAN', 'PNG-0001', 'MEMBUAT_PENUGASAN', NULL, 'Aktif', 'Penyelia', 'Penugasan pengujian dibuat.', '3171075704040004', '2026-07-10 06:40:41'),
('LOG-000000039', 'PENUGASAN_DETAIL', 'PD-00001', 'MEMBUAT_DETAIL_PENUGASAN', NULL, 'Ditugaskan', 'Penyelia', 'Detail penugasan dibuat untuk 1 sampel.', '3171075704040004', '2026-07-10 06:40:41'),
('LOG-000000040', 'PENUGASAN_DETAIL', 'PD-00002', 'MEMBUAT_DETAIL_PENUGASAN', NULL, 'Ditugaskan', 'Penyelia', 'Detail penugasan dibuat untuk 1 sampel.', '3171075704040004', '2026-07-10 06:40:41'),
('LOG-000000041', 'PENUGASAN_DETAIL', 'PD-00003', 'MEMBUAT_DETAIL_PENUGASAN', NULL, 'Ditugaskan', 'Penyelia', 'Detail penugasan dibuat untuk 1 sampel.', '3171075704040004', '2026-07-10 06:40:41'),
('LOG-000000042', 'PENUGASAN_DETAIL', 'PD-00004', 'MEMBUAT_DETAIL_PENUGASAN', NULL, 'Ditugaskan', 'Penyelia', 'Detail penugasan dibuat untuk 2 sampel.', '3171075704040004', '2026-07-10 06:40:41'),
('LOG-000000043', 'LKA', 'LKA-00001', 'MELAPORKAN_LKA', NULL, 'Menunggu Verifikasi Penyelia', 'Analis', 'Analis mengirim LKA ke Penyelia.', '3171075704040005', '2026-07-10 06:58:15'),
('LOG-000000044', 'LKA_REVISI', 'RVL-000001', 'HASIL_SEBELUM_REVISI', '3', NULL, 'Penyelia', '{\"kode_lka\":\"LKA-00001\",\"no_sampel\":\"3/DN/VII/2026\",\"hasil\":\"3\",\"catatan_hasil\":null}', '3171075704040004', '2026-07-10 07:52:25'),
('LOG-000000045', 'LKA_REVISI', 'RVL-000001', 'REVISI_LKA_DIAJUKAN_PENYELIA', NULL, 'Dikirim ke Analis', 'Penyelia', 'kurang sesuai', '3171075704040004', '2026-07-10 07:52:25'),
('LOG-000000046', 'LKA_REVISI', 'RVL-000001', 'HASIL_SETELAH_REVISI', NULL, '30', 'Analis', '{\"kode_lka\":\"LKA-00001\",\"no_sampel\":\"3/DN/VII/2026\",\"hasil\":\"30\",\"catatan_hasil\":null}', NULL, '2026-07-10 07:53:06'),
('LOG-000000047', 'LKA', 'LKA-00001', 'MELAPORKAN_LKA', NULL, 'Menunggu Verifikasi Penyelia', 'Analis', 'Analis mengirim LKA ke Penyelia.', '3171075704040005', '2026-07-10 07:53:06'),
('LOG-000000048', 'LKA', 'LKA-00002', 'MELAPORKAN_LKA', NULL, 'Menunggu Verifikasi Penyelia', 'Analis', 'Analis mengirim LKA ke Penyelia.', '3171075704040005', '2026-07-10 07:56:24'),
('LOG-000000049', 'LKA', 'LKA-00003', 'MELAPORKAN_LKA', NULL, 'Menunggu Verifikasi Penyelia', 'Analis', 'Analis mengirim LKA ke Penyelia.', '3171075704040005', '2026-07-10 07:57:03'),
('LOG-000000050', 'LKA', 'LKA-00004', 'MELAPORKAN_LKA', NULL, 'Menunggu Verifikasi Penyelia', 'Analis', 'Analis mengirim LKA ke Penyelia.', '3171075704040005', '2026-07-10 08:05:34'),
('LOG-000000051', 'PENUGASAN', 'PNG-0002', 'MEMBUAT_PENUGASAN', NULL, 'Aktif', 'Penyelia', 'Penugasan pengujian dibuat.', '3171075704040004', '2026-07-10 08:23:58'),
('LOG-000000052', 'PENUGASAN_DETAIL', 'PD-00005', 'MEMBUAT_DETAIL_PENUGASAN', NULL, 'Ditugaskan', 'Penyelia', 'Detail penugasan dibuat untuk 1 sampel.', '3171075704040004', '2026-07-10 08:23:58'),
('LOG-000000053', 'PENUGASAN_DETAIL', 'PD-00006', 'MEMBUAT_DETAIL_PENUGASAN', NULL, 'Ditugaskan', 'Penyelia', 'Detail penugasan dibuat untuk 1 sampel.', '3171075704040004', '2026-07-10 08:23:58'),
('LOG-000000054', 'PENUGASAN_DETAIL', 'PD-00007', 'MEMBUAT_DETAIL_PENUGASAN', NULL, 'Ditugaskan', 'Penyelia', 'Detail penugasan dibuat untuk 3 sampel.', '3171075704040004', '2026-07-10 08:23:58'),
('LOG-000000055', 'LKA', 'LKA-00005', 'MELAPORKAN_LKA', NULL, 'Menunggu Verifikasi Penyelia', 'Analis', 'Analis mengirim LKA ke Penyelia.', '3171075704040005', '2026-07-10 08:26:38'),
('LOG-000000056', 'LKA_REVISI', 'RVL-000002', 'HASIL_SEBELUM_REVISI', '3', NULL, 'Penyelia', '{\"kode_lka\":\"LKA-00005\",\"no_sampel\":\"2/DN/VII/2026\",\"hasil\":\"3\",\"catatan_hasil\":null}', '3171075704040004', '2026-07-10 08:27:39'),
('LOG-000000057', 'LKA_REVISI', 'RVL-000002', 'REVISI_LKA_DIAJUKAN_PENYELIA', NULL, 'Dikirim ke Analis', 'Penyelia', 'kurang tepat', '3171075704040004', '2026-07-10 08:27:39'),
('LOG-000000058', 'LKA_REVISI', 'RVL-000002', 'HASIL_SETELAH_REVISI', NULL, '3,9', 'Analis', '{\"kode_lka\":\"LKA-00005\",\"no_sampel\":\"2/DN/VII/2026\",\"hasil\":\"3,9\",\"catatan_hasil\":null}', NULL, '2026-07-10 09:38:28'),
('LOG-000000059', 'LKA', 'LKA-00005', 'MELAPORKAN_LKA', NULL, 'Menunggu Verifikasi Penyelia', 'Analis', 'Analis mengirim LKA ke Penyelia.', '3171075704040005', '2026-07-10 09:38:28'),
('LOG-000000060', 'LKA', 'LKA-00006', 'MELAPORKAN_LKA', NULL, 'Menunggu Verifikasi Penyelia', 'Analis', 'Analis mengirim LKA ke Penyelia.', '3171075704040005', '2026-07-10 09:39:03'),
('LOG-000000061', 'LKA', 'LKA-00007', 'MELAPORKAN_LKA', NULL, 'Menunggu Verifikasi Penyelia', 'Analis', 'Analis mengirim LKA ke Penyelia.', '3171075704040005', '2026-07-10 09:40:41'),
('LOG-000000062', 'LKA_REVISI', 'RVL-000003', 'HASIL_SEBELUM_REVISI', '19', NULL, 'Kasi', '{\"kode_lka\":\"LKA-00002\",\"no_sampel\":\"2/DN/VII/2026\",\"hasil\":\"19\",\"catatan_hasil\":null}', '3171075704040009', '2026-07-10 09:45:34'),
('LOG-000000063', 'LKA_REVISI', 'RVL-000003', 'HASIL_SETELAH_REVISI', NULL, '1,9', 'Analis', '{\"kode_lka\":\"LKA-00002\",\"no_sampel\":\"2/DN/VII/2026\",\"hasil\":\"1,9\",\"catatan_hasil\":null}', NULL, '2026-07-10 09:49:08'),
('LOG-000000064', 'LKA', 'LKA-00002', 'MELAPORKAN_LKA', NULL, 'Menunggu Verifikasi Penyelia', 'Analis', 'Analis mengirim LKA ke Penyelia.', '3171075704040005', '2026-07-10 09:49:08'),
('LOG-000000065', 'LHU', '01/LHU/VII/LAB-2026', 'MENYIMPAN_URUTAN_DETAIL_LHU', NULL, NULL, 'QC', '{\"detailOrder\":[{\"urutanLhu\":1,\"detailKey\":\"FPM-002-01-03\",\"idFpplParameterMetode\":\"FPM-002-01-03\",\"idMetodeParameter\":\"MP0007\",\"idParameter\":\"PR0007\",\"namaParameter\":\"Kebutuhan Oksigen Biokimiawi (BOD)\",\"namaMetode\":\"Titrimetri\",\"acuanMetode\":\"SNI 6989.72:2009\"},{\"urutanLhu\":2,\"detailKey\":\"FPM-002-01-02\",\"idFpplParameterMetode\":\"FPM-002-01-02\",\"idMetodeParameter\":\"MP0041\",\"idParameter\":\"PR0033\",\"namaParameter\":\"Arsen (As)\",\"namaMetode\":\"Spektrofotometri (AAS)-GF\",\"acuanMetode\":\"SNI 06-6989.54-2005\"},{\"urutanLhu\":3,\"detailKey\":\"FPM-002-01-01\",\"idFpplParameterMetode\":\"FPM-002-01-01\",\"idMetodeParameter\":\"MP0047\",\"idParameter\":\"PR0011\",\"namaParameter\":\"Amoniak\",\"namaMetode\":\"Spektrofotometri (UV-Vis)\",\"acuanMetode\":\"SNI 19-6964.3-2003\"}]}', '312131131415759', '2026-07-10 09:54:36'),
('LOG-000000066', 'LHU', '01/LHU/VII/LAB-2026', 'MEMBUAT_LHU_FINAL', NULL, 'Disahkan', 'QC', 'LHU multi-sampel dibuat dan langsung disahkan oleh QC.', '312131131415759', '2026-07-10 09:54:37'),
('LOG-000000067', 'FPPL', 'REG-002', 'MENUNGGU_PENJADWALAN_LHU', 'Proses Pengujian', 'Menunggu Penjadwalan LHU', 'Sistem', 'Semua LHU pada permohonan sudah disahkan. Menunggu admin menjadwalkan pengambilan LHU.', NULL, '2026-07-10 09:54:37'),
('LOG-000000068', 'LHU', '01/LHU/VII/LAB-2026', 'MENYIMPAN_URUTAN_DETAIL_LHU', NULL, NULL, 'QC', '{\"detailOrder\":[{\"urutanLhu\":1,\"detailKey\":\"FPM-002-01-02\",\"idFpplParameterMetode\":\"FPM-002-01-02\",\"idMetodeParameter\":\"MP0041\",\"idParameter\":\"PR0033\",\"namaParameter\":\"Arsen (As)\",\"namaMetode\":\"Spektrofotometri (AAS)-GF\",\"acuanMetode\":\"SNI 06-6989.54-2005\"},{\"urutanLhu\":2,\"detailKey\":\"FPM-002-01-03\",\"idFpplParameterMetode\":\"FPM-002-01-03\",\"idMetodeParameter\":\"MP0007\",\"idParameter\":\"PR0007\",\"namaParameter\":\"Kebutuhan Oksigen Biokimiawi (BOD)\",\"namaMetode\":\"Titrimetri\",\"acuanMetode\":\"SNI 6989.72:2009\"},{\"urutanLhu\":3,\"detailKey\":\"FPM-002-01-01\",\"idFpplParameterMetode\":\"FPM-002-01-01\",\"idMetodeParameter\":\"MP0047\",\"idParameter\":\"PR0011\",\"namaParameter\":\"Amoniak\",\"namaMetode\":\"Spektrofotometri (UV-Vis)\",\"acuanMetode\":\"SNI 19-6964.3-2003\"}]}', '312131131415759', '2026-07-10 10:18:18'),
('LOG-000000069', 'LHU', '01/LHU/VII/LAB-2026', 'MEMBUAT_LHU_FINAL', NULL, 'Disahkan', 'QC', 'LHU multi-sampel dibuat dan langsung disahkan oleh QC.', '312131131415759', '2026-07-10 10:18:19'),
('LOG-000000070', 'LHU', '02/LHU/VII/LAB-2026', 'MENYIMPAN_URUTAN_DETAIL_LHU', NULL, NULL, 'QC', '{\"detailOrder\":[{\"urutanLhu\":1,\"detailKey\":\"FPM-002-02-05\",\"idFpplParameterMetode\":\"FPM-002-02-05\",\"idMetodeParameter\":\"MP0053\",\"idParameter\":\"PR0038\",\"namaParameter\":\"Lapisan Minyak\",\"namaMetode\":\"Visual\",\"acuanMetode\":\"-\"},{\"urutanLhu\":2,\"detailKey\":\"FPM-002-02-04\",\"idFpplParameterMetode\":\"FPM-002-02-04\",\"idMetodeParameter\":\"MP9001\",\"idParameter\":\"PR0006\",\"namaParameter\":\"Oksigen Terlarut (DO)\",\"namaMetode\":\"DO Meter\",\"acuanMetode\":\"-\"}]}', '312131131415759', '2026-07-10 10:32:42'),
('LOG-000000071', 'LHU', '02/LHU/VII/LAB-2026', 'MEMBUAT_LHU_FINAL', NULL, 'Disahkan', 'QC', 'LHU multi-sampel dibuat dan langsung disahkan oleh QC.', '312131131415759', '2026-07-10 10:32:42'),
('LOG-000000072', 'LHU', '03/LHU/VII/LAB-2026', 'MENYIMPAN_URUTAN_DETAIL_LHU', NULL, NULL, 'QC', '{\"detailOrder\":[{\"urutanLhu\":1,\"detailKey\":\"FPM-001-01-02\",\"idFpplParameterMetode\":\"FPM-001-01-02\",\"idMetodeParameter\":\"MP0041\",\"idParameter\":\"PR0033\",\"namaParameter\":\"Arsen (As)\",\"namaMetode\":\"Spektrofotometri (AAS)-GF\",\"acuanMetode\":\"SNI 06-6989.54-2005\"},{\"urutanLhu\":2,\"detailKey\":\"FPM-001-01-01\",\"idFpplParameterMetode\":\"FPM-001-01-01\",\"idMetodeParameter\":\"MP0011\",\"idParameter\":\"PR0011\",\"namaParameter\":\"Amoniak\",\"namaMetode\":\"Spektrofotometri (UV-Vis)\",\"acuanMetode\":\"SNI 06-6989.30-2005\"}]}', '312131131415759', '2026-07-10 10:37:26'),
('LOG-000000073', 'LHU', '03/LHU/VII/LAB-2026', 'MEMBUAT_LHU_FINAL', NULL, 'Disahkan', 'QC', 'LHU multi-sampel dibuat dan langsung disahkan oleh QC.', '312131131415759', '2026-07-10 10:37:26'),
('LOG-000000074', 'FPPL', 'REG-001', 'MENUNGGU_PENJADWALAN_LHU', 'Proses Pengujian', 'Menunggu Penjadwalan LHU', 'Sistem', 'Semua LHU pada permohonan sudah disahkan. Menunggu admin menjadwalkan pengambilan LHU.', NULL, '2026-07-10 10:37:26'),
('LOG-000000075', 'LKA', 'LKA-00003', 'MEMERIKSA_LKA', NULL, 'Disetujui Kasi Pengujian', 'Penyelia', 'Penyelia memeriksa LKA.', '3171075704040004', '2026-07-10 07:00:00'),
('LOG-000000076', 'LKA', 'LKA-00005', 'MEMERIKSA_LKA', NULL, 'Disetujui Kasi Pengujian', 'Penyelia', 'Penyelia memeriksa LKA.', '3171075704040004', '2026-07-10 07:00:00'),
('LOG-000000077', 'LHU', '03/LHU/VII/LAB-2026', 'MEMBUAT_LHU', NULL, 'Disahkan', 'Sistem', 'Draft/finalisasi LHU dibuat.', NULL, '2026-07-10 10:37:26'),
('LOG-000000078', 'LHU', '03/LHU/VII/LAB-2026', 'QC_MENYETUJUI_LHU', NULL, 'Disahkan', 'QC', 'LHU disetujui oleh Pengendalian Mutu.', '312131131415759', '2026-07-10 10:37:26'),
('LOG-000000079', 'FPPL', 'REG-001', 'MENUNGGU_PENGAMBILAN_LHU', 'Menunggu Penjadwalan LHU', 'Menunggu Pengambilan LHU', 'Admin', 'Jadwal pengambilan LHU sudah dibuat admin.', '3171075704040002', '2026-07-10 10:39:11'),
('LOG-000000080', 'JADWAL_LHU', 'JPL-000001', 'MENJADWALKAN_PENGAMBILAN_LHU', NULL, 'Dijadwalkan', 'Admin', 'Jadwal pengambilan LHU dibuat.', '3171075704040002', '2026-07-10 10:39:11'),
('LOG-000000081', 'LKA', 'LKA-00002', 'MEMERIKSA_LKA', NULL, 'Disetujui Kasi Pengujian', 'Penyelia', 'Penyelia memeriksa LKA.', '3171075704040004', '2026-07-10 07:00:00'),
('LOG-000000082', 'LKA', 'LKA-00001', 'MEMERIKSA_LKA', NULL, 'Disetujui Kasi Pengujian', 'Penyelia', 'Penyelia memeriksa LKA.', '3171075704040004', '2026-07-10 07:00:00'),
('LOG-000000083', 'LKA', 'LKA-00006', 'MEMERIKSA_LKA', NULL, 'Disetujui Kasi Pengujian', 'Penyelia', 'Penyelia memeriksa LKA.', '3171075704040004', '2026-07-10 07:00:00'),
('LOG-000000084', 'LKA', 'LKA-00004', 'MEMERIKSA_LKA', NULL, 'Disetujui Kasi Pengujian', 'Penyelia', 'Penyelia memeriksa LKA.', '3171075704040004', '2026-07-10 07:00:00'),
('LOG-000000085', 'LKA', 'LKA-00007', 'MEMERIKSA_LKA', NULL, 'Disetujui Kasi Pengujian', 'Penyelia', 'Penyelia memeriksa LKA.', '3171075704040004', '2026-07-10 07:00:00'),
('LOG-000000086', 'LKA_REVISI', 'RVL-000003', 'REVISI_LKA_DIAJUKAN_KASI', NULL, 'Disetujui Kasi', 'Kasi', 'ini periksa ulang', '3171075704040009', '2026-07-10 09:45:34'),
('LOG-000000087', 'LKA_REVISI', 'RVL-000003', 'REVISI_LKA_DITINJAU_PENYELIA', 'Menunggu Persetujuan Penyelia', 'Disetujui Kasi', 'Penyelia', NULL, '3171075704040004', '2026-07-10 09:48:44'),
('LOG-000000088', 'LHU', '01/LHU/VII/LAB-2026', 'MEMBUAT_LHU', NULL, 'Disahkan', 'Sistem', 'Draft/finalisasi LHU dibuat.', NULL, '2026-07-10 10:18:18'),
('LOG-000000089', 'LHU', '01/LHU/VII/LAB-2026', 'QC_MENYETUJUI_LHU', NULL, 'Disahkan', 'QC', 'LHU disetujui oleh Pengendalian Mutu.', '312131131415759', '2026-07-10 10:18:18'),
('LOG-000000090', 'LHU', '02/LHU/VII/LAB-2026', 'MEMBUAT_LHU', NULL, 'Disahkan', 'Sistem', 'Draft/finalisasi LHU dibuat.', NULL, '2026-07-10 10:32:42'),
('LOG-000000091', 'LHU', '02/LHU/VII/LAB-2026', 'QC_MENYETUJUI_LHU', NULL, 'Disahkan', 'QC', 'LHU disetujui oleh Pengendalian Mutu.', '312131131415759', '2026-07-10 10:32:42'),
('LOG-000000092', 'FPPL', 'REG-004', 'MEMBUAT_PERMOHONAN', NULL, 'Menunggu Verifikasi', 'Pelanggan', 'Permohonan dibuat oleh pelanggan.', '3171803823927329', '2026-07-16 08:29:42'),
('LOG-000000093', 'JADWAL_LHU', 'JPL-000001', 'LHU_DIAMBIL_PELANGGAN', 'Sudah Diambil', 'Sudah Diambil', 'Admin', 'LHU diambil oleh Bu Wati.', '3171075704040002', '2026-07-16 08:31:07'),
('LOG-000000094', 'FPPL', 'REG-001', 'MENYELESAIKAN_PERMOHONAN', 'Menunggu Pengambilan LHU', 'Selesai', 'Admin', 'Permohonan selesai setelah LHU diambil.', '3171075704040002', '2026-07-16 08:31:07'),
('LOG-000000095', 'FPPL', 'REG-004', 'MEMVERIFIKASI_PERMOHONAN', 'Menunggu Verifikasi', 'Menunggu Penentuan Metode', 'Admin', 'Permohonan disetujui admin dan dilanjutkan ke penentuan metode.', '3171075704040002', '2026-07-16 08:33:09'),
('LOG-000000096', 'FPPL', 'REG-003', 'MENETAPKAN_METODE_DAN_INVOICE', 'Menunggu Penentuan Metode', 'Menunggu Pembayaran', 'Kasi', 'Kasi Pengujian menetapkan metode uji dan sistem menerbitkan invoice.', '3171075704040009', '2026-07-16 08:39:22'),
('LOG-000000097', 'INVOICE', 'INV-003', 'MEMBUAT_INVOICE', NULL, 'Belum Dibayar', 'Sistem', 'Invoice dibuat untuk permohonan.', NULL, '2026-07-16 08:39:22'),
('LOG-000000098', 'FPPL', 'REG-004', 'MENETAPKAN_METODE_DAN_INVOICE', 'Menunggu Penentuan Metode', 'Menunggu Pembayaran', 'Kasi', 'Kasi Pengujian menetapkan metode uji dan sistem menerbitkan invoice.', '3171075704040009', '2026-07-16 08:50:40'),
('LOG-000000099', 'INVOICE', 'INV-004', 'MEMBUAT_INVOICE', NULL, 'Belum Dibayar', 'Sistem', 'Invoice dibuat untuk permohonan.', NULL, '2026-07-16 08:50:40'),
('LOG-000000100', 'FPPL', 'REG-004', 'MEMPERBARUI_STATUS_PERMOHONAN', 'Menunggu Verifikasi', 'Menunggu Pembayaran', 'Sistem', NULL, NULL, '2026-07-16 08:33:09'),
('LOG-000000101', 'INVOICE', 'INV-004', 'MEMPERBARUI_INVOICE', NULL, 'Belum Dibayar', 'Sistem', 'Invoice diperbarui untuk permohonan.', NULL, '2026-07-16 08:50:40'),
('LOG-000000102', 'PAYMENT', 'PAY-003', 'MEMBAYAR_INVOICE', NULL, NULL, 'Pelanggan', 'Pelanggan melakukan pembayaran.', '3171803823927329', '2026-07-16 08:51:37'),
('LOG-000000103', 'FPPL', 'REG-004', 'PEMBAYARAN_DIKONFIRMASI', 'Menunggu Pembayaran', 'Menunggu Pengambilan Sampel', 'Sistem', 'Pembayaran dikonfirmasi otomatis oleh payment gateway.', NULL, '2026-07-16 08:51:56'),
('LOG-000000104', 'INVOICE', 'INV-003', 'MEMPERBARUI_INVOICE', NULL, 'Belum Dibayar', 'Sistem', 'Invoice diperbarui untuk permohonan.', NULL, '2026-07-16 08:39:22'),
('LOG-000000105', 'PAYMENT', 'PAY-004', 'MEMBAYAR_INVOICE', NULL, NULL, 'Pelanggan', 'Pelanggan melakukan pembayaran.', '1146658392983864', '2026-07-16 08:52:53'),
('LOG-000000106', 'FPPL', 'REG-003', 'PEMBAYARAN_DIKONFIRMASI', 'Menunggu Pembayaran', 'Menunggu Pengambilan Sampel', 'Sistem', 'Pembayaran dikonfirmasi otomatis oleh payment gateway.', NULL, '2026-07-16 08:53:02'),
('LOG-000000107', 'JADWAL_SAMPEL', 'JDW-003', 'MEMBUAT_JADWAL_SAMPEL', NULL, 'Terjadwal', 'Admin', 'Jadwal pengambilan sampel dibuat.', NULL, '2026-07-16 08:55:38'),
('LOG-000000108', 'JADWAL_SAMPEL', 'JDW-004', 'MEMBUAT_JADWAL_SAMPEL', NULL, 'Terjadwal', 'Admin', 'Jadwal pengambilan sampel dibuat.', NULL, '2026-07-16 08:56:02'),
('LOG-000000109', 'JADWAL_SAMPEL', 'JDW-004', 'MENYETUJUI_JADWAL_SAMPEL_PELANGGAN', 'Terjadwal', 'Disetujui Pelanggan', 'Pelanggan', 'Pelanggan menyetujui jadwal sampel.', '3171803823927329', '2026-07-16 08:56:23'),
('LOG-000000110', 'SAMPEL', '5/LT/VII/2026', 'MENERIMA_SAMPEL', NULL, 'Diterima', 'Admin', 'Sampel diterima oleh laboratorium.', '3171075704040002', '2026-07-16 08:58:45'),
('LOG-000000111', 'SAMPEL', '6/LT/VII/2026', 'MENERIMA_SAMPEL', NULL, 'Diterima', 'Admin', 'Sampel diterima oleh laboratorium.', '3171075704040002', '2026-07-16 08:58:45'),
('LOG-000000112', 'SAMPEL', '7/AM/VII/2026', 'MENERIMA_SAMPEL', NULL, 'Diterima', 'Admin', 'Sampel diterima oleh laboratorium.', '3171075704040002', '2026-07-16 08:58:45'),
('LOG-000000113', 'JADWAL_SAMPEL', 'JDW-004', 'MENYELESAIKAN_JADWAL_SAMPEL', 'Disetujui Pelanggan', 'Selesai', 'Admin', 'Jadwal sampel diselesaikan saat sampel diterima.', '3171075704040002', '2026-07-16 08:58:45'),
('LOG-000000114', 'FPPL', 'REG-004', 'MENERIMA_SAMPEL', 'Menunggu Pengambilan Sampel', 'Proses Pengujian', 'Admin', 'Sampel diterima dan nomor sampel dibuat.', '3171075704040002', '2026-07-16 08:58:45'),
('LOG-000000115', 'SAMPEL', '8/SG/VII/2026', 'MENERIMA_SAMPEL', NULL, 'Diterima', 'Admin', 'Sampel diterima oleh laboratorium.', '3171075704040002', '2026-07-16 09:01:27'),
('LOG-000000116', 'SAMPEL', '9/SG/VII/2026', 'MENERIMA_SAMPEL', NULL, 'Diterima', 'Admin', 'Sampel diterima oleh laboratorium.', '3171075704040002', '2026-07-16 09:01:27'),
('LOG-000000117', 'SAMPEL', '10/LMB/VII/2026', 'MENERIMA_SAMPEL', NULL, 'Diterima', 'Admin', 'Sampel diterima oleh laboratorium.', '3171075704040002', '2026-07-16 09:01:27'),
('LOG-000000118', 'JADWAL_SAMPEL', 'JDW-003', 'MENYELESAIKAN_JADWAL_SAMPEL', 'Terjadwal', 'Selesai', 'Admin', 'Jadwal sampel diselesaikan saat sampel diterima.', '3171075704040002', '2026-07-16 09:01:28'),
('LOG-000000119', 'FPPL', 'REG-003', 'MENERIMA_SAMPEL', 'Menunggu Pengambilan Sampel', 'Proses Pengujian', 'Admin', 'Sampel diterima dan nomor sampel dibuat.', '3171075704040002', '2026-07-16 09:01:28'),
('LOG-000000120', 'PENUGASAN', 'PNG-0003', 'MEMBUAT_PENUGASAN', NULL, 'Aktif', 'Penyelia', 'Penugasan pengujian dibuat.', '3171075704040004', '2026-07-16 09:04:12'),
('LOG-000000121', 'PENUGASAN_DETAIL', 'PD-00008', 'MEMBUAT_DETAIL_PENUGASAN', NULL, 'Ditugaskan', 'Penyelia', 'Detail penugasan dibuat untuk 2 sampel.', '3171075704040004', '2026-07-16 09:04:12'),
('LOG-000000122', 'LKA', 'LKA-00008', 'MELAPORKAN_LKA', NULL, 'Menunggu Verifikasi Penyelia', 'Analis', 'Analis mengirim LKA ke Penyelia.', '3171075704040005', '2026-07-16 09:06:46'),
('LOG-000000123', 'LKA_REVISI', 'RVL-000004', 'HASIL_SEBELUM_REVISI', '2,3', NULL, 'Penyelia', '{\"kode_lka\":\"LKA-00008\",\"no_sampel\":\"5/LT/VII/2026\",\"hasil\":\"2,3\",\"catatan_hasil\":null}', '3171075704040004', '2026-07-16 09:07:23'),
('LOG-000000124', 'LKA_REVISI', 'RVL-000004', 'REVISI_LKA_DIAJUKAN_PENYELIA', NULL, 'Dikirim ke Analis', 'Penyelia', 'kurang masuk akal', '3171075704040004', '2026-07-16 09:07:23'),
('LOG-000000125', 'LKA', 'LKA-00008', 'MEMERIKSA_LKA', NULL, 'Perlu Perbaikan', 'Penyelia', 'Penyelia memeriksa LKA.', '3171075704040004', '2026-07-16 07:00:00'),
('LOG-000000126', 'FPPL', 'REG-005', 'MEMBUAT_PERMOHONAN', NULL, 'Menunggu Verifikasi', 'Pelanggan', 'Permohonan dibuat oleh pelanggan.', '1146658392983864', '2026-07-16 09:14:09'),
('LOG-000000127', 'FPPL', 'REG-005', 'MEMVERIFIKASI_PERMOHONAN', 'Menunggu Verifikasi', 'Menunggu Penentuan Metode', 'Admin', 'Permohonan disetujui admin dan dilanjutkan ke penentuan metode.', '3171075704040002', '2026-07-16 12:27:49'),
('LOG-000000128', 'FPPL', 'REG-005', 'MEMPERBARUI_STATUS_PERMOHONAN', 'Menunggu Verifikasi', 'Menunggu Penentuan Metode', 'Sistem', NULL, NULL, '2026-07-16 12:27:49'),
('LOG-000000129', 'FPPL', 'REG-006', 'MEMBUAT_PERMOHONAN', NULL, 'Menunggu Verifikasi', 'Pelanggan', 'Permohonan dibuat oleh pelanggan.', '3172346877989832', '2026-07-16 14:36:19'),
('LOG-000000130', 'FPPL', 'REG-005', 'MENETAPKAN_METODE_DAN_INVOICE', 'Menunggu Penentuan Metode', 'Menunggu Pembayaran', 'Kasi', 'Kasi Pengujian menetapkan metode uji dan sistem menerbitkan invoice.', '3171075704040009', '2026-07-16 14:47:53'),
('LOG-000000131', 'INVOICE', 'INV-005', 'MEMBUAT_INVOICE', NULL, 'Belum Dibayar', 'Sistem', 'Invoice dibuat untuk permohonan.', NULL, '2026-07-16 14:47:53'),
('LOG-000000132', 'INVOICE', 'INV-005', 'MEMPERBARUI_INVOICE', NULL, 'Belum Dibayar', 'Sistem', 'Invoice diperbarui untuk permohonan.', NULL, '2026-07-16 14:47:53'),
('LOG-000000133', 'PAYMENT', 'PAY-005', 'MEMBAYAR_INVOICE', NULL, NULL, 'Pelanggan', 'Pelanggan melakukan pembayaran.', '1146658392983864', '2026-07-16 14:49:08'),
('LOG-000000134', 'FPPL', 'REG-005', 'PEMBAYARAN_DIKONFIRMASI', 'Menunggu Pembayaran', 'Menunggu Pengantaran Sampel', 'Sistem', 'Pembayaran dikonfirmasi otomatis oleh payment gateway.', NULL, '2026-07-16 14:49:21'),
('LOG-000000135', 'FPPL', 'REG-002', 'MENUNGGU_PENGAMBILAN_LHU', 'Menunggu Penjadwalan LHU', 'Menunggu Pengambilan LHU', 'Admin', 'Jadwal pengambilan LHU sudah dibuat admin.', '3171075704040002', '2026-07-16 15:00:59'),
('LOG-000000136', 'JADWAL_LHU', 'JPL-000002', 'MENJADWALKAN_PENGAMBILAN_LHU', NULL, 'Dijadwalkan', 'Admin', 'Jadwal pengambilan LHU dibuat.', '3171075704040002', '2026-07-16 15:00:59'),
('LOG-000000137', 'JADWAL_LHU', 'JPL-000002', 'MENYETUJUI_JADWAL_LHU_PELANGGAN', 'Dijadwalkan', 'Disetujui Pelanggan', 'Pelanggan', 'Pelanggan menyetujui jadwal pengambilan LHU.', '1146658392983864', '2026-07-16 15:01:33'),
('LOG-000000138', 'FPPL', 'REG-006', 'MEMVERIFIKASI_PERMOHONAN', 'Menunggu Verifikasi', 'Menunggu Penentuan Metode', 'Admin', 'Permohonan disetujui admin dan dilanjutkan ke penentuan metode.', '3171075704040002', '2026-07-16 15:28:53'),
('LOG-000000139', 'FPPL', 'REG-006', 'MENETAPKAN_METODE_DAN_INVOICE', 'Menunggu Penentuan Metode', 'Menunggu Pembayaran', 'Kasi', 'Kasi Pengujian menetapkan metode uji dan sistem menerbitkan invoice.', '3171075704040009', '2026-07-16 15:29:36'),
('LOG-000000140', 'INVOICE', 'INV-006', 'MEMBUAT_INVOICE', NULL, 'Belum Dibayar', 'Sistem', 'Invoice dibuat untuk permohonan.', NULL, '2026-07-16 15:29:36'),
('LOG-000000141', 'FPPL', 'REG-006', 'MEMPERBARUI_STATUS_PERMOHONAN', 'Menunggu Verifikasi', 'Menunggu Pembayaran', 'Sistem', NULL, NULL, '2026-07-16 15:28:53'),
('LOG-000000142', 'INVOICE', 'INV-006', 'MEMPERBARUI_INVOICE', NULL, 'Belum Dibayar', 'Sistem', 'Invoice diperbarui untuk permohonan.', NULL, '2026-07-16 15:29:36'),
('LOG-000000143', 'PAYMENT', 'PAY-006', 'MEMBAYAR_INVOICE', NULL, NULL, 'Pelanggan', 'Pelanggan melakukan pembayaran.', '3172346877989832', '2026-07-16 15:30:49'),
('LOG-000000144', 'INVOICE', 'INV-006', 'MEMPERBARUI_INVOICE', NULL, 'Belum Dibayar', 'Sistem', 'Invoice diperbarui untuk permohonan.', NULL, '2026-07-16 15:29:36'),
('LOG-000000145', 'LKA_REVISI', 'RVL-000004', 'HASIL_SETELAH_REVISI', NULL, '2,9', 'Analis', '{\"kode_lka\":\"LKA-00008\",\"no_sampel\":\"5/LT/VII/2026\",\"hasil\":\"2,9\",\"catatan_hasil\":null}', NULL, '2026-07-16 15:38:57'),
('LOG-000000146', 'LKA', 'LKA-00008', 'MELAPORKAN_LKA', NULL, 'Menunggu Verifikasi Penyelia', 'Analis', 'Analis mengirim LKA ke Penyelia.', '3171075704040005', '2026-07-16 15:38:57'),
('LOG-000000147', 'PENUGASAN', 'PNG-0004', 'MEMBUAT_PENUGASAN', NULL, 'Aktif', 'Penyelia', 'Penugasan pengujian dibuat.', '3171075704040004', '2026-07-16 15:42:44'),
('LOG-000000148', 'PENUGASAN_DETAIL', 'PD-00009', 'MEMBUAT_DETAIL_PENUGASAN', NULL, 'Ditugaskan', 'Penyelia', 'Detail penugasan dibuat untuk 1 sampel.', '3171075704040004', '2026-07-16 15:42:44'),
('LOG-000000149', 'PENUGASAN_DETAIL', 'PD-00010', 'MEMBUAT_DETAIL_PENUGASAN', NULL, 'Ditugaskan', 'Penyelia', 'Detail penugasan dibuat untuk 1 sampel.', '3171075704040004', '2026-07-16 15:42:44'),
('LOG-000000150', 'FPPL', 'REG-006', 'PEMBAYARAN_DIKONFIRMASI', 'Menunggu Pembayaran', 'Menunggu Pengambilan Sampel', 'Sistem', 'Pembayaran dikonfirmasi otomatis oleh payment gateway.', NULL, '2026-07-16 15:45:32'),
('LOG-000000151', 'FPPL', 'REG-002', 'MEMBUAT_PERMOHONAN', NULL, 'Menunggu Verifikasi', 'Pelanggan', 'Permohonan dibuat oleh pelanggan.', '3271000000000001', '2026-08-02 17:58:03'),
('LOG-000000152', 'FPPL', 'REG-002', 'MEMBUAT_PERMOHONAN', NULL, 'Menunggu Verifikasi', 'Pelanggan', 'Permohonan dibuat oleh pelanggan.', '3271000000000002', '2026-08-02 17:58:04'),
('LOG-000000153', 'FPPL', 'REG-002', 'MEMBUAT_PERMOHONAN', NULL, 'Menunggu Verifikasi', 'Pelanggan', 'Permohonan dibuat oleh pelanggan.', '3271000000000001', '2026-08-02 17:58:04'),
('LOG-000000154', 'FPPL', 'REG-002', 'MEMBUAT_PERMOHONAN', NULL, 'Menunggu Verifikasi', 'Pelanggan', 'Permohonan dibuat oleh pelanggan.', '3271000000000001', '2026-08-02 17:58:04'),
('LOG-000000155', 'FPPL', 'REG-002', 'MEMBUAT_PERMOHONAN', NULL, 'Menunggu Verifikasi', 'Pelanggan', 'Permohonan dibuat oleh pelanggan.', '3271000000000001', '2026-08-02 17:58:04'),
('LOG-000000156', 'FPPL', 'REG-002', 'MEMBUAT_PERMOHONAN', NULL, 'Menunggu Verifikasi', 'Pelanggan', 'Permohonan dibuat oleh pelanggan.', '3271000000000001', '2026-08-02 17:58:04'),
('LOG-000000157', 'FPPL', 'REG-002', 'MEMBUAT_PERMOHONAN', NULL, 'Menunggu Verifikasi', 'Pelanggan', 'Permohonan dibuat oleh pelanggan.', '3271000000000001', '2026-08-02 17:58:05'),
('LOG-000000158', 'FPPL', 'REG-001', 'MEMBUAT_PERMOHONAN', NULL, 'Menunggu Verifikasi', 'Pelanggan', 'Permohonan dibuat oleh pelanggan.', '3271000000000001', '2026-08-02 17:58:05'),
('LOG-000000159', 'FPPL', 'REG-002', 'MEMBUAT_PERMOHONAN', NULL, 'Menunggu Verifikasi', 'Pelanggan', 'Permohonan dibuat oleh pelanggan.', '3271000000000001', '2026-08-02 18:01:33'),
('LOG-000000160', 'FPPL', 'REG-002', 'MEMBUAT_PERMOHONAN', NULL, 'Menunggu Verifikasi', 'Pelanggan', 'Permohonan dibuat oleh pelanggan.', '3271000000000002', '2026-08-02 18:01:33'),
('LOG-000000161', 'FPPL', 'REG-002', 'MEMBUAT_PERMOHONAN', NULL, 'Menunggu Verifikasi', 'Pelanggan', 'Permohonan dibuat oleh pelanggan.', '3271000000000001', '2026-08-02 18:01:33'),
('LOG-000000162', 'FPPL', 'REG-002', 'MEMBUAT_PERMOHONAN', NULL, 'Menunggu Verifikasi', 'Pelanggan', 'Permohonan dibuat oleh pelanggan.', '3271000000000001', '2026-08-02 18:01:34'),
('LOG-000000163', 'FPPL', 'REG-002', 'MEMBUAT_PERMOHONAN', NULL, 'Menunggu Verifikasi', 'Pelanggan', 'Permohonan dibuat oleh pelanggan.', '3271000000000001', '2026-08-02 18:01:34'),
('LOG-000000164', 'FPPL', 'REG-002', 'MEMBUAT_PERMOHONAN', NULL, 'Menunggu Verifikasi', 'Pelanggan', 'Permohonan dibuat oleh pelanggan.', '3271000000000001', '2026-08-02 18:01:34'),
('LOG-000000165', 'FPPL', 'REG-002', 'MEMBUAT_PERMOHONAN', NULL, 'Menunggu Verifikasi', 'Pelanggan', 'Permohonan dibuat oleh pelanggan.', '3271000000000001', '2026-08-02 18:01:34'),
('LOG-000000166', 'FPPL', 'REG-001', 'MEMBUAT_PERMOHONAN', NULL, 'Menunggu Verifikasi', 'Pelanggan', 'Permohonan dibuat oleh pelanggan.', '3271000000000001', '2026-08-02 18:01:34'),
('LOG-000000167', 'FPPL', 'REG-002', 'MEMBUAT_PERMOHONAN', NULL, 'Menunggu Verifikasi', 'Pelanggan', 'Permohonan dibuat oleh pelanggan.', '3271000000000001', '2026-08-02 18:03:12'),
('LOG-000000168', 'FPPL', 'REG-002', 'MEMBUAT_PERMOHONAN', NULL, 'Menunggu Verifikasi', 'Pelanggan', 'Permohonan dibuat oleh pelanggan.', '3271000000000002', '2026-08-02 18:03:13'),
('LOG-000000169', 'FPPL', 'REG-002', 'MEMBUAT_PERMOHONAN', NULL, 'Menunggu Verifikasi', 'Pelanggan', 'Permohonan dibuat oleh pelanggan.', '3271000000000001', '2026-08-02 18:03:13'),
('LOG-000000170', 'FPPL', 'REG-002', 'MEMBUAT_PERMOHONAN', NULL, 'Menunggu Verifikasi', 'Pelanggan', 'Permohonan dibuat oleh pelanggan.', '3271000000000001', '2026-08-02 18:03:13'),
('LOG-000000171', 'FPPL', 'REG-002', 'MEMBUAT_PERMOHONAN', NULL, 'Menunggu Verifikasi', 'Pelanggan', 'Permohonan dibuat oleh pelanggan.', '3271000000000001', '2026-08-02 18:03:13'),
('LOG-000000172', 'FPPL', 'REG-002', 'MEMBUAT_PERMOHONAN', NULL, 'Menunggu Verifikasi', 'Pelanggan', 'Permohonan dibuat oleh pelanggan.', '3271000000000001', '2026-08-02 18:03:13'),
('LOG-000000173', 'FPPL', 'REG-002', 'MEMBUAT_PERMOHONAN', NULL, 'Menunggu Verifikasi', 'Pelanggan', 'Permohonan dibuat oleh pelanggan.', '3271000000000001', '2026-08-02 18:03:13'),
('LOG-000000174', 'FPPL', 'REG-001', 'MEMBUAT_PERMOHONAN', NULL, 'Menunggu Verifikasi', 'Pelanggan', 'Permohonan dibuat oleh pelanggan.', '3271000000000001', '2026-08-02 18:03:14'),
('LOG-000000175', 'FPPL', 'REG-002', 'MEMBUAT_PERMOHONAN', NULL, 'Menunggu Verifikasi', 'Pelanggan', 'Permohonan dibuat oleh pelanggan.', '3271000000000001', '2026-08-02 18:04:23'),
('LOG-000000176', 'FPPL', 'REG-002', 'MEMBUAT_PERMOHONAN', NULL, 'Menunggu Verifikasi', 'Pelanggan', 'Permohonan dibuat oleh pelanggan.', '3271000000000001', '2026-08-02 18:04:24'),
('LOG-000000177', 'FPPL', 'REG-002', 'MEMBUAT_PERMOHONAN', NULL, 'Menunggu Verifikasi', 'Pelanggan', 'Permohonan dibuat oleh pelanggan.', '3271000000000001', '2026-08-02 18:04:24'),
('LOG-000000178', 'FPPL', 'REG-002', 'MEMBUAT_PERMOHONAN', NULL, 'Menunggu Verifikasi', 'Pelanggan', 'Permohonan dibuat oleh pelanggan.', '3271000000000001', '2026-08-02 18:04:24'),
('LOG-000000179', 'FPPL', 'REG-001', 'MEMBUAT_PERMOHONAN', NULL, 'Menunggu Verifikasi', 'Pelanggan', 'Permohonan dibuat oleh pelanggan.', '3271000000000001', '2026-08-02 18:04:25');

-- --------------------------------------------------------

--
-- Table structure for table `fppl`
--

CREATE TABLE `fppl` (
  `id_registrasi` varchar(10) NOT NULL,
  `nomor_fppl` varchar(25) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci DEFAULT NULL,
  `id_pelanggan` varchar(8) NOT NULL,
  `tanggal_pendaftaran` datetime NOT NULL,
  `maksud_pengujian` text,
  `lokasi_pengambilan_sampel` varchar(100) DEFAULT NULL,
  `jenis_pengambilan_sampel` enum('Petugas','Mandiri') NOT NULL,
  `id_tarif_pengambilan` varchar(10) DEFAULT NULL,
  `tanggal_rencana_pengambilan_sampel` date DEFAULT NULL,
  `jam_rencana_pengambilan_sampel` time DEFAULT NULL,
  `tanggal_rencana_pengantaran_sampel` date DEFAULT NULL,
  `status_fppl` enum('Menunggu Verifikasi','Perlu Revisi','Menunggu Penentuan Metode','Menunggu Pembayaran','Menunggu Verifikasi Pembayaran','Menunggu Sampel','Menunggu Pengambilan Sampel','Menunggu Pengantaran Sampel','Proses Pengujian','Menunggu Penjadwalan LHU','Menunggu Pengambilan LHU','Selesai','Dibatalkan','Dibatalkan Pelanggan','Ditolak Admin','Ditolak Kasi','Ditolak Penyelia') NOT NULL DEFAULT 'Menunggu Verifikasi',
  `catatan_penolakan` text,
  `tanggal_verifikasi` datetime DEFAULT NULL,
  `diverifikasi_oleh` varchar(16) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- --------------------------------------------------------

--
-- Table structure for table `fppl_parameter_metode`
--

CREATE TABLE `fppl_parameter_metode` (
  `id_fppl_parameter_metode` varchar(15) NOT NULL,
  `id_registrasi` varchar(10) NOT NULL,
  `id_jenis_sampel` varchar(4) NOT NULL,
  `id_reg_bm` varchar(6) NOT NULL,
  `id_parameter` varchar(6) NOT NULL,
  `id_metode_parameter` varchar(6) DEFAULT NULL,
  `status_kemampuan_lab` enum('MAMPU','TIDAK_MAMPU') DEFAULT NULL,
  `catatan_kemampuan` text,
  `dipilih_oleh` varchar(16) DEFAULT NULL,
  `dipilih_pada` datetime DEFAULT NULL,
  `is_insitu` tinyint(1) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- --------------------------------------------------------

--
-- Table structure for table `fppl_sampel`
--

CREATE TABLE `fppl_sampel` (
  `id_registrasi` varchar(10) NOT NULL,
  `id_jenis_sampel` varchar(4) NOT NULL,
  `id_reg_bm` varchar(6) NOT NULL,
  `jumlah_sampel` int UNSIGNED NOT NULL DEFAULT '1'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- --------------------------------------------------------

--
-- Table structure for table `invoice`
--

CREATE TABLE `invoice` (
  `id_invoice` varchar(16) NOT NULL,
  `id_registrasi` varchar(10) NOT NULL,
  `tanggal_invoice` datetime DEFAULT NULL,
  `subtotal_uji` bigint UNSIGNED NOT NULL DEFAULT '0',
  `subtotal_pengambilan` bigint UNSIGNED NOT NULL DEFAULT '0',
  `status_invoice` enum('Belum Dibayar','Menunggu Verifikasi','Lunas','Dibatalkan','Bayar Nanti') NOT NULL DEFAULT 'Belum Dibayar',
  `file_invoice_path` varchar(255) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- --------------------------------------------------------

--
-- Table structure for table `invoice_item`
--

CREATE TABLE `invoice_item` (
  `id_invoice` varchar(16) NOT NULL,
  `id_fppl_parameter_metode` varchar(15) NOT NULL,
  `qty` int UNSIGNED NOT NULL DEFAULT '1',
  `tarif_invoice` bigint UNSIGNED NOT NULL DEFAULT '0'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- --------------------------------------------------------

--
-- Table structure for table `jadwal_pengambilan_lhu`
--

CREATE TABLE `jadwal_pengambilan_lhu` (
  `id_jadwal_lhu` varchar(10) NOT NULL,
  `id_registrasi` varchar(10) NOT NULL,
  `tanggal_pengambilan` date NOT NULL,
  `jam_pengambilan` time DEFAULT NULL,
  `status_pengambilan` enum('Dijadwalkan','Disetujui Pelanggan','Disetujui Admin','Sudah Diambil','Dibatalkan') NOT NULL DEFAULT 'Dijadwalkan',
  `catatan` text,
  `dijadwalkan_oleh` varchar(16) DEFAULT NULL,
  `dijadwalkan_pada` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `nama_pengambil` varchar(100) DEFAULT NULL,
  `diambil_pada` datetime DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- --------------------------------------------------------

--
-- Table structure for table `jadwal_sampel`
--

CREATE TABLE `jadwal_sampel` (
  `id_jadwal` varchar(10) NOT NULL,
  `id_registrasi` varchar(10) NOT NULL,
  `tanggal_jadwal` date NOT NULL,
  `jam_jadwal` time NOT NULL,
  `id_pegawai_pcc` varchar(10) DEFAULT NULL,
  `dibuat_oleh` varchar(16) DEFAULT NULL,
  `dibuat_pada` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `status_jadwal` enum('Terjadwal','Disetujui Pelanggan','Disetujui Admin','Selesai','Dibatalkan') NOT NULL DEFAULT 'Terjadwal'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- --------------------------------------------------------

--
-- Table structure for table `jenis_sampel`
--

CREATE TABLE `jenis_sampel` (
  `id_jenis_sampel` varchar(4) NOT NULL,
  `jenis_sampel` varchar(50) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

--
-- Dumping data for table `jenis_sampel`
--

INSERT INTO `jenis_sampel` (`id_jenis_sampel`, `jenis_sampel`) VALUES
('JS06', 'Air Higiene Sanitasi (AHS)'),
('JS08', 'Air Minum'),
('JS02', 'Danau'),
('JS03', 'Laut'),
('JS04', 'Limbah'),
('JS05', 'Sumur Pantau/Tanah'),
('JS01', 'Sungai');

-- --------------------------------------------------------

--
-- Table structure for table `kategori_parameter`
--

CREATE TABLE `kategori_parameter` (
  `id_kategori_parameter` varchar(4) NOT NULL,
  `nama_kategori` varchar(50) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

--
-- Dumping data for table `kategori_parameter`
--

INSERT INTO `kategori_parameter` (`id_kategori_parameter`, `nama_kategori`) VALUES
('KP01', 'Fisika'),
('KP02', 'Kimia'),
('KP03', 'Kimia anorganik'),
('KP04', 'Kimia organik'),
('KP06', 'Makrobio'),
('KP05', 'Mikrobiologi');

-- --------------------------------------------------------

--
-- Table structure for table `klasifikasi`
--

CREATE TABLE `klasifikasi` (
  `id_klasifikasi` varchar(10) NOT NULL,
  `klasifikasi` varchar(50) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

--
-- Dumping data for table `klasifikasi`
--

INSERT INTO `klasifikasi` (`id_klasifikasi`, `klasifikasi`) VALUES
('KLS001', '3<x<=50'),
('KLS002', 'Biota Laut'),
('KLS003', 'Drainase'),
('KLS004', 'Golongan I'),
('KLS005', 'Golongan II'),
('KLS006', 'Kakus'),
('KLS018', 'Kelas A'),
('KLS007', 'Kelas I'),
('KLS008', 'Kelas II'),
('KLS009', 'Kelas III'),
('KLS010', 'Kelas IV'),
('KLS019', 'KELS I'),
('KLS020', 'KELS II'),
('KLS011', 'Lindi'),
('KLS012', 'Pantau'),
('KLS013', 'Pelabuhan'),
('KLS014', 'Umum'),
('KLS015', 'Wisata Bahari'),
('KLS016', 'x > 50'),
('KLS017', 'x<=3');

-- --------------------------------------------------------

--
-- Table structure for table `lhu`
--

CREATE TABLE `lhu` (
  `nomor_lhu` varchar(25) NOT NULL,
  `id_registrasi` varchar(10) NOT NULL,
  `id_pkt_bm` varchar(8) NOT NULL,
  `tanggal_penerbitan` date DEFAULT NULL,
  `file_lhu_path` varchar(255) DEFAULT NULL,
  `file_lhu_signed_path` varchar(255) DEFAULT NULL,
  `file_lhu_signed_original_name` varchar(255) DEFAULT NULL,
  `file_lhu_signed_mime` varchar(100) DEFAULT NULL,
  `file_lhu_signed_size` bigint UNSIGNED DEFAULT NULL,
  `file_lhu_signed_checksum` char(64) DEFAULT NULL,
  `file_lhu_signed_uploaded_by` varchar(16) DEFAULT NULL,
  `file_lhu_signed_uploaded_at` datetime DEFAULT NULL,
  `file_lhu_signed_version` int UNSIGNED NOT NULL DEFAULT '0',
  `file_lhu_signed_replacement_note` text,
  `qc_by` varchar(16) DEFAULT NULL,
  `qc_at` datetime DEFAULT NULL,
  `kalab_by` varchar(16) DEFAULT NULL,
  `kalab_at` datetime DEFAULT NULL,
  `status_lhu` enum('Draft','Menunggu QC','Disahkan','Dibatalkan') NOT NULL DEFAULT 'Draft',
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- --------------------------------------------------------

--
-- Table structure for table `lka`
--

CREATE TABLE `lka` (
  `kode_lka` varchar(20) NOT NULL,
  `id_penugasan_detail` varchar(10) NOT NULL,
  `tanggal_mulai_pengujian` date DEFAULT NULL,
  `tanggal_selesai_pengujian` date DEFAULT NULL,
  `dhl_akuades` varchar(50) DEFAULT NULL,
  `file_worksheet_path` text,
  `dilaporkan_oleh` varchar(16) DEFAULT NULL,
  `tanggal_pelaporan` date DEFAULT NULL,
  `diperiksa_oleh` varchar(16) DEFAULT NULL,
  `tanggal_pemeriksaan` date DEFAULT NULL,
  `status_lka` enum('Draft','Menunggu Verifikasi Penyelia','Perlu Perbaikan','Disetujui Penyelia','Menunggu Verifikasi Kasi Pengujian','Disetujui Kasi Pengujian','Disahkan') NOT NULL DEFAULT 'Draft'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

--
-- Dumping data for table `lka`
--

INSERT INTO `lka` (`kode_lka`, `id_penugasan_detail`, `tanggal_mulai_pengujian`, `tanggal_selesai_pengujian`, `dhl_akuades`, `file_worksheet_path`, `dilaporkan_oleh`, `tanggal_pelaporan`, `diperiksa_oleh`, `tanggal_pemeriksaan`, `status_lka`) VALUES
('LKA-00001', 'PD-00004', '2026-07-10', '2026-07-13', '2,0', '[{\"path\":\"/worksheets/worksheet_PD-00004_3171075704040005_1783641487293_954079197_Kebutuhan-Pengguna-dan-Sistem.pdf\",\"secureUrl\":\"/files/worksheet?token=eyJzY29wZSI6IndvcmtzaGVldCIsInBhdGgiOiIvd29ya3NoZWV0cy93b3Jrc2hlZXRfUEQtMDAwMDRfMzE3MTA3NTcwNDA0MDAwNV8xNzgzNjQxNDg3MjkzXzk1NDA3OTE5N19LZWJ1dHVoYW4tUGVuZ2d1bmEtZGFuLVNpc3RlbS5wZGYiLCJleHAiOjE3ODM2NDUzODUsIm1ldGEiOnt9fQ.bVpXSqesA4tHSzHbxQlOMrPsgBhFCUoBAhWUgXgL93Q\",\"secure_url\":\"/files/worksheet?token=eyJzY29wZSI6IndvcmtzaGVldCIsInBhdGgiOiIvd29ya3NoZWV0cy93b3Jrc2hlZXRfUEQtMDAwMDRfMzE3MTA3NTcwNDA0MDAwNV8xNzgzNjQxNDg3MjkzXzk1NDA3OTE5N19LZWJ1dHVoYW4tUGVuZ2d1bmEtZGFuLVNpc3RlbS5wZGYiLCJleHAiOjE3ODM2NDUzODUsIm1ldGEiOnt9fQ.bVpXSqesA4tHSzHbxQlOMrPsgBhFCUoBAhWUgXgL93Q\",\"downloadUrl\":\"/files/worksheet?token=eyJzY29wZSI6IndvcmtzaGVldCIsInBhdGgiOiIvd29ya3NoZWV0cy93b3Jrc2hlZXRfUEQtMDAwMDRfMzE3MTA3NTcwNDA0MDAwNV8xNzgzNjQxNDg3MjkzXzk1NDA3OTE5N19LZWJ1dHVoYW4tUGVuZ2d1bmEtZGFuLVNpc3RlbS5wZGYiLCJleHAiOjE3ODM2NDUzODUsIm1ldGEiOnt9fQ.bVpXSqesA4tHSzHbxQlOMrPsgBhFCUoBAhWUgXgL93Q&download=1\",\"download_url\":\"/files/worksheet?token=eyJzY29wZSI6IndvcmtzaGVldCIsInBhdGgiOiIvd29ya3NoZWV0cy93b3Jrc2hlZXRfUEQtMDAwMDRfMzE3MTA3NTcwNDA0MDAwNV8xNzgzNjQxNDg3MjkzXzk1NDA3OTE5N19LZWJ1dHVoYW4tUGVuZ2d1bmEtZGFuLVNpc3RlbS5wZGYiLCJleHAiOjE3ODM2NDUzODUsIm1ldGEiOnt9fQ.bVpXSqesA4tHSzHbxQlOMrPsgBhFCUoBAhWUgXgL93Q&download=1\",\"originalName\":\"Kebutuhan Pengguna dan Sistem.pdf\",\"mimeType\":\"application/pdf\",\"size\":32257,\"ext\":\"pdf\",\"uploadedAt\":\"2026-07-09T23:58:07.319Z\"}]', '3171075704040005', '2026-07-10', '3171075704040004', '2026-07-10', 'Disetujui Kasi Pengujian'),
('LKA-00002', 'PD-00003', '2026-07-10', '2026-07-13', '7', '[{\"path\":\"/worksheets/worksheet_PD-00003_3171075704040005_1783644977884_623085538_927356474-20250723154645.pdf\",\"secureUrl\":\"/files/worksheet?token=eyJzY29wZSI6IndvcmtzaGVldCIsInBhdGgiOiIvd29ya3NoZWV0cy93b3Jrc2hlZXRfUEQtMDAwMDNfMzE3MTA3NTcwNDA0MDAwNV8xNzgzNjQ0OTc3ODg0XzYyMzA4NTUzOF85MjczNTY0NzQtMjAyNTA3MjMxNTQ2NDUucGRmIiwiZXhwIjoxNzgzNjUyMzQ4LCJtZXRhIjp7fX0.HqmFzgptZsdu9brCCaVLhkbKAl963KplNp0F5EaRYlE\",\"secure_url\":\"/files/worksheet?token=eyJzY29wZSI6IndvcmtzaGVldCIsInBhdGgiOiIvd29ya3NoZWV0cy93b3Jrc2hlZXRfUEQtMDAwMDNfMzE3MTA3NTcwNDA0MDAwNV8xNzgzNjQ0OTc3ODg0XzYyMzA4NTUzOF85MjczNTY0NzQtMjAyNTA3MjMxNTQ2NDUucGRmIiwiZXhwIjoxNzgzNjUyMzQ4LCJtZXRhIjp7fX0.HqmFzgptZsdu9brCCaVLhkbKAl963KplNp0F5EaRYlE\",\"downloadUrl\":\"/files/worksheet?token=eyJzY29wZSI6IndvcmtzaGVldCIsInBhdGgiOiIvd29ya3NoZWV0cy93b3Jrc2hlZXRfUEQtMDAwMDNfMzE3MTA3NTcwNDA0MDAwNV8xNzgzNjQ0OTc3ODg0XzYyMzA4NTUzOF85MjczNTY0NzQtMjAyNTA3MjMxNTQ2NDUucGRmIiwiZXhwIjoxNzgzNjUyMzQ4LCJtZXRhIjp7fX0.HqmFzgptZsdu9brCCaVLhkbKAl963KplNp0F5EaRYlE&download=1\",\"download_url\":\"/files/worksheet?token=eyJzY29wZSI6IndvcmtzaGVldCIsInBhdGgiOiIvd29ya3NoZWV0cy93b3Jrc2hlZXRfUEQtMDAwMDNfMzE3MTA3NTcwNDA0MDAwNV8xNzgzNjQ0OTc3ODg0XzYyMzA4NTUzOF85MjczNTY0NzQtMjAyNTA3MjMxNTQ2NDUucGRmIiwiZXhwIjoxNzgzNjUyMzQ4LCJtZXRhIjp7fX0.HqmFzgptZsdu9brCCaVLhkbKAl963KplNp0F5EaRYlE&download=1\",\"originalName\":\"927356474-20250723154645.pdf\",\"mimeType\":\"application/pdf\",\"size\":478694,\"ext\":\"pdf\",\"uploadedAt\":\"2026-07-10T00:56:17.923Z\"}]', '3171075704040005', '2026-07-10', '3171075704040004', '2026-07-10', 'Disetujui Kasi Pengujian'),
('LKA-00003', 'PD-00002', '2026-07-10', '2026-07-13', '3,3', '[{\"path\":\"/worksheets/worksheet_PD-00002_3171075704040005_1783645014936_990106809_1700022618_PergubNo13Th2023-1.pdf\",\"secureUrl\":\"/files/worksheet?token=eyJzY29wZSI6IndvcmtzaGVldCIsInBhdGgiOiIvd29ya3NoZWV0cy93b3Jrc2hlZXRfUEQtMDAwMDJfMzE3MTA3NTcwNDA0MDAwNV8xNzgzNjQ1MDE0OTM2Xzk5MDEwNjgwOV8xNzAwMDIyNjE4X1Blcmd1Yk5vMTNUaDIwMjMtMS5wZGYiLCJleHAiOjE3ODM2NDU2MjMsIm1ldGEiOnt9fQ.YB74_phBd279l3GbF34QSfj-xk_3RzE8x-39Nj888ig\",\"secure_url\":\"/files/worksheet?token=eyJzY29wZSI6IndvcmtzaGVldCIsInBhdGgiOiIvd29ya3NoZWV0cy93b3Jrc2hlZXRfUEQtMDAwMDJfMzE3MTA3NTcwNDA0MDAwNV8xNzgzNjQ1MDE0OTM2Xzk5MDEwNjgwOV8xNzAwMDIyNjE4X1Blcmd1Yk5vMTNUaDIwMjMtMS5wZGYiLCJleHAiOjE3ODM2NDU2MjMsIm1ldGEiOnt9fQ.YB74_phBd279l3GbF34QSfj-xk_3RzE8x-39Nj888ig\",\"downloadUrl\":\"/files/worksheet?token=eyJzY29wZSI6IndvcmtzaGVldCIsInBhdGgiOiIvd29ya3NoZWV0cy93b3Jrc2hlZXRfUEQtMDAwMDJfMzE3MTA3NTcwNDA0MDAwNV8xNzgzNjQ1MDE0OTM2Xzk5MDEwNjgwOV8xNzAwMDIyNjE4X1Blcmd1Yk5vMTNUaDIwMjMtMS5wZGYiLCJleHAiOjE3ODM2NDU2MjMsIm1ldGEiOnt9fQ.YB74_phBd279l3GbF34QSfj-xk_3RzE8x-39Nj888ig&download=1\",\"download_url\":\"/files/worksheet?token=eyJzY29wZSI6IndvcmtzaGVldCIsInBhdGgiOiIvd29ya3NoZWV0cy93b3Jrc2hlZXRfUEQtMDAwMDJfMzE3MTA3NTcwNDA0MDAwNV8xNzgzNjQ1MDE0OTM2Xzk5MDEwNjgwOV8xNzAwMDIyNjE4X1Blcmd1Yk5vMTNUaDIwMjMtMS5wZGYiLCJleHAiOjE3ODM2NDU2MjMsIm1ldGEiOnt9fQ.YB74_phBd279l3GbF34QSfj-xk_3RzE8x-39Nj888ig&download=1\",\"originalName\":\"1700022618_PergubNo13Th2023 (1).pdf\",\"mimeType\":\"application/pdf\",\"size\":72525,\"ext\":\"pdf\",\"uploadedAt\":\"2026-07-10T00:56:54.941Z\"}]', '3171075704040005', '2026-07-10', '3171075704040004', '2026-07-10', 'Disetujui Kasi Pengujian'),
('LKA-00004', 'PD-00001', '2026-07-10', '2026-07-13', '2,1', '[{\"path\":\"/worksheets/worksheet_PD-00001_3171075704040005_1783645531748_509622321_927356474-20250723154645.pdf\",\"secureUrl\":\"/files/worksheet?token=eyJzY29wZSI6IndvcmtzaGVldCIsInBhdGgiOiIvd29ya3NoZWV0cy93b3Jrc2hlZXRfUEQtMDAwMDFfMzE3MTA3NTcwNDA0MDAwNV8xNzgzNjQ1NTMxNzQ4XzUwOTYyMjMyMV85MjczNTY0NzQtMjAyNTA3MjMxNTQ2NDUucGRmIiwiZXhwIjoxNzgzNjQ2MTM0LCJtZXRhIjp7fX0.tvFIdQ_11iKNybDaG8HyrGJ498GhbR36Z3vG77VP6hw\",\"secure_url\":\"/files/worksheet?token=eyJzY29wZSI6IndvcmtzaGVldCIsInBhdGgiOiIvd29ya3NoZWV0cy93b3Jrc2hlZXRfUEQtMDAwMDFfMzE3MTA3NTcwNDA0MDAwNV8xNzgzNjQ1NTMxNzQ4XzUwOTYyMjMyMV85MjczNTY0NzQtMjAyNTA3MjMxNTQ2NDUucGRmIiwiZXhwIjoxNzgzNjQ2MTM0LCJtZXRhIjp7fX0.tvFIdQ_11iKNybDaG8HyrGJ498GhbR36Z3vG77VP6hw\",\"downloadUrl\":\"/files/worksheet?token=eyJzY29wZSI6IndvcmtzaGVldCIsInBhdGgiOiIvd29ya3NoZWV0cy93b3Jrc2hlZXRfUEQtMDAwMDFfMzE3MTA3NTcwNDA0MDAwNV8xNzgzNjQ1NTMxNzQ4XzUwOTYyMjMyMV85MjczNTY0NzQtMjAyNTA3MjMxNTQ2NDUucGRmIiwiZXhwIjoxNzgzNjQ2MTM0LCJtZXRhIjp7fX0.tvFIdQ_11iKNybDaG8HyrGJ498GhbR36Z3vG77VP6hw&download=1\",\"download_url\":\"/files/worksheet?token=eyJzY29wZSI6IndvcmtzaGVldCIsInBhdGgiOiIvd29ya3NoZWV0cy93b3Jrc2hlZXRfUEQtMDAwMDFfMzE3MTA3NTcwNDA0MDAwNV8xNzgzNjQ1NTMxNzQ4XzUwOTYyMjMyMV85MjczNTY0NzQtMjAyNTA3MjMxNTQ2NDUucGRmIiwiZXhwIjoxNzgzNjQ2MTM0LCJtZXRhIjp7fX0.tvFIdQ_11iKNybDaG8HyrGJ498GhbR36Z3vG77VP6hw&download=1\",\"originalName\":\"927356474-20250723154645.pdf\",\"mimeType\":\"application/pdf\",\"size\":478694,\"ext\":\"pdf\",\"uploadedAt\":\"2026-07-10T01:05:31.760Z\"}]', '3171075704040005', '2026-07-10', '3171075704040004', '2026-07-10', 'Disetujui Kasi Pengujian'),
('LKA-00005', 'PD-00007', '2026-07-10', '2026-07-13', '2,3', '[{\"path\":\"/worksheets/worksheet_PD-00007_3171075704040005_1783646786588_210467731_1700022618_PergubNo13Th2023.pdf\",\"secureUrl\":\"/files/worksheet?token=eyJzY29wZSI6IndvcmtzaGVldCIsInBhdGgiOiIvd29ya3NoZWV0cy93b3Jrc2hlZXRfUEQtMDAwMDdfMzE3MTA3NTcwNDA0MDAwNV8xNzgzNjQ2Nzg2NTg4XzIxMDQ2NzczMV8xNzAwMDIyNjE4X1Blcmd1Yk5vMTNUaDIwMjMucGRmIiwiZXhwIjoxNzgzNjUxNzA4LCJtZXRhIjp7fX0.G0zkTq3i-TWkbPpFeJM-Dn8joD7Z10AHBqw5he8BOwE\",\"secure_url\":\"/files/worksheet?token=eyJzY29wZSI6IndvcmtzaGVldCIsInBhdGgiOiIvd29ya3NoZWV0cy93b3Jrc2hlZXRfUEQtMDAwMDdfMzE3MTA3NTcwNDA0MDAwNV8xNzgzNjQ2Nzg2NTg4XzIxMDQ2NzczMV8xNzAwMDIyNjE4X1Blcmd1Yk5vMTNUaDIwMjMucGRmIiwiZXhwIjoxNzgzNjUxNzA4LCJtZXRhIjp7fX0.G0zkTq3i-TWkbPpFeJM-Dn8joD7Z10AHBqw5he8BOwE\",\"downloadUrl\":\"/files/worksheet?token=eyJzY29wZSI6IndvcmtzaGVldCIsInBhdGgiOiIvd29ya3NoZWV0cy93b3Jrc2hlZXRfUEQtMDAwMDdfMzE3MTA3NTcwNDA0MDAwNV8xNzgzNjQ2Nzg2NTg4XzIxMDQ2NzczMV8xNzAwMDIyNjE4X1Blcmd1Yk5vMTNUaDIwMjMucGRmIiwiZXhwIjoxNzgzNjUxNzA4LCJtZXRhIjp7fX0.G0zkTq3i-TWkbPpFeJM-Dn8joD7Z10AHBqw5he8BOwE&download=1\",\"download_url\":\"/files/worksheet?token=eyJzY29wZSI6IndvcmtzaGVldCIsInBhdGgiOiIvd29ya3NoZWV0cy93b3Jrc2hlZXRfUEQtMDAwMDdfMzE3MTA3NTcwNDA0MDAwNV8xNzgzNjQ2Nzg2NTg4XzIxMDQ2NzczMV8xNzAwMDIyNjE4X1Blcmd1Yk5vMTNUaDIwMjMucGRmIiwiZXhwIjoxNzgzNjUxNzA4LCJtZXRhIjp7fX0.G0zkTq3i-TWkbPpFeJM-Dn8joD7Z10AHBqw5he8BOwE&download=1\",\"originalName\":\"1700022618_PergubNo13Th2023.pdf\",\"mimeType\":\"application/pdf\",\"size\":72525,\"ext\":\"pdf\",\"uploadedAt\":\"2026-07-10T01:26:26.602Z\"}]', '3171075704040005', '2026-07-10', '3171075704040004', '2026-07-10', 'Disetujui Kasi Pengujian'),
('LKA-00006', 'PD-00006', '2026-07-10', '2026-07-13', '3,9', '[{\"path\":\"/worksheets/worksheet_PD-00006_3171075704040005_1783651137486_706417324_927356474-20250723154645.pdf\",\"secureUrl\":\"/files/worksheet?token=eyJzY29wZSI6IndvcmtzaGVldCIsInBhdGgiOiIvd29ya3NoZWV0cy93b3Jrc2hlZXRfUEQtMDAwMDZfMzE3MTA3NTcwNDA0MDAwNV8xNzgzNjUxMTM3NDg2XzcwNjQxNzMyNF85MjczNTY0NzQtMjAyNTA3MjMxNTQ2NDUucGRmIiwiZXhwIjoxNzgzNjUxNzQzLCJtZXRhIjp7fX0.NYf2uf9t-uQsInQ-xMj-NKtOJsW4xE8AoVOEbsRB38o\",\"secure_url\":\"/files/worksheet?token=eyJzY29wZSI6IndvcmtzaGVldCIsInBhdGgiOiIvd29ya3NoZWV0cy93b3Jrc2hlZXRfUEQtMDAwMDZfMzE3MTA3NTcwNDA0MDAwNV8xNzgzNjUxMTM3NDg2XzcwNjQxNzMyNF85MjczNTY0NzQtMjAyNTA3MjMxNTQ2NDUucGRmIiwiZXhwIjoxNzgzNjUxNzQzLCJtZXRhIjp7fX0.NYf2uf9t-uQsInQ-xMj-NKtOJsW4xE8AoVOEbsRB38o\",\"downloadUrl\":\"/files/worksheet?token=eyJzY29wZSI6IndvcmtzaGVldCIsInBhdGgiOiIvd29ya3NoZWV0cy93b3Jrc2hlZXRfUEQtMDAwMDZfMzE3MTA3NTcwNDA0MDAwNV8xNzgzNjUxMTM3NDg2XzcwNjQxNzMyNF85MjczNTY0NzQtMjAyNTA3MjMxNTQ2NDUucGRmIiwiZXhwIjoxNzgzNjUxNzQzLCJtZXRhIjp7fX0.NYf2uf9t-uQsInQ-xMj-NKtOJsW4xE8AoVOEbsRB38o&download=1\",\"download_url\":\"/files/worksheet?token=eyJzY29wZSI6IndvcmtzaGVldCIsInBhdGgiOiIvd29ya3NoZWV0cy93b3Jrc2hlZXRfUEQtMDAwMDZfMzE3MTA3NTcwNDA0MDAwNV8xNzgzNjUxMTM3NDg2XzcwNjQxNzMyNF85MjczNTY0NzQtMjAyNTA3MjMxNTQ2NDUucGRmIiwiZXhwIjoxNzgzNjUxNzQzLCJtZXRhIjp7fX0.NYf2uf9t-uQsInQ-xMj-NKtOJsW4xE8AoVOEbsRB38o&download=1\",\"originalName\":\"927356474-20250723154645.pdf\",\"mimeType\":\"application/pdf\",\"size\":478694,\"ext\":\"pdf\",\"uploadedAt\":\"2026-07-10T02:38:57.514Z\"}]', '3171075704040005', '2026-07-10', '3171075704040004', '2026-07-10', 'Disetujui Kasi Pengujian'),
('LKA-00007', 'PD-00005', '2026-07-10', '2026-07-13', '9,8', '[{\"path\":\"/worksheets/worksheet_PD-00005_3171075704040005_1783651236469_636997239_1700022618_PergubNo13Th2023.pdf\",\"secureUrl\":\"/files/worksheet?token=eyJzY29wZSI6IndvcmtzaGVldCIsInBhdGgiOiIvd29ya3NoZWV0cy93b3Jrc2hlZXRfUEQtMDAwMDVfMzE3MTA3NTcwNDA0MDAwNV8xNzgzNjUxMjM2NDY5XzYzNjk5NzIzOV8xNzAwMDIyNjE4X1Blcmd1Yk5vMTNUaDIwMjMucGRmIiwiZXhwIjoxNzgzNjUxODQxLCJtZXRhIjp7fX0.cEBQdoqZwJ7PokvU9Hr0WCLn4vIL0qqtekgs2IkUJwk\",\"secure_url\":\"/files/worksheet?token=eyJzY29wZSI6IndvcmtzaGVldCIsInBhdGgiOiIvd29ya3NoZWV0cy93b3Jrc2hlZXRfUEQtMDAwMDVfMzE3MTA3NTcwNDA0MDAwNV8xNzgzNjUxMjM2NDY5XzYzNjk5NzIzOV8xNzAwMDIyNjE4X1Blcmd1Yk5vMTNUaDIwMjMucGRmIiwiZXhwIjoxNzgzNjUxODQxLCJtZXRhIjp7fX0.cEBQdoqZwJ7PokvU9Hr0WCLn4vIL0qqtekgs2IkUJwk\",\"downloadUrl\":\"/files/worksheet?token=eyJzY29wZSI6IndvcmtzaGVldCIsInBhdGgiOiIvd29ya3NoZWV0cy93b3Jrc2hlZXRfUEQtMDAwMDVfMzE3MTA3NTcwNDA0MDAwNV8xNzgzNjUxMjM2NDY5XzYzNjk5NzIzOV8xNzAwMDIyNjE4X1Blcmd1Yk5vMTNUaDIwMjMucGRmIiwiZXhwIjoxNzgzNjUxODQxLCJtZXRhIjp7fX0.cEBQdoqZwJ7PokvU9Hr0WCLn4vIL0qqtekgs2IkUJwk&download=1\",\"download_url\":\"/files/worksheet?token=eyJzY29wZSI6IndvcmtzaGVldCIsInBhdGgiOiIvd29ya3NoZWV0cy93b3Jrc2hlZXRfUEQtMDAwMDVfMzE3MTA3NTcwNDA0MDAwNV8xNzgzNjUxMjM2NDY5XzYzNjk5NzIzOV8xNzAwMDIyNjE4X1Blcmd1Yk5vMTNUaDIwMjMucGRmIiwiZXhwIjoxNzgzNjUxODQxLCJtZXRhIjp7fX0.cEBQdoqZwJ7PokvU9Hr0WCLn4vIL0qqtekgs2IkUJwk&download=1\",\"originalName\":\"1700022618_PergubNo13Th2023.pdf\",\"mimeType\":\"application/pdf\",\"size\":72525,\"ext\":\"pdf\",\"uploadedAt\":\"2026-07-10T02:40:36.476Z\"}]', '3171075704040005', '2026-07-10', '3171075704040004', '2026-07-10', 'Disetujui Kasi Pengujian'),
('LKA-00008', 'PD-00008', '2026-07-17', '2026-07-20', '2,3', '[{\"path\":\"/worksheets/worksheet_PD-00008_3171075704040005_1784167603364_130794951_BERITA-ACARA.pdf\",\"secureUrl\":\"/files/worksheet?token=eyJzY29wZSI6IndvcmtzaGVldCIsInBhdGgiOiIvd29ya3NoZWV0cy93b3Jrc2hlZXRfUEQtMDAwMDhfMzE3MTA3NTcwNDA0MDAwNV8xNzg0MTY3NjAzMzY0XzEzMDc5NDk1MV9CRVJJVEEtQUNBUkEucGRmIiwiZXhwIjoxNzg0MTkxNzM3LCJtZXRhIjp7fX0.2fSLKRfrmzL-gMrV_fFylzHVcVASkGtfIeU9BG6DJLc\",\"secure_url\":\"/files/worksheet?token=eyJzY29wZSI6IndvcmtzaGVldCIsInBhdGgiOiIvd29ya3NoZWV0cy93b3Jrc2hlZXRfUEQtMDAwMDhfMzE3MTA3NTcwNDA0MDAwNV8xNzg0MTY3NjAzMzY0XzEzMDc5NDk1MV9CRVJJVEEtQUNBUkEucGRmIiwiZXhwIjoxNzg0MTkxNzM3LCJtZXRhIjp7fX0.2fSLKRfrmzL-gMrV_fFylzHVcVASkGtfIeU9BG6DJLc\",\"downloadUrl\":\"/files/worksheet?token=eyJzY29wZSI6IndvcmtzaGVldCIsInBhdGgiOiIvd29ya3NoZWV0cy93b3Jrc2hlZXRfUEQtMDAwMDhfMzE3MTA3NTcwNDA0MDAwNV8xNzg0MTY3NjAzMzY0XzEzMDc5NDk1MV9CRVJJVEEtQUNBUkEucGRmIiwiZXhwIjoxNzg0MTkxNzM3LCJtZXRhIjp7fX0.2fSLKRfrmzL-gMrV_fFylzHVcVASkGtfIeU9BG6DJLc&download=1\",\"download_url\":\"/files/worksheet?token=eyJzY29wZSI6IndvcmtzaGVldCIsInBhdGgiOiIvd29ya3NoZWV0cy93b3Jrc2hlZXRfUEQtMDAwMDhfMzE3MTA3NTcwNDA0MDAwNV8xNzg0MTY3NjAzMzY0XzEzMDc5NDk1MV9CRVJJVEEtQUNBUkEucGRmIiwiZXhwIjoxNzg0MTkxNzM3LCJtZXRhIjp7fX0.2fSLKRfrmzL-gMrV_fFylzHVcVASkGtfIeU9BG6DJLc&download=1\",\"originalName\":\"BERITA ACARA.pdf\",\"mimeType\":\"application/pdf\",\"size\":135186,\"ext\":\"pdf\",\"uploadedAt\":\"2026-07-16T02:06:43.384Z\"}]', '3171075704040005', '2026-07-16', '3171075704040004', '2026-07-16', 'Disetujui Penyelia');

-- --------------------------------------------------------

--
-- Table structure for table `lka_hasil`
--

CREATE TABLE `lka_hasil` (
  `kode_lka` varchar(20) NOT NULL,
  `no_sampel` varchar(25) NOT NULL,
  `hasil` varchar(50) DEFAULT NULL,
  `catatan_hasil` text,
  `status_review_hasil` enum('Draft','Menunggu Verifikasi Penyelia','Disetujui Penyelia','Menunggu Verifikasi Kasi Pengujian','Menunggu Persetujuan Penyelia Atas Revisi Kasi','Disetujui Kasi Pengujian','Perlu Revisi') NOT NULL DEFAULT 'Draft'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- --------------------------------------------------------

--
-- Table structure for table `lka_revisi`
--

CREATE TABLE `lka_revisi` (
  `id_revisi_lka` varchar(10) NOT NULL,
  `id_revisi_sebelumnya` varchar(10) DEFAULT NULL,
  `kode_lka` varchar(20) NOT NULL,
  `no_sampel` varchar(25) DEFAULT NULL,
  `catatan_revisi` text,
  `sumber_revisi` enum('PENYELIA','KASI_PENGUJIAN') NOT NULL,
  `level_revisi` enum('LKA','HASIL') NOT NULL,
  `diajukan_oleh` varchar(16) NOT NULL,
  `diajukan_pada` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `status_revisi` enum('Diajukan','Menunggu Persetujuan Penyelia','Menunggu Review Penyelia','Disetujui Penyelia','Ditolak Penyelia','Disetujui untuk Analis','Dikirim ke Analis','Diperbaiki Analis','Disetujui Kasi','Selesai') NOT NULL DEFAULT 'Diajukan',
  `ditinjau_oleh` varchar(16) DEFAULT NULL,
  `ditinjau_pada` datetime DEFAULT NULL,
  `catatan_tinjauan` text,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- --------------------------------------------------------

--
-- Table structure for table `metode`
--

CREATE TABLE `metode` (
  `id_metode` varchar(4) NOT NULL,
  `nama_metode` varchar(100) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

--
-- Dumping data for table `metode`
--

INSERT INTO `metode` (`id_metode`, `nama_metode`) VALUES
('M11', 'AAS-Cold Vapour'),
('M19', 'ASUU'),
('M06', 'DO Meter'),
('M02', 'Gravimetri'),
('M03', 'Ion Selektif Elektroda'),
('M07', 'Organoleptis'),
('M12', 'Sechi Disc'),
('M17', 'Spektrofotometri'),
('M18', 'Spektrofotometri (AAS)'),
('M10', 'Spektrofotometri (AAS)-Flame'),
('M09', 'Spektrofotometri (AAS)-GF'),
('M04', 'Spektrofotometri (UV-Vis)'),
('M08', 'Tabung Ganda'),
('M01', 'Termometer Air Raksa'),
('M15', 'Tidak Ditentukan'),
('M05', 'Titrimetri'),
('M13', 'Visual');

-- --------------------------------------------------------

--
-- Table structure for table `notifikasi_email`
--

CREATE TABLE `notifikasi_email` (
  `id_notifikasi_email` varchar(15) NOT NULL,
  `id_tipe_notifikasi` varchar(10) NOT NULL,
  `nik_penerima` varchar(16) DEFAULT NULL,
  `email_tujuan` varchar(100) DEFAULT NULL,
  `nama_penerima` varchar(100) DEFAULT NULL,
  `referensi_tipe` enum('FPPL','JADWAL_LHU','LHU','PENUGASAN') DEFAULT NULL,
  `referensi_id` varchar(30) DEFAULT NULL,
  `status_pengiriman` enum('MENUNGGU','TERKIRIM','GAGAL') NOT NULL DEFAULT 'MENUNGGU',
  `pesan_error` text,
  `dikirim_pada` datetime DEFAULT NULL,
  `push_endpoint` text,
  `push_p256dh` varchar(255) DEFAULT NULL,
  `push_auth` varchar(255) DEFAULT NULL,
  `push_user_agent` varchar(255) DEFAULT NULL,
  `push_aktif` tinyint(1) NOT NULL DEFAULT '0',
  `push_subscription_pada` datetime DEFAULT NULL,
  `push_terkirim_pada` datetime DEFAULT NULL,
  `dibuat_pada` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

--
-- Dumping data for table `notifikasi_email`
--

INSERT INTO `notifikasi_email` (`id_notifikasi_email`, `id_tipe_notifikasi`, `nik_penerima`, `email_tujuan`, `nama_penerima`, `referensi_tipe`, `referensi_id`, `status_pengiriman`, `pesan_error`, `dikirim_pada`, `push_endpoint`, `push_p256dh`, `push_auth`, `push_user_agent`, `push_aktif`, `push_subscription_pada`, `push_terkirim_pada`, `dibuat_pada`) VALUES
('NE00000001', 'TN009', '3171075704040002', '2211523024_meutia@student.unand.ac.id', 'admin', 'FPPL', 'REG-001', 'TERKIRIM', NULL, '2026-07-09 20:12:07', NULL, NULL, NULL, NULL, 0, NULL, NULL, '2026-07-09 20:10:36'),
('NE00000002', 'TN009', '4587654345678998', 'pakiki@gmail.com', 'dewi.mdd', 'FPPL', 'REG-001', 'MENUNGGU', NULL, NULL, NULL, NULL, NULL, NULL, 0, NULL, NULL, '2026-07-09 20:10:36'),
('NE00000003', 'TN999', '3171075704040002', NULL, '3171075704040002', NULL, NULL, 'TERKIRIM', NULL, '2026-07-09 20:16:14', 'https://fcm.googleapis.com/fcm/send/d-TXBZDu7Vw:APA91bH1kf4yUuTxNzglxanJ7WallZId36yItl41Qp-Vlnn1k7SVPMonbRqX_yQ6pP1gOUy8iZWTIOpJOLTHgv2oYUJLLvxE7LTEPZXiuC5T66nI1cB3PvUakRl5gjRGTf7ZniCCoHxZ', 'BN6OdQsaPY9IM8P3zF4UEJsWFLNOiVi0b7t7GUieLdJgt8qdHRA5dC16a_c90WqRODEWUTnUX8VYoSkuHfB6Wyo', '-HoozUcI4693CvDDOjqKlg', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/149.0.0.0 Safari/537.36', 0, '2026-07-09 20:16:14', NULL, '2026-07-09 20:16:14'),
('NE00000004', 'TN999', '3171075704040009', NULL, '3171075704040009', NULL, NULL, 'TERKIRIM', NULL, '2026-07-09 20:16:36', 'https://fcm.googleapis.com/fcm/send/eKrS0u88N80:APA91bGMEHqFISEMHaBTDwwo9_iBrWQiFTY-iHOMvHebbvp0B1DSSkmrKkbm2lkHtgcT-W-uq-5ICgE2KCpzMWHJzhRWzNhM-JQf6RCP0ThEyuBZTXGuDJy5bk-AuPqZFJlMDlHYxe41', 'BP0U3xP23oAG9dVaDhJAn9LEHyXUObh2vloPpsRU3ia_Kj1uYY_PrEFn13p4Eu-sEinhZVuBcGyIFKj1Ifwe4_g', 'EjBVjWhVzeLbIIYFmOPycg', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/149.0.0.0 Safari/537.36', 0, '2026-07-09 20:16:36', NULL, '2026-07-09 20:16:36'),
('NE00000005', 'TN001', '1146658392983864', 'raniiii@gmail.com', 'Rani Mandiri', 'FPPL', 'REG-001', 'TERKIRIM', NULL, '2026-07-09 20:40:58', NULL, NULL, NULL, NULL, 0, NULL, NULL, '2026-07-09 20:17:15'),
('NE00000006', 'TN018', '3171075704040009', 'kyrinasg91@gmail.com', 'sari', 'FPPL', 'REG-001', 'TERKIRIM', NULL, '2026-07-09 20:36:03', NULL, NULL, NULL, NULL, 0, NULL, NULL, '2026-07-09 20:17:15'),
('NE00000007', 'TN999', '3171075704040009', NULL, '3171075704040009', NULL, NULL, 'TERKIRIM', NULL, '2026-07-09 20:18:04', 'https://fcm.googleapis.com/fcm/send/eaOWVL_9i7E:APA91bHSdXczYiJNpJ2KXovRxBjsNLdgAPyZy7X5Nu2Gjz_YEoPjyqPb0CknxP52_a8zl3amQNQhKJ-YBP_d_9auRmjqFbEtfA3KIr27blZF-uuqtiPAn9aOfVPLezZ2iT1PER0KWSwN', 'BGtUQixcDpGYHCpex784X2k_W2TQUZg4DUB5jJBns74kqfBQz1sHw5R0tx5IGcMniihFYg9J8x3ql6HnWB9P-wo', '6Umam-9DEsBY_qST3whPJw', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/149.0.0.0 Safari/537.36', 0, '2026-07-09 20:18:04', NULL, '2026-07-09 20:18:04'),
('NE00000008', 'TN999', '3171075704040009', NULL, '3171075704040009', NULL, NULL, 'TERKIRIM', NULL, '2026-07-09 20:34:22', 'https://fcm.googleapis.com/fcm/send/fRp-MEQPtqc:APA91bG8NWpiuOo5IiudBV_QEl5OqRJzcGKTHq6d4Yjdhsahrmgm7QM1bUGIq4W_eqicIH98nKD33GiYfiKuSZwv9M6tftK9CmUzgNqa41se5-ulAlxwv8H9IT484cpEb0IGdGFJPlla', 'BDFnY3V-WFm-n-An4RbIHmjgwL3Fc9BoosNH1sZxKYnOHmKLBmsmYX-LcwO2YeeZ_H-v4C-qLymr1BeB_BLjymQ', 'd6A8eOkSwAo98h7mvIsdEw', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/149.0.0.0 Safari/537.36', 0, '2026-07-09 20:34:22', NULL, '2026-07-09 20:34:22'),
('NE00000009', 'TN999', '3171075704040009', NULL, '3171075704040009', NULL, NULL, 'TERKIRIM', NULL, '2026-07-09 20:34:51', 'https://fcm.googleapis.com/fcm/send/f3BjhaGYCwU:APA91bGmFdI-EIfvXbgBI0ryqo5RSItLsjCNBsXmzvS9Ad3yW0vXI3Rp-mTxA4zXTRu6CG-9vCE0hjXPw4G3nsAzH3waEr4B2Ae1CGsdqttoYPnMWrrb94_FQUzoHJx1r-GFW9U9BWpR', 'BO3ncdfFp0IP8EejDe2U_U3E6BeKB2NM8NHhlRtvW1MUuiZcjW7YCIUohYlZt1Nk8b2ZPmbwyKmJSOguXi6IdaY', '4VWvXVtBdp7R17v1AsUdOA', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/149.0.0.0 Safari/537.36', 0, '2026-07-09 20:34:51', NULL, '2026-07-09 20:34:51'),
('NE00000010', 'TN004', '1146658392983864', 'raniiii@gmail.com', 'Rani Mandiri', 'FPPL', 'REG-001', 'TERKIRIM', NULL, '2026-07-09 20:53:35', NULL, NULL, NULL, NULL, 0, NULL, NULL, '2026-07-09 20:52:59'),
('NE00000011', 'TN005', '1146658392983864', 'raniiii@gmail.com', 'Rani Mandiri', 'FPPL', 'REG-001', 'TERKIRIM', NULL, '2026-07-09 21:01:33', NULL, NULL, NULL, NULL, 0, NULL, NULL, '2026-07-09 20:59:08'),
('NE00000012', 'TN032', '3171075704040002', '2211523024_meutia@student.unand.ac.id', 'admin', 'FPPL', 'REG-001', 'TERKIRIM', NULL, '2026-07-09 21:03:11', NULL, NULL, NULL, NULL, 0, NULL, NULL, '2026-07-09 20:59:08'),
('NE00000013', 'TN032', '4587654345678998', 'pakiki@gmail.com', 'dewi.mdd', 'FPPL', 'REG-001', 'MENUNGGU', NULL, NULL, NULL, NULL, NULL, NULL, 0, NULL, NULL, '2026-07-09 20:59:08'),
('NE00000014', 'TN999', '3171075704040002', NULL, '3171075704040002', NULL, NULL, 'TERKIRIM', NULL, '2026-07-09 21:02:58', 'https://fcm.googleapis.com/fcm/send/fqDH6vCwIqo:APA91bGt9VYynldpby5Et9Q2m0ADFnPWS0BruF9Hcj-qreNf4ASduF9DeQaFrkEnBbaBgKDde_hdiSACdKTtYb44NATA-pb1xCUsiObrPKgeVY6RN3kRoTdPISvJIlBiLAuxUugh3TC5', 'BLxfMewLCwDrn5py2cnmkyi3PY9Hjjn88L24NcJ3Ejqc9oEQNKQt69pILNh1Q84ifTxp4YtVe-le-6V3JxdBJ80', 'Qah-7aUxBRLARpJwwofPRg', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/149.0.0.0 Safari/537.36', 0, '2026-07-09 21:02:58', NULL, '2026-07-09 21:02:58'),
('NE00000015', 'TN017', '1146658392983864', 'raniiii@gmail.com', 'Rani Mandiri', 'FPPL', 'REG-001', 'TERKIRIM', NULL, '2026-07-09 21:06:28', NULL, NULL, NULL, NULL, 0, NULL, NULL, '2026-07-09 21:03:27'),
('NE00000016', 'TN006', '1146658392983864', 'raniiii@gmail.com', 'Rani Mandiri', 'FPPL', 'REG-001', 'TERKIRIM', NULL, '2026-07-09 22:02:48', NULL, NULL, NULL, NULL, 0, NULL, NULL, '2026-07-09 21:39:17'),
('NE00000017', 'TN003', '1146658392983864', 'raniiii@gmail.com', 'Rani Mandiri', 'FPPL', 'REG-001', 'TERKIRIM', NULL, '2026-07-09 22:03:32', NULL, NULL, NULL, NULL, 0, NULL, NULL, '2026-07-09 21:39:17'),
('NE00000018', 'TN019', '3171075704040004', 'mmutiaadewi@gmail.com', 'andi', 'FPPL', 'REG-001', 'TERKIRIM', NULL, '2026-07-10 06:39:33', NULL, NULL, NULL, NULL, 0, NULL, NULL, '2026-07-09 21:39:17'),
('NE00000019', 'TN999', '3171075704040009', NULL, '3171075704040009', NULL, NULL, 'TERKIRIM', NULL, '2026-07-09 21:49:37', 'https://fcm.googleapis.com/fcm/send/ezy3TiBXpWA:APA91bEu01EOIwxeJairXGzlsW8E7QGlIzXF6_jt6sAcqg2Gx6C6fup4ti5vKWW-L3UqOW3jGL8fnyLMuUwaS8GoCVOWlF5LWn83ROgEyuGoXSXWQJUIYaigz_fFtqXuJjEh86Xfh5e2', 'BPk3lo7QaD_pNqada85ponPRpYajDfqkuxpsXb1RIzOjG1vx7zi_MgukPSLQ1xvs1AUbrO9M5iookElwtcyplF4', 'KIt6oJx3k_BWe_m2l8HGQA', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/149.0.0.0 Safari/537.36', 0, '2026-07-09 21:49:37', NULL, '2026-07-09 21:49:37'),
('NE00000020', 'TN999', '3171075704040009', NULL, '3171075704040009', NULL, NULL, 'TERKIRIM', NULL, '2026-07-09 21:50:37', 'https://fcm.googleapis.com/fcm/send/dTPoNythAcY:APA91bGp9ePir54QL62efABKBMzABk6XeVgn3jflT5H1g5Fman1vbLdmd3COUyaIq41-DYoBxbbxuLHg6EsRHuubFVJtJ2yLW1FhE4xrOUFYyOpyFQJNt3wwqTijkHTO9zhZHE8KOP44', 'BIIUSY8By_TklHjFQiv6NV5e1FkCsY9QeO1LmK14mQhzkYvh8559JOUPia0UW3ZfbdRzFylwswYLUNc22SHBglc', 'PMnk9oM-8JoxFWvX7UYcsA', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/149.0.0.0 Safari/537.36', 0, '2026-07-09 21:50:37', NULL, '2026-07-09 21:50:37'),
('NE00000021', 'TN009', '3171075704040002', '2211523024_meutia@student.unand.ac.id', 'admin', 'FPPL', 'REG-002', 'TERKIRIM', NULL, '2026-07-09 22:07:42', NULL, NULL, NULL, NULL, 0, NULL, NULL, '2026-07-09 22:05:12'),
('NE00000022', 'TN009', '4587654345678998', 'pakiki@gmail.com', 'dewi.mdd', 'FPPL', 'REG-002', 'MENUNGGU', NULL, NULL, NULL, NULL, NULL, NULL, 0, NULL, NULL, '2026-07-09 22:05:12'),
('NE00000023', 'TN999', '3171075704040002', NULL, '3171075704040002', NULL, NULL, 'TERKIRIM', NULL, '2026-07-09 22:05:26', 'https://fcm.googleapis.com/fcm/send/doiDZd3S0ms:APA91bHGm-8k9Oqdf82YHqL-_zkyKUk_PRR0rqAQCfvqX0EQw_sfriN-Qa9xlJztnBBExLQT-VDl3JUN8G264jecideSlCxXAd50V74AIlPboMeEDWytoDYCOuyv4VOAIhOLDYRFE_dm', 'BA40nHTHwKvsVFn2vFsNWb8FLaBEbpk5Mrs_wIRV0-54bNoxDlBvZdZIfKT0N4GLHus_LIIKmGIisXcFOle_XD8', 'uxqppSJxwC1SXj2VPGR4dA', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/149.0.0.0 Safari/537.36', 0, '2026-07-09 22:05:26', NULL, '2026-07-09 22:05:26'),
('NE00000024', 'TN001', '1146658392983864', 'raniiii@gmail.com', 'Rani Mandiri', 'FPPL', 'REG-002', 'TERKIRIM', NULL, '2026-07-09 22:47:52', NULL, NULL, NULL, NULL, 0, NULL, NULL, '2026-07-09 22:07:55'),
('NE00000025', 'TN018', '3171075704040009', 'kyrinasg91@gmail.com', 'sari', 'FPPL', 'REG-002', 'TERKIRIM', NULL, '2026-07-09 22:11:15', NULL, NULL, NULL, NULL, 0, NULL, NULL, '2026-07-09 22:07:55'),
('NE00000026', 'TN001', '1146658392983864', 'raniiii@gmail.com', 'Rani Mandiri', 'FPPL', 'REG-002', 'TERKIRIM', NULL, '2026-07-09 22:47:52', NULL, NULL, NULL, NULL, 0, NULL, NULL, '2026-07-09 22:17:51'),
('NE00000027', 'TN018', '3171075704040009', 'kyrinasg91@gmail.com', 'sari', 'FPPL', 'REG-002', 'TERKIRIM', NULL, '2026-07-09 22:23:44', NULL, NULL, NULL, NULL, 0, NULL, NULL, '2026-07-09 22:17:52'),
('NE00000028', 'TN999', '3171075704040009', NULL, '3171075704040009', NULL, NULL, 'TERKIRIM', NULL, '2026-07-09 22:22:38', 'https://fcm.googleapis.com/fcm/send/e4nkkQxbpsQ:APA91bGledBSaWrQvGHZKhbMaB0tOSwFiCPPW9SIYco9YUNNt1NAbBCDZ88kaoNPLBBmpqW8DodOZVPYh8d7sG_94fwj0EN6wBFycCdTm9SX1vf9f2RnaueFoRRYeP3kE4cNXd_MjpTw', 'BN-bDTqaUZnWkTUjVFyb_yEcJrDoPcWTQgSK0iZmN-9-svn---IKOaoUTvjeVq2te_2kle0V5qmaMdK1g-P6oh4', 'Bc1V0fxFeJF4PBDIcmB-2A', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/149.0.0.0 Safari/537.36', 0, '2026-07-09 22:22:38', '2026-07-10 05:42:04', '2026-07-09 22:22:38'),
('NE00000029', 'TN001', '1146658392983864', 'raniiii@gmail.com', 'Rani Mandiri', 'FPPL', 'REG-002', 'TERKIRIM', NULL, '2026-07-09 22:47:52', NULL, NULL, NULL, NULL, 0, NULL, NULL, '2026-07-09 22:23:59'),
('NE00000030', 'TN018', '3171075704040009', 'kyrinasg91@gmail.com', 'sari', 'FPPL', 'REG-002', 'TERKIRIM', NULL, '2026-07-09 22:24:37', NULL, NULL, NULL, NULL, 0, NULL, '2026-07-09 22:24:00', '2026-07-09 22:23:59'),
('NE00000031', 'TN004', '1146658392983864', 'raniiii@gmail.com', 'Rani Mandiri', 'FPPL', 'REG-002', 'TERKIRIM', NULL, '2026-07-09 22:46:45', NULL, NULL, NULL, NULL, 0, NULL, NULL, '2026-07-09 22:25:27'),
('NE00000032', 'TN005', '1146658392983864', 'raniiii@gmail.com', 'Rani Mandiri', 'FPPL', 'REG-002', 'TERKIRIM', NULL, '2026-07-09 22:47:52', NULL, NULL, NULL, NULL, 0, NULL, NULL, '2026-07-09 22:47:31'),
('NE00000033', 'TN032', '3171075704040002', '2211523024_meutia@student.unand.ac.id', 'admin', 'FPPL', 'REG-002', 'TERKIRIM', NULL, '2026-07-16 08:37:55', NULL, NULL, NULL, NULL, 0, NULL, NULL, '2026-07-09 22:47:31'),
('NE00000034', 'TN032', '4587654345678998', 'pakiki@gmail.com', 'dewi.mdd', 'FPPL', 'REG-002', 'MENUNGGU', NULL, NULL, NULL, NULL, NULL, NULL, 0, NULL, NULL, '2026-07-09 22:47:31'),
('NE00000035', 'TN999', '3171075704040002', NULL, '3171075704040002', NULL, NULL, 'TERKIRIM', NULL, '2026-07-09 22:48:02', 'https://fcm.googleapis.com/fcm/send/dTdsbu-YF2k:APA91bFv_B7J0uEdUmc8IVJwa4vhnPbMZgktsUS_7GncKi1Jf7xNJ-cA3PyuYUzi7kd_FsMjC2r2COJClojfqWYWEAskQDDJX72lrbrpGPfVevoNA7oDnm6WBVoj9-iet_7P_fuurvis', 'BMy-hRyRUy3epI73ZmX4n6peOt1lcbArE3k3Fn3JF4OF4Mx26y6PCx5RIlRU-SmKdYW_eJ1LOAkoFhQgAnFqZJQ', 'hUSb2UghVkkOfD00njNUSA', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/149.0.0.0 Safari/537.36', 0, '2026-07-09 22:48:02', '2026-07-10 05:41:17', '2026-07-09 22:48:02'),
('NE00000036', 'TN017', '1146658392983864', 'raniiii@gmail.com', 'Rani Mandiri', 'FPPL', 'REG-002', 'TERKIRIM', NULL, '2026-07-09 22:52:21', NULL, NULL, NULL, NULL, 0, NULL, NULL, '2026-07-09 22:48:32'),
('NE00000037', 'TN006', '1146658392983864', 'rekamanpjj@gmail.com', 'Rani Mandiri', 'FPPL', 'REG-002', 'MENUNGGU', NULL, NULL, NULL, NULL, NULL, NULL, 0, NULL, NULL, '2026-07-09 22:51:35'),
('NE00000038', 'TN003', '1146658392983864', 'rekamanpjj@gmail.com', 'Rani Mandiri', 'FPPL', 'REG-002', 'MENUNGGU', NULL, NULL, NULL, NULL, NULL, NULL, 0, NULL, NULL, '2026-07-09 22:51:35'),
('NE00000039', 'TN019', '3171075704040004', 'mmutiaadewi@gmail.com', 'andi', 'FPPL', 'REG-002', 'TERKIRIM', NULL, '2026-07-10 06:39:33', NULL, NULL, NULL, NULL, 0, NULL, NULL, '2026-07-09 22:51:35'),
('NE00000040', 'TN009', '3171075704040002', '2211523024_meutia@student.unand.ac.id', 'admin', 'FPPL', 'REG-003', 'TERKIRIM', NULL, '2026-07-10 05:41:38', NULL, NULL, NULL, NULL, 0, NULL, '2026-07-10 05:41:17', '2026-07-10 05:41:14'),
('NE00000041', 'TN009', '4587654345678998', 'pakiki@gmail.com', 'dewi.mdd', 'FPPL', 'REG-003', 'MENUNGGU', NULL, NULL, NULL, NULL, NULL, NULL, 0, NULL, NULL, '2026-07-10 05:41:18'),
('NE00000042', 'TN001', '1146658392983864', 'mdd.kartika@gmail.com', 'ganjar', 'FPPL', 'REG-003', 'TERKIRIM', NULL, '2026-07-10 05:42:03', NULL, NULL, NULL, NULL, 0, NULL, NULL, '2026-07-10 05:41:49'),
('NE00000043', 'TN018', '3171075704040009', 'kyrinasg91@gmail.com', 'sari', 'FPPL', 'REG-003', 'TERKIRIM', NULL, '2026-07-10 09:39:32', NULL, NULL, NULL, NULL, 0, NULL, '2026-07-10 05:42:04', '2026-07-10 05:42:03'),
('NE00000044', 'TN999', '3171075704040004', NULL, '3171075704040004', NULL, NULL, 'TERKIRIM', NULL, '2026-07-10 05:44:21', 'https://fcm.googleapis.com/fcm/send/dAQQMzl-prw:APA91bGRbBH-LnRZVHA9WE5dVEXJNB8EdrgFP29YPxYJu0Me2AkL21ag5i6ScVWwWGFNn6F6JSOJBbu3parbCbgP85M50WdCdT5rZ4NWUUSiUZrkgPWscutJdJroiahfWBr6xNNj8zzg', 'BC-Fz3vYxtrk8LZgx5nTZaeZ12EhJihr0rft26rFVPNX7_1U99bLpxrECTfKAwD3CzfxEAO9XqpN2EFTjUPUYSI', 'DUM3Wj7ExR7dlIzNcqqgDg', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/149.0.0.0 Safari/537.36', 0, '2026-07-10 05:44:21', '2026-07-10 09:49:08', '2026-07-10 05:44:21'),
('NE00000045', 'TN999', '3171075704040005', NULL, '3171075704040005', NULL, NULL, 'TERKIRIM', NULL, '2026-07-10 05:44:27', 'https://fcm.googleapis.com/fcm/send/fZIOu3cbQ7E:APA91bH7N5PigSvqt6PUeGOpxgA3a0zTf8_26M6zHriIDzxs0HQRm3hIAMzLSrzrtH-4phtZVzfAiadYHoT7mG8tcE9ZBR146hd7g7FzRjoODTc-n0mPLqmJZ4MQfSUgTQCWR8T2EujM', 'BAm2SU1yo3H9PySbvLeCjtWQk12anA0-LX6sp6rY0hEN3pmkp2gkHxPXea8avyk6S8z7Z53y-aCuzmxfy1hO-uM', 'EGVQiwWVwYCYwYhBscqKoQ', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/149.0.0.0 Safari/537.36', 0, '2026-07-10 05:44:27', '2026-07-10 09:48:44', '2026-07-10 05:44:27'),
('NE00000046', 'TN010', '3171075704040005', 'meutiad6@gmail.com', 'rina', 'PENUGASAN', 'PNG-0001', 'TERKIRIM', NULL, '2026-07-10 06:02:05', NULL, NULL, NULL, NULL, 0, NULL, '2026-07-10 06:01:54', '2026-07-10 06:01:53'),
('NE00000047', 'TN010', '3171075704040005', 'meutiad6@gmail.com', 'rina', 'PENUGASAN', 'PNG-0001', 'TERKIRIM', NULL, '2026-07-10 06:40:48', NULL, NULL, NULL, NULL, 0, NULL, '2026-07-10 06:40:41', '2026-07-10 06:40:41'),
('NE00000048', 'TN016', '3171075704040004', 'mmutiaadewi@gmail.com', 'andi', 'PENUGASAN', 'PNG-0001', 'TERKIRIM', NULL, '2026-07-10 06:58:30', NULL, NULL, NULL, NULL, 0, NULL, '2026-07-10 06:58:15', '2026-07-10 06:58:15'),
('NE00000049', 'TN012', '3171075704040005', 'meutiad6@gmail.com', 'rina', 'PENUGASAN', 'PNG-0001', 'TERKIRIM', NULL, '2026-07-10 07:52:47', NULL, NULL, NULL, NULL, 0, NULL, '2026-07-10 07:52:31', '2026-07-10 07:52:26'),
('NE00000050', 'TN016', '3171075704040004', 'mmutiaadewi@gmail.com', 'andi', 'PENUGASAN', 'PNG-0001', 'TERKIRIM', NULL, '2026-07-10 07:53:51', NULL, NULL, NULL, NULL, 0, NULL, '2026-07-10 07:53:06', '2026-07-10 07:53:06'),
('NE00000051', 'TN016', '3171075704040004', 'mmutiaadewi@gmail.com', 'andi', 'PENUGASAN', 'PNG-0001', 'TERKIRIM', NULL, '2026-07-10 08:27:09', NULL, NULL, NULL, NULL, 0, NULL, '2026-07-10 07:56:25', '2026-07-10 07:56:24'),
('NE00000052', 'TN016', '3171075704040004', 'mmutiaadewi@gmail.com', 'andi', 'PENUGASAN', 'PNG-0001', 'TERKIRIM', NULL, '2026-07-10 07:58:36', NULL, NULL, NULL, NULL, 0, NULL, '2026-07-10 07:57:03', '2026-07-10 07:57:03'),
('NE00000053', 'TN016', '3171075704040004', 'mmutiaadewi@gmail.com', 'andi', 'PENUGASAN', 'PNG-0001', 'TERKIRIM', NULL, '2026-07-10 08:05:48', NULL, NULL, NULL, NULL, 0, NULL, '2026-07-10 08:05:35', '2026-07-10 08:05:34'),
('NE00000054', 'TN010', '3171075704040005', 'meutiad6@gmail.com', 'rina', 'PENUGASAN', 'PNG-0002', 'TERKIRIM', NULL, '2026-07-10 08:24:31', NULL, NULL, NULL, NULL, 0, NULL, '2026-07-10 08:23:58', '2026-07-10 08:23:58'),
('NE00000055', 'TN016', '3171075704040004', 'mmutiaadewi@gmail.com', 'andi', 'PENUGASAN', 'PNG-0002', 'TERKIRIM', NULL, '2026-07-10 08:27:06', NULL, NULL, NULL, NULL, 0, NULL, '2026-07-10 08:26:39', '2026-07-10 08:26:38'),
('NE00000056', 'TN012', '3171075704040005', 'meutiad6@gmail.com', 'rina', 'PENUGASAN', 'PNG-0002', 'TERKIRIM', NULL, '2026-07-10 09:38:16', NULL, NULL, NULL, NULL, 0, NULL, '2026-07-10 08:27:39', '2026-07-10 08:27:39'),
('NE00000057', 'TN016', '3171075704040004', 'mmutiaadewi@gmail.com', 'andi', 'PENUGASAN', 'PNG-0002', 'MENUNGGU', NULL, NULL, NULL, NULL, NULL, NULL, 0, NULL, '2026-07-10 09:38:28', '2026-07-10 09:38:28'),
('NE00000058', 'TN016', '3171075704040004', 'mmutiaadewi@gmail.com', 'andi', 'PENUGASAN', 'PNG-0002', 'MENUNGGU', NULL, NULL, NULL, NULL, NULL, NULL, 0, NULL, '2026-07-10 09:39:04', '2026-07-10 09:39:03'),
('NE00000059', 'TN016', '3171075704040004', 'mmutiaadewi@gmail.com', 'andi', 'PENUGASAN', 'PNG-0002', 'MENUNGGU', NULL, NULL, NULL, NULL, NULL, NULL, 0, NULL, '2026-07-10 09:40:42', '2026-07-10 09:40:41'),
('NE00000060', 'TN024', '3171075704040009', 'kyrinasg91@gmail.com', 'sari', 'PENUGASAN', '1/DN/VII/2026', 'TERKIRIM', NULL, '2026-07-10 09:50:22', NULL, NULL, NULL, NULL, 0, NULL, NULL, '2026-07-10 09:43:38'),
('NE00000061', 'TN024', '3171075704040009', 'kyrinasg91@gmail.com', 'sari', 'PENUGASAN', '2/DN/VII/2026', 'TERKIRIM', NULL, '2026-07-10 09:50:22', NULL, NULL, NULL, NULL, 0, NULL, NULL, '2026-07-10 09:43:39'),
('NE00000062', 'TN024', '3171075704040009', 'kyrinasg91@gmail.com', 'sari', 'PENUGASAN', '3/DN/VII/2026', 'TERKIRIM', NULL, '2026-07-10 09:50:22', NULL, NULL, NULL, NULL, 0, NULL, NULL, '2026-07-10 09:43:43'),
('NE00000063', 'TN024', '3171075704040009', 'kyrinasg91@gmail.com', 'sari', 'PENUGASAN', '4/LT/VII/2026', 'TERKIRIM', NULL, '2026-07-10 09:50:22', NULL, NULL, NULL, NULL, 0, NULL, NULL, '2026-07-10 09:43:52'),
('NE00000064', 'TN999', '3171075704040009', NULL, '3171075704040009', NULL, NULL, 'TERKIRIM', NULL, '2026-07-10 09:44:09', 'https://fcm.googleapis.com/fcm/send/dVoAv8G405w:APA91bH5eIaaCS3i5__HM6--EPgd7wI7Qruiy0tfiwPp0rJpMYF1EZBBnGXaXJf2bWELSlvBj8H4aOJzocVk_AaFj1-ylGmMhgHexXgWyLUJunP_W5z2TMKrWyPK_ZqdVi5k9tahQfqf', 'BKENKjvk_I5M4gN34yqdEsvi5RBpcrGDPpnG3DmdIuVM7G-WZSb3KQTLplr7k-PZAa6FTcsmtrGxQIza47JSsLc', 'RTblkNnanQ5FBSUdKY18eA', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/150.0.0.0 Safari/537.36', 0, '2026-07-10 09:44:09', NULL, '2026-07-10 09:44:09'),
('NE00000065', 'TN031', '312131131415759', 'milkyambis@gmail.com', 'sandiaga0', 'FPPL', 'REG-001', 'TERKIRIM', NULL, '2026-07-10 09:53:37', NULL, NULL, NULL, NULL, 0, NULL, NULL, '2026-07-10 09:44:54'),
('NE00000066', 'TN026', '3171075704040004', 'mmutiaadewi@gmail.com', 'andi', 'PENUGASAN', 'PNG-0001', 'MENUNGGU', NULL, NULL, NULL, NULL, NULL, NULL, 0, NULL, '2026-07-10 09:45:34', '2026-07-10 09:45:34'),
('NE00000067', 'TN013', '3171075704040005', 'meutiad6@gmail.com', 'rina', 'PENUGASAN', 'PNG-0001', 'TERKIRIM', NULL, '2026-07-10 09:48:54', NULL, NULL, NULL, NULL, 0, NULL, '2026-07-10 09:48:44', '2026-07-10 09:48:44'),
('NE00000068', 'TN016', '3171075704040004', 'mmutiaadewi@gmail.com', 'andi', 'PENUGASAN', 'PNG-0001', 'TERKIRIM', NULL, '2026-07-10 09:49:38', NULL, NULL, NULL, NULL, 0, NULL, '2026-07-10 09:49:08', '2026-07-10 09:49:08'),
('NE00000069', 'TN028', '3171075704040009', 'kyrinasg91@gmail.com', 'sari', 'PENUGASAN', '2/DN/VII/2026', 'TERKIRIM', NULL, '2026-07-10 09:50:22', NULL, NULL, NULL, NULL, 0, NULL, NULL, '2026-07-10 09:50:06'),
('NE00000070', 'TN031', '312131131415759', 'milkyambis@gmail.com', 'sandiaga0', 'FPPL', 'REG-002', 'TERKIRIM', NULL, '2026-07-10 09:53:41', NULL, NULL, NULL, NULL, 0, NULL, NULL, '2026-07-10 09:50:53'),
('NE00000071', 'TN008', '1146658392983864', 'rekamanpjj@gmail.com', 'Rani Mandiri', 'LHU', '01/LHU/VII/LAB-2026', 'TERKIRIM', NULL, '2026-07-10 09:54:50', NULL, NULL, NULL, NULL, 0, NULL, NULL, '2026-07-10 09:54:37'),
('NE00000072', 'TN008', '1146658392983864', 'rekamanpjj@gmail.com', 'Rani Mandiri', 'LHU', '01/LHU/VII/LAB-2026', 'TERKIRIM', NULL, '2026-07-10 10:18:33', NULL, NULL, NULL, NULL, 0, NULL, NULL, '2026-07-10 10:18:19'),
('NE00000073', 'TN025', '3171075704040002', '2211523024_meutia@student.unand.ac.id', 'admin', 'LHU', '02/LHU/VII/LAB-2026', 'TERKIRIM', NULL, '2026-07-16 08:37:55', NULL, NULL, NULL, NULL, 0, NULL, NULL, '2026-07-10 10:32:42'),
('NE00000074', 'TN025', '4587654345678998', 'pakiki@gmail.com', 'dewi.mdd', 'LHU', '02/LHU/VII/LAB-2026', 'MENUNGGU', NULL, NULL, NULL, NULL, NULL, NULL, 0, NULL, NULL, '2026-07-10 10:32:42'),
('NE00000075', 'TN025', '3171075704040002', '2211523024_meutia@student.unand.ac.id', 'admin', 'LHU', '03/LHU/VII/LAB-2026', 'TERKIRIM', NULL, '2026-07-10 10:38:20', NULL, NULL, NULL, NULL, 0, NULL, NULL, '2026-07-10 10:37:26'),
('NE00000076', 'TN025', '4587654345678998', 'pakiki@gmail.com', 'dewi.mdd', 'LHU', '03/LHU/VII/LAB-2026', 'MENUNGGU', NULL, NULL, NULL, NULL, NULL, NULL, 0, NULL, NULL, '2026-07-10 10:37:26'),
('NE00000077', 'TN999', '3171075704040002', NULL, '3171075704040002', NULL, NULL, 'TERKIRIM', NULL, '2026-07-10 10:38:15', 'https://fcm.googleapis.com/fcm/send/d5lEO8ZBq3M:APA91bELmljNnFrhWEehWpLFQCrG-aq1m99Jf4i1xlXlJHJp0J6h2jrotlN1BniW6eaVDgVfYba2h2sWKOyY98cK5dYQreyT04qZl4eYvHjdXGfO0lzVi1WbsaXke1gEx7r0cUhYpR1r', 'BNwwwaIbc4TPWm0p5ookiaDX4B8NfUbpRWe9GqAwskbc0N1RVyD3AwGvEy6OFr4pvY65BCDY2v9b-eASbKqyCLA', 'QbMTcRAM1N1zG0_roboJ9A', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/150.0.0.0 Safari/537.36', 0, '2026-07-10 10:38:15', NULL, '2026-07-10 10:38:15'),
('NE00000078', 'TN007', '1146658392983864', 'rekamanpjj@gmail.com', 'Rani Mandiri', 'JADWAL_LHU', 'JPL-000001', 'TERKIRIM', NULL, '2026-07-10 10:39:24', NULL, NULL, NULL, NULL, 0, NULL, NULL, '2026-07-10 10:39:11'),
('NE00000079', 'TN009', '3171075704040002', '2211523024_meutia@student.unand.ac.id', 'admin', 'FPPL', 'REG-004', 'TERKIRIM', NULL, '2026-07-16 08:37:55', NULL, NULL, NULL, NULL, 0, NULL, NULL, '2026-07-16 08:29:42'),
('NE00000080', 'TN009', '4587654345678998', 'pakiki@gmail.com', 'dewi.mdd', 'FPPL', 'REG-004', 'MENUNGGU', NULL, NULL, NULL, NULL, NULL, NULL, 0, NULL, NULL, '2026-07-16 08:29:42'),
('NE00000081', 'TN001', '3171803823927329', 'mdd.kartika@gmail.com', 'Jayanti Kusuma', 'FPPL', 'REG-004', 'TERKIRIM', NULL, '2026-07-16 08:34:30', NULL, NULL, NULL, NULL, 0, NULL, NULL, '2026-07-16 08:33:09'),
('NE00000082', 'TN018', '3171075704040009', 'kyrinasg91@gmail.com', 'sari', 'FPPL', 'REG-004', 'TERKIRIM', NULL, '2026-07-16 08:41:45', NULL, NULL, NULL, NULL, 0, NULL, NULL, '2026-07-16 08:34:30'),
('NE00000083', 'TN004', '1146658392983864', 'mdd.kartika@gmail.com', 'ganjar', 'FPPL', 'REG-003', 'TERKIRIM', NULL, '2026-07-16 08:39:37', NULL, NULL, NULL, NULL, 0, NULL, NULL, '2026-07-16 08:39:22'),
('NE00000084', 'TN004', '3171803823927329', 'mdd.kartika@gmail.com', 'Jayanti Kusuma', 'FPPL', 'REG-004', 'TERKIRIM', NULL, '2026-07-16 08:50:54', NULL, NULL, NULL, NULL, 0, NULL, NULL, '2026-07-16 08:50:41'),
('NE00000085', 'TN005', '3171803823927329', 'mdd.kartika@gmail.com', 'Jayanti Kusuma', 'FPPL', 'REG-004', 'TERKIRIM', NULL, '2026-07-16 08:52:20', NULL, NULL, NULL, NULL, 0, NULL, NULL, '2026-07-16 08:51:58'),
('NE00000086', 'TN032', '3171075704040002', '2211523024_meutia@student.unand.ac.id', 'admin', 'FPPL', 'REG-004', 'TERKIRIM', NULL, '2026-07-16 12:29:41', NULL, NULL, NULL, NULL, 0, NULL, NULL, '2026-07-16 08:51:58'),
('NE00000087', 'TN032', '4587654345678998', 'pakiki@gmail.com', 'dewi.mdd', 'FPPL', 'REG-004', 'MENUNGGU', NULL, NULL, NULL, NULL, NULL, NULL, 0, NULL, NULL, '2026-07-16 08:51:58'),
('NE00000088', 'TN005', '1146658392983864', 'mdd.kartika@gmail.com', 'ganjar', 'FPPL', 'REG-003', 'TERKIRIM', NULL, '2026-07-16 08:53:17', NULL, NULL, NULL, NULL, 0, NULL, NULL, '2026-07-16 08:53:04'),
('NE00000089', 'TN032', '3171075704040002', '2211523024_meutia@student.unand.ac.id', 'admin', 'FPPL', 'REG-003', 'TERKIRIM', NULL, '2026-07-16 12:29:41', NULL, NULL, NULL, NULL, 0, NULL, NULL, '2026-07-16 08:53:04'),
('NE00000090', 'TN032', '4587654345678998', 'pakiki@gmail.com', 'dewi.mdd', 'FPPL', 'REG-003', 'MENUNGGU', NULL, NULL, NULL, NULL, NULL, NULL, 0, NULL, NULL, '2026-07-16 08:53:04'),
('NE00000091', 'TN017', '1146658392983864', 'mdd.kartika@gmail.com', 'ganjar', 'FPPL', 'REG-003', 'TERKIRIM', NULL, '2026-07-16 08:55:51', NULL, NULL, NULL, NULL, 0, NULL, NULL, '2026-07-16 08:55:38'),
('NE00000092', 'TN017', '3171803823927329', 'mdd.kartika@gmail.com', 'Jayanti Kusuma', 'FPPL', 'REG-004', 'TERKIRIM', NULL, '2026-07-16 08:56:15', NULL, NULL, NULL, NULL, 0, NULL, NULL, '2026-07-16 08:56:02'),
('NE00000093', 'TN003', '3171803823927329', 'mdd.kartika@gmail.com', 'Jayanti Kusuma', 'FPPL', 'REG-004', 'TERKIRIM', NULL, '2026-07-16 08:58:59', NULL, NULL, NULL, NULL, 0, NULL, NULL, '2026-07-16 08:58:45'),
('NE00000094', 'TN006', '3171803823927329', 'mdd.kartika@gmail.com', 'Jayanti Kusuma', 'FPPL', 'REG-004', 'TERKIRIM', NULL, '2026-07-16 08:58:58', NULL, NULL, NULL, NULL, 0, NULL, NULL, '2026-07-16 08:58:45'),
('NE00000095', 'TN019', '3171075704040004', 'mmutiaadewi@gmail.com', 'andi', 'FPPL', 'REG-004', 'MENUNGGU', NULL, NULL, NULL, NULL, NULL, NULL, 0, NULL, NULL, '2026-07-16 08:58:45'),
('NE00000096', 'TN006', '1146658392983864', 'mdd.kartika@gmail.com', 'ganjar', 'FPPL', 'REG-003', 'TERKIRIM', NULL, '2026-07-16 09:01:41', NULL, NULL, NULL, NULL, 0, NULL, NULL, '2026-07-16 09:01:28'),
('NE00000097', 'TN019', '3171075704040004', 'mmutiaadewi@gmail.com', 'andi', 'FPPL', 'REG-003', 'MENUNGGU', NULL, NULL, NULL, NULL, NULL, NULL, 0, NULL, NULL, '2026-07-16 09:01:28'),
('NE00000098', 'TN003', '1146658392983864', 'mdd.kartika@gmail.com', 'ganjar', 'FPPL', 'REG-003', 'TERKIRIM', NULL, '2026-07-16 09:01:42', NULL, NULL, NULL, NULL, 0, NULL, NULL, '2026-07-16 09:01:28'),
('NE00000099', 'TN010', '3171075704040005', 'meutiad6@gmail.com', 'rina', 'PENUGASAN', 'PNG-0003', 'MENUNGGU', NULL, NULL, NULL, NULL, NULL, NULL, 0, NULL, NULL, '2026-07-16 09:04:12'),
('NE00000100', 'TN016', '3171075704040004', 'mmutiaadewi@gmail.com', 'andi', 'PENUGASAN', 'PNG-0003', 'MENUNGGU', NULL, NULL, NULL, NULL, NULL, NULL, 0, NULL, NULL, '2026-07-16 09:06:46'),
('NE00000101', 'TN012', '3171075704040005', 'meutiad6@gmail.com', 'rina', 'PENUGASAN', 'PNG-0003', 'MENUNGGU', NULL, NULL, NULL, NULL, NULL, NULL, 0, NULL, NULL, '2026-07-16 09:07:23'),
('NE00000102', 'TN009', '3171075704040002', '2211523024_meutia@student.unand.ac.id', 'admin', 'FPPL', 'REG-005', 'TERKIRIM', NULL, '2026-07-16 12:29:41', NULL, NULL, NULL, NULL, 0, NULL, NULL, '2026-07-16 09:14:09'),
('NE00000103', 'TN009', '4587654345678998', 'pakiki@gmail.com', 'dewi.mdd', 'FPPL', 'REG-005', 'MENUNGGU', NULL, NULL, NULL, NULL, NULL, NULL, 0, NULL, NULL, '2026-07-16 09:14:09'),
('NE00000104', 'TN001', '1146658392983864', 'mdd.kartika@gmail.com', 'ganjar', 'FPPL', 'REG-005', 'TERKIRIM', NULL, '2026-07-16 12:28:03', NULL, NULL, NULL, NULL, 0, NULL, NULL, '2026-07-16 12:27:49'),
('NE00000105', 'TN018', '3171075704040009', 'kyrinasg91@gmail.com', 'sari', 'FPPL', 'REG-005', 'MENUNGGU', NULL, NULL, NULL, NULL, NULL, NULL, 0, NULL, NULL, '2026-07-16 12:28:03'),
('NE00000106', 'TN009', '3171075704040002', '2211523024_meutia@student.unand.ac.id', 'admin', 'FPPL', 'REG-006', 'MENUNGGU', NULL, NULL, NULL, NULL, NULL, NULL, 0, NULL, NULL, '2026-07-16 14:36:19'),
('NE00000107', 'TN009', '4587654345678998', 'pakiki@gmail.com', 'dewi.mdd', 'FPPL', 'REG-006', 'MENUNGGU', NULL, NULL, NULL, NULL, NULL, NULL, 0, NULL, NULL, '2026-07-16 14:36:19'),
('NE00000108', 'TN004', '1146658392983864', 'mdd.kartika@gmail.com', 'ganjar', 'FPPL', 'REG-005', 'TERKIRIM', NULL, '2026-07-16 14:48:24', NULL, NULL, NULL, NULL, 0, NULL, NULL, '2026-07-16 14:47:53'),
('NE00000109', 'TN005', '1146658392983864', 'mdd.kartika@gmail.com', 'ganjar', 'FPPL', 'REG-005', 'TERKIRIM', NULL, '2026-07-16 14:49:38', NULL, NULL, NULL, NULL, 0, NULL, NULL, '2026-07-16 14:49:23'),
('NE00000110', 'TN032', '3171075704040002', '2211523024_meutia@student.unand.ac.id', 'admin', 'FPPL', 'REG-005', 'MENUNGGU', NULL, NULL, NULL, NULL, NULL, NULL, 0, NULL, NULL, '2026-07-16 14:49:23'),
('NE00000111', 'TN032', '4587654345678998', 'pakiki@gmail.com', 'dewi.mdd', 'FPPL', 'REG-005', 'MENUNGGU', NULL, NULL, NULL, NULL, NULL, NULL, 0, NULL, NULL, '2026-07-16 14:49:23'),
('NE00000112', 'TN007', '1146658392983864', 'rekamanpjj@gmail.com', 'Rani Mandiri', 'JADWAL_LHU', 'JPL-000002', 'TERKIRIM', NULL, '2026-07-16 15:01:16', NULL, NULL, NULL, NULL, 0, NULL, NULL, '2026-07-16 15:00:59'),
('NE00000113', 'TN001', '3172346877989832', 'warga@gmail.com', 'warga', 'FPPL', 'REG-006', 'TERKIRIM', NULL, '2026-07-16 15:29:07', NULL, NULL, NULL, NULL, 0, NULL, NULL, '2026-07-16 15:28:53'),
('NE00000114', 'TN018', '3171075704040009', 'kyrinasg91@gmail.com', 'sari', 'FPPL', 'REG-006', 'MENUNGGU', NULL, NULL, NULL, NULL, NULL, NULL, 0, NULL, NULL, '2026-07-16 15:29:07'),
('NE00000115', 'TN004', '3172346877989832', 'warga@gmail.com', 'warga', 'FPPL', 'REG-006', 'TERKIRIM', NULL, '2026-07-16 15:29:50', NULL, NULL, NULL, NULL, 0, NULL, NULL, '2026-07-16 15:29:36'),
('NE00000116', 'TN016', '3171075704040004', 'mmutiaadewi@gmail.com', 'andi', 'PENUGASAN', 'PNG-0003', 'MENUNGGU', NULL, NULL, NULL, NULL, NULL, NULL, 0, NULL, NULL, '2026-07-16 15:38:57'),
('NE00000117', 'TN010', '3171075704040005', 'meutiad6@gmail.com', 'rina', 'PENUGASAN', 'PNG-0004', 'MENUNGGU', NULL, NULL, NULL, NULL, NULL, NULL, 0, NULL, NULL, '2026-07-16 15:42:44'),
('NE00000118', 'TN005', '3172346877989832', 'warga@gmail.com', 'warga', 'FPPL', 'REG-006', 'TERKIRIM', NULL, '2026-07-16 15:45:49', NULL, NULL, NULL, NULL, 0, NULL, NULL, '2026-07-16 15:45:34'),
('NE00000119', 'TN032', '3171075704040002', '2211523024_meutia@student.unand.ac.id', 'admin', 'FPPL', 'REG-006', 'MENUNGGU', NULL, NULL, NULL, NULL, NULL, NULL, 0, NULL, NULL, '2026-07-16 15:45:34'),
('NE00000120', 'TN032', '4587654345678998', 'pakiki@gmail.com', 'dewi.mdd', 'FPPL', 'REG-006', 'MENUNGGU', NULL, NULL, NULL, NULL, NULL, NULL, 0, NULL, NULL, '2026-07-16 15:45:34'),
('NE00000121', 'TN009', '3171075704040002', '2211523024_meutia@student.unand.ac.id', 'admin', 'FPPL', 'REG-002', 'MENUNGGU', NULL, NULL, NULL, NULL, NULL, NULL, 0, NULL, NULL, '2026-08-02 17:58:03'),
('NE00000122', 'TN009', '4587654345678998', 'pakiki@gmail.com', 'dewi.mdd', 'FPPL', 'REG-002', 'MENUNGGU', NULL, NULL, NULL, NULL, NULL, NULL, 0, NULL, NULL, '2026-08-02 17:58:03'),
('NE00000123', 'TN009', '3171075704040002', '2211523024_meutia@student.unand.ac.id', 'admin', 'FPPL', 'REG-002', 'MENUNGGU', NULL, NULL, NULL, NULL, NULL, NULL, 0, NULL, NULL, '2026-08-02 17:58:04'),
('NE00000124', 'TN009', '4587654345678998', 'pakiki@gmail.com', 'dewi.mdd', 'FPPL', 'REG-002', 'MENUNGGU', NULL, NULL, NULL, NULL, NULL, NULL, 0, NULL, NULL, '2026-08-02 17:58:04'),
('NE00000125', 'TN009', '3171075704040002', '2211523024_meutia@student.unand.ac.id', 'admin', 'FPPL', 'REG-002', 'MENUNGGU', NULL, NULL, NULL, NULL, NULL, NULL, 0, NULL, NULL, '2026-08-02 17:58:04'),
('NE00000126', 'TN009', '4587654345678998', 'pakiki@gmail.com', 'dewi.mdd', 'FPPL', 'REG-002', 'MENUNGGU', NULL, NULL, NULL, NULL, NULL, NULL, 0, NULL, NULL, '2026-08-02 17:58:04'),
('NE00000127', 'TN009', '3171075704040002', '2211523024_meutia@student.unand.ac.id', 'admin', 'FPPL', 'REG-002', 'MENUNGGU', NULL, NULL, NULL, NULL, NULL, NULL, 0, NULL, NULL, '2026-08-02 17:58:04'),
('NE00000128', 'TN009', '4587654345678998', 'pakiki@gmail.com', 'dewi.mdd', 'FPPL', 'REG-002', 'MENUNGGU', NULL, NULL, NULL, NULL, NULL, NULL, 0, NULL, NULL, '2026-08-02 17:58:04'),
('NE00000129', 'TN009', '3171075704040002', '2211523024_meutia@student.unand.ac.id', 'admin', 'FPPL', 'REG-002', 'MENUNGGU', NULL, NULL, NULL, NULL, NULL, NULL, 0, NULL, NULL, '2026-08-02 17:58:04'),
('NE00000130', 'TN009', '4587654345678998', 'pakiki@gmail.com', 'dewi.mdd', 'FPPL', 'REG-002', 'MENUNGGU', NULL, NULL, NULL, NULL, NULL, NULL, 0, NULL, NULL, '2026-08-02 17:58:04'),
('NE00000131', 'TN009', '3171075704040002', '2211523024_meutia@student.unand.ac.id', 'admin', 'FPPL', 'REG-002', 'MENUNGGU', NULL, NULL, NULL, NULL, NULL, NULL, 0, NULL, NULL, '2026-08-02 17:58:04'),
('NE00000132', 'TN009', '4587654345678998', 'pakiki@gmail.com', 'dewi.mdd', 'FPPL', 'REG-002', 'MENUNGGU', NULL, NULL, NULL, NULL, NULL, NULL, 0, NULL, NULL, '2026-08-02 17:58:04'),
('NE00000133', 'TN009', '3171075704040002', '2211523024_meutia@student.unand.ac.id', 'admin', 'FPPL', 'REG-002', 'MENUNGGU', NULL, NULL, NULL, NULL, NULL, NULL, 0, NULL, NULL, '2026-08-02 17:58:05'),
('NE00000134', 'TN009', '4587654345678998', 'pakiki@gmail.com', 'dewi.mdd', 'FPPL', 'REG-002', 'MENUNGGU', NULL, NULL, NULL, NULL, NULL, NULL, 0, NULL, NULL, '2026-08-02 17:58:05'),
('NE00000135', 'TN009', '3171075704040002', '2211523024_meutia@student.unand.ac.id', 'admin', 'FPPL', 'REG-001', 'MENUNGGU', NULL, NULL, NULL, NULL, NULL, NULL, 0, NULL, NULL, '2026-08-02 17:58:05'),
('NE00000136', 'TN009', '4587654345678998', 'pakiki@gmail.com', 'dewi.mdd', 'FPPL', 'REG-001', 'MENUNGGU', NULL, NULL, NULL, NULL, NULL, NULL, 0, NULL, NULL, '2026-08-02 17:58:05'),
('NE00000137', 'TN009', '3171075704040002', '2211523024_meutia@student.unand.ac.id', 'admin', 'FPPL', 'REG-002', 'MENUNGGU', NULL, NULL, NULL, NULL, NULL, NULL, 0, NULL, NULL, '2026-08-02 18:01:33'),
('NE00000138', 'TN009', '4587654345678998', 'pakiki@gmail.com', 'dewi.mdd', 'FPPL', 'REG-002', 'MENUNGGU', NULL, NULL, NULL, NULL, NULL, NULL, 0, NULL, NULL, '2026-08-02 18:01:33'),
('NE00000139', 'TN009', '3171075704040002', '2211523024_meutia@student.unand.ac.id', 'admin', 'FPPL', 'REG-002', 'MENUNGGU', NULL, NULL, NULL, NULL, NULL, NULL, 0, NULL, NULL, '2026-08-02 18:01:33'),
('NE00000140', 'TN009', '4587654345678998', 'pakiki@gmail.com', 'dewi.mdd', 'FPPL', 'REG-002', 'MENUNGGU', NULL, NULL, NULL, NULL, NULL, NULL, 0, NULL, NULL, '2026-08-02 18:01:33'),
('NE00000141', 'TN009', '3171075704040002', '2211523024_meutia@student.unand.ac.id', 'admin', 'FPPL', 'REG-002', 'MENUNGGU', NULL, NULL, NULL, NULL, NULL, NULL, 0, NULL, NULL, '2026-08-02 18:01:33'),
('NE00000142', 'TN009', '4587654345678998', 'pakiki@gmail.com', 'dewi.mdd', 'FPPL', 'REG-002', 'MENUNGGU', NULL, NULL, NULL, NULL, NULL, NULL, 0, NULL, NULL, '2026-08-02 18:01:34'),
('NE00000143', 'TN009', '3171075704040002', '2211523024_meutia@student.unand.ac.id', 'admin', 'FPPL', 'REG-002', 'MENUNGGU', NULL, NULL, NULL, NULL, NULL, NULL, 0, NULL, NULL, '2026-08-02 18:01:34'),
('NE00000144', 'TN009', '4587654345678998', 'pakiki@gmail.com', 'dewi.mdd', 'FPPL', 'REG-002', 'MENUNGGU', NULL, NULL, NULL, NULL, NULL, NULL, 0, NULL, NULL, '2026-08-02 18:01:34'),
('NE00000145', 'TN009', '3171075704040002', '2211523024_meutia@student.unand.ac.id', 'admin', 'FPPL', 'REG-002', 'MENUNGGU', NULL, NULL, NULL, NULL, NULL, NULL, 0, NULL, NULL, '2026-08-02 18:01:34'),
('NE00000146', 'TN009', '4587654345678998', 'pakiki@gmail.com', 'dewi.mdd', 'FPPL', 'REG-002', 'MENUNGGU', NULL, NULL, NULL, NULL, NULL, NULL, 0, NULL, NULL, '2026-08-02 18:01:34'),
('NE00000147', 'TN009', '3171075704040002', '2211523024_meutia@student.unand.ac.id', 'admin', 'FPPL', 'REG-002', 'MENUNGGU', NULL, NULL, NULL, NULL, NULL, NULL, 0, NULL, NULL, '2026-08-02 18:01:34'),
('NE00000148', 'TN009', '4587654345678998', 'pakiki@gmail.com', 'dewi.mdd', 'FPPL', 'REG-002', 'MENUNGGU', NULL, NULL, NULL, NULL, NULL, NULL, 0, NULL, NULL, '2026-08-02 18:01:34'),
('NE00000149', 'TN009', '3171075704040002', '2211523024_meutia@student.unand.ac.id', 'admin', 'FPPL', 'REG-002', 'MENUNGGU', NULL, NULL, NULL, NULL, NULL, NULL, 0, NULL, NULL, '2026-08-02 18:01:34'),
('NE00000150', 'TN009', '4587654345678998', 'pakiki@gmail.com', 'dewi.mdd', 'FPPL', 'REG-002', 'MENUNGGU', NULL, NULL, NULL, NULL, NULL, NULL, 0, NULL, NULL, '2026-08-02 18:01:34'),
('NE00000151', 'TN009', '3171075704040002', '2211523024_meutia@student.unand.ac.id', 'admin', 'FPPL', 'REG-001', 'MENUNGGU', NULL, NULL, NULL, NULL, NULL, NULL, 0, NULL, NULL, '2026-08-02 18:01:34'),
('NE00000152', 'TN009', '4587654345678998', 'pakiki@gmail.com', 'dewi.mdd', 'FPPL', 'REG-001', 'MENUNGGU', NULL, NULL, NULL, NULL, NULL, NULL, 0, NULL, NULL, '2026-08-02 18:01:34'),
('NE00000153', 'TN009', '3171075704040002', '2211523024_meutia@student.unand.ac.id', 'admin', 'FPPL', 'REG-002', 'MENUNGGU', NULL, NULL, NULL, NULL, NULL, NULL, 0, NULL, NULL, '2026-08-02 18:03:12'),
('NE00000154', 'TN009', '4587654345678998', 'pakiki@gmail.com', 'dewi.mdd', 'FPPL', 'REG-002', 'MENUNGGU', NULL, NULL, NULL, NULL, NULL, NULL, 0, NULL, NULL, '2026-08-02 18:03:12'),
('NE00000155', 'TN009', '3171075704040002', '2211523024_meutia@student.unand.ac.id', 'admin', 'FPPL', 'REG-002', 'MENUNGGU', NULL, NULL, NULL, NULL, NULL, NULL, 0, NULL, NULL, '2026-08-02 18:03:13'),
('NE00000156', 'TN009', '4587654345678998', 'pakiki@gmail.com', 'dewi.mdd', 'FPPL', 'REG-002', 'MENUNGGU', NULL, NULL, NULL, NULL, NULL, NULL, 0, NULL, NULL, '2026-08-02 18:03:13'),
('NE00000157', 'TN009', '3171075704040002', '2211523024_meutia@student.unand.ac.id', 'admin', 'FPPL', 'REG-002', 'MENUNGGU', NULL, NULL, NULL, NULL, NULL, NULL, 0, NULL, NULL, '2026-08-02 18:03:13'),
('NE00000158', 'TN009', '4587654345678998', 'pakiki@gmail.com', 'dewi.mdd', 'FPPL', 'REG-002', 'MENUNGGU', NULL, NULL, NULL, NULL, NULL, NULL, 0, NULL, NULL, '2026-08-02 18:03:13'),
('NE00000159', 'TN009', '3171075704040002', '2211523024_meutia@student.unand.ac.id', 'admin', 'FPPL', 'REG-002', 'MENUNGGU', NULL, NULL, NULL, NULL, NULL, NULL, 0, NULL, NULL, '2026-08-02 18:03:13'),
('NE00000160', 'TN009', '4587654345678998', 'pakiki@gmail.com', 'dewi.mdd', 'FPPL', 'REG-002', 'MENUNGGU', NULL, NULL, NULL, NULL, NULL, NULL, 0, NULL, NULL, '2026-08-02 18:03:13'),
('NE00000161', 'TN009', '3171075704040002', '2211523024_meutia@student.unand.ac.id', 'admin', 'FPPL', 'REG-002', 'MENUNGGU', NULL, NULL, NULL, NULL, NULL, NULL, 0, NULL, NULL, '2026-08-02 18:03:13'),
('NE00000162', 'TN009', '4587654345678998', 'pakiki@gmail.com', 'dewi.mdd', 'FPPL', 'REG-002', 'MENUNGGU', NULL, NULL, NULL, NULL, NULL, NULL, 0, NULL, NULL, '2026-08-02 18:03:13'),
('NE00000163', 'TN009', '3171075704040002', '2211523024_meutia@student.unand.ac.id', 'admin', 'FPPL', 'REG-002', 'MENUNGGU', NULL, NULL, NULL, NULL, NULL, NULL, 0, NULL, NULL, '2026-08-02 18:03:13'),
('NE00000164', 'TN009', '4587654345678998', 'pakiki@gmail.com', 'dewi.mdd', 'FPPL', 'REG-002', 'MENUNGGU', NULL, NULL, NULL, NULL, NULL, NULL, 0, NULL, NULL, '2026-08-02 18:03:13'),
('NE00000165', 'TN009', '3171075704040002', '2211523024_meutia@student.unand.ac.id', 'admin', 'FPPL', 'REG-002', 'MENUNGGU', NULL, NULL, NULL, NULL, NULL, NULL, 0, NULL, NULL, '2026-08-02 18:03:13'),
('NE00000166', 'TN009', '4587654345678998', 'pakiki@gmail.com', 'dewi.mdd', 'FPPL', 'REG-002', 'MENUNGGU', NULL, NULL, NULL, NULL, NULL, NULL, 0, NULL, NULL, '2026-08-02 18:03:13'),
('NE00000167', 'TN009', '3171075704040002', '2211523024_meutia@student.unand.ac.id', 'admin', 'FPPL', 'REG-001', 'MENUNGGU', NULL, NULL, NULL, NULL, NULL, NULL, 0, NULL, NULL, '2026-08-02 18:03:14'),
('NE00000168', 'TN009', '4587654345678998', 'pakiki@gmail.com', 'dewi.mdd', 'FPPL', 'REG-001', 'MENUNGGU', NULL, NULL, NULL, NULL, NULL, NULL, 0, NULL, NULL, '2026-08-02 18:03:14'),
('NE00000169', 'TN009', '3171075704040002', '2211523024_meutia@student.unand.ac.id', 'admin', 'FPPL', 'REG-002', 'MENUNGGU', NULL, NULL, NULL, NULL, NULL, NULL, 0, NULL, NULL, '2026-08-02 18:04:23'),
('NE00000170', 'TN009', '4587654345678998', 'pakiki@gmail.com', 'dewi.mdd', 'FPPL', 'REG-002', 'MENUNGGU', NULL, NULL, NULL, NULL, NULL, NULL, 0, NULL, NULL, '2026-08-02 18:04:24'),
('NE00000171', 'TN009', '3171075704040002', '2211523024_meutia@student.unand.ac.id', 'admin', 'FPPL', 'REG-002', 'MENUNGGU', NULL, NULL, NULL, NULL, NULL, NULL, 0, NULL, NULL, '2026-08-02 18:04:24'),
('NE00000172', 'TN009', '4587654345678998', 'pakiki@gmail.com', 'dewi.mdd', 'FPPL', 'REG-002', 'MENUNGGU', NULL, NULL, NULL, NULL, NULL, NULL, 0, NULL, NULL, '2026-08-02 18:04:24'),
('NE00000173', 'TN009', '3171075704040002', '2211523024_meutia@student.unand.ac.id', 'admin', 'FPPL', 'REG-002', 'MENUNGGU', NULL, NULL, NULL, NULL, NULL, NULL, 0, NULL, NULL, '2026-08-02 18:04:24'),
('NE00000174', 'TN009', '4587654345678998', 'pakiki@gmail.com', 'dewi.mdd', 'FPPL', 'REG-002', 'MENUNGGU', NULL, NULL, NULL, NULL, NULL, NULL, 0, NULL, NULL, '2026-08-02 18:04:24'),
('NE00000175', 'TN009', '3171075704040002', '2211523024_meutia@student.unand.ac.id', 'admin', 'FPPL', 'REG-002', 'MENUNGGU', NULL, NULL, NULL, NULL, NULL, NULL, 0, NULL, NULL, '2026-08-02 18:04:24'),
('NE00000176', 'TN009', '4587654345678998', 'pakiki@gmail.com', 'dewi.mdd', 'FPPL', 'REG-002', 'MENUNGGU', NULL, NULL, NULL, NULL, NULL, NULL, 0, NULL, NULL, '2026-08-02 18:04:24'),
('NE00000177', 'TN009', '3171075704040002', '2211523024_meutia@student.unand.ac.id', 'admin', 'FPPL', 'REG-001', 'MENUNGGU', NULL, NULL, NULL, NULL, NULL, NULL, 0, NULL, NULL, '2026-08-02 18:04:25'),
('NE00000178', 'TN009', '4587654345678998', 'pakiki@gmail.com', 'dewi.mdd', 'FPPL', 'REG-001', 'MENUNGGU', NULL, NULL, NULL, NULL, NULL, NULL, 0, NULL, NULL, '2026-08-02 18:04:25');

-- --------------------------------------------------------

--
-- Table structure for table `parameter`
--

CREATE TABLE `parameter` (
  `id_parameter` varchar(6) NOT NULL,
  `id_kategori_parameter` varchar(4) DEFAULT NULL,
  `nama_parameter` varchar(100) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

--
-- Dumping data for table `parameter`
--

INSERT INTO `parameter` (`id_parameter`, `id_kategori_parameter`, `nama_parameter`) VALUES
('PR0001', 'KP01', 'Temperatur/Suhu'),
('PR0002', 'KP01', 'Padatan Tersuspensi Total (TSS)'),
('PR0003', 'KP01', 'Padatan Terlarut Total (TDS)'),
('PR0004', 'KP03', 'Derajat Keasaman (pH)'),
('PR0005', 'KP01', 'Warna'),
('PR0006', 'KP03', 'Oksigen Terlarut (DO)'),
('PR0007', 'KP03', 'Kebutuhan Oksigen Biokimiawi (BOD)'),
('PR0008', 'KP03', 'Kebutuhan Oksigen Kimiawi (COD)'),
('PR0009', 'KP03', 'Klorida'),
('PR0010', 'KP03', 'Sulfat'),
('PR0011', 'KP03', 'Amoniak'),
('PR0012', 'KP03', 'Nitrat'),
('PR0013', 'KP03', 'Nitrit'),
('PR0014', 'KP04', 'Deterjen Total/MBAS'),
('PR0015', 'KP03', 'Total Fosfat'),
('PR0016', 'KP01', 'DHL'),
('PR0017', 'KP01', 'Bau'),
('PR0018', 'KP01', 'Debit'),
('PR0019', 'KP04', 'Minyak dan Lemak'),
('PR0020', 'KP03', 'Total Nitrogen'),
('PR0021', 'KP03', 'Klorin Bebas'),
('PR0022', 'KP03', 'Fluorida'),
('PR0023', 'KP03', 'Sianida'),
('PR0024', 'KP05', 'Fecal Coliform'),
('PR0025', 'KP05', 'Total Coliform'),
('PR0026', 'KP03', 'Tembaga (Cu)'),
('PR0027', 'KP03', 'Timbal (Pb)'),
('PR0028', 'KP03', 'Kadmium (Cd)'),
('PR0029', 'KP03', 'Seng (Zn)'),
('PR0030', 'KP03', 'Besi (Fe)'),
('PR0031', 'KP03', 'Mangan (Mn)'),
('PR0032', 'KP03', 'Nikel (Ni)'),
('PR0033', 'KP03', 'Arsen (As)'),
('PR0034', 'KP03', 'Merkuri (Hg)'),
('PR0035', 'KP01', 'Transparansi/Kecerahan'),
('PR0036', 'KP01', 'Salinitas'),
('PR0037', 'KP01', 'Sampah'),
('PR0038', 'KP01', 'Lapisan Minyak'),
('PR0039', 'KP05', 'Escherichia Coli'),
('PR0101', 'KP03', 'Ortofosfat'),
('PR0102', 'KP01', 'PPAPA');

-- --------------------------------------------------------

--
-- Table structure for table `parameter_metode`
--

CREATE TABLE `parameter_metode` (
  `id_metode_parameter` varchar(6) NOT NULL,
  `id_parameter` varchar(6) NOT NULL,
  `id_metode` varchar(4) NOT NULL,
  `tarif` bigint UNSIGNED NOT NULL DEFAULT '0',
  `acuan_metode` varchar(100) DEFAULT NULL,
  `is_terakreditasi` tinyint(1) NOT NULL DEFAULT '0',
  `is_subkontrak` tinyint(1) NOT NULL DEFAULT '0',
  `is_active` tinyint(1) NOT NULL DEFAULT '1'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

--
-- Dumping data for table `parameter_metode`
--

INSERT INTO `parameter_metode` (`id_metode_parameter`, `id_parameter`, `id_metode`, `tarif`, `acuan_metode`, `is_terakreditasi`, `is_subkontrak`, `is_active`) VALUES
('MP0001', 'PR0001', 'M01', 10000, 'SNI 06-6989.23-2005', 1, 0, 1),
('MP0002', 'PR0002', 'M02', 35000, 'SNI 6989.3:2019', 1, 0, 1),
('MP0003', 'PR0003', 'M02', 25000, 'SNI 6989.27:2019', 1, 0, 1),
('MP0004', 'PR0004', 'M03', 15000, 'SNI 6989.11:2019', 1, 0, 1),
('MP0005', 'PR0005', 'M04', 30000, 'SNI 6989.80:2011', 1, 0, 1),
('MP0006', 'PR0006', 'M05', 15000, 'SNI 06-6989.14-2004', 1, 0, 1),
('MP0007', 'PR0007', 'M05', 60000, 'SNI 6989.72:2009', 1, 0, 1),
('MP0008', 'PR0008', 'M04', 65000, 'SNI 6989.2:2019', 1, 0, 1),
('MP0009', 'PR0009', 'M05', 38000, 'SNI 6989.19:2009', 1, 0, 1),
('MP0010', 'PR0010', 'M04', 40000, 'SNI 6989.20:2019', 1, 0, 1),
('MP0011', 'PR0011', 'M04', 55000, 'SNI 06-6989.30-2005', 1, 0, 1),
('MP0012', 'PR0012', 'M04', 90000, '2/IK-M/LAB (spektrofotometri)', 1, 0, 1),
('MP0013', 'PR0012', 'M04', 40000, 'Standar Methods 24th 4500-NO3- B, 2023', 0, 0, 1),
('MP0014', 'PR0013', 'M04', 40000, 'SNI 06-6989.9-2004', 1, 0, 1),
('MP0015', 'PR0014', 'M04', 60000, 'SNI 06-6989.51-2005', 1, 0, 1),
('MP0016', 'PR0015', 'M04', 55000, 'SNI 6989.31-2021', 1, 0, 1),
('MP0017', 'PR0016', 'M03', 15000, 'SNI 6989.1:2019', 1, 0, 1),
('MP0018', 'PR0017', 'M07', 9000, NULL, 0, 0, 1),
('MP0019', 'PR0018', 'M15', 150000, NULL, 0, 0, 1),
('MP0020', 'PR0019', 'M02', 125000, NULL, 0, 0, 0),
('MP0021', 'PR0020', 'M17', 65000, NULL, 0, 0, 1),
('MP0022', 'PR0021', 'M04', 35000, 'Merck 1.00598 (Test Kit)', 0, 0, 1),
('MP0023', 'PR0022', 'M04', 50000, 'Merck 1.14598 (Test Kit)', 0, 0, 1),
('MP0024', 'PR0023', 'M04', 68000, 'Merck 1.09701 (Test Kit)', 0, 0, 1),
('MP0025', 'PR0024', 'M08', 85000, 'Standar Methods 24th ed.9221 A-E, 2023', 0, 0, 1),
('MP0026', 'PR0025', 'M08', 85000, 'Standar Methods 24th ed.9221 A-D, 2023', 0, 0, 1),
('MP0027', 'PR0026', 'M09', 120000, 'SNI 6989.66:2009', 0, 0, 1),
('MP0028', 'PR0026', 'M10', 75000, 'SNI 6989.84:2019', 0, 0, 1),
('MP0029', 'PR0027', 'M09', 160000, 'SNI 6989.46:2009', 0, 0, 1),
('MP0030', 'PR0027', 'M10', 75000, 'SNI 6989.84:2019', 0, 0, 1),
('MP0031', 'PR0028', 'M09', 160000, 'SNI 06-6989.38-2005', 0, 0, 1),
('MP0032', 'PR0028', 'M10', 75000, 'SNI 6989.84:2019', 0, 0, 1),
('MP0033', 'PR0029', 'M09', 120000, 'SNI 06-6989.44-2005', 0, 0, 1),
('MP0034', 'PR0029', 'M10', 75000, 'SNI 6989.84:2019', 0, 0, 1),
('MP0035', 'PR0030', 'M10', 75000, 'SNI 6989.84:2019', 0, 0, 1),
('MP0036', 'PR0030', 'M09', 120000, 'SNI 06-6989.50-2005', 0, 0, 1),
('MP0037', 'PR0031', 'M10', 75000, 'SNI 6989.84:2019', 0, 0, 1),
('MP0038', 'PR0031', 'M09', 90000, 'SNI 06-6989.42-2005', 0, 0, 1),
('MP0039', 'PR0032', 'M09', 120000, 'SNI 06-6989.48-2005', 0, 0, 1),
('MP0040', 'PR0032', 'M10', 75000, 'SNI 6989.84:2019', 0, 0, 1),
('MP0041', 'PR0033', 'M09', 120000, 'SNI 06-6989.54-2005', 0, 0, 1),
('MP0042', 'PR0033', 'M10', 75000, NULL, 0, 0, 1),
('MP0043', 'PR0034', 'M11', 125000, 'SNI 6989.78:2019', 0, 0, 1),
('MP0044', 'PR0005', 'M04', 30000, 'SNI 6989.80-2011', 1, 1, 1),
('MP0045', 'PR0035', 'M12', 12000, NULL, 0, 0, 0),
('MP0046', 'PR0002', 'M02', 35000, '5/IK-M/LAB (gravimetri)', 0, 0, 1),
('MP0047', 'PR0011', 'M04', 55000, 'SNI 19-6964.3-2003', 0, 0, 1),
('MP0048', 'PR0101', 'M04', 55000, '4/IK-M/LAB (spektrofotometri)', 0, 0, 1),
('MP0049', 'PR0019', 'M02', 125000, '6/IK-M/LAB (gravimetri)', 0, 0, 1),
('MP0050', 'PR0036', 'M03', 20000, NULL, 0, 0, 1),
('MP0051', 'PR0035', 'M12', 12000, 'SNI 8995:2021', 0, 0, 1),
('MP0052', 'PR0037', 'M13', 5000, NULL, 0, 0, 1),
('MP0053', 'PR0038', 'M13', 10000, NULL, 0, 0, 1),
('MP0054', 'PR0025', 'M08', 85000, 'Standar Methods 24th ed.9221 A-D', 0, 0, 1),
('MP0055', 'PR0034', 'M18', 125000, 'SNI 6989.78:2019', 0, 0, 1),
('MP0056', 'PR0039', 'M15', 85000, NULL, 0, 0, 1),
('MP0057', 'PR0025', 'M15', 85000, NULL, 0, 0, 1),
('MP0058', 'PR0007', 'M05', 85000, 'SNI 6989.72:2009', 0, 1, 1),
('MP0059', 'PR0022', 'M04', 75000, 'Merck 1.14598 (Test Kit)', 0, 1, 1),
('MP0060', 'PR0030', 'M10', 100000, 'SNI 6989.84:2019', 0, 1, 1),
('MP0061', 'PR0005', 'M12', 20000, 'UJU', 1, 1, 1),
('MP9001', 'PR0006', 'M06', 0, NULL, 0, 0, 1),
('MP9002', 'PR0013', 'M04', 0, '3/IK-M/LAB (spektrofotometri)', 1, 0, 1),
('MP9003', 'PR0005', 'M04', 30000, 'SNI 6989.80-2011', 1, 0, 1);

-- --------------------------------------------------------

--
-- Table structure for table `payment`
--

CREATE TABLE `payment` (
  `id_payment` varchar(16) NOT NULL,
  `id_invoice` varchar(16) NOT NULL,
  `metode_bayar` enum('XENDIT_QRIS','XENDIT_DANA','MANUAL') NOT NULL,
  `gateway_provider` varchar(30) DEFAULT NULL,
  `gateway_session_id` varchar(100) DEFAULT NULL,
  `gateway_reference_id` varchar(100) DEFAULT NULL,
  `gateway_payment_url` varchar(500) DEFAULT NULL,
  `gateway_status` varchar(50) DEFAULT NULL,
  `gateway_payment_id` varchar(100) DEFAULT NULL,
  `gateway_payment_request_id` varchar(100) DEFAULT NULL,
  `expires_at` datetime DEFAULT NULL,
  `gateway_payload` json DEFAULT NULL,
  `paid_at` datetime DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- --------------------------------------------------------

--
-- Table structure for table `pegawai`
--

CREATE TABLE `pegawai` (
  `id_pegawai` varchar(10) NOT NULL,
  `nik` varchar(16) DEFAULT NULL,
  `nip` varchar(18) DEFAULT NULL,
  `nama_pegawai` varchar(100) NOT NULL,
  `no_wa` varchar(13) DEFAULT NULL,
  `is_pcc` tinyint(1) NOT NULL DEFAULT '0'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

--
-- Dumping data for table `pegawai`
--

INSERT INTO `pegawai` (`id_pegawai`, `nik`, `nip`, `nama_pegawai`, `no_wa`, `is_pcc`) VALUES
('PGW-001', NULL, '196912000000000006', 'Dr. Ahmad', NULL, 0),
('PGW-002', '3171075704040002', '197001000000000001', 'Admin Lab', '081460933864', 0),
('PGW-003', '3171075704040009', '197502000000000002', 'Sri Sari', NULL, 0),
('PGW-004', '3171075704040004', '197812000000000003', 'Andika', NULL, 0),
('PGW-005', '3171075704040006', '198403000000000005', 'Dedi Mulyadi', NULL, 0),
('PGW-006', '3171075704040005', '198805000000000004', 'Rina Antika', NULL, 0),
('PGW-007', NULL, NULL, 'Dewi Sartika, A.Md.KL', '082173489056', 1),
('PGW-008', NULL, NULL, 'Rizky Pratama, S.T.', '085264197720', 1),
('PGW-009', '312131131415759', '5436365999999', 'Sandiaga Uno', '0988888888', 0),
('PGW-010', '4587654345678998', '567876545678765456', 'Pak dewi', '0846478393939', 0),
('PGW-011', NULL, '567876567765678765', 'Ahmad Fauzan, S.Si.', '081267542381', 1),
('PGW-012', NULL, '563789467384738473', 'Yulia Rahmadani, A.Md.KL.', '081374625809', 1);

-- --------------------------------------------------------

--
-- Table structure for table `pelanggan`
--

CREATE TABLE `pelanggan` (
  `id_pelanggan` varchar(8) NOT NULL,
  `nik` varchar(16) NOT NULL,
  `nama_instansi` varchar(100) NOT NULL,
  `no_telp` varchar(20) NOT NULL,
  `alamat` varchar(100) DEFAULT NULL,
  `email_kontak` varchar(50) DEFAULT NULL,
  `pic` varchar(100) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- --------------------------------------------------------

--
-- Table structure for table `pengajuan_perubahan_jadwal`
--

CREATE TABLE `pengajuan_perubahan_jadwal` (
  `id_pengajuan_jadwal` varchar(20) NOT NULL,
  `jenis_jadwal` enum('SAMPEL','LHU') NOT NULL,
  `id_registrasi` varchar(10) NOT NULL,
  `id_jadwal_sampel` varchar(10) DEFAULT NULL,
  `id_jadwal_lhu` varchar(10) DEFAULT NULL,
  `tanggal_sebelumnya` date DEFAULT NULL,
  `jam_sebelumnya` time DEFAULT NULL,
  `tanggal_usulan` date NOT NULL,
  `jam_usulan` time DEFAULT NULL,
  `alasan_pengajuan` text NOT NULL,
  `status_pengajuan` enum('Menunggu Persetujuan Admin','Disetujui','Ditolak','Dibatalkan Pelanggan') NOT NULL DEFAULT 'Menunggu Persetujuan Admin',
  `catatan_admin` text,
  `diajukan_pada` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- --------------------------------------------------------

--
-- Table structure for table `penugasan`
--

CREATE TABLE `penugasan` (
  `id_penugasan` varchar(10) NOT NULL,
  `id_user_analis` varchar(16) DEFAULT NULL,
  `assigned_by` varchar(16) DEFAULT NULL,
  `assigned_at` datetime DEFAULT NULL,
  `jenis_penugasan` enum('INTERNAL','SUBKONTRAK') NOT NULL DEFAULT 'INTERNAL',
  `status_penugasan` enum('Draft','Aktif','Selesai','Dibatalkan') NOT NULL DEFAULT 'Draft',
  `catatan_penugasan` text
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

--
-- Dumping data for table `penugasan`
--

INSERT INTO `penugasan` (`id_penugasan`, `id_user_analis`, `assigned_by`, `assigned_at`, `jenis_penugasan`, `status_penugasan`, `catatan_penugasan`) VALUES
('PNG-0001', '3171075704040005', '3171075704040004', '2026-07-10 06:40:41', 'INTERNAL', 'Selesai', ''),
('PNG-0002', '3171075704040005', '3171075704040004', '2026-07-10 08:23:58', 'INTERNAL', 'Selesai', ''),
('PNG-0003', '3171075704040005', '3171075704040004', '2026-07-16 09:04:12', 'INTERNAL', 'Selesai', ''),
('PNG-0004', '3171075704040005', '3171075704040004', '2026-07-16 15:42:44', 'INTERNAL', 'Aktif', '');

-- --------------------------------------------------------

--
-- Table structure for table `penugasan_detail`
--

CREATE TABLE `penugasan_detail` (
  `id_penugasan_detail` varchar(10) NOT NULL,
  `id_penugasan` varchar(10) NOT NULL,
  `id_metode_parameter` varchar(6) NOT NULL,
  `status_detail` enum('Draft','Ditugaskan','Sedang Dikerjakan','Worksheet Terkirim','Perlu Revisi','Disetujui','Selesai') NOT NULL DEFAULT 'Draft',
  `tanggal_tenggat` date DEFAULT NULL,
  `catatan_detail` text
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

--
-- Dumping data for table `penugasan_detail`
--

INSERT INTO `penugasan_detail` (`id_penugasan_detail`, `id_penugasan`, `id_metode_parameter`, `status_detail`, `tanggal_tenggat`, `catatan_detail`) VALUES
('PD-00001', 'PNG-0001', 'MP9001', 'Disetujui', '2026-07-13', NULL),
('PD-00002', 'PNG-0001', 'MP0011', 'Disetujui', '2026-07-13', NULL),
('PD-00003', 'PNG-0001', 'MP0047', 'Disetujui', '2026-07-13', NULL),
('PD-00004', 'PNG-0001', 'MP0007', 'Disetujui', '2026-07-13', NULL),
('PD-00005', 'PNG-0002', 'MP0053', 'Disetujui', '2026-07-13', NULL),
('PD-00006', 'PNG-0002', 'MP0047', 'Disetujui', '2026-07-13', NULL),
('PD-00007', 'PNG-0002', 'MP0041', 'Disetujui', '2026-07-13', NULL),
('PD-00008', 'PNG-0003', 'MP0011', 'Disetujui', '2026-07-21', NULL),
('PD-00009', 'PNG-0004', 'MP0004', 'Ditugaskan', '2026-07-22', NULL),
('PD-00010', 'PNG-0004', 'MP0015', 'Ditugaskan', '2026-07-22', NULL);

-- --------------------------------------------------------

--
-- Table structure for table `penugasan_item`
--

CREATE TABLE `penugasan_item` (
  `id_penugasan_detail` varchar(10) NOT NULL,
  `no_sampel` varchar(25) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- --------------------------------------------------------

--
-- Table structure for table `pkt_bm`
--

CREATE TABLE `pkt_bm` (
  `id_pkt_bm` varchar(8) NOT NULL,
  `id_reg_bm` varchar(6) NOT NULL,
  `id_jenis_sampel` varchar(4) NOT NULL,
  `id_klasifikasi` varchar(10) NOT NULL,
  `is_active` tinyint(1) NOT NULL DEFAULT '1'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

--
-- Dumping data for table `pkt_bm`
--

INSERT INTO `pkt_bm` (`id_pkt_bm`, `id_reg_bm`, `id_jenis_sampel`, `id_klasifikasi`, `is_active`) VALUES
('PKBM0101', 'RBM001', 'JS01', 'KLS007', 1),
('PKBM0102', 'RBM001', 'JS01', 'KLS008', 1),
('PKBM0103', 'RBM001', 'JS01', 'KLS009', 0),
('PKBM0104', 'RBM001', 'JS01', 'KLS010', 1),
('PKBM0201', 'RBM001', 'JS02', 'KLS007', 1),
('PKBM0202', 'RBM001', 'JS02', 'KLS008', 1),
('PKBM0203', 'RBM001', 'JS02', 'KLS009', 0),
('PKBM0204', 'RBM001', 'JS02', 'KLS010', 1),
('PKBM0301', 'RBM002', 'JS03', 'KLS013', 1),
('PKBM0302', 'RBM002', 'JS03', 'KLS015', 1),
('PKBM0303', 'RBM002', 'JS03', 'KLS002', 1),
('PKBM0401', 'RBM003', 'JS04', 'KLS004', 1),
('PKBM0402', 'RBM003', 'JS04', 'KLS005', 1),
('PKBM0501', 'RBM004', 'JS04', 'KLS011', 1),
('PKBM0502', 'RBM004', 'JS05', 'KLS012', 1),
('PKBM0601', 'RBM005', 'JS06', 'KLS014', 1),
('PKBM0701', 'RBM006', 'JS04', 'KLS006', 1),
('PKBM0702', 'RBM006', 'JS04', 'KLS016', 1),
('PKBM0703', 'RBM006', 'JS04', 'KLS001', 1),
('PKBM0704', 'RBM006', 'JS04', 'KLS017', 1),
('PKBM0705', 'RBM006', 'JS04', 'KLS003', 1),
('PKBM0801', 'RBM005', 'JS08', 'KLS014', 1),
('PKBM0802', 'RBM007', 'JS08', 'KLS019', 1),
('PKBM0803', 'RBM007', 'JS08', 'KLS020', 1);

-- --------------------------------------------------------

--
-- Table structure for table `pkt_bm_kelompok`
--

CREATE TABLE `pkt_bm_kelompok` (
  `id_reg_bm` varchar(6) NOT NULL,
  `id_jenis_sampel` varchar(4) NOT NULL,
  `is_active` tinyint(1) NOT NULL DEFAULT '1'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

--
-- Dumping data for table `pkt_bm_kelompok`
--

INSERT INTO `pkt_bm_kelompok` (`id_reg_bm`, `id_jenis_sampel`, `is_active`) VALUES
('RBM001', 'JS01', 1),
('RBM001', 'JS02', 1),
('RBM002', 'JS03', 1),
('RBM003', 'JS04', 1),
('RBM004', 'JS04', 1),
('RBM004', 'JS05', 1),
('RBM005', 'JS06', 1),
('RBM005', 'JS08', 1),
('RBM006', 'JS04', 1),
('RBM007', 'JS08', 1);

-- --------------------------------------------------------

--
-- Table structure for table `pkt_bm_nilai`
--

CREATE TABLE `pkt_bm_nilai` (
  `id_pkt_bm` varchar(8) NOT NULL,
  `id_parameter` varchar(6) NOT NULL,
  `nilai_bm` varchar(150) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

--
-- Dumping data for table `pkt_bm_nilai`
--

INSERT INTO `pkt_bm_nilai` (`id_pkt_bm`, `id_parameter`, `nilai_bm`) VALUES
('PKBM0101', 'PR0001', 'Dev 3'),
('PKBM0101', 'PR0002', '40'),
('PKBM0101', 'PR0003', '1000'),
('PKBM0101', 'PR0004', '6-9'),
('PKBM0101', 'PR0005', '15'),
('PKBM0101', 'PR0006', '6'),
('PKBM0101', 'PR0007', '2'),
('PKBM0101', 'PR0008', '10'),
('PKBM0101', 'PR0009', '300'),
('PKBM0101', 'PR0010', '300'),
('PKBM0101', 'PR0011', '0.1'),
('PKBM0101', 'PR0012', '10'),
('PKBM0101', 'PR0013', '0.06'),
('PKBM0101', 'PR0014', '0.2'),
('PKBM0101', 'PR0015', '0.2'),
('PKBM0101', 'PR0016', NULL),
('PKBM0101', 'PR0017', NULL),
('PKBM0101', 'PR0018', NULL),
('PKBM0101', 'PR0019', '1'),
('PKBM0101', 'PR0020', '15'),
('PKBM0101', 'PR0021', '0.03'),
('PKBM0101', 'PR0022', '1'),
('PKBM0101', 'PR0023', '0.02'),
('PKBM0101', 'PR0024', '100'),
('PKBM0101', 'PR0025', '1000'),
('PKBM0101', 'PR0026', '0.02'),
('PKBM0101', 'PR0027', '0.03'),
('PKBM0101', 'PR0028', '0.01'),
('PKBM0101', 'PR0029', '0.05'),
('PKBM0101', 'PR0030', '0.3'),
('PKBM0101', 'PR0031', '0.1'),
('PKBM0101', 'PR0032', '0.05'),
('PKBM0101', 'PR0033', '0.05'),
('PKBM0101', 'PR0034', '0.001'),
('PKBM0102', 'PR0001', 'Dev 3'),
('PKBM0102', 'PR0002', '50'),
('PKBM0102', 'PR0003', '1000'),
('PKBM0102', 'PR0004', '6-9'),
('PKBM0102', 'PR0005', '50'),
('PKBM0102', 'PR0006', '4'),
('PKBM0102', 'PR0007', '3'),
('PKBM0102', 'PR0008', '25'),
('PKBM0102', 'PR0009', '300'),
('PKBM0102', 'PR0010', '300'),
('PKBM0102', 'PR0011', '0.2'),
('PKBM0102', 'PR0012', '10'),
('PKBM0102', 'PR0013', '0.06'),
('PKBM0102', 'PR0014', '0.2'),
('PKBM0102', 'PR0015', '0.2'),
('PKBM0102', 'PR0016', NULL),
('PKBM0102', 'PR0017', NULL),
('PKBM0102', 'PR0018', NULL),
('PKBM0102', 'PR0019', '1'),
('PKBM0102', 'PR0020', '15'),
('PKBM0102', 'PR0021', '0.03'),
('PKBM0102', 'PR0022', '1.5'),
('PKBM0102', 'PR0023', '0.02'),
('PKBM0102', 'PR0024', '1000'),
('PKBM0102', 'PR0025', '5000'),
('PKBM0102', 'PR0026', '0.02'),
('PKBM0102', 'PR0027', '0.03'),
('PKBM0102', 'PR0028', '0.01'),
('PKBM0102', 'PR0029', '0.05'),
('PKBM0102', 'PR0030', NULL),
('PKBM0102', 'PR0031', NULL),
('PKBM0102', 'PR0032', '0.05'),
('PKBM0102', 'PR0033', '0.05'),
('PKBM0102', 'PR0034', '0.002'),
('PKBM0103', 'PR0001', 'Dev 3'),
('PKBM0103', 'PR0002', '100'),
('PKBM0103', 'PR0003', '1000'),
('PKBM0103', 'PR0004', '6-9'),
('PKBM0103', 'PR0005', '100'),
('PKBM0103', 'PR0006', '3'),
('PKBM0103', 'PR0007', '6'),
('PKBM0103', 'PR0008', '40'),
('PKBM0103', 'PR0009', '300'),
('PKBM0103', 'PR0010', '300'),
('PKBM0103', 'PR0011', '0.5'),
('PKBM0103', 'PR0012', '20'),
('PKBM0103', 'PR0013', '0.06'),
('PKBM0103', 'PR0014', '0.2'),
('PKBM0103', 'PR0015', '1.0'),
('PKBM0103', 'PR0016', NULL),
('PKBM0103', 'PR0017', NULL),
('PKBM0103', 'PR0018', NULL),
('PKBM0103', 'PR0019', '1'),
('PKBM0103', 'PR0020', '25'),
('PKBM0103', 'PR0021', '0.03'),
('PKBM0103', 'PR0022', '1.5'),
('PKBM0103', 'PR0023', '0.02'),
('PKBM0103', 'PR0024', '2000'),
('PKBM0103', 'PR0025', '10000'),
('PKBM0103', 'PR0026', '0.02'),
('PKBM0103', 'PR0027', '0.03'),
('PKBM0103', 'PR0028', '0.01'),
('PKBM0103', 'PR0029', '0.05'),
('PKBM0103', 'PR0030', NULL),
('PKBM0103', 'PR0031', NULL),
('PKBM0103', 'PR0032', '0.05'),
('PKBM0103', 'PR0033', '0.05'),
('PKBM0103', 'PR0034', '0.002'),
('PKBM0104', 'PR0001', 'Dev 3'),
('PKBM0104', 'PR0002', '400'),
('PKBM0104', 'PR0003', '2000'),
('PKBM0104', 'PR0004', '6-9'),
('PKBM0104', 'PR0005', NULL),
('PKBM0104', 'PR0006', '1'),
('PKBM0104', 'PR0007', '12'),
('PKBM0104', 'PR0008', '80'),
('PKBM0104', 'PR0009', '600'),
('PKBM0104', 'PR0010', '400'),
('PKBM0104', 'PR0011', NULL),
('PKBM0104', 'PR0012', '20'),
('PKBM0104', 'PR0013', NULL),
('PKBM0104', 'PR0014', NULL),
('PKBM0104', 'PR0015', NULL),
('PKBM0104', 'PR0016', NULL),
('PKBM0104', 'PR0017', NULL),
('PKBM0104', 'PR0018', NULL),
('PKBM0104', 'PR0019', '10'),
('PKBM0104', 'PR0020', NULL),
('PKBM0104', 'PR0021', NULL),
('PKBM0104', 'PR0022', NULL),
('PKBM0104', 'PR0023', NULL),
('PKBM0104', 'PR0024', '2000'),
('PKBM0104', 'PR0025', '10000'),
('PKBM0104', 'PR0026', '0.2'),
('PKBM0104', 'PR0027', '0.5'),
('PKBM0104', 'PR0028', '0.01'),
('PKBM0104', 'PR0029', '2'),
('PKBM0104', 'PR0030', NULL),
('PKBM0104', 'PR0031', NULL),
('PKBM0104', 'PR0032', '0.1'),
('PKBM0104', 'PR0033', '0.10'),
('PKBM0104', 'PR0034', '0.005'),
('PKBM0201', 'PR0001', 'Dev 3'),
('PKBM0201', 'PR0002', '25'),
('PKBM0201', 'PR0003', '1000'),
('PKBM0201', 'PR0004', '6-9'),
('PKBM0201', 'PR0005', '15'),
('PKBM0201', 'PR0006', '6'),
('PKBM0201', 'PR0007', '2'),
('PKBM0201', 'PR0008', '10'),
('PKBM0201', 'PR0009', '300'),
('PKBM0201', 'PR0010', '300'),
('PKBM0201', 'PR0011', NULL),
('PKBM0201', 'PR0012', NULL),
('PKBM0201', 'PR0013', NULL),
('PKBM0201', 'PR0014', '0.2'),
('PKBM0201', 'PR0015', '0.01'),
('PKBM0201', 'PR0016', NULL),
('PKBM0201', 'PR0019', '1'),
('PKBM0201', 'PR0020', '0.65'),
('PKBM0201', 'PR0021', '0.03'),
('PKBM0201', 'PR0022', '1'),
('PKBM0201', 'PR0023', '0.02'),
('PKBM0201', 'PR0024', '100'),
('PKBM0201', 'PR0025', '1000'),
('PKBM0201', 'PR0026', '0.02'),
('PKBM0201', 'PR0027', '0.03'),
('PKBM0201', 'PR0028', '0.01'),
('PKBM0201', 'PR0029', '0.05'),
('PKBM0201', 'PR0030', '0.3'),
('PKBM0201', 'PR0031', '0.4'),
('PKBM0201', 'PR0032', '0.05'),
('PKBM0201', 'PR0033', '0.05'),
('PKBM0201', 'PR0034', '0.001'),
('PKBM0201', 'PR0035', '10'),
('PKBM0202', 'PR0001', 'Dev 3'),
('PKBM0202', 'PR0002', '50'),
('PKBM0202', 'PR0003', '1000'),
('PKBM0202', 'PR0004', '6-9'),
('PKBM0202', 'PR0005', '50'),
('PKBM0202', 'PR0006', '4'),
('PKBM0202', 'PR0007', '3'),
('PKBM0202', 'PR0008', '25'),
('PKBM0202', 'PR0009', '300'),
('PKBM0202', 'PR0010', '300'),
('PKBM0202', 'PR0011', NULL),
('PKBM0202', 'PR0012', NULL),
('PKBM0202', 'PR0013', NULL),
('PKBM0202', 'PR0014', '0.2'),
('PKBM0202', 'PR0015', '0.03'),
('PKBM0202', 'PR0016', NULL),
('PKBM0202', 'PR0019', '1'),
('PKBM0202', 'PR0020', '0.75'),
('PKBM0202', 'PR0021', '0.03'),
('PKBM0202', 'PR0022', '1.5'),
('PKBM0202', 'PR0023', '0.02'),
('PKBM0202', 'PR0024', '1000'),
('PKBM0202', 'PR0025', '5000'),
('PKBM0202', 'PR0026', '0.02'),
('PKBM0202', 'PR0027', '0.03'),
('PKBM0202', 'PR0028', '0.01'),
('PKBM0202', 'PR0029', '0.05'),
('PKBM0202', 'PR0030', NULL),
('PKBM0202', 'PR0031', '0.4'),
('PKBM0202', 'PR0032', '0.05'),
('PKBM0202', 'PR0033', '0.05'),
('PKBM0202', 'PR0034', '0.002'),
('PKBM0202', 'PR0035', '4'),
('PKBM0203', 'PR0001', 'Dev 3'),
('PKBM0203', 'PR0002', '100'),
('PKBM0203', 'PR0003', '1000'),
('PKBM0203', 'PR0004', '6-9'),
('PKBM0203', 'PR0005', '100'),
('PKBM0203', 'PR0006', '3'),
('PKBM0203', 'PR0007', '6'),
('PKBM0203', 'PR0008', '40'),
('PKBM0203', 'PR0009', '300'),
('PKBM0203', 'PR0010', '300'),
('PKBM0203', 'PR0011', NULL),
('PKBM0203', 'PR0012', NULL),
('PKBM0203', 'PR0013', NULL),
('PKBM0203', 'PR0014', '0.2'),
('PKBM0203', 'PR0015', '0.1'),
('PKBM0203', 'PR0016', NULL),
('PKBM0203', 'PR0019', '1'),
('PKBM0203', 'PR0020', '1.90'),
('PKBM0203', 'PR0021', '0.03'),
('PKBM0203', 'PR0022', '1.5'),
('PKBM0203', 'PR0023', '0.02'),
('PKBM0203', 'PR0024', '2000'),
('PKBM0203', 'PR0025', '10000'),
('PKBM0203', 'PR0026', '0.02'),
('PKBM0203', 'PR0027', '0.03'),
('PKBM0203', 'PR0028', '0.01'),
('PKBM0203', 'PR0029', '0.05'),
('PKBM0203', 'PR0030', NULL),
('PKBM0203', 'PR0031', '0.5'),
('PKBM0203', 'PR0032', '0.05'),
('PKBM0203', 'PR0033', '0.05'),
('PKBM0203', 'PR0034', '0.002'),
('PKBM0203', 'PR0035', '2.5'),
('PKBM0204', 'PR0001', 'Dev 3'),
('PKBM0204', 'PR0002', '400'),
('PKBM0204', 'PR0003', '1000'),
('PKBM0204', 'PR0004', '6-9'),
('PKBM0204', 'PR0005', NULL),
('PKBM0204', 'PR0006', '1'),
('PKBM0204', 'PR0007', '12'),
('PKBM0204', 'PR0008', '80'),
('PKBM0204', 'PR0009', '600'),
('PKBM0204', 'PR0010', '400'),
('PKBM0204', 'PR0011', NULL),
('PKBM0204', 'PR0012', NULL),
('PKBM0204', 'PR0013', NULL),
('PKBM0204', 'PR0014', NULL),
('PKBM0204', 'PR0015', NULL),
('PKBM0204', 'PR0016', NULL),
('PKBM0204', 'PR0019', '10'),
('PKBM0204', 'PR0020', NULL),
('PKBM0204', 'PR0021', NULL),
('PKBM0204', 'PR0022', NULL),
('PKBM0204', 'PR0023', NULL),
('PKBM0204', 'PR0024', '2000'),
('PKBM0204', 'PR0025', '10000'),
('PKBM0204', 'PR0026', '0.2'),
('PKBM0204', 'PR0027', '0.5'),
('PKBM0204', 'PR0028', '0.01'),
('PKBM0204', 'PR0029', '2.0'),
('PKBM0204', 'PR0030', NULL),
('PKBM0204', 'PR0031', '1.0'),
('PKBM0204', 'PR0032', '0.1'),
('PKBM0204', 'PR0033', '0.1'),
('PKBM0204', 'PR0034', '0.005'),
('PKBM0204', 'PR0035', NULL),
('PKBM0301', 'PR0001', 'Alami'),
('PKBM0301', 'PR0002', '80'),
('PKBM0301', 'PR0004', '6.5-8.5'),
('PKBM0301', 'PR0006', NULL),
('PKBM0301', 'PR0011', '0.3'),
('PKBM0301', 'PR0019', '5'),
('PKBM0301', 'PR0035', '>3'),
('PKBM0301', 'PR0036', 'Alami'),
('PKBM0301', 'PR0037', 'Nihil'),
('PKBM0301', 'PR0038', 'Nihil'),
('PKBM0301', 'PR0101', NULL),
('PKBM0302', 'PR0001', 'Alami'),
('PKBM0302', 'PR0002', '20'),
('PKBM0302', 'PR0004', '7-8.5'),
('PKBM0302', 'PR0006', '>5'),
('PKBM0302', 'PR0011', '0.02'),
('PKBM0302', 'PR0019', '1'),
('PKBM0302', 'PR0035', '>6'),
('PKBM0302', 'PR0036', 'Alami'),
('PKBM0302', 'PR0037', 'Nihil'),
('PKBM0302', 'PR0038', 'Nihil'),
('PKBM0302', 'PR0101', '0.015'),
('PKBM0303', 'PR0001', 'coral:28-30; mangrove:28-32; lamun:28-30'),
('PKBM0303', 'PR0002', 'coral:20; mangrove:80; lamun:20'),
('PKBM0303', 'PR0004', '7-8.5'),
('PKBM0303', 'PR0006', '>5'),
('PKBM0303', 'PR0011', '0.3'),
('PKBM0303', 'PR0019', '1'),
('PKBM0303', 'PR0035', 'coral:>5; mangrove:-; lamun:>3'),
('PKBM0303', 'PR0036', 'coral:33-34; mangrove:s/d 34; lamun:33-34'),
('PKBM0303', 'PR0037', 'Nihil'),
('PKBM0303', 'PR0038', 'Nihil'),
('PKBM0303', 'PR0101', '0.015'),
('PKBM0401', 'PR0001', '38'),
('PKBM0401', 'PR0002', '200'),
('PKBM0401', 'PR0003', '2000'),
('PKBM0401', 'PR0004', '6-9'),
('PKBM0401', 'PR0005', NULL),
('PKBM0401', 'PR0006', NULL),
('PKBM0401', 'PR0007', '50'),
('PKBM0401', 'PR0008', '100'),
('PKBM0401', 'PR0009', NULL),
('PKBM0401', 'PR0010', NULL),
('PKBM0401', 'PR0011', '5'),
('PKBM0401', 'PR0012', '20'),
('PKBM0401', 'PR0013', '1'),
('PKBM0401', 'PR0014', '5'),
('PKBM0401', 'PR0015', NULL),
('PKBM0401', 'PR0016', NULL),
('PKBM0401', 'PR0019', '10'),
('PKBM0401', 'PR0021', '1'),
('PKBM0401', 'PR0022', '2'),
('PKBM0401', 'PR0023', '0.05'),
('PKBM0401', 'PR0025', '10000'),
('PKBM0401', 'PR0026', '2'),
('PKBM0401', 'PR0027', '0.1'),
('PKBM0401', 'PR0028', '0.05'),
('PKBM0401', 'PR0029', '5'),
('PKBM0401', 'PR0030', '5'),
('PKBM0401', 'PR0031', '2'),
('PKBM0401', 'PR0032', '0.2'),
('PKBM0401', 'PR0033', '0.1'),
('PKBM0401', 'PR0034', '0.002'),
('PKBM0402', 'PR0001', '40'),
('PKBM0402', 'PR0002', '400'),
('PKBM0402', 'PR0003', '4000'),
('PKBM0402', 'PR0004', '6-9'),
('PKBM0402', 'PR0005', NULL),
('PKBM0402', 'PR0006', NULL),
('PKBM0402', 'PR0007', '150'),
('PKBM0402', 'PR0008', '300'),
('PKBM0402', 'PR0009', NULL),
('PKBM0402', 'PR0010', NULL),
('PKBM0402', 'PR0011', '10'),
('PKBM0402', 'PR0012', '30'),
('PKBM0402', 'PR0013', '3'),
('PKBM0402', 'PR0014', '10'),
('PKBM0402', 'PR0015', NULL),
('PKBM0402', 'PR0016', NULL),
('PKBM0402', 'PR0019', '20'),
('PKBM0402', 'PR0021', '2'),
('PKBM0402', 'PR0022', '3'),
('PKBM0402', 'PR0023', '0.5'),
('PKBM0402', 'PR0025', '10000'),
('PKBM0402', 'PR0026', '3'),
('PKBM0402', 'PR0027', '1'),
('PKBM0402', 'PR0028', '0.1'),
('PKBM0402', 'PR0029', '10'),
('PKBM0402', 'PR0030', '10'),
('PKBM0402', 'PR0031', '5'),
('PKBM0402', 'PR0032', '0.5'),
('PKBM0402', 'PR0033', '0.5'),
('PKBM0402', 'PR0034', '0.005'),
('PKBM0501', 'PR0002', '100'),
('PKBM0501', 'PR0004', '6-9'),
('PKBM0501', 'PR0007', '150'),
('PKBM0501', 'PR0008', '300'),
('PKBM0501', 'PR0020', '60'),
('PKBM0501', 'PR0028', '0.1'),
('PKBM0501', 'PR0034', '0.005'),
('PKBM0502', 'PR0002', NULL),
('PKBM0502', 'PR0004', NULL),
('PKBM0502', 'PR0006', NULL),
('PKBM0502', 'PR0007', NULL),
('PKBM0502', 'PR0008', NULL),
('PKBM0502', 'PR0028', NULL),
('PKBM0502', 'PR0034', NULL),
('PKBM0601', 'PR0001', 'Suhu udara ± 3'),
('PKBM0601', 'PR0002', NULL),
('PKBM0601', 'PR0003', '<300'),
('PKBM0601', 'PR0004', '6.5-8.5'),
('PKBM0601', 'PR0005', '10'),
('PKBM0601', 'PR0006', NULL),
('PKBM0601', 'PR0007', NULL),
('PKBM0601', 'PR0008', NULL),
('PKBM0601', 'PR0009', NULL),
('PKBM0601', 'PR0010', NULL),
('PKBM0601', 'PR0011', NULL),
('PKBM0601', 'PR0012', '20'),
('PKBM0601', 'PR0013', '3'),
('PKBM0601', 'PR0014', NULL),
('PKBM0601', 'PR0015', NULL),
('PKBM0601', 'PR0016', NULL),
('PKBM0601', 'PR0017', 'Tidak berbau'),
('PKBM0601', 'PR0021', '0.2-0.5'),
('PKBM0601', 'PR0022', '1.5'),
('PKBM0601', 'PR0023', NULL),
('PKBM0601', 'PR0025', '0'),
('PKBM0601', 'PR0027', '0.01'),
('PKBM0601', 'PR0028', '0.003'),
('PKBM0601', 'PR0029', NULL),
('PKBM0601', 'PR0030', '0.2'),
('PKBM0601', 'PR0031', '0.1'),
('PKBM0601', 'PR0033', '0.01'),
('PKBM0601', 'PR0034', NULL),
('PKBM0601', 'PR0039', '0'),
('PKBM0701', 'PR0002', '100'),
('PKBM0701', 'PR0004', '6-9'),
('PKBM0701', 'PR0007', '150'),
('PKBM0701', 'PR0008', '300'),
('PKBM0701', 'PR0011', '50'),
('PKBM0701', 'PR0014', NULL),
('PKBM0701', 'PR0019', NULL),
('PKBM0701', 'PR0021', NULL),
('PKBM0701', 'PR0024', '1000'),
('PKBM0702', 'PR0002', '30'),
('PKBM0702', 'PR0004', '6-9'),
('PKBM0702', 'PR0007', '30'),
('PKBM0702', 'PR0008', '100'),
('PKBM0702', 'PR0011', '10'),
('PKBM0702', 'PR0014', '5'),
('PKBM0702', 'PR0019', '5'),
('PKBM0702', 'PR0021', '1'),
('PKBM0702', 'PR0024', '1000'),
('PKBM0703', 'PR0002', '50'),
('PKBM0703', 'PR0004', '6-9'),
('PKBM0703', 'PR0007', '50'),
('PKBM0703', 'PR0008', '100'),
('PKBM0703', 'PR0011', '20'),
('PKBM0703', 'PR0014', '10'),
('PKBM0703', 'PR0019', '10'),
('PKBM0703', 'PR0021', '1'),
('PKBM0703', 'PR0024', '1000'),
('PKBM0704', 'PR0002', NULL),
('PKBM0704', 'PR0004', '6-9'),
('PKBM0704', 'PR0007', '75'),
('PKBM0704', 'PR0008', NULL),
('PKBM0704', 'PR0011', NULL),
('PKBM0704', 'PR0014', NULL),
('PKBM0704', 'PR0019', '10'),
('PKBM0704', 'PR0021', '1'),
('PKBM0704', 'PR0024', '1000'),
('PKBM0705', 'PR0002', '30'),
('PKBM0705', 'PR0004', '6-9'),
('PKBM0705', 'PR0007', '12'),
('PKBM0705', 'PR0008', '80'),
('PKBM0705', 'PR0011', NULL),
('PKBM0705', 'PR0014', NULL),
('PKBM0705', 'PR0019', NULL),
('PKBM0705', 'PR0021', '1'),
('PKBM0705', 'PR0024', '200'),
('PKBM0801', 'PR0001', 'Suhu udara ± 3'),
('PKBM0801', 'PR0003', '<300'),
('PKBM0801', 'PR0004', '6.5-8.5'),
('PKBM0801', 'PR0005', '10'),
('PKBM0801', 'PR0012', '20'),
('PKBM0801', 'PR0013', '3'),
('PKBM0801', 'PR0017', 'Tidak berbau'),
('PKBM0801', 'PR0021', '0.2-0.5'),
('PKBM0801', 'PR0022', '1.5'),
('PKBM0801', 'PR0025', '0'),
('PKBM0801', 'PR0027', '0.01'),
('PKBM0801', 'PR0028', '0.003'),
('PKBM0801', 'PR0030', '0.2'),
('PKBM0801', 'PR0031', '0.1'),
('PKBM0801', 'PR0033', '0.01'),
('PKBM0801', 'PR0039', '0');

-- --------------------------------------------------------

--
-- Table structure for table `pkt_bm_param`
--

CREATE TABLE `pkt_bm_param` (
  `id_reg_bm` varchar(6) NOT NULL,
  `id_jenis_sampel` varchar(4) NOT NULL,
  `id_parameter` varchar(6) NOT NULL,
  `id_satuan` varchar(10) NOT NULL,
  `ket_bm` varchar(255) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

--
-- Dumping data for table `pkt_bm_param`
--

INSERT INTO `pkt_bm_param` (`id_reg_bm`, `id_jenis_sampel`, `id_parameter`, `id_satuan`, `ket_bm`) VALUES
('RBM001', 'JS01', 'PR0001', 'SAT003', 'Perbedaan dengan suhu udara di atas permukaan air'),
('RBM001', 'JS01', 'PR0002', 'SAT007', 'Tidak berlaku untuk air gambut berdasarkan kondisi alaminya'),
('RBM001', 'JS01', 'PR0003', 'SAT007', 'Tidak berlaku untuk muara'),
('RBM001', 'JS01', 'PR0004', 'SAT001', 'Tidak berlaku untuk air gambut berdasarkan kondisi alaminya'),
('RBM001', 'JS01', 'PR0005', 'SAT009', 'Tidak berlaku untuk air gambut berdasarkan kondisi alaminya'),
('RBM001', 'JS01', 'PR0006', 'SAT007', 'Batas minimal'),
('RBM001', 'JS01', 'PR0007', 'SAT007', NULL),
('RBM001', 'JS01', 'PR0008', 'SAT007', NULL),
('RBM001', 'JS01', 'PR0009', 'SAT007', NULL),
('RBM001', 'JS01', 'PR0010', 'SAT007', NULL),
('RBM001', 'JS01', 'PR0011', 'SAT007', NULL),
('RBM001', 'JS01', 'PR0012', 'SAT007', NULL),
('RBM001', 'JS01', 'PR0013', 'SAT007', NULL),
('RBM001', 'JS01', 'PR0014', 'SAT007', NULL),
('RBM001', 'JS01', 'PR0015', 'SAT007', NULL),
('RBM001', 'JS01', 'PR0016', 'SAT012', 'Tidak tercantum dalam baku mutu; ditampilkan \"-\" pada LHU jika dipilih.'),
('RBM001', 'JS01', 'PR0017', 'SAT001', 'Tidak tercantum dalam baku mutu; ditampilkan \"-\" pada LHU jika dipilih.'),
('RBM001', 'JS01', 'PR0018', 'SAT011', 'Tidak tercantum dalam baku mutu; ditampilkan \"-\" pada LHU jika dipilih.'),
('RBM001', 'JS01', 'PR0019', 'SAT007', NULL),
('RBM001', 'JS01', 'PR0020', 'SAT007', NULL),
('RBM001', 'JS01', 'PR0021', 'SAT007', 'Bagi air baku air minum tidak dipersyaratkan'),
('RBM001', 'JS01', 'PR0022', 'SAT007', NULL),
('RBM001', 'JS01', 'PR0023', 'SAT007', NULL),
('RBM001', 'JS01', 'PR0024', 'SAT008', NULL),
('RBM001', 'JS01', 'PR0025', 'SAT008', NULL),
('RBM001', 'JS01', 'PR0026', 'SAT007', NULL),
('RBM001', 'JS01', 'PR0027', 'SAT007', NULL),
('RBM001', 'JS01', 'PR0028', 'SAT007', NULL),
('RBM001', 'JS01', 'PR0029', 'SAT007', NULL),
('RBM001', 'JS01', 'PR0030', 'SAT007', NULL),
('RBM001', 'JS01', 'PR0031', 'SAT007', NULL),
('RBM001', 'JS01', 'PR0032', 'SAT007', NULL),
('RBM001', 'JS01', 'PR0033', 'SAT007', NULL),
('RBM001', 'JS01', 'PR0034', 'SAT007', NULL),
('RBM001', 'JS02', 'PR0001', 'SAT003', 'Perbedaan dengan suhu udara di atas permukaan air'),
('RBM001', 'JS02', 'PR0002', 'SAT007', NULL),
('RBM001', 'JS02', 'PR0003', 'SAT007', NULL),
('RBM001', 'JS02', 'PR0004', 'SAT001', 'Tidak berlaku untuk air gambut berdasarkan kondisi alaminya'),
('RBM001', 'JS02', 'PR0005', 'SAT009', NULL),
('RBM001', 'JS02', 'PR0006', 'SAT007', 'Batas minimal'),
('RBM001', 'JS02', 'PR0007', 'SAT007', NULL),
('RBM001', 'JS02', 'PR0008', 'SAT007', NULL),
('RBM001', 'JS02', 'PR0009', 'SAT007', NULL),
('RBM001', 'JS02', 'PR0010', 'SAT007', NULL),
('RBM001', 'JS02', 'PR0011', 'SAT007', 'Tidak tercantum dalam baku mutu; ditampilkan \"-\" pada LHU jika dipilih.'),
('RBM001', 'JS02', 'PR0012', 'SAT007', 'Tidak tercantum dalam baku mutu; ditampilkan \"-\" pada LHU jika dipilih.'),
('RBM001', 'JS02', 'PR0013', 'SAT007', 'Tidak tercantum dalam baku mutu; ditampilkan \"-\" pada LHU jika dipilih.'),
('RBM001', 'JS02', 'PR0014', 'SAT007', NULL),
('RBM001', 'JS02', 'PR0015', 'SAT007', NULL),
('RBM001', 'JS02', 'PR0016', 'SAT012', 'Tidak tercantum dalam baku mutu; ditampilkan \"-\" pada LHU jika dipilih.'),
('RBM001', 'JS02', 'PR0019', 'SAT007', NULL),
('RBM001', 'JS02', 'PR0020', 'SAT007', NULL),
('RBM001', 'JS02', 'PR0021', 'SAT007', 'Bagi air baku air minum tidak dipersyaratkan'),
('RBM001', 'JS02', 'PR0022', 'SAT007', NULL),
('RBM001', 'JS02', 'PR0023', 'SAT007', NULL),
('RBM001', 'JS02', 'PR0024', 'SAT008', NULL),
('RBM001', 'JS02', 'PR0025', 'SAT008', NULL),
('RBM001', 'JS02', 'PR0026', 'SAT007', NULL),
('RBM001', 'JS02', 'PR0027', 'SAT007', NULL),
('RBM001', 'JS02', 'PR0028', 'SAT007', NULL),
('RBM001', 'JS02', 'PR0029', 'SAT007', NULL),
('RBM001', 'JS02', 'PR0030', 'SAT007', NULL),
('RBM001', 'JS02', 'PR0031', 'SAT007', NULL),
('RBM001', 'JS02', 'PR0032', 'SAT007', NULL),
('RBM001', 'JS02', 'PR0033', 'SAT007', NULL),
('RBM001', 'JS02', 'PR0034', 'SAT007', NULL),
('RBM001', 'JS02', 'PR0035', 'SAT006', NULL),
('RBM002', 'JS03', 'PR0001', 'SAT003', NULL),
('RBM002', 'JS03', 'PR0002', 'SAT007', NULL),
('RBM002', 'JS03', 'PR0004', 'SAT001', NULL),
('RBM002', 'JS03', 'PR0006', 'SAT007', NULL),
('RBM002', 'JS03', 'PR0011', 'SAT007', NULL),
('RBM002', 'JS03', 'PR0019', 'SAT007', NULL),
('RBM002', 'JS03', 'PR0035', 'SAT006', NULL),
('RBM002', 'JS03', 'PR0036', 'SAT002', NULL),
('RBM002', 'JS03', 'PR0037', 'SAT001', NULL),
('RBM002', 'JS03', 'PR0038', 'SAT001', NULL),
('RBM002', 'JS03', 'PR0101', 'SAT007', NULL),
('RBM003', 'JS04', 'PR0001', 'SAT003', NULL),
('RBM003', 'JS04', 'PR0002', 'SAT007', NULL),
('RBM003', 'JS04', 'PR0003', 'SAT007', NULL),
('RBM003', 'JS04', 'PR0004', 'SAT001', NULL),
('RBM003', 'JS04', 'PR0005', 'SAT009', 'Tidak tercantum dalam baku mutu; ditampilkan \"-\" pada LHU jika dipilih.'),
('RBM003', 'JS04', 'PR0006', 'SAT007', NULL),
('RBM003', 'JS04', 'PR0007', 'SAT007', NULL),
('RBM003', 'JS04', 'PR0008', 'SAT007', NULL),
('RBM003', 'JS04', 'PR0009', 'SAT007', 'Tidak tercantum dalam baku mutu; ditampilkan \"-\" pada LHU jika dipilih.'),
('RBM003', 'JS04', 'PR0010', 'SAT007', 'Tidak tercantum dalam baku mutu; ditampilkan \"-\" pada LHU jika dipilih.'),
('RBM003', 'JS04', 'PR0011', 'SAT007', NULL),
('RBM003', 'JS04', 'PR0012', 'SAT007', NULL),
('RBM003', 'JS04', 'PR0013', 'SAT007', NULL),
('RBM003', 'JS04', 'PR0014', 'SAT007', NULL),
('RBM003', 'JS04', 'PR0015', 'SAT007', 'Tidak tercantum dalam baku mutu; ditampilkan \"-\" pada LHU jika dipilih.'),
('RBM003', 'JS04', 'PR0016', 'SAT012', 'Tidak tercantum dalam baku mutu; ditampilkan \"-\" pada LHU jika dipilih.'),
('RBM003', 'JS04', 'PR0019', 'SAT007', NULL),
('RBM003', 'JS04', 'PR0021', 'SAT007', NULL),
('RBM003', 'JS04', 'PR0022', 'SAT007', NULL),
('RBM003', 'JS04', 'PR0023', 'SAT007', NULL),
('RBM003', 'JS04', 'PR0025', 'SAT008', NULL),
('RBM003', 'JS04', 'PR0026', 'SAT007', NULL),
('RBM003', 'JS04', 'PR0027', 'SAT007', NULL),
('RBM003', 'JS04', 'PR0028', 'SAT007', NULL),
('RBM003', 'JS04', 'PR0029', 'SAT007', NULL),
('RBM003', 'JS04', 'PR0030', 'SAT007', NULL),
('RBM003', 'JS04', 'PR0031', 'SAT007', NULL),
('RBM003', 'JS04', 'PR0032', 'SAT007', NULL),
('RBM003', 'JS04', 'PR0033', 'SAT007', NULL),
('RBM003', 'JS04', 'PR0034', 'SAT007', NULL),
('RBM004', 'JS04', 'PR0002', 'SAT007', NULL),
('RBM004', 'JS04', 'PR0004', 'SAT001', NULL),
('RBM004', 'JS04', 'PR0007', 'SAT007', NULL),
('RBM004', 'JS04', 'PR0008', 'SAT007', NULL),
('RBM004', 'JS04', 'PR0020', 'SAT007', NULL),
('RBM004', 'JS04', 'PR0028', 'SAT007', NULL),
('RBM004', 'JS04', 'PR0034', 'SAT007', NULL),
('RBM004', 'JS05', 'PR0002', 'SAT007', 'Parameter pemantauan sumur pantau; nilai baku mutu tidak ditetapkan.'),
('RBM004', 'JS05', 'PR0004', 'SAT001', 'Parameter pemantauan sumur pantau; nilai baku mutu tidak ditetapkan.'),
('RBM004', 'JS05', 'PR0006', 'SAT007', 'Parameter pemantauan sumur pantau; nilai baku mutu tidak ditetapkan.'),
('RBM004', 'JS05', 'PR0007', 'SAT007', 'Parameter pemantauan sumur pantau; nilai baku mutu tidak ditetapkan.'),
('RBM004', 'JS05', 'PR0008', 'SAT007', 'Parameter pemantauan sumur pantau; nilai baku mutu tidak ditetapkan.'),
('RBM004', 'JS05', 'PR0028', 'SAT007', 'Parameter pemantauan sumur pantau; nilai baku mutu tidak ditetapkan.'),
('RBM004', 'JS05', 'PR0034', 'SAT007', 'Parameter pemantauan sumur pantau; nilai baku mutu tidak ditetapkan.'),
('RBM005', 'JS06', 'PR0001', 'SAT003', NULL),
('RBM005', 'JS06', 'PR0002', 'SAT007', 'Tidak tercantum dalam baku mutu; ditampilkan \"-\" pada LHU jika dipilih.'),
('RBM005', 'JS06', 'PR0003', 'SAT007', NULL),
('RBM005', 'JS06', 'PR0004', 'SAT001', NULL),
('RBM005', 'JS06', 'PR0005', 'SAT009', NULL),
('RBM005', 'JS06', 'PR0006', 'SAT007', 'Tidak tercantum dalam baku mutu; ditampilkan \"-\" pada LHU jika dipilih.'),
('RBM005', 'JS06', 'PR0007', 'SAT007', 'Tidak tercantum dalam baku mutu; ditampilkan \"-\" pada LHU jika dipilih.'),
('RBM005', 'JS06', 'PR0008', 'SAT007', 'Tidak tercantum dalam baku mutu; ditampilkan \"-\" pada LHU jika dipilih.'),
('RBM005', 'JS06', 'PR0009', 'SAT007', 'Tidak tercantum dalam baku mutu; ditampilkan \"-\" pada LHU jika dipilih.'),
('RBM005', 'JS06', 'PR0010', 'SAT007', 'Tidak tercantum dalam baku mutu; ditampilkan \"-\" pada LHU jika dipilih.'),
('RBM005', 'JS06', 'PR0011', 'SAT007', NULL),
('RBM005', 'JS06', 'PR0012', 'SAT007', NULL),
('RBM005', 'JS06', 'PR0013', 'SAT007', NULL),
('RBM005', 'JS06', 'PR0014', 'SAT007', 'Tidak tercantum dalam baku mutu; ditampilkan \"-\" pada LHU jika dipilih.'),
('RBM005', 'JS06', 'PR0015', 'SAT007', 'Tidak tercantum dalam baku mutu; ditampilkan \"-\" pada LHU jika dipilih.'),
('RBM005', 'JS06', 'PR0016', 'SAT012', 'Tidak tercantum dalam baku mutu; ditampilkan \"-\" pada LHU jika dipilih.'),
('RBM005', 'JS06', 'PR0017', 'SAT001', NULL),
('RBM005', 'JS06', 'PR0021', 'SAT007', 'Tidak tercantum dalam baku mutu; ditampilkan \"-\" pada LHU jika dipilih.'),
('RBM005', 'JS06', 'PR0022', 'SAT007', 'Tidak tercantum dalam baku mutu; ditampilkan \"-\" pada LHU jika dipilih.'),
('RBM005', 'JS06', 'PR0023', 'SAT007', 'Tidak tercantum dalam baku mutu; ditampilkan \"-\" pada LHU jika dipilih.'),
('RBM005', 'JS06', 'PR0025', 'SAT004', NULL),
('RBM005', 'JS06', 'PR0027', 'SAT007', 'Tidak tercantum dalam baku mutu; ditampilkan \"-\" pada LHU jika dipilih.'),
('RBM005', 'JS06', 'PR0028', 'SAT007', 'Tidak tercantum dalam baku mutu; ditampilkan \"-\" pada LHU jika dipilih.'),
('RBM005', 'JS06', 'PR0029', 'SAT007', 'Tidak tercantum dalam baku mutu; ditampilkan \"-\" pada LHU jika dipilih.'),
('RBM005', 'JS06', 'PR0030', 'SAT007', NULL),
('RBM005', 'JS06', 'PR0031', 'SAT007', NULL),
('RBM005', 'JS06', 'PR0033', 'SAT007', 'Tidak tercantum dalam baku mutu; ditampilkan \"-\" pada LHU jika dipilih.'),
('RBM005', 'JS06', 'PR0034', 'SAT007', 'Tidak tercantum dalam baku mutu; ditampilkan \"-\" pada LHU jika dipilih.'),
('RBM005', 'JS06', 'PR0039', 'SAT004', NULL),
('RBM005', 'JS08', 'PR0001', 'SAT003', 'Suhu; parameter wajib Air Minum Permenkes 2/2023'),
('RBM005', 'JS08', 'PR0003', 'SAT007', 'Total Dissolved Solid/TDS; parameter wajib Air Minum Permenkes 2/2023'),
('RBM005', 'JS08', 'PR0004', 'SAT001', 'pH; parameter wajib Air Minum Permenkes 2/2023'),
('RBM005', 'JS08', 'PR0005', 'SAT010', 'Warna; parameter wajib Air Minum Permenkes 2/2023'),
('RBM005', 'JS08', 'PR0012', 'SAT007', 'Nitrat sebagai NO3 terlarut; parameter wajib Air Minum Permenkes 2/2023'),
('RBM005', 'JS08', 'PR0013', 'SAT007', 'Nitrit sebagai NO2 terlarut; parameter wajib Air Minum Permenkes 2/2023'),
('RBM005', 'JS08', 'PR0017', 'SAT001', 'Bau; parameter wajib Air Minum Permenkes 2/2023'),
('RBM005', 'JS08', 'PR0021', 'SAT007', 'Sisa khlor terlarut; parameter wajib Air Minum Permenkes 2/2023'),
('RBM005', 'JS08', 'PR0022', 'SAT007', 'Fluoride/Fluorida terlarut; parameter wajib Air Minum Permenkes 2/2023'),
('RBM005', 'JS08', 'PR0025', 'SAT004', 'Total Coliform; parameter wajib Air Minum Permenkes 2/2023'),
('RBM005', 'JS08', 'PR0027', 'SAT007', 'Timbal terlarut; parameter wajib Air Minum Permenkes 2/2023'),
('RBM005', 'JS08', 'PR0028', 'SAT007', 'Kadmium terlarut; parameter wajib Air Minum Permenkes 2/2023'),
('RBM005', 'JS08', 'PR0030', 'SAT007', 'Besi terlarut; parameter wajib Air Minum Permenkes 2/2023'),
('RBM005', 'JS08', 'PR0031', 'SAT007', 'Mangan terlarut; parameter wajib Air Minum Permenkes 2/2023'),
('RBM005', 'JS08', 'PR0033', 'SAT007', 'Arsen terlarut; parameter wajib Air Minum Permenkes 2/2023'),
('RBM005', 'JS08', 'PR0039', 'SAT004', 'Escherichia coli; parameter wajib Air Minum Permenkes 2/2023'),
('RBM006', 'JS04', 'PR0002', 'SAT007', NULL),
('RBM006', 'JS04', 'PR0004', 'SAT001', NULL),
('RBM006', 'JS04', 'PR0007', 'SAT007', NULL),
('RBM006', 'JS04', 'PR0008', 'SAT007', NULL),
('RBM006', 'JS04', 'PR0011', 'SAT007', NULL),
('RBM006', 'JS04', 'PR0014', 'SAT007', NULL),
('RBM006', 'JS04', 'PR0019', 'SAT007', NULL),
('RBM006', 'JS04', 'PR0021', 'SAT007', NULL),
('RBM006', 'JS04', 'PR0024', 'SAT008', NULL);

-- --------------------------------------------------------

--
-- Table structure for table `reg_bm`
--

CREATE TABLE `reg_bm` (
  `id_reg_bm` varchar(6) NOT NULL,
  `instansi` varchar(50) NOT NULL,
  `ref_reg` varchar(150) DEFAULT NULL,
  `is_active` tinyint(1) NOT NULL DEFAULT '1'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

--
-- Dumping data for table `reg_bm`
--

INSERT INTO `reg_bm` (`id_reg_bm`, `instansi`, `ref_reg`, `is_active`) VALUES
('RBM001', 'KLHK', 'PP RI No. 22 Tahun 2021 Lampiran VI', 1),
('RBM002', 'KLHK', 'PP RI No. 22 Tahun 2021 Lampiran VIII', 1),
('RBM003', 'KLH', 'Permen LH No. 5 Tahun 2014 Lampiran XLVII', 1),
('RBM004', 'KLHK', 'Permen LHK P.59/Menlhk/Setjen/Kum.1/7/2016', 1),
('RBM005', 'KEMENKES', 'Permenkes RI No. 2 Tahun 2023', 1),
('RBM006', 'KLH/BPLH', 'Permen LH/BPLH No. 11 Tahun 2025', 1),
('RBM007', 'KEMENKES', 'TESTY', 1);

-- --------------------------------------------------------

--
-- Table structure for table `role`
--

CREATE TABLE `role` (
  `id_role` varchar(10) NOT NULL,
  `nama_role` varchar(50) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

--
-- Dumping data for table `role`
--

INSERT INTO `role` (`id_role`, `nama_role`) VALUES
('RL-002', 'Admin'),
('RL-005', 'Analis'),
('RL-006', 'Kasi Pengendalian Mutu'),
('RL-003', 'Kasi Pengujian'),
('RL-001', 'Pelanggan'),
('RL-004', 'Penyelia');

-- --------------------------------------------------------

--
-- Table structure for table `sampel`
--

CREATE TABLE `sampel` (
  `no_sampel` varchar(25) NOT NULL,
  `id_registrasi` varchar(10) NOT NULL,
  `id_jenis_sampel` varchar(4) NOT NULL,
  `id_reg_bm` varchar(6) NOT NULL,
  `nomor_lhu` varchar(25) DEFAULT NULL,
  `tanggal_pengambilan_sampel` date DEFAULT NULL,
  `diterima_pada` datetime DEFAULT NULL,
  `lokasi_spesifik` varchar(150) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci DEFAULT NULL,
  `koordinat` varchar(100) DEFAULT NULL,
  `kondisi_sampel` enum('Sesuai','Tidak Sesuai') NOT NULL DEFAULT 'Sesuai',
  `abnormalitas_sampel` varchar(30) DEFAULT NULL,
  `acuan_pengambilan_sampel` varchar(20) DEFAULT NULL,
  `diterima_oleh` varchar(16) DEFAULT NULL,
  `status_sample` enum('Menunggu Pengambilan','Diterima','Dalam Pengujian','Selesai') NOT NULL DEFAULT 'Menunggu Pengambilan'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- --------------------------------------------------------

--
-- Table structure for table `sampel_parameter`
--

CREATE TABLE `sampel_parameter` (
  `no_sampel` varchar(25) NOT NULL,
  `id_fppl_parameter_metode` varchar(15) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- --------------------------------------------------------

--
-- Table structure for table `satuan`
--

CREATE TABLE `satuan` (
  `id_satuan` varchar(10) NOT NULL,
  `satuan` varchar(30) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

--
-- Dumping data for table `satuan`
--

INSERT INTO `satuan` (`id_satuan`, `satuan`) VALUES
('SAT001', '-'),
('SAT002', '‰'),
('SAT003', '°C'),
('SAT004', 'CFU/100mL'),
('SAT005', 'Jml/100mL'),
('SAT006', 'm'),
('SAT011', 'm3/s'),
('SAT007', 'mg/L'),
('SAT008', 'MPN/100mL'),
('SAT009', 'Pt-Co Unit'),
('SAT010', 'TCU'),
('SAT012', 'μS/cm');

-- --------------------------------------------------------

--
-- Table structure for table `sequelizemeta`
--

CREATE TABLE `sequelizemeta` (
  `name` varchar(255) CHARACTER SET utf8mb3 COLLATE utf8mb3_unicode_ci NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb3 COLLATE=utf8mb3_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `tarif_pengambilan`
--

CREATE TABLE `tarif_pengambilan` (
  `id_tarif_pengambilan` varchar(10) NOT NULL,
  `keterangan_jarak` varchar(50) DEFAULT NULL,
  `tarif` bigint UNSIGNED NOT NULL DEFAULT '0'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

--
-- Dumping data for table `tarif_pengambilan`
--

INSERT INTO `tarif_pengambilan` (`id_tarif_pengambilan`, `keterangan_jarak`, `tarif`) VALUES
('TA-001', 'Dalam Kota Padang', 475000),
('TA-002', 'Luar kota >50-100 km ke lokasi', 950000),
('TA-003', 'Luar kota >100-200 km ke lokasi', 1850000),
('TA-004', 'Luar kota >200 km ke lokasi', 2950000);

-- --------------------------------------------------------

--
-- Table structure for table `user`
--

CREATE TABLE `user` (
  `nik` varchar(16) NOT NULL,
  `id_role` varchar(10) NOT NULL,
  `username` varchar(50) NOT NULL,
  `email` varchar(50) NOT NULL,
  `password` varchar(100) NOT NULL,
  `refresh_token_hash` varchar(64) DEFAULT NULL,
  `refresh_token_expires_at` datetime DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `is_active` tinyint(1) NOT NULL DEFAULT '1',
  `reset_password_token_hash` varchar(64) DEFAULT NULL,
  `reset_password_expires_at` datetime DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

--
-- Dumping data for table `user`
--

INSERT INTO `user` (`nik`, `id_role`, `username`, `email`, `password`, `refresh_token_hash`, `refresh_token_expires_at`, `created_at`, `is_active`, `reset_password_token_hash`, `reset_password_expires_at`) VALUES
('0987654321098765', 'RL-001', 'test', 'tets@lablingkungan.go.id', '$2b$10$dREzopzpb4BoTi9yndUFjOIL9tklzrILtRPdjrEG1sob7/Gzbk3Aq', NULL, NULL, '2026-05-07 11:39:47', 1, NULL, NULL),
('1146658392983864', 'RL-001', 'rani', 'rekamanpjj@gmail.com', '$2b$10$HB4wC8O1F2B7qga8Ze05J.v/LfiUtcyffYzSh9OM1SCJN.7wKezzu', '6345361216115d377a4216f8542d32500bab5f46f7cad6ac5afb28946209d0de', '2026-07-23 19:43:47', '2026-05-19 09:24:33', 1, NULL, NULL),
('1234567890123456', 'RL-001', 'User Pelanggan', 'pelanggan@example.com', '$2b$10$bj2FHZHRo0J4Td1GtFvW2OFVSURWTnAVIWlrU7JN0b2Nw1C.s8L1K', NULL, NULL, '2026-03-09 21:18:41', 1, NULL, NULL),
('1878787878787879', 'RL-001', 'dewi', 'dewi@gmail.com', '$2b$10$yuVDJb5yX4GU8asn1eba3u7mZOiIqiNXTtoehNZ8TQPGzrSWq52Pe', NULL, NULL, '2026-05-19 10:19:12', 1, NULL, NULL),
('312131131415759', 'RL-006', 'sandiaga0', 'milkyambis@gmail.com', '$2b$10$SXYYQwcJ/HmzWjG3p3PZ9eHPjEQRLPp5HpQtc1ppSwZ0klxv0uTJS', NULL, NULL, '2026-05-02 16:25:12', 1, NULL, NULL),
('3171075704032018', 'RL-001', 'first1', 'first@gmail.com', '$2b$10$Q2mFbu2Zhykham8a34jAv.g1m/FSgLtqHpz4xwZxB63TmDrjtwDCG', NULL, NULL, '2026-04-15 17:53:27', 1, NULL, NULL),
('3171075704040002', 'RL-002', 'admin', '2211523024_meutia@student.unand.ac.id', '$2b$10$SXYYQwcJ/HmzWjG3p3PZ9eHPjEQRLPp5HpQtc1ppSwZ0klxv0uTJS', NULL, NULL, '2025-12-01 00:00:00', 1, NULL, NULL),
('3171075704040004', 'RL-004', 'andi', 'mmutiaadewi@gmail.com', '$2b$10$SXYYQwcJ/HmzWjG3p3PZ9eHPjEQRLPp5HpQtc1ppSwZ0klxv0uTJS', NULL, NULL, '2025-12-01 00:00:00', 1, NULL, NULL),
('3171075704040005', 'RL-005', 'rina', 'meutiad6@gmail.com', '$2b$10$SXYYQwcJ/HmzWjG3p3PZ9eHPjEQRLPp5HpQtc1ppSwZ0klxv0uTJS', NULL, NULL, '2025-12-01 00:00:00', 1, NULL, NULL),
('3171075704040006', 'RL-005', 'dedi', 'dewi.mdd@gmail.com', '$2b$10$2nsvwKfw8NdtsKRF1dpmTektksPgT.V1lx9DnhSp5vcLUd7r8nE3a', NULL, NULL, '2025-12-01 00:00:00', 1, NULL, NULL),
('3171075704040009', 'RL-003', 'sari', 'kyrinasg91@gmail.com', '$2b$10$SXYYQwcJ/HmzWjG3p3PZ9eHPjEQRLPp5HpQtc1ppSwZ0klxv0uTJS', NULL, NULL, '2025-12-01 00:00:00', 1, NULL, NULL),
('3171803823927329', 'RL-001', 'jayanti', 'mdd.kartika@gmail.com', '$2b$10$ai77B7IapcQ/9CRVF9FxLeH.PJDCxb7/9f8UbsEOCNObtHWXcCG1S', NULL, NULL, '2026-07-16 08:27:16', 1, NULL, NULL),
('3172346877989832', 'RL-001', 'warga', 'warga@gmail.com', '$2b$10$NE1Zqbu253vk2bbj/Uh5.Ocfbds/3utkmIjHirbUngJW5CVE9bLPu', '5e6f0fda4c12324e070b676f4d9068a49df978ee85e0261711b0a2b1ffd6b8d2', '2026-07-23 19:45:18', '2026-07-16 14:33:53', 1, NULL, NULL),
('3271000000000001', 'RL-001', 'usera', 'a@a.com', 'a', NULL, NULL, '2026-08-02 17:30:29', 1, NULL, NULL),
('3271000000000002', 'RL-001', 'userb', 'b@b.com', 'b', NULL, NULL, '2026-08-02 17:30:29', 1, NULL, NULL),
('4587654345678998', 'RL-002', 'dewi.mdd', 'pakiki@gmail.com', '$2b$10$Z2NEYPlOZ7WftsRevCefAen6nrOkzn3F/G3p5aCyjdYk7MNE6HLqm', NULL, NULL, '2026-05-15 15:11:46', 1, NULL, NULL),
('5895555555555555', 'RL-001', 'ikaw', 'ikaw@gmail.com', '$2b$10$lU/ipvN7GJRpALM6cnBIMO3QopEmFsRIm08lceyrEefoQvWChirdW', NULL, NULL, '2026-05-28 16:41:50', 1, NULL, NULL),
('8904803284023840', 'RL-001', 'zidah', 'zidah@gmail.com', '$2b$10$82TW713bx3RBpuG1zXQPk.ljxzwowdO5c4lFEkyNj1lTBQ.R1zDBm', NULL, NULL, '2026-05-28 08:16:12', 1, NULL, NULL);

--
-- Indexes for dumped tables
--

--
-- Indexes for table `aktivitas_sistem_log`
--
ALTER TABLE `aktivitas_sistem_log`
  ADD PRIMARY KEY (`id_aktivitas_log`),
  ADD KEY `idx_aktivitas_entity` (`entity_type`,`entity_id`),
  ADD KEY `idx_aktivitas_dibuat_oleh` (`dibuat_oleh`);

--
-- Indexes for table `fppl`
--
ALTER TABLE `fppl`
  ADD PRIMARY KEY (`id_registrasi`),
  ADD UNIQUE KEY `uq_fppl_nomor` (`nomor_fppl`),
  ADD KEY `idx_fppl_pelanggan` (`id_pelanggan`),
  ADD KEY `idx_fppl_tarif_pengambilan` (`id_tarif_pengambilan`),
  ADD KEY `idx_fppl_diverifikasi_oleh` (`diverifikasi_oleh`);

--
-- Indexes for table `fppl_parameter_metode`
--
ALTER TABLE `fppl_parameter_metode`
  ADD PRIMARY KEY (`id_fppl_parameter_metode`),
  ADD UNIQUE KEY `uq_fpm_fppl_sampel_parameter` (`id_registrasi`,`id_jenis_sampel`,`id_reg_bm`,`id_parameter`),
  ADD KEY `idx_fpm_parameter` (`id_parameter`),
  ADD KEY `idx_fpm_metode_parameter` (`id_metode_parameter`),
  ADD KEY `idx_fpm_dipilih_oleh` (`dipilih_oleh`),
  ADD KEY `fk_fpm_metode_parameter_pair` (`id_metode_parameter`,`id_parameter`),
  ADD KEY `idx_fpm_fppl_sampel_pfk` (`id_registrasi`,`id_jenis_sampel`,`id_reg_bm`);

--
-- Indexes for table `fppl_sampel`
--
ALTER TABLE `fppl_sampel`
  ADD PRIMARY KEY (`id_registrasi`,`id_jenis_sampel`,`id_reg_bm`),
  ADD KEY `idx_fppl_sampel_registrasi` (`id_registrasi`),
  ADD KEY `idx_fppl_sampel_jenis` (`id_jenis_sampel`),
  ADD KEY `idx_fppl_sampel_regbm` (`id_reg_bm`),
  ADD KEY `idx_fppl_sampel_id_jenis_sampel` (`id_jenis_sampel`),
  ADD KEY `idx_fppl_sampel_id_reg_bm` (`id_reg_bm`);

--
-- Indexes for table `invoice`
--
ALTER TABLE `invoice`
  ADD PRIMARY KEY (`id_invoice`),
  ADD UNIQUE KEY `uq_invoice_registrasi` (`id_registrasi`);

--
-- Indexes for table `invoice_item`
--
ALTER TABLE `invoice_item`
  ADD PRIMARY KEY (`id_invoice`,`id_fppl_parameter_metode`),
  ADD KEY `idx_invoice_item_fpm` (`id_fppl_parameter_metode`);

--
-- Indexes for table `jadwal_pengambilan_lhu`
--
ALTER TABLE `jadwal_pengambilan_lhu`
  ADD PRIMARY KEY (`id_jadwal_lhu`),
  ADD UNIQUE KEY `uq_jadwal_lhu_registrasi` (`id_registrasi`),
  ADD KEY `idx_jadwal_lhu_status` (`status_pengambilan`),
  ADD KEY `idx_jadwal_lhu_dijadwalkan_oleh` (`dijadwalkan_oleh`);

--
-- Indexes for table `jadwal_sampel`
--
ALTER TABLE `jadwal_sampel`
  ADD PRIMARY KEY (`id_jadwal`),
  ADD KEY `idx_jadwal_registrasi` (`id_registrasi`),
  ADD KEY `idx_jadwal_pcc` (`id_pegawai_pcc`),
  ADD KEY `idx_jadwal_sampel_dibuat_oleh` (`dibuat_oleh`);

--
-- Indexes for table `jenis_sampel`
--
ALTER TABLE `jenis_sampel`
  ADD PRIMARY KEY (`id_jenis_sampel`),
  ADD UNIQUE KEY `uq_jenis_sampel_nama` (`jenis_sampel`);

--
-- Indexes for table `kategori_parameter`
--
ALTER TABLE `kategori_parameter`
  ADD PRIMARY KEY (`id_kategori_parameter`),
  ADD UNIQUE KEY `uq_kategori_parameter_nama` (`nama_kategori`);

--
-- Indexes for table `klasifikasi`
--
ALTER TABLE `klasifikasi`
  ADD PRIMARY KEY (`id_klasifikasi`),
  ADD UNIQUE KEY `uq_klasifikasi_nama` (`klasifikasi`);

--
-- Indexes for table `lhu`
--
ALTER TABLE `lhu`
  ADD PRIMARY KEY (`nomor_lhu`),
  ADD KEY `idx_lhu_pkt_bm` (`id_pkt_bm`),
  ADD KEY `idx_lhu_status_lhu` (`status_lhu`),
  ADD KEY `idx_lhu_qc_by` (`qc_by`),
  ADD KEY `idx_lhu_kalab_by` (`kalab_by`),
  ADD KEY `idx_lhu_id_registrasi` (`id_registrasi`),
  ADD KEY `idx_lhu_signed_uploaded_by` (`file_lhu_signed_uploaded_by`),
  ADD KEY `idx_lhu_signed_uploaded_at` (`file_lhu_signed_uploaded_at`);

--
-- Indexes for table `lka`
--
ALTER TABLE `lka`
  ADD PRIMARY KEY (`kode_lka`),
  ADD UNIQUE KEY `uq_lka_penugasan_detail` (`id_penugasan_detail`),
  ADD KEY `idx_lka_pelapor` (`dilaporkan_oleh`),
  ADD KEY `idx_lka_pemeriksa` (`diperiksa_oleh`);

--
-- Indexes for table `lka_hasil`
--
ALTER TABLE `lka_hasil`
  ADD PRIMARY KEY (`kode_lka`,`no_sampel`),
  ADD KEY `idx_lka_hasil_sampel` (`no_sampel`),
  ADD KEY `idx_lka_hasil_status_review` (`status_review_hasil`);

--
-- Indexes for table `lka_revisi`
--
ALTER TABLE `lka_revisi`
  ADD PRIMARY KEY (`id_revisi_lka`),
  ADD KEY `idx_lka_revisi_kode_lka` (`kode_lka`),
  ADD KEY `idx_lka_revisi_sumber_status` (`sumber_revisi`,`status_revisi`),
  ADD KEY `idx_lka_revisi_diajukan_oleh` (`diajukan_oleh`),
  ADD KEY `idx_lka_revisi_ditinjau_oleh` (`ditinjau_oleh`),
  ADD KEY `idx_lka_revisi_sebelumnya` (`id_revisi_sebelumnya`),
  ADD KEY `idx_lka_revisi_kode_tanggal` (`kode_lka`,`diajukan_pada`,`id_revisi_lka`),
  ADD KEY `idx_lka_revisi_kode_sampel` (`kode_lka`,`no_sampel`),
  ADD KEY `fk_lka_revisi_no_sampel` (`no_sampel`);

--
-- Indexes for table `metode`
--
ALTER TABLE `metode`
  ADD PRIMARY KEY (`id_metode`),
  ADD UNIQUE KEY `uq_metode_nama` (`nama_metode`);

--
-- Indexes for table `notifikasi_email`
--
ALTER TABLE `notifikasi_email`
  ADD PRIMARY KEY (`id_notifikasi_email`),
  ADD KEY `idx_notif_email_tipe` (`id_tipe_notifikasi`),
  ADD KEY `idx_notif_email_status` (`status_pengiriman`),
  ADD KEY `idx_notif_email_dibuat_pada` (`dibuat_pada`),
  ADD KEY `idx_ne_tipe_status` (`id_tipe_notifikasi`,`status_pengiriman`),
  ADD KEY `idx_ne_referensi` (`referensi_tipe`,`referensi_id`),
  ADD KEY `idx_notifikasi_email_push_user` (`nik_penerima`,`id_tipe_notifikasi`,`push_aktif`),
  ADD KEY `idx_push_active_user` (`nik_penerima`,`id_tipe_notifikasi`,`push_aktif`),
  ADD KEY `idx_push_endpoint` (`push_endpoint`(255)),
  ADD KEY `idx_web_notification_list` (`nik_penerima`,`id_tipe_notifikasi`,`status_pengiriman`,`dibuat_pada`);

--
-- Indexes for table `parameter`
--
ALTER TABLE `parameter`
  ADD PRIMARY KEY (`id_parameter`),
  ADD UNIQUE KEY `uq_parameter_nama` (`nama_parameter`),
  ADD KEY `idx_parameter_kategori` (`id_kategori_parameter`);

--
-- Indexes for table `parameter_metode`
--
ALTER TABLE `parameter_metode`
  ADD PRIMARY KEY (`id_metode_parameter`),
  ADD UNIQUE KEY `uq_parameter_metode_variant` (`id_parameter`,`id_metode`,`acuan_metode`,`is_subkontrak`),
  ADD KEY `idx_parameter_metode_parameter` (`id_parameter`),
  ADD KEY `idx_parameter_metode_metode` (`id_metode`),
  ADD KEY `idx_parameter_metode_idparam` (`id_metode_parameter`,`id_parameter`),
  ADD KEY `idx_parameter_metode_active_param` (`is_active`,`id_parameter`);

--
-- Indexes for table `payment`
--
ALTER TABLE `payment`
  ADD PRIMARY KEY (`id_payment`),
  ADD KEY `idx_payment_gateway_status` (`gateway_status`),
  ADD KEY `idx_payment_gateway_session_id` (`gateway_session_id`),
  ADD KEY `idx_payment_gateway_reference_id` (`gateway_reference_id`),
  ADD KEY `idx_payment_invoice` (`id_invoice`);

--
-- Indexes for table `pegawai`
--
ALTER TABLE `pegawai`
  ADD PRIMARY KEY (`id_pegawai`),
  ADD UNIQUE KEY `uq_pegawai_nik` (`nik`);

--
-- Indexes for table `pelanggan`
--
ALTER TABLE `pelanggan`
  ADD PRIMARY KEY (`id_pelanggan`),
  ADD KEY `idx_pelanggan_nik` (`nik`);

--
-- Indexes for table `pengajuan_perubahan_jadwal`
--
ALTER TABLE `pengajuan_perubahan_jadwal`
  ADD PRIMARY KEY (`id_pengajuan_jadwal`),
  ADD KEY `idx_pengajuan_jadwal_registrasi` (`id_registrasi`),
  ADD KEY `idx_pengajuan_jadwal_status` (`status_pengajuan`),
  ADD KEY `idx_pengajuan_jadwal_jenis` (`jenis_jadwal`),
  ADD KEY `idx_pengajuan_jadwal_sampel` (`id_jadwal_sampel`),
  ADD KEY `idx_pengajuan_jadwal_lhu` (`id_jadwal_lhu`),
  ADD KEY `idx_pengajuan_jadwal_diajukan` (`diajukan_pada`);

--
-- Indexes for table `penugasan`
--
ALTER TABLE `penugasan`
  ADD PRIMARY KEY (`id_penugasan`),
  ADD KEY `idx_penugasan_analis` (`id_user_analis`),
  ADD KEY `idx_penugasan_assigned_by` (`assigned_by`),
  ADD KEY `idx_penugasan_jenis` (`jenis_penugasan`);

--
-- Indexes for table `penugasan_detail`
--
ALTER TABLE `penugasan_detail`
  ADD PRIMARY KEY (`id_penugasan_detail`),
  ADD KEY `fk_penugasan_detail_metode_parameter` (`id_metode_parameter`),
  ADD KEY `idx_penugasan_detail_penugasan` (`id_penugasan`);

--
-- Indexes for table `penugasan_item`
--
ALTER TABLE `penugasan_item`
  ADD PRIMARY KEY (`id_penugasan_detail`,`no_sampel`),
  ADD KEY `idx_penugasan_item_sampel` (`no_sampel`);

--
-- Indexes for table `pkt_bm`
--
ALTER TABLE `pkt_bm`
  ADD PRIMARY KEY (`id_pkt_bm`),
  ADD UNIQUE KEY `uq_pkt_bm_id_group` (`id_pkt_bm`,`id_reg_bm`,`id_jenis_sampel`),
  ADD UNIQUE KEY `uq_pkt_bm_group_id_klasifikasi` (`id_reg_bm`,`id_jenis_sampel`,`id_klasifikasi`),
  ADD KEY `idx_pkt_bm_reg` (`id_reg_bm`),
  ADD KEY `idx_pkt_bm_jenis` (`id_jenis_sampel`),
  ADD KEY `idx_pkt_bm_id_klasifikasi` (`id_klasifikasi`);

--
-- Indexes for table `pkt_bm_kelompok`
--
ALTER TABLE `pkt_bm_kelompok`
  ADD PRIMARY KEY (`id_reg_bm`,`id_jenis_sampel`),
  ADD KEY `fk_pkt_bm_kelompok_jenis_sampel` (`id_jenis_sampel`);

--
-- Indexes for table `pkt_bm_nilai`
--
ALTER TABLE `pkt_bm_nilai`
  ADD PRIMARY KEY (`id_pkt_bm`,`id_parameter`),
  ADD KEY `idx_pbn_parameter` (`id_parameter`);

--
-- Indexes for table `pkt_bm_param`
--
ALTER TABLE `pkt_bm_param`
  ADD PRIMARY KEY (`id_reg_bm`,`id_jenis_sampel`,`id_parameter`),
  ADD KEY `idx_pkt_bm_param_parameter_new` (`id_parameter`),
  ADD KEY `idx_pbp_id_satuan` (`id_satuan`);

--
-- Indexes for table `reg_bm`
--
ALTER TABLE `reg_bm`
  ADD PRIMARY KEY (`id_reg_bm`);

--
-- Indexes for table `role`
--
ALTER TABLE `role`
  ADD PRIMARY KEY (`id_role`),
  ADD UNIQUE KEY `uq_role_nama` (`nama_role`);

--
-- Indexes for table `sampel`
--
ALTER TABLE `sampel`
  ADD PRIMARY KEY (`no_sampel`),
  ADD KEY `idx_sampel_diterima_oleh` (`diterima_oleh`),
  ADD KEY `idx_sampel_fppl_sampel_pfk` (`id_registrasi`,`id_jenis_sampel`,`id_reg_bm`),
  ADD KEY `idx_sampel_nomor_lhu` (`nomor_lhu`);

--
-- Indexes for table `sampel_parameter`
--
ALTER TABLE `sampel_parameter`
  ADD PRIMARY KEY (`no_sampel`,`id_fppl_parameter_metode`),
  ADD KEY `idx_sampel_parameter_fpm` (`id_fppl_parameter_metode`);

--
-- Indexes for table `satuan`
--
ALTER TABLE `satuan`
  ADD PRIMARY KEY (`id_satuan`),
  ADD UNIQUE KEY `uq_satuan_nama` (`satuan`);

--
-- Indexes for table `sequelizemeta`
--
ALTER TABLE `sequelizemeta`
  ADD PRIMARY KEY (`name`);

--
-- Indexes for table `tarif_pengambilan`
--
ALTER TABLE `tarif_pengambilan`
  ADD PRIMARY KEY (`id_tarif_pengambilan`);

--
-- Indexes for table `user`
--
ALTER TABLE `user`
  ADD PRIMARY KEY (`nik`),
  ADD UNIQUE KEY `uq_user_username` (`username`),
  ADD UNIQUE KEY `uq_user_email` (`email`),
  ADD KEY `idx_user_role` (`id_role`);

--
-- Constraints for dumped tables
--

--
-- Constraints for table `aktivitas_sistem_log`
--
ALTER TABLE `aktivitas_sistem_log`
  ADD CONSTRAINT `fk_aktivitas_sistem_log_user` FOREIGN KEY (`dibuat_oleh`) REFERENCES `user` (`nik`) ON DELETE SET NULL ON UPDATE CASCADE;

--
-- Constraints for table `fppl`
--
ALTER TABLE `fppl`
  ADD CONSTRAINT `fk_fppl_pelanggan` FOREIGN KEY (`id_pelanggan`) REFERENCES `pelanggan` (`id_pelanggan`) ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT `fk_fppl_tarif_pengambilan` FOREIGN KEY (`id_tarif_pengambilan`) REFERENCES `tarif_pengambilan` (`id_tarif_pengambilan`) ON DELETE SET NULL ON UPDATE CASCADE;

--
-- Constraints for table `fppl_parameter_metode`
--
ALTER TABLE `fppl_parameter_metode`
  ADD CONSTRAINT `fk_fpm_fppl_sampel_pfk` FOREIGN KEY (`id_registrasi`,`id_jenis_sampel`,`id_reg_bm`) REFERENCES `fppl_sampel` (`id_registrasi`, `id_jenis_sampel`, `id_reg_bm`) ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT `fk_fpm_metode_parameter_pair` FOREIGN KEY (`id_metode_parameter`,`id_parameter`) REFERENCES `parameter_metode` (`id_metode_parameter`, `id_parameter`) ON DELETE RESTRICT ON UPDATE CASCADE;

--
-- Constraints for table `fppl_sampel`
--
ALTER TABLE `fppl_sampel`
  ADD CONSTRAINT `fk_fppl_sampel_fppl` FOREIGN KEY (`id_registrasi`) REFERENCES `fppl` (`id_registrasi`) ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT `fk_fppl_sampel_jenis_sampel` FOREIGN KEY (`id_jenis_sampel`) REFERENCES `jenis_sampel` (`id_jenis_sampel`) ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT `fk_fppl_sampel_reg_bm` FOREIGN KEY (`id_reg_bm`) REFERENCES `reg_bm` (`id_reg_bm`) ON DELETE RESTRICT ON UPDATE CASCADE;

--
-- Constraints for table `invoice`
--
ALTER TABLE `invoice`
  ADD CONSTRAINT `fk_invoice_fppl` FOREIGN KEY (`id_registrasi`) REFERENCES `fppl` (`id_registrasi`) ON DELETE CASCADE ON UPDATE CASCADE;

--
-- Constraints for table `invoice_item`
--
ALTER TABLE `invoice_item`
  ADD CONSTRAINT `fk_invoice_item_fpm` FOREIGN KEY (`id_fppl_parameter_metode`) REFERENCES `fppl_parameter_metode` (`id_fppl_parameter_metode`) ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT `fk_invoice_item_invoice` FOREIGN KEY (`id_invoice`) REFERENCES `invoice` (`id_invoice`) ON DELETE CASCADE ON UPDATE CASCADE;

--
-- Constraints for table `jadwal_pengambilan_lhu`
--
ALTER TABLE `jadwal_pengambilan_lhu`
  ADD CONSTRAINT `fk_jadwal_lhu_fppl` FOREIGN KEY (`id_registrasi`) REFERENCES `fppl` (`id_registrasi`) ON DELETE CASCADE ON UPDATE CASCADE;

--
-- Constraints for table `jadwal_sampel`
--
ALTER TABLE `jadwal_sampel`
  ADD CONSTRAINT `fk_jadwal_sampel_fppl` FOREIGN KEY (`id_registrasi`) REFERENCES `fppl` (`id_registrasi`) ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT `fk_jadwal_sampel_pcc` FOREIGN KEY (`id_pegawai_pcc`) REFERENCES `pegawai` (`id_pegawai`) ON DELETE SET NULL ON UPDATE CASCADE;

--
-- Constraints for table `lhu`
--
ALTER TABLE `lhu`
  ADD CONSTRAINT `fk_lhu_fppl` FOREIGN KEY (`id_registrasi`) REFERENCES `fppl` (`id_registrasi`) ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT `fk_lhu_pkt_bm` FOREIGN KEY (`id_pkt_bm`) REFERENCES `pkt_bm` (`id_pkt_bm`) ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT `fk_lhu_signed_uploaded_by` FOREIGN KEY (`file_lhu_signed_uploaded_by`) REFERENCES `user` (`nik`);

--
-- Constraints for table `lka`
--
ALTER TABLE `lka`
  ADD CONSTRAINT `fk_lka_penugasan_detail` FOREIGN KEY (`id_penugasan_detail`) REFERENCES `penugasan_detail` (`id_penugasan_detail`) ON DELETE CASCADE ON UPDATE CASCADE;

--
-- Constraints for table `lka_hasil`
--
ALTER TABLE `lka_hasil`
  ADD CONSTRAINT `fk_lka_hasil_lka` FOREIGN KEY (`kode_lka`) REFERENCES `lka` (`kode_lka`) ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT `fk_lka_hasil_sampel` FOREIGN KEY (`no_sampel`) REFERENCES `sampel` (`no_sampel`) ON DELETE CASCADE ON UPDATE CASCADE;

--
-- Constraints for table `lka_revisi`
--
ALTER TABLE `lka_revisi`
  ADD CONSTRAINT `fk_lka_revisi_lka` FOREIGN KEY (`kode_lka`) REFERENCES `lka` (`kode_lka`) ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT `fk_lka_revisi_lka_hasil` FOREIGN KEY (`kode_lka`,`no_sampel`) REFERENCES `lka_hasil` (`kode_lka`, `no_sampel`) ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT `fk_lka_revisi_sebelumnya` FOREIGN KEY (`id_revisi_sebelumnya`) REFERENCES `lka_revisi` (`id_revisi_lka`) ON DELETE SET NULL ON UPDATE CASCADE;

--
-- Constraints for table `notifikasi_email`
--
ALTER TABLE `notifikasi_email`
  ADD CONSTRAINT `fk_notifikasi_email_user` FOREIGN KEY (`nik_penerima`) REFERENCES `user` (`nik`) ON DELETE SET NULL ON UPDATE CASCADE;

--
-- Constraints for table `parameter`
--
ALTER TABLE `parameter`
  ADD CONSTRAINT `fk_parameter_kategori` FOREIGN KEY (`id_kategori_parameter`) REFERENCES `kategori_parameter` (`id_kategori_parameter`) ON DELETE SET NULL ON UPDATE CASCADE;

--
-- Constraints for table `parameter_metode`
--
ALTER TABLE `parameter_metode`
  ADD CONSTRAINT `fk_parameter_metode_metode` FOREIGN KEY (`id_metode`) REFERENCES `metode` (`id_metode`) ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT `fk_parameter_metode_parameter` FOREIGN KEY (`id_parameter`) REFERENCES `parameter` (`id_parameter`) ON DELETE RESTRICT ON UPDATE CASCADE;

--
-- Constraints for table `payment`
--
ALTER TABLE `payment`
  ADD CONSTRAINT `fk_payment_invoice` FOREIGN KEY (`id_invoice`) REFERENCES `invoice` (`id_invoice`) ON DELETE CASCADE ON UPDATE CASCADE;

--
-- Constraints for table `pegawai`
--
ALTER TABLE `pegawai`
  ADD CONSTRAINT `fk_pegawai_user_nik` FOREIGN KEY (`nik`) REFERENCES `user` (`nik`) ON DELETE SET NULL ON UPDATE CASCADE;

--
-- Constraints for table `pelanggan`
--
ALTER TABLE `pelanggan`
  ADD CONSTRAINT `fk_pelanggan_user_nik` FOREIGN KEY (`nik`) REFERENCES `user` (`nik`) ON DELETE RESTRICT ON UPDATE CASCADE;

--
-- Constraints for table `pengajuan_perubahan_jadwal`
--
ALTER TABLE `pengajuan_perubahan_jadwal`
  ADD CONSTRAINT `fk_pengajuan_jadwal_fppl` FOREIGN KEY (`id_registrasi`) REFERENCES `fppl` (`id_registrasi`) ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT `fk_pengajuan_jadwal_lhu` FOREIGN KEY (`id_jadwal_lhu`) REFERENCES `jadwal_pengambilan_lhu` (`id_jadwal_lhu`) ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT `fk_pengajuan_jadwal_sampel` FOREIGN KEY (`id_jadwal_sampel`) REFERENCES `jadwal_sampel` (`id_jadwal`) ON DELETE SET NULL ON UPDATE CASCADE;

--
-- Constraints for table `penugasan`
--
ALTER TABLE `penugasan`
  ADD CONSTRAINT `fk_penugasan_analis` FOREIGN KEY (`id_user_analis`) REFERENCES `user` (`nik`) ON DELETE SET NULL ON UPDATE CASCADE;

--
-- Constraints for table `penugasan_detail`
--
ALTER TABLE `penugasan_detail`
  ADD CONSTRAINT `fk_penugasan_detail_metode_parameter` FOREIGN KEY (`id_metode_parameter`) REFERENCES `parameter_metode` (`id_metode_parameter`) ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT `fk_penugasan_detail_penugasan` FOREIGN KEY (`id_penugasan`) REFERENCES `penugasan` (`id_penugasan`) ON DELETE CASCADE ON UPDATE CASCADE;

--
-- Constraints for table `penugasan_item`
--
ALTER TABLE `penugasan_item`
  ADD CONSTRAINT `fk_penugasan_item_detail` FOREIGN KEY (`id_penugasan_detail`) REFERENCES `penugasan_detail` (`id_penugasan_detail`) ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT `fk_penugasan_item_sampel` FOREIGN KEY (`no_sampel`) REFERENCES `sampel` (`no_sampel`) ON DELETE CASCADE ON UPDATE CASCADE;

--
-- Constraints for table `pkt_bm`
--
ALTER TABLE `pkt_bm`
  ADD CONSTRAINT `fk_pkt_bm_jenis_sampel` FOREIGN KEY (`id_jenis_sampel`) REFERENCES `jenis_sampel` (`id_jenis_sampel`) ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT `fk_pkt_bm_klasifikasi` FOREIGN KEY (`id_klasifikasi`) REFERENCES `klasifikasi` (`id_klasifikasi`) ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT `fk_pkt_bm_reg_bm` FOREIGN KEY (`id_reg_bm`) REFERENCES `reg_bm` (`id_reg_bm`) ON DELETE RESTRICT ON UPDATE CASCADE;

--
-- Constraints for table `pkt_bm_kelompok`
--
ALTER TABLE `pkt_bm_kelompok`
  ADD CONSTRAINT `fk_pkt_bm_kelompok_jenis_sampel` FOREIGN KEY (`id_jenis_sampel`) REFERENCES `jenis_sampel` (`id_jenis_sampel`) ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT `fk_pkt_bm_kelompok_reg_bm` FOREIGN KEY (`id_reg_bm`) REFERENCES `reg_bm` (`id_reg_bm`) ON DELETE RESTRICT ON UPDATE CASCADE;

--
-- Constraints for table `pkt_bm_nilai`
--
ALTER TABLE `pkt_bm_nilai`
  ADD CONSTRAINT `fk_pbn_parameter` FOREIGN KEY (`id_parameter`) REFERENCES `parameter` (`id_parameter`) ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT `fk_pbn_pkt_bm` FOREIGN KEY (`id_pkt_bm`) REFERENCES `pkt_bm` (`id_pkt_bm`) ON DELETE CASCADE ON UPDATE CASCADE;

--
-- Constraints for table `pkt_bm_param`
--
ALTER TABLE `pkt_bm_param`
  ADD CONSTRAINT `fk_pbp_new_kelompok` FOREIGN KEY (`id_reg_bm`,`id_jenis_sampel`) REFERENCES `pkt_bm_kelompok` (`id_reg_bm`, `id_jenis_sampel`) ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT `fk_pbp_new_parameter` FOREIGN KEY (`id_parameter`) REFERENCES `parameter` (`id_parameter`) ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT `fk_pbp_satuan` FOREIGN KEY (`id_satuan`) REFERENCES `satuan` (`id_satuan`) ON DELETE RESTRICT ON UPDATE CASCADE;

--
-- Constraints for table `sampel`
--
ALTER TABLE `sampel`
  ADD CONSTRAINT `fk_sampel_fppl_sampel_pfk` FOREIGN KEY (`id_registrasi`,`id_jenis_sampel`,`id_reg_bm`) REFERENCES `fppl_sampel` (`id_registrasi`, `id_jenis_sampel`, `id_reg_bm`) ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT `fk_sampel_lhu` FOREIGN KEY (`nomor_lhu`) REFERENCES `lhu` (`nomor_lhu`) ON DELETE SET NULL ON UPDATE CASCADE;

--
-- Constraints for table `sampel_parameter`
--
ALTER TABLE `sampel_parameter`
  ADD CONSTRAINT `fk_sampel_parameter_fpm` FOREIGN KEY (`id_fppl_parameter_metode`) REFERENCES `fppl_parameter_metode` (`id_fppl_parameter_metode`) ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT `fk_sampel_parameter_sampel` FOREIGN KEY (`no_sampel`) REFERENCES `sampel` (`no_sampel`) ON DELETE CASCADE ON UPDATE CASCADE;

--
-- Constraints for table `user`
--
ALTER TABLE `user`
  ADD CONSTRAINT `fk_user_role` FOREIGN KEY (`id_role`) REFERENCES `role` (`id_role`) ON DELETE RESTRICT ON UPDATE CASCADE;
COMMIT;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
