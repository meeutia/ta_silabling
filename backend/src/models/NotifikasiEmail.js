const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');
const { NOTIFICATION_REFERENCE_TYPE } = require('../constants/notification.constant');

const NotifikasiEmail = sequelize.define('notifikasi_email', {
  id_notifikasi_email: {
    type: DataTypes.STRING(15),
    primaryKey: true,
  },

  id_tipe_notifikasi: {
    type: DataTypes.STRING(10),
    allowNull: false,
  },

  nik_penerima: {
    type: DataTypes.STRING(16),
    allowNull: true,
  },

  email_tujuan: {
    type: DataTypes.STRING(100),
    allowNull: true,
  },

  nama_penerima: {
    type: DataTypes.STRING(100),
    allowNull: true,
  },

  referensi_tipe: {
    type: DataTypes.ENUM(...Object.values(NOTIFICATION_REFERENCE_TYPE)),
    allowNull: true,
  },

  referensi_id: {
    type: DataTypes.STRING(30),
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
}, {
  tableName: 'notifikasi_email',
  timestamps: false,
  underscored: true,
});

module.exports = NotifikasiEmail;
