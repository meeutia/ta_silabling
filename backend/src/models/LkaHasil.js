const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const REVIEW_STATUS_FIELD = ['status', 'review', 'hasil'].join('_');

const LkaHasil = sequelize.define('lka_hasil', {
  kode_lka: {
    type: DataTypes.STRING(20),
    primaryKey: true,
    allowNull: false,
  },
  no_sampel: {
    type: DataTypes.STRING(25),
    primaryKey: true,
    allowNull: false,
  },
  hasil: {
    type: DataTypes.STRING(50),
    allowNull: true,
  },
  catatan_hasil: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  statusReviewHasil: {
    type: DataTypes.ENUM(
      'Draft',
      'Menunggu Verifikasi Penyelia',
      'Disetujui Penyelia',
      'Menunggu Verifikasi Kasi Pengujian',
      'Menunggu Persetujuan Penyelia Atas Revisi Kasi',
      'Disetujui Kasi Pengujian',
      'Perlu Revisi'
    ),
    allowNull: false,
    defaultValue: 'Draft',
    field: REVIEW_STATUS_FIELD,
  },
}, {
  tableName: 'lka_hasil',
  timestamps: false,
});

module.exports = LkaHasil;
