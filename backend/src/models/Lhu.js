const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Lhu = sequelize.define('lhu', {
  nomor_lhu: {
    type: DataTypes.STRING(20),
    primaryKey: true,
    allowNull: false,
  },
  id_registrasi: {
    type: DataTypes.STRING(10),
    allowNull: false,
  },
  id_pkt_bm: {
    type: DataTypes.STRING(8),
    allowNull: false,
  },
  tanggal_penerbitan: {
    type: DataTypes.DATEONLY,
    allowNull: true,
  },
  file_lhu_path: {
    type: DataTypes.STRING(255),
    allowNull: true,
  },
  qc_by: {
    type: DataTypes.STRING(16),
    allowNull: true,
  },
  qc_at: {
    type: DataTypes.DATE,
    allowNull: true,
  },
  kalab_by: {
    type: DataTypes.STRING(16),
    allowNull: true,
  },
  kalab_at: {
    type: DataTypes.DATE,
    allowNull: true,
  },
  created_at: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: DataTypes.NOW,
  },
  updated_at: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: DataTypes.NOW,
  },
  status_lhu: {
    type: DataTypes.ENUM(
      'Draft',
      'Menunggu QC',
      'Menunggu Persetujuan Kepala Lab',
      'Disahkan',
      'Dibatalkan'
    ),
    allowNull: false,
    defaultValue: 'Draft',
  },
}, {
  tableName: 'lhu',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at',
});

module.exports = Lhu;
