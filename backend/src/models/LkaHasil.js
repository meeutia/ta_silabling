const { DataTypes, Model } = require('sequelize');
const sequelize = require('../config/database');

const REVIEW_STATUS_FIELD = ['status', 'review', 'hasil'].join('_');

class LkaHasil extends Model {
  static associate(models) {
    LkaHasil.belongsTo(models.Lka, { foreignKey: 'kode_lka' });
    LkaHasil.belongsTo(models.Sampel, { foreignKey: 'no_sampel' });
  }

  getPrimaryKeyValue() {
    const primaryKey = this.constructor.primaryKeyAttribute;
    return primaryKey ? this.get(primaryKey) : undefined;
  }

  toPlainObject() {
    return this.get({ plain: true });
  }

  hasResult() {
    return this.hasil !== null && this.hasil !== undefined && this.hasil !== '';
  }

  isReviewStatus(status) {
    return this.statusReviewHasil === status;
  }
}

LkaHasil.init({
  kode_lka: {
    type: DataTypes.STRING(20),
    primaryKey: true,
    allowNull: false,
  },
  no_sampel: {
    type: DataTypes.STRING(25),
    primaryKey: true,
    allowNull: false,
  },
  hasil: {
    type: DataTypes.STRING(50),
    allowNull: true,
  },
  catatan_hasil: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  statusReviewHasil: {
    type: DataTypes.ENUM(
      'Draft',
      'Menunggu Verifikasi Penyelia',
      'Disetujui Penyelia',
      'Menunggu Verifikasi Kasi Pengujian',
      'Menunggu Persetujuan Penyelia Atas Revisi Kasi',
      'Disetujui Kasi Pengujian',
      'Perlu Revisi'
    ),
    allowNull: false,
    defaultValue: 'Draft',
    field: REVIEW_STATUS_FIELD,
  },
}, {
  sequelize,
  modelName: 'lka_hasil',
tableName: 'lka_hasil',
  timestamps: false,
});

module.exports = LkaHasil;
