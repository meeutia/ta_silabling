const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Satuan = sequelize.define('satuan', {
  id_satuan: {
    type: DataTypes.STRING(10),
    primaryKey: true,
    allowNull: false,
  },
  satuan: {
    type: DataTypes.STRING(30),
    allowNull: false,
  },
}, {
  tableName: 'satuan',
  timestamps: false,
});

module.exports = Satuan;
