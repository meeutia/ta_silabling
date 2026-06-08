const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const LKA_REVISION_STATUSES = [
  'Diajukan',
  'Menunggu Persetujuan Penyelia',
  'Menunggu Review Penyelia',
  'Disetujui Penyelia',
  'Ditolak Penyelia',
  'Disetujui untuk Analis',
  'Dikirim ke Analis',
  'Diperbaiki Analis',
  'Disetujui Kasi',
  'Selesai',
];

const LkaRevisi = sequelize.define('lka_revisi', {
  id_revisi_lka: {
    type: DataTypes.STRING(10),
    primaryKey: true,
    allowNull: false,
  },
  id_revisi_sebelumnya: {
    type: DataTypes.STRING(10),
    allowNull: true,
  },
  kode_lka: {
    type: DataTypes.STRING(20),
    allowNull: false,
  },
  no_sampel: {
    type: DataTypes.STRING(25),
    allowNull: true,
  },
  catatan_revisi: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  sumber_revisi: {
    type: DataTypes.ENUM('PENYELIA', 'KASI_PENGUJIAN'),
    allowNull: false,
  },
  level_revisi: {
    type: DataTypes.ENUM('LKA', 'HASIL'),
    allowNull: false,
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
    type: DataTypes.ENUM(...LKA_REVISION_STATUSES),
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
module.exports.LKA_REVISION_STATUSES = LKA_REVISION_STATUSES;
