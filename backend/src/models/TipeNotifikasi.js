const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const TipeNotifikasi = sequelize.define('tipe_notifikasi', {
  id_tipe_notifikasi: {
    type: DataTypes.STRING(10),
    primaryKey: true,
  },
  deskripsi: {
    type: DataTypes.STRING(100),
    allowNull: false,
  },
  konteks: {
    type: DataTypes.ENUM('FPPL', 'JADWAL_LHU', 'JADWAL', 'LHU', 'PENUGASAN', 'UMUM'),
    allowNull: false,
    defaultValue: 'UMUM',
  },
}, {
  tableName: 'tipe_notifikasi',
  timestamps: false,
  underscored: true,
});

module.exports = TipeNotifikasi;