const { DataTypes, Model } = require('sequelize');
const sequelize = require('../config/database');

class Satuan extends Model {
  static associate(models) {
    Satuan.hasMany(models.PktBmParam, { foreignKey: 'id_satuan' });
  }

  getPrimaryKeyValue() {
    const primaryKey = this.constructor.primaryKeyAttribute;
    return primaryKey ? this.get(primaryKey) : undefined;
  }

  toPlainObject() {
    return this.get({ plain: true });
  }
}

Satuan.init({
  id_satuan: {
    type: DataTypes.STRING(10),
    primaryKey: true,
    allowNull: false,
  },
  satuan: {
    type: DataTypes.STRING(30),
    allowNull: false,
  },
}, {
  sequelize,
  modelName: 'satuan',
tableName: 'satuan',
  timestamps: false,
});

module.exports = Satuan;
