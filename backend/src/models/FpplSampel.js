const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const FpplSampel = sequelize.define('fppl_sampel', {
    id_registrasi: {
        type: DataTypes.STRING(10),
        primaryKey: true,
        allowNull: false
    },
    id_jenis_sampel: {
        type: DataTypes.STRING(4),
        primaryKey: true,
        allowNull: false
    },
    id_reg_bm: {
        type: DataTypes.STRING(6),
        primaryKey: true,
        allowNull: false
    },
    jumlah_sampel: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 1
    }
});

module.exports = FpplSampel;
