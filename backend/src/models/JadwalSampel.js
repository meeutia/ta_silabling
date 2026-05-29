const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const JadwalSampel = sequelize.define('jadwal_sampel', {
    id_jadwal: {
        type: DataTypes.STRING(10),
        primaryKey: true
    },
    id_registrasi: {
        type: DataTypes.STRING(15),
        allowNull: false
    },
    tanggal_jadwal: {
        type: DataTypes.DATEONLY,
        allowNull: false
    },
    jam_jadwal: {
        type: DataTypes.TIME,
        allowNull: false
    },
    
    id_pegawai_pcc: {
        type: DataTypes.STRING(10),
        allowNull: true
    },
    dibuat_oleh: {
        type: DataTypes.STRING(16),
        allowNull: true
    },

    dibuat_pada: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW
    },
    status_jadwal: {
        type: DataTypes.ENUM('Terjadwal', 'Disetujui Pelanggan', 'Disetujui Admin', 'Selesai', 'Dibatalkan'),
        allowNull: false,
        defaultValue: 'Terjadwal'
    },
}, {
    timestamps: false
});

module.exports = JadwalSampel;
