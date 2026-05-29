const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const JenisSampel = sequelize.define('jenis_sampel', {
    id_jenis_sampel: {
        type: DataTypes.STRING(10),
        primaryKey: true
    },
    jenis_sampel: {
        type: DataTypes.STRING(100),
        allowNull: false
    }
});

module.exports = JenisSampel;
