const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const PktBmNilai = sequelize.define('pkt_bm_nilai', {
  id_pkt_bm: {
    type: DataTypes.STRING(8),
    primaryKey: true,
    allowNull: false,
  },
  id_parameter: {
    type: DataTypes.STRING(6),
    primaryKey: true,
    allowNull: false,
  },
  nilai_bm: {
    type: DataTypes.STRING(30),
    allowNull: true,
  },
}, {
  tableName: 'pkt_bm_nilai',
  timestamps: false,
});

module.exports = PktBmNilai;
