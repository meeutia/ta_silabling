const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const JadwalPengambilanLhu = sequelize.define('jadwal_pengambilan_lhu', {
  id_jadwal_lhu: {
    type: DataTypes.STRING(10),
    primaryKey: true,
  },
  id_registrasi: {
    type: DataTypes.STRING(10),
    allowNull: false,
  },
  tanggal_pengambilan: {
    type: DataTypes.DATEONLY,
    allowNull: false,
  },
  jam_pengambilan: {
    type: DataTypes.TIME,
    allowNull: true,
  },
  status_pengambilan: {
    type: DataTypes.ENUM('Dijadwalkan', 'Disetujui Pelanggan', 'Disetujui Admin', 'Sudah Diambil', 'Dibatalkan'),
    allowNull: false,
    defaultValue: 'Dijadwalkan',
  },  catatan: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  dijadwalkan_oleh: {
    type: DataTypes.STRING(16),
    allowNull: true,
  },
  dijadwalkan_pada: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: DataTypes.NOW,
  },
  nama_pengambil: {
    type: DataTypes.STRING(100),
    allowNull: true,
  },
  diambil_pada: {
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
}, 
{
  tableName: 'jadwal_pengambilan_lhu',
  underscored: true,
  timestamps: false,
});

module.exports = JadwalPengambilanLhu;