const { DataTypes, Model } = require('sequelize');
const sequelize = require('../config/database');

class Pelanggan extends Model {
  static associate(models) {
    Pelanggan.belongsTo(models.User, { foreignKey: 'nik' });
    Pelanggan.hasMany(models.Fppl, { foreignKey: 'id_pelanggan', as: 'permintaan' });
  }

  getPrimaryKeyValue() {
    const primaryKey = this.constructor.primaryKeyAttribute;
    return primaryKey ? this.get(primaryKey) : undefined;
  }

  toPlainObject() {
    return this.get({ plain: true });
  }

  hasUserAccount() {
    return Boolean(this.nik);
  }

  getContactEmail() {
    return this.email_kontak;
  }
}

Pelanggan.init({
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
}, {
  sequelize,
  modelName: 'pelanggan',
});

module.exports = Pelanggan;
