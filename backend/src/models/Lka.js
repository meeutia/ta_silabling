const { DataTypes, Model } = require('sequelize');
const sequelize = require('../config/database');

class Lka extends Model {
  static associate(models) {
    Lka.belongsTo(models.PenugasanDetail, { foreignKey: 'id_penugasan_detail' });
    Lka.belongsTo(models.User, { foreignKey: 'dilaporkan_oleh', as: 'Pelapor' });
    Lka.belongsTo(models.User, { foreignKey: 'diperiksa_oleh', as: 'Pemeriksa' });
    Lka.hasMany(models.LkaHasil, { foreignKey: 'kode_lka' });
    Lka.hasMany(models.LkaRevisi, { foreignKey: 'kode_lka', as: 'revisi_lka' });
  }

  getPrimaryKeyValue() {
    const primaryKey = this.constructor.primaryKeyAttribute;
    return primaryKey ? this.get(primaryKey) : undefined;
  }

  toPlainObject() {
    return this.get({ plain: true });
  }

  isStatus(status) {
    return this.status_lka === status;
  }

  isDraft() {
    return this.isStatus('Draft');
  }

  isReported() {
    return Boolean(this.tanggal_pelaporan);
  }

  isChecked() {
    return Boolean(this.tanggal_pemeriksaan);
  }
}

Lka.init({
  kode_lka: {
    type: DataTypes.STRING(20),
    primaryKey: true,
    allowNull: false,
  },
  id_penugasan_detail: {
    type: DataTypes.STRING(10),
    allowNull: false,
  },
  tanggal_mulai_pengujian: {
    type: DataTypes.DATEONLY,
    allowNull: true,
  },
  tanggal_selesai_pengujian: {
    type: DataTypes.DATEONLY,
    allowNull: true,
  },
  dhl_akuades: {
    type: DataTypes.STRING(50),
    allowNull: true,
  },
  file_worksheet_path: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  dilaporkan_oleh: {
    type: DataTypes.STRING(16),
    allowNull: true,
  },
  tanggal_pelaporan: {
    type: DataTypes.DATEONLY,
    allowNull: true,
  },
  diperiksa_oleh: {
    type: DataTypes.STRING(16),
    allowNull: true,
  },
  tanggal_pemeriksaan: {
    type: DataTypes.DATEONLY,
    allowNull: true,
  },
  status_lka: {
    type: DataTypes.ENUM(
      'Draft',
      'Menunggu Verifikasi Penyelia',
      'Perlu Perbaikan',
      'Disetujui Penyelia',
      'Menunggu Verifikasi Kasi Pengujian',
      'Disetujui Kasi Pengujian',
      'Disahkan'
    ),
    allowNull: false,
    defaultValue: 'Draft',
  },
}, {
  sequelize,
  modelName: 'lka',
tableName: 'lka',
  timestamps: false,
});

module.exports = Lka;
