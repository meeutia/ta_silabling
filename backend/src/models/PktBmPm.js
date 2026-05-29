const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const PktBmPm = sequelize.define('pkt_bm_pm', {
  id_pkt_bm_param: {
    type: DataTypes.STRING(10),
    primaryKey: true,
    allowNull: false,
  },
  id_metode_parameter: {
    type: DataTypes.STRING(6),
    primaryKey: true,
    allowNull: false,
  },
  is_default: {
    type: DataTypes.TINYINT,
    allowNull: false,
    defaultValue: 0,
  },
}, {
  tableName: 'pkt_bm_pm',
  timestamps: false,
});

module.exports = PktBmPm;
