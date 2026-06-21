const { DataTypes, Model } = require('sequelize');
const sequelize = require('../config/database');

class SampelParameter extends Model {
  static associate(models) {
    SampelParameter.belongsTo(models.Sampel, { foreignKey: 'no_sampel', as: 'sampel' });
    SampelParameter.belongsTo(models.FpplParameterMetode, { foreignKey: 'id_fppl_parameter_metode', as: 'fppl_parameter_metode' });
  }

  getPrimaryKeyValue() {
    const primaryKey = this.constructor.primaryKeyAttribute;
    return primaryKey ? this.get(primaryKey) : undefined;
  }

  toPlainObject() {
    return this.get({ plain: true });
  }
}

SampelParameter.init({
    no_sampel: {
        type: DataTypes.STRING(25),
        primaryKey: true
    },
    id_fppl_parameter_metode: {
        type: DataTypes.STRING(20),
        primaryKey: true
    }

}, {
  sequelize,
  modelName: 'sampel_parameter',
});

module.exports = SampelParameter;
