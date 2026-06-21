const { DataTypes, Model } = require('sequelize');
const sequelize = require('../config/database');

class Invoice extends Model {
  static associate(models) {
    Invoice.belongsTo(models.Fppl, { foreignKey: 'id_registrasi' });
    Invoice.hasMany(models.InvoiceItem, { foreignKey: 'id_invoice' });
    Invoice.belongsToMany(models.FpplParameterMetode, { through: models.InvoiceItem, foreignKey: 'id_invoice', otherKey: 'id_fppl_parameter_metode', as: 'ItemParameter' });
    Invoice.hasMany(models.Payment, { foreignKey: 'id_invoice' });
  }

  getPrimaryKeyValue() {
    const primaryKey = this.constructor.primaryKeyAttribute;
    return primaryKey ? this.get(primaryKey) : undefined;
  }

  toPlainObject() {
    return this.get({ plain: true });
  }

  isStatus(status) {
    return this.status_invoice === status;
  }

  isPaid() {
    return this.isStatus('Lunas');
  }

  isWaitingPayment() {
    return this.isStatus('Belum Dibayar');
  }

  isWaitingVerification() {
    return this.isStatus('Menunggu Verifikasi');
  }

  getTotal() {
    return Number(this.subtotal_uji || 0) + Number(this.subtotal_pengambilan || 0);
  }
}

Invoice.init({
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
}, {
  sequelize,
  modelName: 'invoice',
});

module.exports = Invoice;
