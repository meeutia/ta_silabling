const { DataTypes, Model } = require('sequelize');
const sequelize = require('../config/database');

class InvoiceItem extends Model {
  static associate(models) {
    InvoiceItem.belongsTo(models.Invoice, { foreignKey: 'id_invoice' });
    InvoiceItem.belongsTo(models.FpplParameterMetode, { foreignKey: 'id_fppl_parameter_metode' });
  }

  getPrimaryKeyValue() {
    const primaryKey = this.constructor.primaryKeyAttribute;
    return primaryKey ? this.get(primaryKey) : undefined;
  }

  toPlainObject() {
    return this.get({ plain: true });
  }
}

InvoiceItem.init({
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
  sequelize,
  modelName: 'invoice_item',
tableName: 'invoice_item',
  timestamps: false,
});

module.exports = InvoiceItem;
