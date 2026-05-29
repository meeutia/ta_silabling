const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const AktivitasSistemLog = sequelize.define(
  'aktivitas_sistem_log',
  {
    id_aktivitas_log: {
      type: DataTypes.STRING(13),
      primaryKey: true,
      allowNull: false,
    },
    entity_type: {
      type: DataTypes.STRING(30),
      allowNull: false,
    },
    entity_id: {
      type: DataTypes.STRING(30),
      allowNull: false,
    },
    aksi: {
      type: DataTypes.STRING(50),
      allowNull: false,
    },
    status_sebelumnya: {
      type: DataTypes.STRING(50),
      allowNull: true,
    },
    status_baru: {
      type: DataTypes.STRING(50),
      allowNull: true,
    },
    sumber_aksi: {
      type: DataTypes.ENUM('Pelanggan', 'Admin', 'Kasi', 'Penyelia', 'Analis', 'QC', 'Kalab', 'Sistem'),
      allowNull: false,
      defaultValue: 'Sistem',
    },
    catatan: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    dibuat_oleh: {
      type: DataTypes.STRING(16),
      allowNull: true,
    },
    dibuat_pada: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
    },
  },
  {
    tableName: 'aktivitas_sistem_log',
    timestamps: false,
  }
);

module.exports = AktivitasSistemLog;
