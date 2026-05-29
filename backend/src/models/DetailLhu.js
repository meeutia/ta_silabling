const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const DetailLhu = sequelize.define('detail_lhu', {
  nomor_lhu: {
    type: DataTypes.STRING(20),
    primaryKey: true,
    allowNull: false,
  },
  id_fppl_parameter_metode: {
    type: DataTypes.STRING(15),
    primaryKey: true,
    allowNull: false,
  },
  urutan_lhu: {
    type: DataTypes.INTEGER.UNSIGNED,
    allowNull: false,
    defaultValue: 1,
  },
}, {
  tableName: 'detail_lhu',
  timestamps: false,
});

module.exports = DetailLhu;
