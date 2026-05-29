const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const RegBm = sequelize.define('reg_bm', {
    id_reg_bm: {
        type: DataTypes.STRING(6),
        primaryKey: true
    },
    instansi: {
        type: DataTypes.STRING(50),
        allowNull: false
    },
    ref_reg: {
        type: DataTypes.STRING(100),
        allowNull: true
    },
    is_active: {
        type: DataTypes.TINYINT,
        allowNull: false,
        defaultValue: 1
    }
}, {
    tableName: 'reg_bm'
});

module.exports = RegBm;
