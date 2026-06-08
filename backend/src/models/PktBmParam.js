const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const PktBmParam = sequelize.define('pkt_bm_param', {
    id_reg_bm: {
        type: DataTypes.STRING(6),
        primaryKey: true,
        allowNull: false
    },
    id_jenis_sampel: {
        type: DataTypes.STRING(4),
        primaryKey: true,
        allowNull: false
    },
    id_parameter: {
        type: DataTypes.STRING(6),
        primaryKey: true,
        allowNull: false
    },
    satuan_bm: {
        type: DataTypes.STRING(20),
        allowNull: true
    },
    ket_bm: {
        type: DataTypes.STRING(100),
        allowNull: true
    }
}, {
    tableName: 'pkt_bm_param',
    timestamps: false,
});

module.exports = PktBmParam;
