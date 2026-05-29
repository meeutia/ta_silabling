const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const FpplSampel = sequelize.define('fppl_sampel', {
    id_fppl_sampel: {
        type: DataTypes.STRING(13),
        primaryKey: true
    },
    id_registrasi: {
        type: DataTypes.STRING(10),
        allowNull: false
    },
    id_jenis_sampel: {
        type: DataTypes.STRING(4),
        allowNull: false
    },
    id_reg_bm: {
        type: DataTypes.STRING(6),
        allowNull: false
    },
    jumlah_sampel: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 1
    }
});

module.exports = FpplSampel;
