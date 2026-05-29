const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Pelanggan = sequelize.define('pelanggan', {
    id_pelanggan: {
        type: DataTypes.STRING(10),
        primaryKey: true
    },
    nik: {
        type: DataTypes.STRING(16),
        allowNull: false
    },
    nama_instansi: {
        type: DataTypes.STRING(200),
        allowNull: false
    },
    pic: {
        type: DataTypes.STRING(200),
        allowNull: false
    },
    no_telp: {
        type: DataTypes.STRING(20),
        allowNull: false
    },
    alamat: {
        type: DataTypes.TEXT,
        allowNull: false
    },
    email_kontak: {
        type: DataTypes.STRING(100),
        allowNull: false
    }
});

module.exports = Pelanggan;
