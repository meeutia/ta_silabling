const { DataTypes, Model } = require('sequelize');
const sequelize = require('../config/database');

class FpplSampel extends Model {
  static associate(models) {
    FpplSampel.belongsTo(models.Fppl, { foreignKey: 'id_registrasi', as: 'fppl' });
    FpplSampel.belongsTo(models.JenisSampel, { foreignKey: 'id_jenis_sampel' });
    FpplSampel.belongsTo(models.RegBm, { foreignKey: 'id_reg_bm' });
    FpplSampel.hasMany(models.Sampel, { foreignKey: 'id_registrasi', sourceKey: 'id_registrasi', as: 'sampels', constraints: false });
    FpplSampel.hasMany(models.FpplParameterMetode, { foreignKey: 'id_registrasi', sourceKey: 'id_registrasi', constraints: false });
  }

  getPrimaryKeyValue() {
    const primaryKey = this.constructor.primaryKeyAttribute;
    return primaryKey ? this.get(primaryKey) : undefined;
  }

  toPlainObject() {
    return this.get({ plain: true });
  }
}

FpplSampel.init({
    id_registrasi: {
        type: DataTypes.STRING(10),
        primaryKey: true,
        allowNull: false
    },
    id_jenis_sampel: {
        type: DataTypes.STRING(4),
        primaryKey: true,
        allowNull: false
    },
    id_reg_bm: {
        type: DataTypes.STRING(6),
        primaryKey: true,
        allowNull: false
    },
    jumlah_sampel: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 1
    }
}, {
  sequelize,
  modelName: 'fppl_sampel',
});

module.exports = FpplSampel;
