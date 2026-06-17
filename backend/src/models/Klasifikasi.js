const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Klasifikasi = sequelize.define('klasifikasi', {
  id_klasifikasi: {
    type: DataTypes.STRING(10),
    primaryKey: true,
    allowNull: false,
  },
  klasifikasi: {
    type: DataTypes.STRING(50),
    allowNull: false,
  },
}, {
  tableName: 'klasifikasi',
  timestamps: false,
});

module.exports = Klasifikasi;
