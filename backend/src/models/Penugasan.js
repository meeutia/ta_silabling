const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Penugasan = sequelize.define('penugasan', {
    id_penugasan: {
        type: DataTypes.STRING(10),
        primaryKey: true
    },
    id_user_analis: {
        type: DataTypes.STRING(16),
        allowNull: false
    },
    assigned_by: {
        type: DataTypes.STRING(16),
        allowNull: true
    },
    assigned_at: {
        type: DataTypes.DATE,
        allowNull: true,
        defaultValue: DataTypes.NOW
    },
    jenis_penugasan: {
        type: DataTypes.ENUM('INTERNAL', 'SUBKONTRAK'),
        allowNull: false,
        defaultValue: 'INTERNAL'
    },
    status_penugasan: {
        type: DataTypes.ENUM(
            'Draft',
            'Aktif',
            'Selesai',
            'Dibatalkan'
        ),
        allowNull: false,
        defaultValue: 'Draft'
    },
    catatan_penugasan: {
        type: DataTypes.TEXT,
        allowNull: true
    }
});

module.exports = Penugasan;
