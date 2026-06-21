const { DataTypes, Model } = require('sequelize');
const sequelize = require('../config/database');

class PengajuanPerubahanJadwal extends Model {
  static associate(models) {
    PengajuanPerubahanJadwal.belongsTo(models.Fppl, {
  foreignKey: 'id_registrasi',
  targetKey: 'id_registrasi',
  as: 'fppl',
});
    PengajuanPerubahanJadwal.belongsTo(models.JadwalSampel, {
  foreignKey: 'id_jadwal_sampel',
  targetKey: 'id_jadwal',
  as: 'jadwal_sampel',
});
    PengajuanPerubahanJadwal.belongsTo(models.JadwalPengambilanLhu, {
  foreignKey: 'id_jadwal_lhu',
  targetKey: 'id_jadwal_lhu',
  as: 'jadwal_pengambilan_lhu',
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
    return this.status_pengajuan === status;
  }

  isWaitingAdminApproval() {
    return this.isStatus('Menunggu Persetujuan Admin');
  }

  isForSampelSchedule() {
    return this.tipe_jadwal === 'SAMPEL';
  }

  isForLhuPickupSchedule() {
    return this.tipe_jadwal === 'LHU';
  }
}

PengajuanPerubahanJadwal.init({
  id_pengajuan_jadwal: {
    type: DataTypes.STRING(20),
    primaryKey: true,
  },
  jenis_jadwal: {
    type: DataTypes.ENUM('SAMPEL', 'LHU'),
    allowNull: false,
  },
  id_registrasi: {
    type: DataTypes.STRING(10),
    allowNull: false,
  },
  id_jadwal_sampel: {
    type: DataTypes.STRING(10),
    allowNull: true,
  },
  id_jadwal_lhu: {
    type: DataTypes.STRING(10),
    allowNull: true,
  },
  tanggal_sebelumnya: {
    type: DataTypes.DATEONLY,
    allowNull: true,
  },
  jam_sebelumnya: {
    type: DataTypes.TIME,
    allowNull: true,
  },
  tanggal_usulan: {
    type: DataTypes.DATEONLY,
    allowNull: false,
  },
  jam_usulan: {
    type: DataTypes.TIME,
    allowNull: true,
  },
  alasan_pengajuan: {
    type: DataTypes.TEXT,
    allowNull: false,
  },
  status_pengajuan: {
    type: DataTypes.ENUM(
      'Menunggu Persetujuan Admin',
      'Disetujui',
      'Ditolak',
      'Dibatalkan Pelanggan'
    ),
    allowNull: false,
    defaultValue: 'Menunggu Persetujuan Admin',
  },
  catatan_admin: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  diajukan_pada: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: DataTypes.NOW,
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
  modelName: 'pengajuan_perubahan_jadwal',
tableName: 'pengajuan_perubahan_jadwal',
  underscored: true,
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at',
});

module.exports = PengajuanPerubahanJadwal;
