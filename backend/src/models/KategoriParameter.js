const { DataTypes, Model } = require('sequelize');
const sequelize = require('../config/database');

class KategoriParameter extends Model {
  static associate(models) {
    KategoriParameter.hasMany(models.Parameter, { foreignKey: 'id_kategori_parameter', as: 'parameters' });
  }

  getPrimaryKeyValue() {
    const primaryKey = this.constructor.primaryKeyAttribute;
    return primaryKey ? this.get(primaryKey) : undefined;
  }

  toPlainObject() {
    return this.get({ plain: true });
  }
}

KategoriParameter.init({
  id_kategori_parameter: {
    type: DataTypes.STRING(4),
    primaryKey: true,
  },
  nama_kategori: {
    type: DataTypes.STRING(50),
    allowNull: false,
    unique: true,
  },
}, {
  sequelize,
  modelName: 'kategori_parameter',
});

module.exports = KategoriParameter;
