const { DataTypes, Model } = require('sequelize');
const sequelize = require('../config/database');

class Pegawai extends Model {
  static associate(models) {
    Pegawai.belongsTo(models.User, { foreignKey: 'nik' });
    Pegawai.hasMany(models.JadwalSampel, { foreignKey: 'id_pegawai_pcc', as: 'jadwal_pcc' });
  }

  getPrimaryKeyValue() {
    const primaryKey = this.constructor.primaryKeyAttribute;
    return primaryKey ? this.get(primaryKey) : undefined;
  }

  toPlainObject() {
    return this.get({ plain: true });
  }

  hasUserAccount() {
    return Boolean(this.nik);
  }

  getDisplayName() {
    return this.nama_pegawai;
  }
}

Pegawai.init({
  id_pegawai: {
    type: DataTypes.STRING(10),
    primaryKey: true,
    allowNull: false,
  },
  nik: {
    type: DataTypes.STRING(16),
    allowNull: true,
    unique: true,
  },
  nip: {
    type: DataTypes.STRING(18),
    allowNull: true,
  },
  nama_pegawai: {
    type: DataTypes.STRING(100),
    allowNull: false,
  },
  no_wa: {
    type: DataTypes.STRING(13),
    allowNull: true,
  },
  is_pcc: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: false,
  },
}, {
  sequelize,
  modelName: 'pegawai',
tableName: 'pegawai',
  timestamps: false,
});

module.exports = Pegawai;
