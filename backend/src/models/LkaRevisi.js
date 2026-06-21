const { DataTypes, Model } = require('sequelize');
const sequelize = require('../config/database');

const LKA_REVISION_STATUSES = [
  'Diajukan',
  'Menunggu Persetujuan Penyelia',
  'Menunggu Review Penyelia',
  'Disetujui Penyelia',
  'Ditolak Penyelia',
  'Disetujui untuk Analis',
  'Dikirim ke Analis',
  'Diperbaiki Analis',
  'Disetujui Kasi',
  'Selesai',
];

class LkaRevisi extends Model {
  static associate(models) {
    LkaRevisi.belongsTo(models.Lka, { foreignKey: 'kode_lka', as: 'lka' });
    LkaRevisi.belongsTo(models.LkaRevisi, { foreignKey: 'id_revisi_sebelumnya', as: 'RevisiSebelumnya' });
    LkaRevisi.hasMany(models.LkaRevisi, { foreignKey: 'id_revisi_sebelumnya', as: 'RevisiBerikutnya' });
    LkaRevisi.belongsTo(models.User, { foreignKey: 'diajukan_oleh', as: 'PengajuRevisi' });
    LkaRevisi.belongsTo(models.User, { foreignKey: 'ditinjau_oleh', as: 'PeninjauRevisi' });
    LkaRevisi.belongsTo(models.Sampel, { foreignKey: 'no_sampel', as: 'sampel' });
  }

  getPrimaryKeyValue() {
    const primaryKey = this.constructor.primaryKeyAttribute;
    return primaryKey ? this.get(primaryKey) : undefined;
  }

  toPlainObject() {
    return this.get({ plain: true });
  }

  isStatus(status) {
    return this.status_revisi === status;
  }

  isSubmitted() {
    return this.isStatus('Diajukan');
  }

  hasPreviousRevision() {
    return Boolean(this.id_revisi_sebelumnya);
  }
}

LkaRevisi.init({
  id_revisi_lka: {
    type: DataTypes.STRING(10),
    primaryKey: true,
    allowNull: false,
  },
  id_revisi_sebelumnya: {
    type: DataTypes.STRING(10),
    allowNull: true,
  },
  kode_lka: {
    type: DataTypes.STRING(20),
    allowNull: false,
  },
  no_sampel: {
    type: DataTypes.STRING(25),
    allowNull: true,
  },
  catatan_revisi: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  sumber_revisi: {
    type: DataTypes.ENUM('PENYELIA', 'KASI_PENGUJIAN'),
    allowNull: false,
  },
  level_revisi: {
    type: DataTypes.ENUM('LKA', 'HASIL'),
    allowNull: false,
  },
  diajukan_oleh: {
    type: DataTypes.STRING(16),
    allowNull: false,
  },
  diajukan_pada: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: DataTypes.NOW,
  },
  status_revisi: {
    type: DataTypes.ENUM(...LKA_REVISION_STATUSES),
    allowNull: false,
    defaultValue: 'Diajukan',
  },
  ditinjau_oleh: {
    type: DataTypes.STRING(16),
    allowNull: true,
  },
  ditinjau_pada: {
    type: DataTypes.DATE,
    allowNull: true,
  },
  catatan_tinjauan: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  created_at: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: DataTypes.NOW,
  },
  updated_at: {
    type: DataTypes.DATE,
    allowNull: true,
  },
}, {
  sequelize,
  modelName: 'lka_revisi',
tableName: 'lka_revisi',
  timestamps: false,
});

module.exports = LkaRevisi;
module.exports.LKA_REVISION_STATUSES = LKA_REVISION_STATUSES;
