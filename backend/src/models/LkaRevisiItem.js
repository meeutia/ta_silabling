const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const LkaRevisiItem = sequelize.define('lka_revisi_item', {
  id_revisi_item: {
    type: DataTypes.STRING(10),
    primaryKey: true,
    allowNull: false,
  },
  id_revisi_lka: {
    type: DataTypes.STRING(10),
    allowNull: false,
  },
  kode_lka: {
    type: DataTypes.STRING(20),
    allowNull: false,
  },
  no_sampel: {
    type: DataTypes.STRING(25),
    allowNull: false,
  },
  catatan_revisi: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  status_item_revisi: {
    type: DataTypes.ENUM(
      'Menunggu Review Penyelia',
      'Ditolak Penyelia',
      'Disetujui untuk Analis',
      'Diperbaiki Analis',
      'Disetujui Penyelia',
      'Disetujui Kasi'
    ),
    allowNull: false,
    defaultValue: 'Menunggu Review Penyelia',
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
  tableName: 'lka_revisi_item',
  timestamps: false,
});

module.exports = LkaRevisiItem;
