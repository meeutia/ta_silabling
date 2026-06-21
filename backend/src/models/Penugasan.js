const { DataTypes, Model } = require('sequelize');
const sequelize = require('../config/database');

class Penugasan extends Model {
  static associate(models) {
    Penugasan.hasMany(models.PenugasanDetail, { foreignKey: 'id_penugasan' });
    Penugasan.belongsTo(models.User, { foreignKey: 'id_user_analis', as: 'Analis' });
  }

  getPrimaryKeyValue() {
    const primaryKey = this.constructor.primaryKeyAttribute;
    return primaryKey ? this.get(primaryKey) : undefined;
  }

  toPlainObject() {
    return this.get({ plain: true });
  }

  isStatus(status) {
    return this.status_penugasan === status;
  }

  isDraft() {
    return this.isStatus('Draft');
  }

  isInternal() {
    return this.jenis_penugasan === 'INTERNAL';
  }

  isSubcontract() {
    return this.jenis_penugasan === 'SUBKONTRAK';
  }
}

Penugasan.init({
    id_penugasan: {
        type: DataTypes.STRING(10),
        primaryKey: true
    },
    id_user_analis: {
        type: DataTypes.STRING(16),
        allowNull: false
    },
    assigned_by: {
        type: DataTypes.STRING(16),
        allowNull: true
    },
    assigned_at: {
        type: DataTypes.DATE,
        allowNull: true,
        defaultValue: DataTypes.NOW
    },
    jenis_penugasan: {
        type: DataTypes.ENUM('INTERNAL', 'SUBKONTRAK'),
        allowNull: false,
        defaultValue: 'INTERNAL'
    },
    status_penugasan: {
        type: DataTypes.ENUM(
            'Draft',
            'Aktif',
            'Selesai',
            'Dibatalkan'
        ),
        allowNull: false,
        defaultValue: 'Draft'
    },
    catatan_penugasan: {
        type: DataTypes.TEXT,
        allowNull: true
    }
}, {
  sequelize,
  modelName: 'penugasan',
});

module.exports = Penugasan;
