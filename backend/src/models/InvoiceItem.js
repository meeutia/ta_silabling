const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const InvoiceItem = sequelize.define('invoice_item', {
  id_invoice: {
    type: DataTypes.STRING(16),
    primaryKey: true,
  },
  id_fppl_parameter_metode: {
    type: DataTypes.STRING(15),
    primaryKey: true,
  },
  qty: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 1,
  },
  tarif_invoice: {
    type: DataTypes.BIGINT.UNSIGNED,
    allowNull: false,
    defaultValue: 0,
  },
}, {
  tableName: 'invoice_item',
  timestamps: false,
});

module.exports = InvoiceItem;
