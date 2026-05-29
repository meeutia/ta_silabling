const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const FpplParameterMetode = sequelize.define('fppl_parameter_metode', {
  id_fppl_parameter_metode: {
    type: DataTypes.STRING(15),
    primaryKey: true,
    allowNull: false,
  },
  id_fppl_sampel: {
    type: DataTypes.STRING(13),
    allowNull: false,
  },
  id_parameter: {
    type: DataTypes.STRING(6),
    allowNull: false,
  },
  id_metode_parameter: {
    type: DataTypes.STRING(6),
    allowNull: true,
  },
  status_kemampuan_lab: {
    type: DataTypes.ENUM('MAMPU', 'TIDAK_MAMPU'),
    allowNull: true,
  },
  catatan_kemampuan: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  dipilih_oleh: {
    type: DataTypes.STRING(16),
    allowNull: true,
  },
  dipilih_pada: {
    type: DataTypes.DATE,
    allowNull: true,
  },
  is_insitu: {
    type: DataTypes.BOOLEAN,
    allowNull: true,
    defaultValue: false,
  },
}, {
  tableName: 'fppl_parameter_metode',
  timestamps: false,
});

module.exports = FpplParameterMetode;
