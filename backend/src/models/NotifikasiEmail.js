const { DataTypes, Model } = require('sequelize');
const sequelize = require('../config/database');
const { NOTIFICATION_REFERENCE_TYPE } = require('../constants/notification.constant');

class NotifikasiEmail extends Model {
  static associate(models) {
    NotifikasiEmail.belongsTo(models.User, {
  foreignKey: 'nik_penerima',
  as: 'penerima_user',
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
    return this.status_pengiriman === status;
  }

  isPending() {
    return this.isStatus('MENUNGGU');
  }

  isSent() {
    return this.isStatus('TERKIRIM');
  }

  isFailed() {
    return this.isStatus('GAGAL');
  }
}

NotifikasiEmail.init({
  id_notifikasi_email: {
    type: DataTypes.STRING(15),
    primaryKey: true,
  },

  id_tipe_notifikasi: {
    type: DataTypes.STRING(10),
    allowNull: false,
  },

  nik_penerima: {
    type: DataTypes.STRING(16),
    allowNull: true,
  },

  email_tujuan: {
    type: DataTypes.STRING(100),
    allowNull: true,
  },

  nama_penerima: {
    type: DataTypes.STRING(100),
    allowNull: true,
  },

  referensi_tipe: {
    type: DataTypes.ENUM(...Object.values(NOTIFICATION_REFERENCE_TYPE)),
    allowNull: true,
  },

  referensi_id: {
    type: DataTypes.STRING(30),
    allowNull: true,
  },

  status_pengiriman: {
    type: DataTypes.ENUM('MENUNGGU', 'TERKIRIM', 'GAGAL'),
    allowNull: false,
    defaultValue: 'MENUNGGU',
  },

  pesan_error: {
    type: DataTypes.TEXT,
    allowNull: true,
  },

  dikirim_pada: {
    type: DataTypes.DATE,
    allowNull: true,
  },


  push_endpoint: {
    type: DataTypes.TEXT,
    allowNull: true,
  },

  push_p256dh: {
    type: DataTypes.STRING(255),
    allowNull: true,
  },

  push_auth: {
    type: DataTypes.STRING(255),
    allowNull: true,
  },

  push_user_agent: {
    type: DataTypes.STRING(255),
    allowNull: true,
  },

  push_aktif: {
    type: DataTypes.TINYINT,
    allowNull: false,
    defaultValue: 0,
  },

  push_subscription_pada: {
    type: DataTypes.DATE,
    allowNull: true,
  },

  push_terkirim_pada: {
    type: DataTypes.DATE,
    allowNull: true,
  },

  dibuat_pada: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: DataTypes.NOW,
  },
}, {
  sequelize,
  modelName: 'notifikasi_email',
tableName: 'notifikasi_email',
  timestamps: false,
  underscored: true,
});

module.exports = NotifikasiEmail;
