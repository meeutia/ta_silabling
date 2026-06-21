const { DataTypes, Model } = require('sequelize');
const sequelize = require('../config/database');

class FpplParameterMetode extends Model {
  static associate(models) {
    FpplParameterMetode.belongsTo(models.FpplSampel, { foreignKey: 'id_registrasi', targetKey: 'id_registrasi', constraints: false });
    FpplParameterMetode.belongsTo(models.Fppl, { foreignKey: 'id_registrasi', targetKey: 'id_registrasi', as: 'fppl' });
    FpplParameterMetode.belongsTo(models.JenisSampel, { foreignKey: 'id_jenis_sampel', as: 'jenis_sampel' });
    FpplParameterMetode.belongsTo(models.RegBm, { foreignKey: 'id_reg_bm', as: 'reg_bm' });
    FpplParameterMetode.belongsTo(models.Parameter, { foreignKey: 'id_parameter' });
    FpplParameterMetode.belongsTo(models.ParameterMetode, { foreignKey: 'id_metode_parameter' });
    FpplParameterMetode.belongsTo(models.User, { foreignKey: 'dipilih_oleh', as: 'PemilihUser' });
    FpplParameterMetode.hasMany(models.SampelParameter, { foreignKey: 'id_fppl_parameter_metode', as: 'sampel_parameters' });
    FpplParameterMetode.belongsToMany(models.Sampel, { through: models.SampelParameter, foreignKey: 'id_fppl_parameter_metode', otherKey: 'no_sampel', as: 'sampels' });
    FpplParameterMetode.hasMany(models.InvoiceItem, { foreignKey: 'id_fppl_parameter_metode' });
    FpplParameterMetode.belongsToMany(models.Invoice, { through: models.InvoiceItem, foreignKey: 'id_fppl_parameter_metode', otherKey: 'id_invoice', as: 'InvoiceList' });
  }

  getPrimaryKeyValue() {
    const primaryKey = this.constructor.primaryKeyAttribute;
    return primaryKey ? this.get(primaryKey) : undefined;
  }

  toPlainObject() {
    return this.get({ plain: true });
  }

  isLabCapable() {
    return this.status_kemampuan_lab === 'MAMPU';
  }

  isSubcontractRequired() {
    return this.status_kemampuan_lab === 'TIDAK_MAMPU';
  }

  isInSitu() {
    return this.is_insitu === true || this.is_insitu === 1;
  }
}

FpplParameterMetode.init({
  id_fppl_parameter_metode: {
    type: DataTypes.STRING(15),
    primaryKey: true,
    allowNull: false,
  },
  id_registrasi: {
    type: DataTypes.STRING(10),
    allowNull: false,
  },
  id_jenis_sampel: {
    type: DataTypes.STRING(4),
    allowNull: false,
  },
  id_reg_bm: {
    type: DataTypes.STRING(6),
    allowNull: false,
  },
  id_parameter: {
    type: DataTypes.STRING(6),
    allowNull: false,
  },
  id_metode_parameter: {
    type: DataTypes.STRING(6),
    allowNull: true,
  },
  status_kemampuan_lab: {
    type: DataTypes.ENUM('MAMPU', 'TIDAK_MAMPU'),
    allowNull: true,
  },
  catatan_kemampuan: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  dipilih_oleh: {
    type: DataTypes.STRING(16),
    allowNull: true,
  },
  dipilih_pada: {
    type: DataTypes.DATE,
    allowNull: true,
  },
  is_insitu: {
    type: DataTypes.BOOLEAN,
    allowNull: true,
    defaultValue: false,
  },
}, {
  sequelize,
  modelName: 'fppl_parameter_metode',
tableName: 'fppl_parameter_metode',
  timestamps: false,
});

module.exports = FpplParameterMetode;
