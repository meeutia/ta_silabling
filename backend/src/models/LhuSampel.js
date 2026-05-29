const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const LhuSampel = sequelize.define('lhu_sampel', {
  nomor_lhu: {
    type: DataTypes.STRING(20),
    primaryKey: true,
    allowNull: false,
  },
  no_sampel: {
    type: DataTypes.STRING(25),
    primaryKey: true,
    allowNull: false,
  },
  urutan_sampel: {
    type: DataTypes.INTEGER.UNSIGNED,
    allowNull: false,
    defaultValue: 1,
  },
}, {
  tableName: 'lhu_sampel',
  timestamps: false,
});

module.exports = LhuSampel;
