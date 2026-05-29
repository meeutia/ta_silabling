const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Metode = sequelize.define('metode', {
    id_metode: {
        type: DataTypes.STRING(10),
        primaryKey: true
    },
    nama_metode: {
        type: DataTypes.STRING(100),
        allowNull: false
    }
});

module.exports = Metode;
