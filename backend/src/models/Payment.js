const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Payment = sequelize.define('payment', {
    id_payment: {
        type: DataTypes.STRING(16),
        primaryKey: true
    },
    id_invoice: {
        type: DataTypes.STRING(16),
        allowNull: false
    },
    metode_bayar: {
        // MANUAL dipertahankan sebagai kode DB untuk fitur Bayar Nanti oleh admin.
        type: DataTypes.ENUM('XENDIT_QRIS', 'XENDIT_DANA', 'MANUAL'),
        allowNull: false
    },
    gateway_provider: {
        type: DataTypes.STRING(30),
        allowNull: true
    },
    gateway_session_id: {
        type: DataTypes.STRING(100),
        allowNull: true
    },
    gateway_reference_id: {
        type: DataTypes.STRING(100),
        allowNull: true
    },
    gateway_payment_url: {
        type: DataTypes.STRING(500),
        allowNull: true
    },
    gateway_status: {
        type: DataTypes.STRING(50),
        allowNull: true
    },
    gateway_payment_id: {
        type: DataTypes.STRING(100),
        allowNull: true
    },
    gateway_payment_request_id: {
        type: DataTypes.STRING(100),
        allowNull: true
    },
    expires_at: {
        type: DataTypes.DATE,
        allowNull: true
    },
    gateway_payload: {
        type: DataTypes.JSON,
        allowNull: true
    },
    paid_at: {
        type: DataTypes.DATE,
        allowNull: true
    },
}, {
    tableName: 'payment',
    timestamps: false,
    indexes: [
        { name: 'idx_payment_invoice', fields: ['id_invoice'] },
        { name: 'idx_payment_gateway_status', fields: ['gateway_status'] },
        { name: 'idx_payment_gateway_session_id', fields: ['gateway_session_id'] },
        { name: 'idx_payment_gateway_reference_id', fields: ['gateway_reference_id'] },
    ],
});

module.exports = Payment;
