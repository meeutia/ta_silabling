const { DataTypes, Model } = require('sequelize');
const sequelize = require('../config/database');

class JenisSampel extends Model {
  static associate(models) {
    JenisSampel.hasMany(models.FpplSampel, { foreignKey: 'id_jenis_sampel' });
    JenisSampel.hasMany(models.Sampel, { foreignKey: 'id_jenis_sampel', as: 'sampel_rows' });
    JenisSampel.hasMany(models.PktBmKelompok, { foreignKey: 'id_jenis_sampel' });
    JenisSampel.hasMany(models.PktBm, { foreignKey: 'id_jenis_sampel' });
    JenisSampel.hasMany(models.PktBmParam, { foreignKey: 'id_jenis_sampel' });
    JenisSampel.hasMany(models.FpplParameterMetode, { foreignKey: 'id_jenis_sampel', as: 'fppl_parameter_metodes' });
  }

  getPrimaryKeyValue() {
    const primaryKey = this.constructor.primaryKeyAttribute;
    return primaryKey ? this.get(primaryKey) : undefined;
  }

  toPlainObject() {
    return this.get({ plain: true });
  }
}

JenisSampel.init({
    id_jenis_sampel: {
        type: DataTypes.STRING(10),
        primaryKey: true
    },
    jenis_sampel: {
        type: DataTypes.STRING(100),
        allowNull: false
    }
}, {
  sequelize,
  modelName: 'jenis_sampel',
});

module.exports = JenisSampel;
