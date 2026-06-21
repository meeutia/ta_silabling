const { DataTypes, Model } = require('sequelize');
const sequelize = require('../config/database');

class JadwalSampel extends Model {
  static associate(models) {
    JadwalSampel.belongsTo(models.Fppl, { foreignKey: 'id_registrasi' });
    JadwalSampel.belongsTo(models.Pegawai, { foreignKey: 'id_pegawai_pcc', as: 'pegawai_pcc' });
    JadwalSampel.hasMany(models.PengajuanPerubahanJadwal, {
  foreignKey: 'id_jadwal_sampel',
  sourceKey: 'id_jadwal',
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
    return this.status_jadwal === status;
  }

  isScheduled() {
    return this.isStatus('Terjadwal');
  }

  isCompleted() {
    return this.isStatus('Selesai');
  }
}

JadwalSampel.init({
    id_jadwal: {
        type: DataTypes.STRING(10),
        primaryKey: true
    },
    id_registrasi: {
        type: DataTypes.STRING(15),
        allowNull: false
    },
    tanggal_jadwal: {
        type: DataTypes.DATEONLY,
        allowNull: false
    },
    jam_jadwal: {
        type: DataTypes.TIME,
        allowNull: false
    },
    
    id_pegawai_pcc: {
        type: DataTypes.STRING(10),
        allowNull: true
    },
    dibuat_oleh: {
        type: DataTypes.STRING(16),
        allowNull: true
    },

    dibuat_pada: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW
    },
    status_jadwal: {
        type: DataTypes.ENUM('Terjadwal', 'Disetujui Pelanggan', 'Disetujui Admin', 'Selesai', 'Dibatalkan'),
        allowNull: false,
        defaultValue: 'Terjadwal'
    },
}, {
  sequelize,
  modelName: 'jadwal_sampel',
timestamps: false
});

module.exports = JadwalSampel;
