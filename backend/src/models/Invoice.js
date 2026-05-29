const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Invoice = sequelize.define('invoice', {
    id_invoice: {
        type: DataTypes.STRING(16),
        primaryKey: true
    },
    id_registrasi: {
        type: DataTypes.STRING(10),
        allowNull: false
    },
    tanggal_invoice: {
        type: DataTypes.DATE,
        allowNull: true
    },
    subtotal_uji: {
        type: DataTypes.BIGINT.UNSIGNED,
        allowNull: false,
        defaultValue: 0
    },
    subtotal_pengambilan: {
        type: DataTypes.BIGINT.UNSIGNED,
        allowNull: false,
        defaultValue: 0
    },
    // Kolom 'total' tidak ada di skema DB baru — dihitung di application layer
    status_invoice: {
        type: DataTypes.ENUM('Belum Dibayar', 'Menunggu Verifikasi', 'Lunas', 'Dibatalkan', 'Bayar Nanti'),
        allowNull: false,
        defaultValue: 'Belum Dibayar'
    },
    total: {
        type: DataTypes.VIRTUAL,
        get() {
            return Number(this.subtotal_uji || 0) + Number(this.subtotal_pengambilan || 0);
        },
        set(value) {
            throw new Error('Jangan set kolom "total" secara manual. Kolom ini adalah field virtual.');
        }
    },
    file_invoice_path: {
        type: DataTypes.STRING(255),
        allowNull: true,
    }
});

module.exports = Invoice;
