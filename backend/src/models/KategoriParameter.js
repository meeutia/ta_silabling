const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const KategoriParameter = sequelize.define('kategori_parameter', {
  id_kategori_parameter: {
    type: DataTypes.STRING(4),
    primaryKey: true,
  },
  nama_kategori: {
    type: DataTypes.STRING(50),
    allowNull: false,
    unique: true,
  },
});

module.exports = KategoriParameter;
