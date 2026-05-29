const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const LkaRevisi = sequelize.define('lka_revisi', {
  id_revisi_lka: {
    type: DataTypes.STRING(10),
    primaryKey: true,
    allowNull: false,
  },
  kode_lka: {
    type: DataTypes.STRING(20),
    allowNull: false,
  },
  sumber_revisi: {
    type: DataTypes.ENUM('PENYELIA', 'KASI_PENGUJIAN'),
    allowNull: false,
  },
  level_revisi: {
    type: DataTypes.ENUM('LKA', 'HASIL'),
    allowNull: false,
  },
  catatan_umum: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  diajukan_oleh: {
    type: DataTypes.STRING(16),
    allowNull: false,
  },
  diajukan_pada: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: DataTypes.NOW,
  },
  status_revisi: {
    type: DataTypes.ENUM(
      'Diajukan',
      'Menunggu Persetujuan Penyelia',
      'Disetujui Penyelia',
      'Ditolak Penyelia',
      'Dikirim ke Analis',
      'Selesai'
    ),
    allowNull: false,
    defaultValue: 'Diajukan',
  },
  ditinjau_oleh: {
    type: DataTypes.STRING(16),
    allowNull: true,
  },
  ditinjau_pada: {
    type: DataTypes.DATE,
    allowNull: true,
  },
  catatan_tinjauan: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  created_at: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: DataTypes.NOW,
  },
  updated_at: {
    type: DataTypes.DATE,
    allowNull: true,
  },
}, {
  tableName: 'lka_revisi',
  timestamps: false,
});

module.exports = LkaRevisi;
