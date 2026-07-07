const { DataTypes, Model } = require('sequelize');
const sequelize = require('../config/database');

class Fppl extends Model {
  static associate(models) {
    Fppl.belongsTo(models.Pelanggan, { foreignKey: 'id_pelanggan', as: 'pelanggan' });
    Fppl.hasMany(models.FpplSampel,  { foreignKey: 'id_registrasi', as: 'fppl_sampels' });
    Fppl.hasMany(models.Sampel,      { foreignKey: 'id_registrasi', as: 'sampels_direct' });
    Fppl.hasMany(models.Lhu,         { foreignKey: 'id_registrasi', as: 'lhus' });
    Fppl.hasMany(models.Invoice,     { foreignKey: 'id_registrasi' });
  }

  isMenungguVerifikasi() { return this.status_fppl === 'Menunggu Verifikasi'; }
  canAssignMethods()     { return this.status_fppl === 'Menunggu Penentuan Metode'; }
  usesPetugasSampling()  { return this.jenis_pengambilan_sampel === 'Petugas'; }
}

Fppl.init({
  id_registrasi:            { type: DataTypes.STRING(10), primaryKey: true, allowNull: false },
  nomor_fppl:               { type: DataTypes.STRING(25), allowNull: true  },
  id_pelanggan:             { type: DataTypes.STRING(8),  allowNull: false },
  tanggal_pendaftaran:      { type: DataTypes.DATE,       allowNull: false },
  maksud_pengujian:         { type: DataTypes.TEXT,       allowNull: true  },
  jenis_pengambilan_sampel: {
    type: DataTypes.ENUM('Petugas', 'Mandiri'),
    allowNull: false,
  },
  status_fppl: {
    type: DataTypes.ENUM(
      'Menunggu Verifikasi', 'Menunggu Penentuan Metode',
      'Menunggu Pembayaran', 'Proses Pengujian',
      'Menunggu Penjadwalan LHU', 'Menunggu Pengambilan LHU',
      'Selesai', 'Ditolak Admin', 'Ditolak Kasi'
    ),
    allowNull: false,
    defaultValue: 'Menunggu Verifikasi',
  },
  tanggal_verifikasi:  { type: DataTypes.DATE,       allowNull: true },
  diverifikasi_oleh:   { type: DataTypes.STRING(16), allowNull: true },
}, {
  sequelize,
  modelName: 'fppl',
  tableName: 'fppl',
  timestamps: false,
});

module.exports = Fppl;
