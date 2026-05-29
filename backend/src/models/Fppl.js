const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Fppl = sequelize.define('fppl', {
  id_registrasi: {
    type: DataTypes.STRING(10),
    primaryKey: true,
    allowNull: false,
  },
  nomor_fppl: {
    type: DataTypes.STRING(25),
    allowNull: true,
  },
  id_pelanggan: {
    type: DataTypes.STRING(8),
    allowNull: false,
  },
  tanggal_pendaftaran: {
    type: DataTypes.DATE,
    allowNull: false,
  },
  maksud_pengujian: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  lokasi_pengambilan_sampel: {
    type: DataTypes.STRING(100),
    allowNull: true,
  },
  jenis_pengambilan_sampel: {
    type: DataTypes.ENUM('Petugas', 'Mandiri'),
    allowNull: false,
  },
  id_tarif_pengambilan: {
    type: DataTypes.STRING(10),
    allowNull: true,
  },
  tanggal_rencana_pengambilan_sampel: {
    type: DataTypes.DATEONLY,
    allowNull: true,
  },
  jam_rencana_pengambilan_sampel: {
    type: DataTypes.TIME,
    allowNull: true,
  },
  tanggal_rencana_pengantaran_sampel: {
    type: DataTypes.DATEONLY,
    allowNull: true,
  },
  status_fppl: {
    type: DataTypes.ENUM(
      'Menunggu Verifikasi',
      'Perlu Revisi',
      'Menunggu Penentuan Metode',
      'Menunggu Pembayaran',
      'Menunggu Verifikasi Pembayaran',
      'Menunggu Sampel',
      'Menunggu Pengambilan Sampel',
      'Menunggu Pengantaran Sampel',
      'Proses Pengujian',
      'Menunggu Penjadwalan LHU',
      'Menunggu Pengambilan LHU',
      'Selesai',
      'Dibatalkan',
      'Dibatalkan Pelanggan',
      'Ditolak Admin',
      'Ditolak Kasi',
      'Ditolak Penyelia'
    ),
    allowNull: false,
    defaultValue: 'Menunggu Verifikasi',
  },
  catatan_penolakan: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  tanggal_verifikasi: {
    type: DataTypes.DATE,
    allowNull: true,
  },
  diverifikasi_oleh: {
    type: DataTypes.STRING(16),
    allowNull: true,
  },
}, {
  tableName: 'fppl',
  timestamps: false,
});

module.exports = Fppl;
