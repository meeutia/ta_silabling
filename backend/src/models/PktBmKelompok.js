const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const PktBmKelompok = sequelize.define('pkt_bm_kelompok', {
  id_reg_bm: {
    type: DataTypes.STRING(6),
    primaryKey: true,
    allowNull: false,
  },
  id_jenis_sampel: {
    type: DataTypes.STRING(4),
    primaryKey: true,
    allowNull: false,
  },
  is_active: {
    type: DataTypes.TINYINT,
    allowNull: false,
    defaultValue: 1,
  },
}, {
  tableName: 'pkt_bm_kelompok',
  timestamps: false,
});

module.exports = PktBmKelompok;
