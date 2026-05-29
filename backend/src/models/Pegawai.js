const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Pegawai = sequelize.define('pegawai', {
  id_pegawai: {
    type: DataTypes.STRING(10),
    primaryKey: true,
    allowNull: false,
  },
  nik: {
    type: DataTypes.STRING(16),
    allowNull: true,
    unique: true,
  },
  nip: {
    type: DataTypes.STRING(18),
    allowNull: true,
  },
  nama_pegawai: {
    type: DataTypes.STRING(100),
    allowNull: false,
  },
  no_wa: {
    type: DataTypes.STRING(13),
    allowNull: true,
  },
  is_pcc: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: false,
  },
}, {
  tableName: 'pegawai',
  timestamps: false,
});

module.exports = Pegawai;
