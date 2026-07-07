const { DataTypes, Model } = require('sequelize');
const sequelize = require('../config/database');

class Lhu extends Model {
  static associate(models) {
    Lhu.belongsTo(models.Fppl,  { foreignKey: 'id_registrasi', as: 'fppl' });
    Lhu.belongsTo(models.PktBm, { foreignKey: 'id_pkt_bm' });
    Lhu.hasMany(models.Sampel,  { foreignKey: 'nomor_lhu', as: 'sampels' });
  }

  isDraft()     { return this.status_lhu === 'Draft'; }
  isFinalized() { return this.status_lhu === 'Menunggu Pengesahan'; }
  isApproved()  { return this.status_lhu === 'Disahkan'; }

  canBeFinalized() { return this.isDraft(); }
  canBeApproved()  { return this.isFinalized(); }
  hasPublishedFile() { return Boolean(this.file_lhu_path); }
}

Lhu.init({
  nomor_lhu:          { type: DataTypes.STRING(20),  primaryKey: true, allowNull: false },
  id_registrasi:      { type: DataTypes.STRING(10),  allowNull: false },
  id_pkt_bm:          { type: DataTypes.STRING(8),   allowNull: false },
  tanggal_penerbitan: { type: DataTypes.DATEONLY,    allowNull: true  },
  file_lhu_path:      { type: DataTypes.STRING(255), allowNull: true  },
  qc_by:              { type: DataTypes.STRING(16),  allowNull: true  },
  qc_at:              { type: DataTypes.DATE,        allowNull: true  },
  kalab_by:           { type: DataTypes.STRING(16),  allowNull: true  },
  kalab_at:           { type: DataTypes.DATE,        allowNull: true  },
  status_lhu: {
    type: DataTypes.ENUM(
      'Draft',
      'Menunggu QC',
      'Menunggu Persetujuan Kepala Lab',
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
