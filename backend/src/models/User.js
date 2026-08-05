const { DataTypes, Model } = require('sequelize');
const sequelize = require('../config/database');

class User extends Model {
  static associate(models) {
    User.belongsTo(models.Role, { foreignKey: 'id_role' });
    User.hasOne(models.Pegawai, { foreignKey: 'nik' });
    User.hasMany(models.Pelanggan, { foreignKey: 'nik' });
    User.hasMany(models.Sampel, { foreignKey: 'diterima_oleh', as: 'SampelDiterima' });
    User.hasMany(models.FpplParameterMetode, { foreignKey: 'dipilih_oleh', as: 'PilihFpplParameterMetode' });
    User.hasMany(models.Penugasan, { foreignKey: 'id_user_analis', as: 'PenugasanAnalis' });
    User.hasMany(models.Lka, { foreignKey: 'dilaporkan_oleh', as: 'LkaDilaporkan' });
    User.hasMany(models.Lka, { foreignKey: 'diperiksa_oleh', as: 'LkaDiperiksa' });
    User.hasMany(models.LkaRevisi, { foreignKey: 'diajukan_oleh', as: 'RevisiLkaDiajukan' });
    User.hasMany(models.LkaRevisi, { foreignKey: 'ditinjau_oleh', as: 'RevisiLkaDitinjau' });
    User.hasMany(models.NotifikasiEmail, {
  foreignKey: 'nik_penerima',
  as: 'notifikasi_email',
});
    User.hasMany(models.AktivitasSistemLog, {
      foreignKey: 'dibuat_oleh',
      as: 'aktivitas_sistem_log',
    });
    User.hasMany(models.Lhu, {
      foreignKey: 'file_lhu_signed_uploaded_by',
      as: 'uploaded_signed_lhus',
    });
  }

  getPrimaryKeyValue() {
    const primaryKey = this.constructor.primaryKeyAttribute;
    return primaryKey ? this.get(primaryKey) : undefined;
  }

  toPlainObject() {
    return this.get({ plain: true });
  }

  isActiveUser() {
    return this.is_active === true || this.is_active === 1;
  }

  hasRole(roleId) {
    return this.id_role === roleId;
  }

  canLogin() {
    return this.isActiveUser();
  }
}

User.init({
  nik: {
    type: DataTypes.STRING(16),
    primaryKey: true,
    allowNull: false,
  },
  id_role: {
    type: DataTypes.STRING(10),
    allowNull: false,
  },
  username: {
    type: DataTypes.STRING(50),
    allowNull: false,
    unique: true,
  },
  email: {
    type: DataTypes.STRING(50),
    allowNull: false,
    unique: true,
  },
  password: {
    type: DataTypes.STRING(100),
    allowNull: false,
  },
  refresh_token_hash: {
    type: DataTypes.STRING(64),
    allowNull: true,
  },
  refresh_token_expires_at: {
    type: DataTypes.DATE,
    allowNull: true,
  },
  created_at: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: DataTypes.NOW,
  },
  is_active: {
    type: DataTypes.TINYINT,
    allowNull: false,
    defaultValue: 1,
  },
  reset_password_token_hash: {
    type: DataTypes.STRING(64),
    allowNull: true,
  },
  reset_password_expires_at: {
    type: DataTypes.DATE,
    allowNull: true,
  },
}, {
  sequelize,
  modelName: 'user',
tableName: 'user',
  timestamps: false,
});

module.exports = User;
