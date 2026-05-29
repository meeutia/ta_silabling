const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Parameter = sequelize.define('parameter', {
    id_parameter: {
        type: DataTypes.STRING(10),
        primaryKey: true
    },
    id_kategori_parameter: {
        type: DataTypes.STRING(4),
        allowNull: true
    },
    // kategori_parameter bukan lagi kolom fisik di tabel parameter.
    // Nilai kategori dibaca dari relasi parameter.id_kategori_parameter -> kategori_parameter.nama_kategori.
    kategori_parameter: {
        type: DataTypes.VIRTUAL,
        get() {
            const kategori = this.getDataValue('kategori') || this.kategori;
            return kategori?.nama_kategori || this.getDataValue('kategori_parameter') || null;
        },
        set(value) {
            this.setDataValue('kategori_parameter', value);
        }
    },
    nama_parameter: {
        type: DataTypes.STRING(100),
        allowNull: false
    }
});

module.exports = Parameter;
