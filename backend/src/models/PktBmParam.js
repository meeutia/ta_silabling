const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const PktBmParam = sequelize.define('pkt_bm_param', {
    id_pkt_bm_param: {
        type: DataTypes.STRING(10),
        primaryKey: true
    },
    id_pkt_bm: {
        type: DataTypes.STRING(8),
        allowNull: false
    },
    id_parameter: {
        type: DataTypes.STRING(6),
        allowNull: false
    },

    nilai_bm: {
        type: DataTypes.STRING(10),
        allowNull: true
    },
    satuan_bm: {
        type: DataTypes.STRING(10),
        allowNull: true
    },
    ket_bm: {
        type: DataTypes.STRING(255),
        allowNull: true
    },
    is_in_bm: {
        type: DataTypes.TINYINT,
        allowNull: false,
        defaultValue: 1
    }
}, {
    tableName: 'pkt_bm_param'
});

module.exports = PktBmParam;
