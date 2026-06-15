const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Sampel = sequelize.define('sampel', {
  no_sampel: {
    type: DataTypes.STRING(25),
    primaryKey: true,
  },
  id_registrasi: {
    type: DataTypes.STRING(10),
    allowNull: false,
  },
  id_jenis_sampel: {
    type: DataTypes.STRING(4),
    allowNull: false,
  },
  id_reg_bm: {
    type: DataTypes.STRING(6),
    allowNull: false,
  },
  nomor_lhu: {
    type: DataTypes.STRING(20),
    allowNull: true,
  },
  tanggal_pengambilan_sampel: {
    type: DataTypes.DATEONLY,
    allowNull: true,
  },
  diterima_pada: {
    type: DataTypes.DATE,
    allowNull: true,
  },
  lokasi_spesifik: {
    type: DataTypes.STRING(150),
    allowNull: true,
  },
  koordinat: {
    type: DataTypes.STRING(100),
    allowNull: true,
  },
  kondisi_sampel: {
    type: DataTypes.ENUM('Sesuai', 'Tidak Sesuai'),
    allowNull: false,
    defaultValue: 'Sesuai',
  },
  abnormalitas_sampel: {
    type: DataTypes.STRING(30),
    allowNull: true,
  },
  acuan_pengambilan_sampel: {
    type: DataTypes.STRING(20),
    allowNull: true,
  },
  diterima_oleh: {
    type: DataTypes.STRING(16),
    allowNull: true,
  },
  status_sample: {
    type: DataTypes.ENUM('Menunggu Pengambilan', 'Diterima', 'Dalam Pengujian', 'Selesai'),
    allowNull: false,
    defaultValue: 'Menunggu Pengambilan',
  },
}, {
  tableName: 'sampel',
  timestamps: false,
});

module.exports = Sampel;
