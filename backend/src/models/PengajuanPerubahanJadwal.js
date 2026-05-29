const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const PengajuanPerubahanJadwal = sequelize.define('pengajuan_perubahan_jadwal', {
  id_pengajuan_jadwal: {
    type: DataTypes.STRING(20),
    primaryKey: true,
  },
  jenis_jadwal: {
    type: DataTypes.ENUM('SAMPEL', 'LHU'),
    allowNull: false,
  },
  id_registrasi: {
    type: DataTypes.STRING(10),
    allowNull: false,
  },
  id_jadwal_sampel: {
    type: DataTypes.STRING(10),
    allowNull: true,
  },
  id_jadwal_lhu: {
    type: DataTypes.STRING(10),
    allowNull: true,
  },
  tanggal_sebelumnya: {
    type: DataTypes.DATEONLY,
    allowNull: true,
  },
  jam_sebelumnya: {
    type: DataTypes.TIME,
    allowNull: true,
  },
  tanggal_usulan: {
    type: DataTypes.DATEONLY,
    allowNull: false,
  },
  jam_usulan: {
    type: DataTypes.TIME,
    allowNull: true,
  },
  alasan_pengajuan: {
    type: DataTypes.TEXT,
    allowNull: false,
  },
  status_pengajuan: {
    type: DataTypes.ENUM(
      'Menunggu Persetujuan Admin',
      'Disetujui',
      'Ditolak',
      'Dibatalkan Pelanggan'
    ),
    allowNull: false,
    defaultValue: 'Menunggu Persetujuan Admin',
  },
  catatan_admin: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  diajukan_pada: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: DataTypes.NOW,
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
}, {
  tableName: 'pengajuan_perubahan_jadwal',
  underscored: true,
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at',
});

module.exports = PengajuanPerubahanJadwal;
