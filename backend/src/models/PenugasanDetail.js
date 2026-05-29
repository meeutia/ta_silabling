const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const PenugasanDetail = sequelize.define('penugasan_detail', {
    id_penugasan_detail: {
        type: DataTypes.STRING(10),
        primaryKey: true
    },
    id_penugasan: {
        type: DataTypes.STRING(10),
        allowNull: false
    },
    id_metode_parameter: {
        type: DataTypes.STRING(6),
        allowNull: false,
    },
    status_detail: {
        type: DataTypes.ENUM(
            'Draft',
            'Ditugaskan',
            'Sedang Dikerjakan',
            'Worksheet Terkirim',
            'Perlu Revisi',
            'Disetujui',
            'Selesai'
        ),
        allowNull: false,
        defaultValue: 'Draft'
    },
    tanggal_tenggat: {
        type: DataTypes.DATEONLY,
        allowNull: true
    },
    catatan_detail: {
        type: DataTypes.TEXT,
        allowNull: true
    }
}, {
    tableName: 'penugasan_detail'
});

module.exports = PenugasanDetail;
