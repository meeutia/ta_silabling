const { DataTypes, Model } = require('sequelize');
const sequelize = require('../config/database');

class JadwalPengambilanLhu extends Model {
  static associate(models) {
    JadwalPengambilanLhu.belongsTo(models.Fppl, {
  foreignKey: 'id_registrasi',
  targetKey: 'id_registrasi',
  as: 'fppl',
});
    JadwalPengambilanLhu.hasMany(models.PengajuanPerubahanJadwal, {
  foreignKey: 'id_jadwal_lhu',
  sourceKey: 'id_jadwal_lhu',
  as: 'pengajuan_perubahan',
});
  }

  getPrimaryKeyValue() {
    const primaryKey = this.constructor.primaryKeyAttribute;
    return primaryKey ? this.get(primaryKey) : undefined;
  }

  toPlainObject() {
    return this.get({ plain: true });
  }

  isStatus(status) {
    return this.status_pengambilan === status;
  }

  isScheduled() {
    return this.isStatus('Dijadwalkan');
  }

  isTaken() {
    return this.isStatus('Sudah Diambil');
  }
}

JadwalPengambilanLhu.init({
  id_jadwal_lhu: {
    type: DataTypes.STRING(10),
    primaryKey: true,
  },
  id_registrasi: {
    type: DataTypes.STRING(10),
    allowNull: false,
  },
  tanggal_pengambilan: {
    type: DataTypes.DATEONLY,
    allowNull: false,
  },
  jam_pengambilan: {
    type: DataTypes.TIME,
    allowNull: true,
  },
  status_pengambilan: {
    type: DataTypes.ENUM('Dijadwalkan', 'Disetujui Pelanggan', 'Disetujui Admin', 'Sudah Diambil', 'Dibatalkan'),
    allowNull: false,
    defaultValue: 'Dijadwalkan',
  },  catatan: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  dijadwalkan_oleh: {
    type: DataTypes.STRING(16),
    allowNull: true,
  },
  dijadwalkan_pada: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: DataTypes.NOW,
  },
  nama_pengambil: {
    type: DataTypes.STRING(100),
    allowNull: true,
  },
  diambil_pada: {
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
}, {
  sequelize,
  modelName: 'jadwal_pengambilan_lhu',
tableName: 'jadwal_pengambilan_lhu',
  underscored: true,
  timestamps: false,
});

module.exports = JadwalPengambilanLhu;