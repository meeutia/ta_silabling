const { DataTypes, Model } = require('sequelize');
const sequelize = require('../config/database');

class RegBm extends Model {
  static associate(models) {
    RegBm.hasMany(models.FpplSampel, { foreignKey: 'id_reg_bm' });
    RegBm.hasMany(models.Sampel, { foreignKey: 'id_reg_bm', as: 'sampel_rows' });
    RegBm.hasMany(models.PktBmKelompok, { foreignKey: 'id_reg_bm' });
    RegBm.hasMany(models.PktBm, { foreignKey: 'id_reg_bm' });
    RegBm.hasMany(models.PktBmParam, { foreignKey: 'id_reg_bm' });
    RegBm.hasMany(models.FpplParameterMetode, { foreignKey: 'id_reg_bm', as: 'fppl_parameter_metodes' });
  }

  getPrimaryKeyValue() {
    const primaryKey = this.constructor.primaryKeyAttribute;
    return primaryKey ? this.get(primaryKey) : undefined;
  }

  toPlainObject() {
    return this.get({ plain: true });
  }

  isActive() {
    return this.is_active === true || this.is_active === 1;
  }
}

RegBm.init({
    id_reg_bm: {
        type: DataTypes.STRING(6),
        primaryKey: true
    },
    instansi: {
        type: DataTypes.STRING(50),
        allowNull: false
    },
    ref_reg: {
        type: DataTypes.STRING(100),
        allowNull: true
    },
    is_active: {
        type: DataTypes.TINYINT,
        allowNull: false,
        defaultValue: 1
    }
}, {
  sequelize,
  modelName: 'reg_bm',
tableName: 'reg_bm'
});

module.exports = RegBm;
