const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const NotifikasiEmail = sequelize.define('notifikasi_email', {
  id_notifikasi_email: {
    type: DataTypes.STRING(15),
    primaryKey: true,
  },

  id_tipe_notifikasi: {
    type: DataTypes.STRING(10),
    allowNull: false,
  },

  penerima_user_nik: {
    type: DataTypes.STRING(16),
    allowNull: true,
  },

  penerima_pelanggan_id: {
    type: DataTypes.STRING(8),
    allowNull: true,
  },

  id_registrasi: {
    type: DataTypes.STRING(10),
    allowNull: true,
  },

  id_jadwal_lhu: {
    type: DataTypes.STRING(10),
    allowNull: true,
  },

  nomor_lhu: {
    type: DataTypes.STRING(20),
    allowNull: true,
  },

  id_penugasan: {
    type: DataTypes.STRING(10),
    allowNull: true,
  },

  status_pengiriman: {
    type: DataTypes.ENUM('MENUNGGU', 'TERKIRIM', 'GAGAL'),
    allowNull: false,
    defaultValue: 'MENUNGGU',
  },

  pesan_error: {
    type: DataTypes.TEXT,
    allowNull: true,
  },

  dikirim_pada: {
    type: DataTypes.DATE,
    allowNull: true,
  },

  dibuat_pada: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: DataTypes.NOW,
  },

  diperbarui_pada: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: DataTypes.NOW,
  },
}, {
  tableName: 'notifikasi_email',
  timestamps: false,
  underscored: true,
});

module.exports = NotifikasiEmail;