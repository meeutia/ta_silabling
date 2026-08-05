const { DataTypes, Model } = require('sequelize');
const sequelize = require('../config/database');

class Fppl extends Model {
  static associate(models) {
    Fppl.belongsTo(models.Pelanggan, { foreignKey: 'id_pelanggan', as: 'pelanggan' });
    Fppl.belongsTo(models.TarifPengambilan, { foreignKey: 'id_tarif_pengambilan' });
    Fppl.hasMany(models.JadwalSampel, { foreignKey: 'id_registrasi', as: 'jadwal_sampels' });
    Fppl.hasMany(models.FpplSampel, { foreignKey: 'id_registrasi', as: 'fppl_sampels' });
    Fppl.hasMany(models.Sampel, { foreignKey: 'id_registrasi', sourceKey: 'id_registrasi', as: 'sampels_direct' });
    Fppl.hasMany(models.FpplParameterMetode, { foreignKey: 'id_registrasi', sourceKey: 'id_registrasi', as: 'fppl_parameter_metodes_direct' });
    Fppl.hasMany(models.Lhu, { foreignKey: 'id_registrasi', as: 'lhus' });
    Fppl.hasMany(models.Invoice, { foreignKey: 'id_registrasi' });
    Fppl.hasOne(models.JadwalPengambilanLhu, {foreignKey: 'id_registrasi', sourceKey: 'id_registrasi', as: 'jadwal_pengambilan_lhu',});
    Fppl.hasMany(models.PengajuanPerubahanJadwal, {foreignKey: 'id_registrasi', sourceKey: 'id_registrasi', as: 'pengajuan_perubahan_jadwal',});
    Fppl.belongsTo(models.User, { foreignKey: 'terakhir_diubah_oleh', as: 'pengubah_terakhir' });
  }

  getPrimaryKeyValue() {
    const primaryKey = this.constructor.primaryKeyAttribute;
    return primaryKey ? this.get(primaryKey) : undefined;
  }

  toPlainObject() {
    return this.get({ plain: true });
  }

  isStatus(status) {
    return this.status_fppl === status;
  }

  isMenungguVerifikasi() {
    return this.isStatus('Menunggu Verifikasi');
  }

  canBeVerified() {
    return this.isMenungguVerifikasi();
  }

  canAssignMethods() {
    return this.isStatus('Menunggu Penentuan Metode');
  }

  isWaitingPayment() {
    return this.isStatus('Menunggu Pembayaran');
  }

  isCompleted() {
    return this.isStatus('Selesai');
  }

  usesPetugasSampling() {
    return this.jenis_pengambilan_sampel === 'Petugas';
  }

  usesMandiriSampling() {
    return this.jenis_pengambilan_sampel === 'Mandiri';
  }

  canBeEditedByCustomer() {
    return this.status_fppl === 'Menunggu Verifikasi';
  }

  getDataVersion() {
    return Number(this.versi_data || 1);
  }
}

Fppl.init({
  id_registrasi: {
    type: DataTypes.STRING(10),
    primaryKey: true,
    allowNull: false,
  },
  nomor_fppl: {
    type: DataTypes.STRING(25),
    allowNull: true,
  },
  id_pelanggan: {
    type: DataTypes.STRING(8),
    allowNull: false,
  },
  tanggal_pendaftaran: {
    type: DataTypes.DATE,
    allowNull: false,
  },
  maksud_pengujian: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  lokasi_pengambilan_sampel: {
    type: DataTypes.STRING(100),
    allowNull: true,
  },
  jenis_pengambilan_sampel: {
    type: DataTypes.ENUM('Petugas', 'Mandiri'),
    allowNull: false,
  },
  id_tarif_pengambilan: {
    type: DataTypes.STRING(10),
    allowNull: true,
  },
  tanggal_rencana_pengambilan_sampel: {
    type: DataTypes.DATEONLY,
    allowNull: true,
  },
  jam_rencana_pengambilan_sampel: {
    type: DataTypes.TIME,
    allowNull: true,
  },
  tanggal_rencana_pengantaran_sampel: {
    type: DataTypes.DATEONLY,
    allowNull: true,
  },
  status_fppl: {
    type: DataTypes.ENUM(
      'Menunggu Verifikasi',
      'Perlu Revisi',
      'Menunggu Penentuan Metode',
      'Menunggu Pembayaran',
      'Menunggu Verifikasi Pembayaran',
      'Menunggu Sampel',
      'Menunggu Pengambilan Sampel',
      'Menunggu Pengantaran Sampel',
      'Proses Pengujian',
      'Menunggu Penjadwalan LHU',
      'Menunggu Pengambilan LHU',
      'Selesai',
      'Dibatalkan',
      'Dibatalkan Pelanggan',
      'Ditolak Admin',
      'Ditolak Kasi',
      'Ditolak Penyelia'
    ),
    allowNull: false,
    defaultValue: 'Menunggu Verifikasi',
  },
  versi_data: {
    type: DataTypes.INTEGER.UNSIGNED,
    allowNull: false,
    defaultValue: 1,
  },
  terakhir_diubah_pada: {
    type: DataTypes.DATE,
    allowNull: true,
  },
  terakhir_diubah_oleh: {
    type: DataTypes.STRING(16),
    allowNull: true,
  },
  catatan_penolakan: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  tanggal_verifikasi: {
    type: DataTypes.DATE,
    allowNull: true,
  },
  diverifikasi_oleh: {
    type: DataTypes.STRING(16),
    allowNull: true,
  },
}, {
  sequelize,
  modelName: 'fppl',
tableName: 'fppl',
  timestamps: false,
});

module.exports = Fppl;
