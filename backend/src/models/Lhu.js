const { DataTypes, Model } = require('sequelize');
const sequelize = require('../config/database');

class Lhu extends Model {
  static associate(models) {
    Lhu.belongsTo(models.Fppl, { foreignKey: 'id_registrasi', as: 'fppl' });
    Lhu.belongsTo(models.PktBm, { foreignKey: 'id_pkt_bm' });
    Lhu.hasMany(models.Sampel, { foreignKey: 'nomor_lhu', as: 'sampels' });
  }

  getPrimaryKeyValue() {
    const primaryKey = this.constructor.primaryKeyAttribute;
    return primaryKey ? this.get(primaryKey) : undefined;
  }

  toPlainObject() {
    return this.get({ plain: true });
  }

  isStatus(status) {
    return this.status_lhu === status;
  }

  isDraft() {
    return this.isStatus('Draft');
  }

  isFinalized() {
    return this.isStatus('Disahkan');
  }

  isApproved() {
    return this.isStatus('Disahkan');
  }

  canBeFinalized() {
    return this.isDraft();
  }

  canBeApproved() {
    return this.isFinalized();
  }

  hasPublishedFile() {
    return Boolean(this.file_lhu_path);
  }

  hasSignedFile() {
    return Boolean(this.file_lhu_signed_path);
  }

  canReceiveSignedFile() {
    return this.status_lhu === 'Disahkan';
  }
}

Lhu.init({
  nomor_lhu: {
    type: DataTypes.STRING(20),
    primaryKey: true,
    allowNull: false,
  },
  id_registrasi: {
    type: DataTypes.STRING(10),
    allowNull: false,
  },
  id_pkt_bm: {
    type: DataTypes.STRING(8),
    allowNull: false,
  },
  tanggal_penerbitan: {
    type: DataTypes.DATEONLY,
    allowNull: true,
  },
  file_lhu_path: {
    type: DataTypes.STRING(255),
    allowNull: true,
  },
  file_lhu_signed_path: {
    type: DataTypes.STRING(255),
    allowNull: true,
  },
  qc_by: {
    type: DataTypes.STRING(16),
    allowNull: true,
  },
  qc_at: {
    type: DataTypes.DATE,
    allowNull: true,
  },
  kalab_by: {
    type: DataTypes.STRING(16),
    allowNull: true,
  },
  kalab_at: {
    type: DataTypes.DATE,
    allowNull: true,
  },
  created_at: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: DataTypes.NOW,
  },
  updated_at: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: DataTypes.NOW,
  },
  status_lhu: {
    type: DataTypes.ENUM(
      'Draft',
      'Menunggu QC',
      'Disahkan',
      'Dibatalkan'
    ),
    allowNull: false,
    defaultValue: 'Draft',
  },
}, {
  sequelize,
  modelName: 'lhu',
  tableName: 'lhu',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at',
});

module.exports = Lhu;
