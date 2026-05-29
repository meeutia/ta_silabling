const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const PktBm = sequelize.define('pkt_bm', {
    id_pkt_bm: {
        type: DataTypes.STRING(8),
        primaryKey: true
    },
    id_reg_bm: {
        type: DataTypes.STRING(6),
        allowNull: false
    },
    id_jenis_sampel: {
        type: DataTypes.STRING(4),
        allowNull: false
    },
    klasifikasi: {
        type: DataTypes.STRING(10),
        allowNull: true
    },
    nama_pkt: {
        type: DataTypes.STRING(30),
        allowNull: false
    },
    teks_lhu: {
        type: DataTypes.STRING(100),
        allowNull: true
    },
    is_active: {
        type: DataTypes.TINYINT,
        allowNull: false,
        defaultValue: 1
    }
}, {
    tableName: 'pkt_bm'
});

module.exports = PktBm;
