const { DataTypes, Model } = require('sequelize');
const sequelize = require('../config/database');

class Metode extends Model {
  static associate(models) {
    Metode.hasMany(models.ParameterMetode, { foreignKey: 'id_metode' });
  }

  getPrimaryKeyValue() {
    const primaryKey = this.constructor.primaryKeyAttribute;
    return primaryKey ? this.get(primaryKey) : undefined;
  }

  toPlainObject() {
    return this.get({ plain: true });
  }
}

Metode.init({
    id_metode: {
        type: DataTypes.STRING(10),
        primaryKey: true
    },
    nama_metode: {
        type: DataTypes.STRING(100),
        allowNull: false
    }
}, {
  sequelize,
  modelName: 'metode',
});

module.exports = Metode;
