const { DataTypes, Model } = require('sequelize');
const sequelize = require('../config/database');

class Sampel extends Model {
  static associate(models) {
    Sampel.belongsTo(models.FpplSampel, { foreignKey: 'id_registrasi', targetKey: 'id_registrasi', as: 'fppl_sampel', constraints: false });
    Sampel.belongsTo(models.Fppl, { foreignKey: 'id_registrasi', targetKey: 'id_registrasi', as: 'fppl' });
    Sampel.belongsTo(models.JenisSampel, { foreignKey: 'id_jenis_sampel', as: 'jenis_sampel' });
    Sampel.belongsTo(models.RegBm, { foreignKey: 'id_reg_bm', as: 'reg_bm' });
    Sampel.belongsTo(models.User, { foreignKey: 'diterima_oleh', as: 'PenerimaSampel' });
    Sampel.hasMany(models.SampelParameter, { foreignKey: 'no_sampel', as: 'sampel_parameters' });
    Sampel.belongsToMany(models.FpplParameterMetode, { through: models.SampelParameter, foreignKey: 'no_sampel', otherKey: 'id_fppl_parameter_metode', as: 'parameter_metodes' });
    Sampel.hasMany(models.PenugasanItem, { foreignKey: 'no_sampel', as: 'penugasan_items' });
    Sampel.hasMany(models.LkaHasil, { foreignKey: 'no_sampel' });
    Sampel.hasMany(models.LkaRevisi, { foreignKey: 'no_sampel', as: 'revisi_lka_sampel' });
    Sampel.belongsTo(models.Lhu, { foreignKey: 'nomor_lhu', as: 'lhu' });
  }

  getPrimaryKeyValue() {
    const primaryKey = this.constructor.primaryKeyAttribute;
    return primaryKey ? this.get(primaryKey) : undefined;
  }

  toPlainObject() {
    return this.get({ plain: true });
  }

  isStatus(status) {
    return this.status_sample === status;
  }

  isReceived() {
    return this.isStatus('Diterima');
  }

  isInTesting() {
    return this.isStatus('Dalam Pengujian');
  }

  isCompleted() {
    return this.isStatus('Selesai');
  }

  hasAbnormality() {
    return Boolean(this.abnormalitas_sampel) && this.abnormalitas_sampel !== 'Tidak Ada';
  }
}

Sampel.init({
  no_sampel: {
    type: DataTypes.STRING(25),
    primaryKey: true,
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
  nomor_lhu: {
    type: DataTypes.STRING(20),
    allowNull: true,
  },
  tanggal_pengambilan_sampel: {
    type: DataTypes.DATEONLY,
    allowNull: true,
  },
  diterima_pada: {
    type: DataTypes.DATE,
    allowNull: true,
  },
  lokasi_spesifik: {
    type: DataTypes.STRING(150),
    allowNull: true,
  },
  koordinat: {
    type: DataTypes.STRING(100),
    allowNull: true,
  },
  kondisi_sampel: {
    type: DataTypes.ENUM('Sesuai', 'Tidak Sesuai'),
    allowNull: false,
    defaultValue: 'Sesuai',
  },
  abnormalitas_sampel: {
    type: DataTypes.STRING(30),
    allowNull: true,
  },
  acuan_pengambilan_sampel: {
    type: DataTypes.STRING(20),
    allowNull: true,
  },
  diterima_oleh: {
    type: DataTypes.STRING(16),
    allowNull: true,
  },
  status_sample: {
    type: DataTypes.ENUM('Menunggu Pengambilan', 'Diterima', 'Dalam Pengujian', 'Selesai'),
    allowNull: false,
    defaultValue: 'Menunggu Pengambilan',
  },
}, {
  sequelize,
  modelName: 'sampel',
tableName: 'sampel',
  timestamps: false,
});

module.exports = Sampel;
