const { DataTypes, Model } = require('sequelize');
const sequelize = require('../config/database');

class PenugasanItem extends Model {
  static associate(models) {
    PenugasanItem.belongsTo(models.Sampel, { foreignKey: 'no_sampel' });
    PenugasanItem.belongsTo(models.PenugasanDetail, { foreignKey: 'id_penugasan_detail' });
  }

  getPrimaryKeyValue() {
    const primaryKey = this.constructor.primaryKeyAttribute;
    return primaryKey ? this.get(primaryKey) : undefined;
  }

  toPlainObject() {
    return this.get({ plain: true });
  }
}

PenugasanItem.init({
    id_penugasan_detail: {
        type: DataTypes.STRING(10),
        primaryKey: true
    },
    no_sampel: {
        type: DataTypes.STRING(25),
        primaryKey: true
    }
}, {
  sequelize,
  modelName: 'penugasan_item',
tableName: 'penugasan_item'
});

module.exports = PenugasanItem;
