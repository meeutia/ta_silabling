const { DataTypes, Model } = require('sequelize');
const sequelize = require('../config/database');

class Klasifikasi extends Model {
  static associate(models) {
    Klasifikasi.hasMany(models.PktBm, { foreignKey: 'id_klasifikasi' });
  }

  getPrimaryKeyValue() {
    const primaryKey = this.constructor.primaryKeyAttribute;
    return primaryKey ? this.get(primaryKey) : undefined;
  }

  toPlainObject() {
    return this.get({ plain: true });
  }
}

Klasifikasi.init({
  id_klasifikasi: {
    type: DataTypes.STRING(10),
    primaryKey: true,
    allowNull: false,
  },
  klasifikasi: {
    type: DataTypes.STRING(50),
    allowNull: false,
  },
}, {
  sequelize,
  modelName: 'klasifikasi',
tableName: 'klasifikasi',
  timestamps: false,
});

module.exports = Klasifikasi;
