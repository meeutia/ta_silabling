const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Lka = sequelize.define('lka', {
  kode_lka: {
    type: DataTypes.STRING(20),
    primaryKey: true,
    allowNull: false,
  },
  id_penugasan_detail: {
    type: DataTypes.STRING(10),
    allowNull: false,
  },
  tanggal_mulai_pengujian: {
    type: DataTypes.DATEONLY,
    allowNull: true,
  },
  tanggal_selesai_pengujian: {
    type: DataTypes.DATEONLY,
    allowNull: true,
  },
  dhl_akuades: {
    type: DataTypes.STRING(50),
    allowNull: true,
  },
  file_worksheet_path: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  dilaporkan_oleh: {
    type: DataTypes.STRING(16),
    allowNull: true,
  },
  tanggal_pelaporan: {
    type: DataTypes.DATEONLY,
    allowNull: true,
  },
  diperiksa_oleh: {
    type: DataTypes.STRING(16),
    allowNull: true,
  },
  tanggal_pemeriksaan: {
    type: DataTypes.DATEONLY,
    allowNull: true,
  },
  status_lka: {
    type: DataTypes.ENUM(
      'Draft',
      'Menunggu Verifikasi Penyelia',
      'Perlu Perbaikan',
      'Disetujui Penyelia',
      'Menunggu Verifikasi Kasi Pengujian',
      'Disetujui Kasi Pengujian',
      'Disahkan'
    ),
    allowNull: false,
    defaultValue: 'Draft',
  },
}, {
  tableName: 'lka',
  timestamps: false,
});

module.exports = Lka;
