const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const PenugasanItem = sequelize.define('penugasan_item', {
    id_penugasan_detail: {
        type: DataTypes.STRING(10),
        primaryKey: true
    },
    no_sampel: {
        type: DataTypes.STRING(25),
        primaryKey: true
    },
    tanggal_penugasan: {
        type: DataTypes.DATEONLY,
        allowNull: true
    }
}, {
    tableName: 'penugasan_item'
});

module.exports = PenugasanItem;
